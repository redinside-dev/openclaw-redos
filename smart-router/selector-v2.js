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
      // Fast & Free - Local
      'ollama/llama3.1:8b': {
        cost: 0,
        speed: 'fast',        // 2-3s
        quality: 'good',
        capabilities: ['chat', 'simple-tasks'],
        maxTokens: 2000,
        reliability: 0.95
      },

      // Specialized - Local
      'ollama/qwen2.5-coder:7b': {
        cost: 0,
        speed: 'slow',        // 3-4min
        quality: 'excellent',
        capabilities: ['code', 'technical'],
        maxTokens: 4000,
        reliability: 0.90
      },

      // Powerful - Local
      'ollama/glm-4.7-flash:latest': {
        cost: 0,
        speed: 'very-slow',   // 5-6min
        quality: 'excellent',
        capabilities: ['complex', 'analysis', 'reasoning'],
        maxTokens: 8000,
        reliability: 0.85
      },

      // Cloud - Fast & Expensive
      'anthropic/claude-sonnet-4.5': {
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
    if (hasCode || /code|program|function|debug|implement/.test(lowerMessage)) {
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

      // ⭐ CRITICAL: If internet is needed, ONLY use internet-capable models
      if (requirements.needsInternet && !config.internet) {
        continue; // Skip non-internet models
      }

      // Check capability match
      let capabilityMatch = false;
      if (requirements.taskType === 'code' && config.capabilities.includes('code')) {
        capabilityMatch = true;
      } else if (requirements.taskType === 'complex' && config.capabilities.includes('complex')) {
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

      // Speed scoring
      if (requirements.needsSpeed) {
        if (config.speed === 'instant') {
          score += 50;
          reason = 'urgent task needs fast response';
        } else if (config.speed === 'fast') {
          score += 30;
          reason = 'fast local model';
        }
      } else if (requirements.canBeSlow) {
        // Don't penalize slow models for background tasks
        score += 20;
        reason = 'background task can use powerful model';
      }

      // Cost scoring (HEAVILY prefer free unless urgent)
      if (config.cost === 0) {
        score += 100; // Massive bonus for free models
        reason = reason ? `${reason}, free` : 'free local model';
      } else if (config.cost < 0.001) {
        score += 10; // Small bonus for cheap
        // Only use paid if explicitly urgent
        if (!requirements.urgent) {
          score -= 50; // Penalty for paid models when not urgent
        }
      } else {
        // Expensive models
        if (!requirements.urgent) {
          score -= 100; // Big penalty if not urgent
        }
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
