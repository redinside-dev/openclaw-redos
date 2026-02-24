#!/usr/bin/env node

/**
 * Resilient Handler - Bulletproof message handling with error recovery
 * Never crashes, always finds a way to respond
 */

import { TaskAnalyzer } from '../smart-router/analyzer.js';
import { smartRouterV2 } from '../smart-router/selector-v2.js';
import { errorHandler } from '../resilience/error-handler.js';
import { costMonitor } from '../cost-monitor/monitor.js';
import ToolCallMiddleware from './tool-call-middleware.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

export class ResilientHandler {
  constructor() {
    this.analyzer = new TaskAnalyzer();
    this.router = smartRouterV2;
    this.maxRetries = 3;
  }

  /**
   * Handle message with full resilience
   */
  async handleMessage(agentId, message, context = {}) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📨 Message to ${agentId}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

    let attempt = 0;
    let lastError = null;

    while (attempt < this.maxRetries) {
      attempt++;

      try {
        return await this.attemptHandling(agentId, message, context, attempt);
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;

        // Get recovery strategy
        const recovery = await errorHandler.handleError(error, {
          agentId,
          message,
          attempt
        });

        if (!recovery.retry && attempt >= this.maxRetries) {
          // Return fallback response
          return this.getFallbackResponse(message, error);
        }

        // Apply fallback strategy
        if (recovery.fallback === 'fast-model') {
          context.forceModel = 'ollama/llama3.1:8b';
        } else if (recovery.fallback === 'alternative-model') {
          context.forceModel = this.getAlternativeModel();
        } else if (recovery.fallback === 'force-ollama') {
          context.forceModel = 'ollama/llama3.1:8b';
          console.log('💰 Forcing free Ollama model due to budget/credit issue');
        }

        // Wait before retry
        await this.sleep(2000 * attempt);
      }
    }

    // All retries failed
    return this.getFallbackResponse(message, lastError);
  }

  /**
   * Attempt to handle message
   */
  async attemptHandling(agentId, message, context, attempt) {
    // 1. Analyze task (quick, no external calls)
    const requirements = this.router.analyzeRequirements(message, context);

    console.log(`📊 Requirements: ${requirements.taskType}, ${requirements.complexity}, urgent=${requirements.urgent}`);

    // 2. Select optimal model
    const selectedModel = context.forceModel
      ? this.parseModel(context.forceModel)
      : await this.router.selectModel(message, context);

    console.log(`🎯 Model: ${selectedModel.provider}/${selectedModel.model}`);
    console.log(`   Reason: ${selectedModel.reason}`);
    console.log(`   Expected: ${selectedModel.expectedSpeed}, $${selectedModel.cost}`);

    // 3. Check budget (if paid model)
    if (selectedModel.cost > 0) {
      const budgetRemaining = costMonitor.getBudgetRemaining();
      if (budgetRemaining < selectedModel.cost) {
        console.log('⚠️  Budget limit reached, forcing free model');
        selectedModel.provider = 'ollama';
        selectedModel.model = 'llama3.1:8b';
        selectedModel.cost = 0;
      }
    }

    // 4. Call OpenClaw
    const startTime = Date.now();
    const response = await this.callOpenClaw(agentId, message, selectedModel);
    const latency = Date.now() - startTime;

    console.log(`✅ Response received in ${latency}ms`);

    // 5. Track cost and performance
    const estimatedTokens = {
      input: Math.ceil(message.length / 4),
      output: Math.ceil(response.length / 4)
    };

    await costMonitor.recordRequest(
      agentId,
      `${selectedModel.provider}/${selectedModel.model}`,
      estimatedTokens,
      selectedModel.cost
    );

    await this.router.recordPerformance(
      `${selectedModel.provider}/${selectedModel.model}`,
      latency,
      true,
      selectedModel.cost
    );

    // 6. Build response
    const responseObj = {
      content: response,
      model: {
        provider: selectedModel.provider,
        model: selectedModel.model,
        reason: selectedModel.reason
      },
      latency: latency,
      cost: selectedModel.cost,
      tokens: estimatedTokens,
      attempt: attempt
    };

    // 7. Apply tool-call middleware (validate + normalize message/write tool calls)
    const validatedResponse = ToolCallMiddleware.wrapAgentResponse(responseObj);
    
    if (validatedResponse.validationError) {
      console.warn(`[ResilientHandler] Tool validation error: ${validatedResponse.validationError}`);
    }

    return validatedResponse;
  }

  /**
   * Call model (Ollama, Anthropic, or Perplexity)
   */
  async callOpenClaw(agentId, message, model) {
    if (model.provider === 'ollama') {
      return await this.callOllama(model.model, message);
    } else if (model.provider === 'anthropic') {
      return await this.callAnthropic(model.model, message);
    } else if (model.provider === 'perplexity') {
      return await this.callPerplexity(model.model, message);
    } else if (model.provider === 'zai') {
      return await this.callZhipu(model.model, message);
    } else {
      throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  /**
   * Call Ollama API directly
   */
  async callOllama(modelName, message) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: message,
          stream: false
        }),
        timeout: 600000 // 10 minute timeout
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.response) {
        throw new Error('Empty response from Ollama');
      }

      return data.response;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama not running - start with: ollama serve');
      }
      throw error;
    }
  }

  /**
   * Call Anthropic API
   */
  async callAnthropic(modelName, message) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set - cannot use cloud models');
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 4096,
          messages: [{ role: 'user', content: message }]
        }),
        timeout: 60000 // 1 minute timeout for cloud
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic error: ${error}`);
      }

      const data = await response.json();

      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response from Anthropic');
      }

      return data.content[0].text;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Call Perplexity API (internet-enabled)
   */
  async callPerplexity(modelName, message) {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY not set - cannot use internet-enabled models');
    }

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: message }],
          max_tokens: 4096,
          temperature: 0.7
        }),
        timeout: 60000 // 1 minute timeout
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Perplexity error: ${error}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Invalid response from Perplexity');
      }

      return data.choices[0].message.content;
    } catch (error) {
      throw error;
    }
  }

  async callZhipu(modelName, message) {
    const apiKey = process.env.ZAI_API_KEY;

    if (!apiKey) {
      throw new Error('ZAI_API_KEY not set - cannot use Zhipu AI / GLM-4');
    }

    try {
      const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: message }],
          max_tokens: 4096,
          temperature: 0.7
        }),
        timeout: 60000 // 1 minute timeout
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Zhipu AI error: ${error}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Invalid response from Zhipu AI');
      }

      return data.choices[0].message.content;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get alternative model when primary fails
   */
  getAlternativeModel() {
    const alternatives = [
      'ollama/llama3.1:8b',
      'ollama/qwen2.5-coder:7b',
      'ollama/glm-4.7-flash:latest'
    ];

    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  /**
   * Parse model string
   */
  parseModel(modelString) {
    const [provider, model] = modelString.split('/');
    return {
      provider,
      model,
      reason: 'forced model',
      cost: provider === 'ollama' ? 0 : 0.003
    };
  }

  /**
   * Get fallback response when all else fails
   */
  getFallbackResponse(message, error) {
    console.log('🆘 Returning fallback response');

    // Generate a helpful fallback based on the message
    let fallbackContent = '';

    if (message.toLowerCase().includes('help')) {
      fallbackContent = 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment, or contact support if the issue persists.';
    } else if (message.length < 50) {
      fallbackContent = `I received your message "${message.substring(0, 30)}..." but I\'m currently unable to process it due to a temporary issue. Please try again shortly.`;
    } else {
      fallbackContent = 'I apologize, but I\'m experiencing technical difficulties processing your request. Our system is working to resolve this automatically. Please try again in a few moments.';
    }

    return {
      content: fallbackContent,
      model: {
        provider: 'fallback',
        model: 'error-handler',
        reason: 'all attempts failed'
      },
      latency: 0,
      cost: 0,
      tokens: { input: 0, output: 0 },
      error: error?.message || 'Unknown error',
      fallback: true
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get handler statistics
   */
  getStats() {
    return {
      errorStats: errorHandler.getStats(),
      performanceStats: this.router.performanceHistory
        .slice(-100)
        .reduce((acc, h) => {
          if (!acc[h.modelId]) {
            acc[h.modelId] = { requests: 0, totalLatency: 0, successes: 0 };
          }
          acc[h.modelId].requests++;
          acc[h.modelId].totalLatency += h.latency;
          if (h.success) acc[h.modelId].successes++;
          return acc;
        }, {})
    };
  }
}

export const resilientHandler = new ResilientHandler();
