#!/usr/bin/env node

/**
 * Bulletproof Error Handler - Never crashes, always recovers
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ticketSystem } from './ticket-system.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ERROR_LOG = path.join(__dirname, '../logs/errors.jsonl');

class ResilientErrorHandler {
  constructor() {
    this.errorCount = 0;
    this.recoveryStrategies = new Map();
    this.circuitBreakers = new Map();
    this.initStrategies();
  }

  /**
   * Initialize recovery strategies
   */
  initStrategies() {
    // Gateway connection errors
    this.registerStrategy('ECONNREFUSED', async (error, context) => {
      console.log('🔧 Gateway down, waiting 5s and retrying...');
      await this.sleep(5000);
      return { retry: true, fallback: 'local' };
    });

    // Perplexity / provider quota exhausted (NOT a transient rate limit)
    this.registerStrategy('INSUFFICIENT_QUOTA', async (error, context) => {
      // Open a long circuit so we don't hammer the provider on every cron/agent call.
      this.tripCircuitBreaker('INSUFFICIENT_QUOTA', { openMs: 6 * 60 * 60 * 1000 }); // 6h
      console.log('🧾 Quota exhausted (insufficient_quota). Disabling internet provider temporarily and falling back.');
      return { retry: false, fallback: 'alternative-model' };
    });

    // Timeout errors
    this.registerStrategy('ETIMEDOUT', async (error, context) => {
      console.log('⏱️  Timeout, switching to faster model...');
      return { retry: true, fallback: 'fast-model' };
    });

    // Rate limit errors
    this.registerStrategy('RATE_LIMIT', async (error, context) => {
      console.log('⏸️  Rate limited, waiting 10s...');
      await this.sleep(10000);
      return { retry: true, fallback: 'queue' };
    });

    // Ollama errors
    this.registerStrategy('OLLAMA_ERROR', async (error, context) => {
      console.log('🔄 Ollama issue, trying alternative model...');
      return { retry: true, fallback: 'alternative-model' };
    });

    // Markdown errors
    this.registerStrategy('MARKDOWN_ERROR', async (error, context) => {
      console.log('📝 Markdown failed, using plain text...');
      return { retry: true, fallback: 'plain-text' };
    });

    // Anthropic credit errors
    this.registerStrategy('ANTHROPIC_CREDIT', async (error, context) => {
      console.log('💳 Anthropic credit low, switching to Ollama...');
      return { retry: true, fallback: 'force-ollama' };
    });

    // Generic fallback
    this.registerStrategy('DEFAULT', async (error, context) => {
      console.log('⚠️  Unknown error, using safe fallback...');
      return { retry: false, fallback: 'error-response' };
    });
  }

  /**
   * Register recovery strategy
   */
  registerStrategy(errorType, handler) {
    this.recoveryStrategies.set(errorType, handler);
  }

  /**
   * Handle error with recovery
   */
  async handleError(error, context = {}) {
    this.errorCount++;

    // Log error
    await this.logError(error, context);

    // Create internal ticket (not shown to user)
    await ticketSystem.createTicket(error, context);

    // Get error type
    const errorType = this.classifyError(error);

    // Check circuit breaker
    if (this.isCircuitOpen(errorType)) {
      console.log(`🚫 Circuit breaker open for ${errorType}, using fallback immediately`);
      return this.getFallbackResponse(error, context);
    }

    // Get recovery strategy
    const strategy = this.recoveryStrategies.get(errorType) ||
                     this.recoveryStrategies.get('DEFAULT');

    try {
      const result = await strategy(error, context);

      // Record success
      this.recordSuccess(errorType);

      return result;
    } catch (recoveryError) {
      console.error('❌ Recovery failed:', recoveryError.message);
      this.tripCircuitBreaker(errorType);
      return this.getFallbackResponse(error, context);
    }
  }

  /**
   * Classify error type
   */
  classifyError(error) {
    const raw = (error.message || String(error));
    const message = raw.toLowerCase();

    // Perplexity quota exhausted often shows as: code=401, type=insufficient_quota
    if (message.includes('insufficient_quota') || (message.includes('exceeded your current quota') && message.includes('perplexity'))) {
      return 'INSUFFICIENT_QUOTA';
    }

    if (message.includes('econnrefused')) return 'ECONNREFUSED';
    if (message.includes('etimedout')) return 'ETIMEDOUT';
    if (message.includes('rate limit') || message.includes('429') || message.includes('rate_limit')) return 'RATE_LIMIT';

    // Generic "quota" text can be either rate limiting or provider quota. If we got here,
    // prefer RATE_LIMIT unless it matches the more specific Perplexity insufficient_quota above.
    if (message.includes('quota') || message.includes('limit exceeded') || message.includes('key limit exceeded')) return 'RATE_LIMIT';

    if (message.includes('billing') || message.includes('credits') || message.includes('insufficient balance') || message.includes('run out of credits')) return 'ANTHROPIC_CREDIT';
    if (message.includes('ollama')) return 'OLLAMA_ERROR';
    if (message.includes('parse entities') || message.includes('markdown')) return 'MARKDOWN_ERROR';
    if (message.includes('gateway error')) return 'GATEWAY_ERROR';
    if (message.includes('credit balance') || (message.includes('anthropic') && message.includes('credit'))) return 'ANTHROPIC_CREDIT';

    return 'UNKNOWN';
  }

  /**
   * Circuit breaker - prevents cascading failures
   */
  isCircuitOpen(errorType) {
    const breaker = this.circuitBreakers.get(errorType) || { failures: 0, lastFailure: 0, openUntil: 0 };
    const now = Date.now();

    // If explicitly opened until a time, respect it
    if (breaker.openUntil && now < breaker.openUntil) {
      return true;
    }

    // Reset after 60 seconds (unless explicitly opened)
    if (!breaker.openUntil && now - breaker.lastFailure > 60000) {
      this.circuitBreakers.set(errorType, { failures: 0, lastFailure: 0, openUntil: 0 });
      return false;
    }

    // Open circuit if 5+ failures in 60s
    return breaker.failures >= 5;
  }

  /**
   * Trip circuit breaker
   */
  tripCircuitBreaker(errorType, options = {}) {
    const breaker = this.circuitBreakers.get(errorType) || { failures: 0, lastFailure: 0, openUntil: 0 };
    breaker.failures++;
    breaker.lastFailure = Date.now();

    // Optional explicit open duration
    if (options.openMs && Number.isFinite(options.openMs)) {
      breaker.openUntil = Date.now() + options.openMs;
    }

    this.circuitBreakers.set(errorType, breaker);
  }

  /**
   * Record successful recovery
   */
  recordSuccess(errorType) {
    const breaker = this.circuitBreakers.get(errorType);
    if (breaker) {
      breaker.failures = Math.max(0, breaker.failures - 1);
      // If we were explicitly open, a success should close it.
      breaker.openUntil = 0;
      this.circuitBreakers.set(errorType, breaker);
    }
  }

  /**
   * Get fallback response
   */
  getFallbackResponse(error, context) {
    return {
      success: false,
      error: 'Service temporarily unavailable',
      fallback: true,
      content: '⚠️ I encountered an issue but I\'m working on it. Please try again in a moment.',
      recovery: {
        attempted: true,
        type: this.classifyError(error)
      }
    };
  }

  /**
   * Log error
   */
  async logError(error, context) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          type: this.classifyError(error),
          stack: error.stack
        },
        context: context,
        count: this.errorCount
      };

      await fs.appendFile(ERROR_LOG, JSON.stringify(logEntry) + '\n');
    } catch (logError) {
      console.error('Failed to log error:', logError.message);
    }
  }

  /**
   * Get error statistics
   */
  getStats() {
    return {
      totalErrors: this.errorCount,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([type, breaker]) => ({
        type,
        failures: breaker.failures,
        isOpen: this.isCircuitOpen(type),
        openUntil: breaker.openUntil || 0
      }))
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const errorHandler = new ResilientErrorHandler();
