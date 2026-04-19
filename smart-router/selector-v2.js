#!/usr/bin/env node

/**
 * Smart Router V2 - Optimizes for best performance at lowest cost
 * - Analyzes response requirements (speed vs quality)
 * - Chooses optimal model based on task
 * - Has fallback strategies
 * - Learns from performance
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { internetDetector } from '../agents/internet-detector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERFORMANCE_LOG = path.join(__dirname, '../logs/performance.jsonl');

export class SmartRouterV2 {
  constructor() {
    this.models = {
      // CLOUD - FASTEST (1-2 seconds) - PRIMARY MODEL
      'zai/glm-4.7': {
        cost: 0.0001,         // Very cheap
        speed: 'instant',     // 1-2s response
        quality: 'excellent',
        capabilities: ['all', 'chat', 'code', 'complex', 'analysis', 'reasoning'],
        maxTokens: 128000,
        reliability: 0.99,
        apiKey: 'ZAI_API_KEY'
      },

      // CLOUD - Internet Access (2-3 seconds)
      'perplexity/sonar-pro': {
        cost: 0.0005,
        speed: 'instant',     // 2-3s
        quality: 'exceptional',
        capabilities: ['all', 'real-time', 'news', 'search', 'current-events', 'web'],
        maxTokens: 100000,
        reliability: 0.99,
        internet: true,
        apiKey: 'PERPLEXITY_API_KEY'
      },

      // LOCAL FALLBACK - Only if cloud APIs fail (8-30 seconds)
      'ollama/llama3.1:8b': {
        cost: 0,
        speed: 'medium',      // 8-30s (slower than cloud)
        quality: 'good',
        capabilities: ['all', 'chat', 'simple-tasks', 'code', 'complex', 'analysis'],
        maxTokens: 8000,
        reliability: 0.95,
        fallbackOnly: true    // Only use if cloud fails
      },

      // DISABLED - TOO SLOW (can take hours)
      // 'ollama/qwen2.5-coder:7b': {
      //   cost: 0,
      //   speed: 'slow',
      //   quality: 'excellent',
      //   capabilities: ['code', 'technical'],
      //   maxTokens: 4000,
      //   reliability: 0.90
      // },

      // DISABLED - TOO SLOW (can take hours)
      // 'ollama/glm-4.7-flash:latest': {
      //   cost: 0,
      //   speed: 'medium',
      //   quality: 'excellent',
      //   capabilities: ['all', 'complex', 'analysis', 'reasoning', 'chat', 'code'],
      //   maxTokens: 8000,
      //   reliability: 0.95
      // },

      // Cloud - Fast & Expensive
      'anthropic/claude-sonnet-4-6': {
        cost: 0.003,
        speed: 'instant',     // 1-2s
        quality: 'best',
        capabilities: ['all'],
        maxTokens: 100000,
        reliability: 0.99
      },

      // Cloud - Cheap & Fast
      'anthropic/claude-haiku-4.5': {
        cost: 0.0005,
        speed: 'instant',     // <1s
        quality: 'good',
        capabilities: ['chat', 'simple-tasks'],
        maxTokens: 50000,
        reliability: 0.99
      },

      // Internet-Enabled - Perplexity (CRITICAL for real-time queries!)
      'perplexity/sonar': {
        cost: 0.0002,
        speed: 'fast',        // 2-3s
        quality: 'excellent',
        capabilities: ['real-time', 'news', 'search', 'current-events', 'web'],
        maxTokens: 100000,
        reliability: 0.98,
        internet: true        // ⭐ HAS INTERNET ACCESS
      },

      'perplexity/sonar-pro': {
        cost: 0.0005,
        speed: 'medium',      // 3-5s
        quality: 'exceptional',
        capabilities: ['real-time', 'news', 'search', 'current-events', 'web', 'complex-analysis'],
        maxTokens: 100000,
        reliability: 0.99,
        internet: true        // ⭐ HAS INTERNET ACCESS
      }
    };

    this.performanceHistory = [];
  }

  /**
   * Select best model based on requirements
   */
  async selectModel(message, context = {}) {
    // Analyze requirements
    const requirements = this.analyzeRequirements(message, context);

    // ⭐ CRITICAL: Check if internet is needed
    const internetCheck = internetDetector.needsInternet(message);
    if (internetCheck.needed) {
      requirements.needsInternet = true;
      requirements.internetReason = internetCheck.reason;
      console.log(`🌐 Internet required: ${internetCheck.reason}`);
    }

    // Get candidate models
    const candidates = this.getCandidates(requirements);

    // Score and rank
    const scored = this.scoreModels(candidates, requirements);

    // Pick best
    const selected = scored[0];

    // Log decision
    this.logDecision(message, requirements, selected);

    return {
      provider: selected.provider,
      model: selected.model,
      reason: selected.reason,
      expectedSpeed: selected.expectedSpeed,
      cost: selected.cost
    };
  }

  /**
   * Analyze what the task requires
   */
  analyzeRequirements(message, context) {
    const lowerMessage = message.toLowerCase();

    // Determine priority
    const isUrgent = context.urgent || lowerMessage.includes('urgent') || lowerMessage.includes('quickly');
    const isBackground = context.background || context.scheduled;

    // Determine complexity
    const wordCount = message.split(/\s+/).length;
    const hasCode = /```|function|class|import|def |const |let |var /.test(message);
    const isComplex = wordCount > 100 || lowerMessage.includes('explain') || lowerMessage.includes('analyze');
    const isSimple = wordCount < 20 && !hasCode && !isComplex;

    // Determine type
    let taskType = 'general';
    if (hasCode || /code|program|function|debug|implement|create|build|make|develop|write|generate|design/.test(lowerMessage)) {
      taskType = 'code';
    } else if (isComplex || /explain|analyze|compare|evaluate/.test(lowerMessage)) {
      taskType = 'complex';
    } else if (isSimple) {
      taskType = 'simple';
    }

    // Determine response needs
    const needsSpeed = isUrgent || taskType === 'simple';
    const needsQuality = isComplex || taskType === 'code';
    const canBeSlow = isBackground || (!isUrgent && needsQuality);

    return {
      taskType,
      complexity: isSimple ? 'simple' : (isComplex ? 'complex' : 'medium'),
      urgent: isUrgent,
      background: isBackground,
      needsSpeed,
      needsQuality,
      canBeSlow,
      wordCount,
      hasCode
    };
  }

  /**
   * Get candidate models
   */
  getCandidates(requirements) {
    const candidates = [];

    for (const [modelId, config] of Object.entries(this.models)) {
      const [provider, model] = modelId.split('/');

      // ⭐ SKIP ANTHROPIC - Use free local models only (GLM, Qwen, Llama)
      if (provider === 'anthropic') {
        continue; // Skip all Anthropic models
      }

      // ⭐ PRIORITY: Coding tasks override internet requirement
      // If it's a coding task, use coding models even if internet mentioned
      if (requirements.taskType === 'code') {
        // For coding tasks, prefer code-capable models
        if (config.capabilities.includes('code')) {
          candidates.push({ provider, model, config });
        }
        continue; // Skip internet check for coding tasks
      }

      // ⭐ CRITICAL: If internet is needed (and NOT coding), ONLY use internet-capable models
      if (requirements.needsInternet && !config.internet) {
        continue; // Skip non-internet models
      }

      // Check capability match
      let capabilityMatch = false;
      if (requirements.taskType === 'complex' && config.capabilities.includes('complex')) {
        capabilityMatch = true;
      } else if (requirements.taskType === 'simple' && config.capabilities.includes('chat')) {
        capabilityMatch = true;
      } else if (config.capabilities.includes('all')) {
        capabilityMatch = true;
      }

      // If internet needed, accept any internet-capable model regardless of task type
      if (requirements.needsInternet && config.internet) {
        capabilityMatch = true;
      }

      if (capabilityMatch) {
        candidates.push({
          provider,
          model,
          config
        });
      }
    }

    // If internet needed but no internet-capable candidates, log warning
    if (requirements.needsInternet && candidates.length === 0) {
      console.log('⚠️  Internet needed but no internet-capable models available!');
      console.log('   Add PERPLEXITY_API_KEY to .env to enable internet queries');
    }

    return candidates;
  }

  /**
   * Score models based on requirements
   */
  scoreModels(candidates, requirements) {
    const scored = candidates.map(candidate => {
      let score = 0;
      let reason = '';

      const config = candidate.config;

      // SPEED IS CRITICAL - 1 minute SLA requirement
      // ALWAYS prefer instant models (cloud APIs: 1-3s) over slow models
      if (config.speed === 'instant') {
        score += 200; // HUGE bonus for instant (cloud APIs)
        reason = 'instant response meets 1min SLA';
      } else if (config.speed === 'fast') {
        score += 50; // OK for fast
        reason = 'fast enough for SLA';
      } else if (config.speed === 'medium') {
        score -= 50; // Penalize medium speed
        reason = 'slower than ideal';
      } else {
        score -= 200; // HUGE penalty for slow models
        reason = 'too slow for SLA';
      }

      // Fallback models only used as last resort
      if (config.fallbackOnly) {
        score -= 500; // Massive penalty - only use if nothing else works
        reason = 'fallback only - use cloud APIs first';
      }

      // Cost scoring (cheap cloud APIs preferred over free slow local)
      if (config.cost === 0) {
        score += 30; // Small bonus for free
      } else if (config.cost < 0.001) {
        score += 50; // Prefer cheap cloud APIs (fast + cheap)
        reason = reason ? `${reason}, cheap cloud API` : 'cheap and fast';
      }

      // Quality scoring
      if (requirements.needsQuality) {
        if (config.quality === 'excellent' || config.quality === 'best') {
          score += 30;
          reason = reason ? `${reason}, high quality` : 'high quality output';
        }
      }

      // Reliability scoring
      score += config.reliability * 10;

      // Task type matching
      if (requirements.taskType === 'code' && config.capabilities.includes('code')) {
        score += 40;
        reason = 'specialized for code tasks';
      } else if (requirements.taskType === 'complex' && config.capabilities.includes('complex')) {
        score += 35;
        reason = 'optimized for complex reasoning';
      } else if (requirements.taskType === 'simple' && config.capabilities.includes('chat')) {
        score += 25;
        reason = 'perfect for simple queries';
      }

      // Urgent override - use cloud if urgent and budget allows
      if (requirements.urgent && config.speed === 'instant') {
        score += 100;
        reason = 'urgent - using fastest available';
      }

      return {
        ...candidate,
        score,
        reason,
        expectedSpeed: config.speed,
        cost: config.cost
      };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Get fallback model
   */
  getFallback(primaryModel, reason) {
    console.log(`⚠️  Primary model ${primaryModel} failed: ${reason}`);
    console.log('🔄 Selecting fallback...');

    // Always fallback to most reliable local model
    return {
      provider: 'ollama',
      model: 'llama3.1:8b',
      reason: 'fallback to reliable local model',
      expectedSpeed: 'fast',
      cost: 0
    };
  }

  /**
   * Log decision for learning
   */
  async logDecision(message, requirements, selected) {
    const entry = {
      timestamp: new Date().toISOString(),
      message: message.substring(0, 100),
      requirements,
      selected: {
        provider: selected.provider,
        model: selected.model,
        score: selected.score,
        reason: selected.reason
      }
    };

    try {
      await fs.appendFile(PERFORMANCE_LOG, JSON.stringify(entry) + '\n');
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Record actual performance
   */
  async recordPerformance(modelId, latency, success, cost) {
    this.performanceHistory.push({
      timestamp: Date.now(),
      modelId,
      latency,
      success,
      cost
    });

    // Keep last 1000
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Get performance stats
   */
  getPerformanceStats(modelId) {
    const modelHistory = this.performanceHistory.filter(h => h.modelId === modelId);

    if (modelHistory.length === 0) {
      return null;
    }

    const avgLatency = modelHistory.reduce((sum, h) => sum + h.latency, 0) / modelHistory.length;
    const successRate = modelHistory.filter(h => h.success).length / modelHistory.length;
    const totalCost = modelHistory.reduce((sum, h) => sum + h.cost, 0);

    return {
      requests: modelHistory.length,
      avgLatency: Math.round(avgLatency),
      successRate: (successRate * 100).toFixed(1),
      totalCost: totalCost.toFixed(6)
    };
  }
}

export const smartRouterV2 = new SmartRouterV2();
