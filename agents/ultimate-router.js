#!/usr/bin/env node

/**
 * ULTIMATE SMART ROUTER
 * Routes to the BEST tool/model based on query type
 *
 * Arsenal:
 * - OpenCodex GPT-5.2 (high performance)
 * - Claude Code (code quality)
 * - Perplexity (real-time)
 * - GLM (general)
 * - Ollama (local/free)
 * - MCP Exa (web search)
 * - Vector DB (memory)
 */

import { internetDetector } from './internet-detector.js';

export class UltimateRouter {
  constructor() {
    this.tools = this.initTools();
    this.models = this.initModels();
    this.routingRules = this.initRoutingRules();
  }

  /**
   * Initialize all available tools
   */
  initTools() {
    return {
      'mcp-exa': {
        type: 'web-search',
        capabilities: ['search', 'web', 'find', 'lookup'],
        cost: 0.0001,
        speed: 'fast',
        internet: true,
        priority: 'high'
      },
      'vector-db': {
        type: 'memory',
        capabilities: ['remember', 'recall', 'history', 'context'],
        cost: 0,
        speed: 'instant',
        internet: false,
        priority: 'always' // Always check memory first!
      }
    };
  }

  /**
   * Initialize all available models
   */
  initModels() {
    return {
      // Tier 1: High Performance (for complex/critical tasks)
      'opencodex/gpt-5.2': {
        tier: 'premium',
        cost: 0.005,
        speed: 'instant',
        quality: 'best',
        capabilities: ['complex', 'reasoning', 'analysis', 'architecture', 'critical'],
        internet: false,
        useFor: ['complex code', 'architecture', 'critical decisions', 'high stakes']
      },

      'claude/claude-code': {
        tier: 'premium',
        cost: 0.003,
        speed: 'instant',
        quality: 'best',
        capabilities: ['code', 'refactoring', 'code-review', 'debugging'],
        internet: false,
        useFor: ['code quality', 'refactoring', 'code review', 'best practices']
      },

      // Tier 2: Real-Time & Internet
      'perplexity/llama-3.1-sonar-small-128k-online': {
        tier: 'internet',
        cost: 0.0002,
        speed: 'fast',
        quality: 'excellent',
        capabilities: ['real-time', 'news', 'current', 'live', 'search'],
        internet: true,
        useFor: ['news', 'real-time data', 'current events', 'live info']
      },

      // Tier 3: General Purpose
      'glm/glm-4.7-flash': {
        tier: 'standard',
        cost: 0,
        speed: 'fast',
        quality: 'excellent',
        capabilities: ['general', 'chat', 'tasks', 'analysis'],
        internet: false,
        useFor: ['general queries', 'analysis', 'reasoning']
      },

      // Tier 4: Specialized Local
      'ollama/qwen2.5-coder:7b': {
        tier: 'free',
        cost: 0,
        speed: 'slow',
        quality: 'good',
        capabilities: ['code', 'simple-code', 'scripts'],
        internet: false,
        useFor: ['simple code', 'scripts', 'quick fixes']
      },

      'ollama/llama3.1:8b': {
        tier: 'free',
        cost: 0,
        speed: 'fast',
        quality: 'good',
        capabilities: ['chat', 'simple'],
        internet: false,
        useFor: ['simple queries', 'basic chat', 'calculations']
      }
    };
  }

  /**
   * Initialize intelligent routing rules
   */
  initRoutingRules() {
    return {
      // ALWAYS check memory first
      memory: {
        priority: 1,
        check: (message) => true, // Always check
        tool: 'vector-db',
        reason: 'Check long-term memory for context'
      },

      // High-performance code tasks
      complexCode: {
        priority: 2,
        check: (message) => {
          const keywords = ['architecture', 'design system', 'refactor large', 'optimize performance', 'critical bug', 'production issue'];
          return keywords.some(k => message.toLowerCase().includes(k));
        },
        model: 'opencodex/gpt-5.2',
        reason: 'Complex/critical task needs best model'
      },

      // Code quality & review
      codeQuality: {
        priority: 3,
        check: (message) => {
          const keywords = ['code review', 'refactor', 'improve code', 'best practices', 'clean code', 'review my'];
          return keywords.some(k => message.toLowerCase().includes(k));
        },
        model: 'claude/claude-code',
        reason: 'Code quality needs Claude Code'
      },

      // Real-time & current information
      realTime: {
        priority: 4,
        check: (message) => {
          const internetCheck = internetDetector.needsInternet(message);
          return internetCheck.needed && internetCheck.confidence === 'high';
        },
        model: 'perplexity/llama-3.1-sonar-small-128k-online',
        reason: 'Real-time data needs internet-enabled model'
      },

      // Web search
      webSearch: {
        priority: 5,
        check: (message) => {
          const searchKeywords = ['search for', 'find information', 'look up', 'search the web', 'google'];
          return searchKeywords.some(k => message.toLowerCase().includes(k));
        },
        tool: 'mcp-exa',
        reason: 'Web search best handled by MCP Exa'
      },

      // General purpose
      general: {
        priority: 6,
        check: (message) => {
          // GLM for general queries that aren't simple
          const wordCount = message.split(' ').length;
          return wordCount > 10 && wordCount < 100;
        },
        model: 'glm/glm-4.7-flash',
        reason: 'General task, GLM is fast and capable'
      },

      // Simple code
      simpleCode: {
        priority: 7,
        check: (message) => {
          const codeKeywords = ['write', 'create', 'generate', 'code', 'function', 'script'];
          const isSimple = message.split(' ').length < 20;
          return codeKeywords.some(k => message.toLowerCase().includes(k)) && isSimple;
        },
        model: 'ollama/qwen2.5-coder:7b',
        reason: 'Simple code, free local model'
      },

      // Simple queries (fallback)
      simple: {
        priority: 8,
        check: (message) => true, // Catch all
        model: 'ollama/llama3.1:8b',
        reason: 'Simple query, use free local model'
      }
    };
  }

  /**
   * ULTIMATE ROUTING DECISION
   * Returns: { type: 'tool'|'model', name: string, reason: string, metadata: {} }
   */
  async route(message, context = {}) {
    console.log('\n🎯 ULTIMATE ROUTER: Analyzing query...');

    const decisions = [];

    // Step 1: ALWAYS check memory first
    decisions.push({
      priority: 0,
      type: 'tool',
      name: 'vector-db',
      reason: 'Check memory for relevant context',
      metadata: {
        action: 'retrieve-context',
        message: message
      }
    });

    // Step 2: Apply routing rules in priority order
    for (const [ruleName, rule] of Object.entries(this.routingRules)) {
      if (rule.check(message)) {
        console.log(`   ✓ Matched rule: ${ruleName}`);

        if (rule.tool) {
          decisions.push({
            priority: rule.priority,
            type: 'tool',
            name: rule.tool,
            reason: rule.reason,
            metadata: this.tools[rule.tool]
          });
        }

        if (rule.model) {
          decisions.push({
            priority: rule.priority,
            type: 'model',
            name: rule.model,
            reason: rule.reason,
            metadata: this.models[rule.model]
          });
        }

        // Take first matching model rule (highest priority)
        if (rule.model) break;
      }
    }

    // Step 3: Sort by priority and return primary decision
    decisions.sort((a, b) => a.priority - b.priority);

    const primaryDecision = decisions.find(d => d.type === 'model') || decisions[decisions.length - 1];
    const memoryCheck = decisions.find(d => d.name === 'vector-db');
    const toolsNeeded = decisions.filter(d => d.type === 'tool');

    console.log(`\n📊 Routing Decision:`);
    console.log(`   Primary: ${primaryDecision.name}`);
    console.log(`   Reason: ${primaryDecision.reason}`);
    if (toolsNeeded.length > 0) {
      console.log(`   Tools: ${toolsNeeded.map(t => t.name).join(', ')}`);
    }
    console.log('');

    return {
      primary: primaryDecision,
      tools: toolsNeeded,
      memory: memoryCheck,
      allOptions: decisions
    };
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      tools: Object.keys(this.tools).length,
      models: Object.keys(this.models).length,
      rules: Object.keys(this.routingRules).length
    };
  }

  /**
   * Explain routing decision (for learning/debugging)
   */
  explainDecision(message, decision) {
    return {
      query: message,
      selected: decision.primary.name,
      reasoning: decision.primary.reason,
      cost: decision.primary.metadata.cost || 0,
      speed: decision.primary.metadata.speed,
      quality: decision.primary.metadata.quality,
      tools_used: decision.tools.map(t => t.name),
      alternatives: decision.allOptions
        .filter(d => d.type === 'model' && d.name !== decision.primary.name)
        .map(d => ({ model: d.name, reason: d.reason }))
    };
  }
}

// Export singleton
export const ultimateRouter = new UltimateRouter();
