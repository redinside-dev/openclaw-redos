#!/usr/bin/env node

/**
 * Track Router - Routes messages to Fast Track or Orchestrated Track
 * Based on HATAKE's structured brief
 */

import { hatakeParser } from '../agents/hatake-parser.js';
import { resilientHandler } from './resilient-handler.js';
import { edRedOrchestrator } from '../agents/ed-red-orchestrator.js';
import { agentOrchestrator } from '../orchestration/agent-orchestrator.js';

/**
 * Model Tier Classifier — assigns lightweight/standard/heavy/local based on
 * payload model_tier override, agentId, prompt length, and keywords.
 * Reads routing-profiles.json tier_classifier rules.
 */
const LIGHTWEIGHT_KEYWORDS = [
  'ping', 'alive', 'status', 'heartbeat', 'warmup', 'check if', 'is it running',
  'health check', 'ack', 'acknowledge', 'ok?', 'still running', 'uptime', 'dispatcher',
  'warmup marker', 'pulse'
];
const HEAVY_KEYWORDS = [
  'l4 approval', 'l5 approval', 'critical', 'irreversible', 'architecture decision',
  'security review', 'comprehensive audit', 'full analysis', 'strategy document'
];

function classifyModelTier(agentId, message, context = {}) {
  // 1. Explicit override from payload takes priority
  if (context.model_tier) {
    return context.model_tier;
  }

  // 2. HATAKE always uses local
  if (agentId === 'hatake') {
    return 'local';
  }

  const msgLower = (message || '').toLowerCase();
  const msgLen = (message || '').length;

  // 3. Short health/status queries → lightweight
  if (msgLen < 300 && LIGHTWEIGHT_KEYWORDS.some(kw => msgLower.includes(kw))) {
    return 'lightweight';
  }

  // 4. Heavy keywords → heavy
  if (HEAVY_KEYWORDS.some(kw => msgLower.includes(kw))) {
    return 'heavy';
  }

  // 5. Very long prompts → heavy (need full context window)
  if (msgLen > 4000) {
    return 'heavy';
  }

  // 6. Default → standard
  return 'standard';
}

// Model tier → 9Router model string mapping
const TIER_TO_MODEL = {
  lightweight: '9router/free-unlimited',  // HATAKE routes to Haiku internally
  standard:    '9router/free-unlimited',  // Standard: Sonnet via 9Router
  heavy:       '9router/free-unlimited',  // Heavy: Opus via 9Router
  local:       'ollama/qwen2.5-coder:7b'
};

export class TrackRouter {
  constructor() {
    this.fastTrackHandler = resilientHandler;
    this.orchestratedHandler = edRedOrchestrator; // ED/RED Orchestrator
    this.stats = {
      fast_track: 0,
      orchestrated_track: 0,
      total: 0
    };
  }

  /**
   * Main entry point - route message through appropriate track
   */
  async route(agentId, message, context = {}) {
    this.stats.total++;

    // Classify model tier (lightweight / standard / heavy / local)
    const tier = classifyModelTier(agentId, message, context);
    context.model_tier = tier;
    if (tier === 'local') {
      context.forceModel = TIER_TO_MODEL.local;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📨 NEW REQUEST`);
    console.log(`Agent: ${agentId}`);
    console.log(`Tier: ${tier}`);
    console.log(`Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    console.log(`${'='.repeat(60)}`);

    // Step 1: Parse message with HATAKE
    const brief = await hatakeParser.parse(message, context);

    // Step 2: Check if request requires specialized agent delegation
    const intent = await agentOrchestrator.analyzeIntent(message);

    if (intent.requiresDelegation) {
      console.log(`🎯 DELEGATION to ${intent.primaryAgent} - will use ORCHESTRATED TRACK`);

      // Force orchestrated track for delegated requests
      brief.track = 'orchestrated';
      brief.suggested_agents = [intent.primaryAgent];
      if (intent.supportingAgents && intent.supportingAgents.length > 0) {
        brief.suggested_agents.push(...intent.supportingAgents);
      }

      // Update intent in brief
      brief.intent.type = this.mapAgentToIntentType(intent.primaryAgent);
      brief.original_message = message;
    }

    // Step 3: Route based on track (delegation forces orchestrated track)
    let result;

    if (brief.track === 'fast') {
      console.log(`🚀 FAST TRACK selected`);
      this.stats.fast_track++;
      result = await this.executeFastTrack(agentId, message, brief, context);
    } else {
      console.log(`🎯 ORCHESTRATED TRACK selected`);
      this.stats.orchestrated_track++;

      // Check if orchestrated handler available
      if (this.orchestratedHandler) {
        result = await this.executeOrchestratedTrack(agentId, message, brief, context);
      } else {
        console.log(`⚠️  Orchestrated track not yet implemented, falling back to fast track`);
        this.stats.fast_track++;
        result = await this.executeFastTrack(agentId, message, brief, context);
      }
    }

    // Step 3: Add brief metadata to result
    result.brief = {
      brief_id: brief.brief_id,
      intent: brief.intent,
      track: brief.track,
      complexity: brief.complexity,
      agents_used: brief.suggested_agents
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ REQUEST COMPLETE`);
    console.log(`Brief: ${brief.brief_id}`);
    console.log(`Track: ${brief.track}`);
    console.log(`Time: ${result.latency}ms`);
    console.log(`Cost: $${result.cost.toFixed(6)}`);
    console.log(`${'='.repeat(60)}\n`);

    return result;
  }

  /**
   * Fast Track - Direct to model (current resilient handler)
   */
  async executeFastTrack(agentId, message, brief, context) {
    console.log(`\n┌─ FAST TRACK EXECUTION ─────────────────────────`);
    console.log(`│ Direct routing to model`);
    console.log(`│ Expected: 2-3 seconds`);
    console.log(`└────────────────────────────────────────────────`);

    // Use existing resilient handler
    const result = await this.fastTrackHandler.handleMessage(agentId, message, {
      ...context,
      brief_id: brief.brief_id,
      track: 'fast'
    });

    return result;
  }

  /**
   * Orchestrated Track - Multi-agent coordination via ED/RED
   */
  async executeOrchestratedTrack(agentId, message, brief, context) {
    console.log(`\n┌─ ORCHESTRATED TRACK EXECUTION ─────────────────`);
    console.log(`│ Multi-agent coordination via ED/RED`);
    console.log(`│ Agents: ${brief.suggested_agents.join(', ')}`);
    console.log(`│ Expected: 3-5 minutes`);
    console.log(`└────────────────────────────────────────────────`);

    const startTime = Date.now();

    try {
      // Use ED/RED orchestrator for complex multi-agent coordination
      const result = await this.orchestratedHandler.orchestrate(brief, {
        ...context,
        agentId,
        message
      });

      // Add metadata expected by gateway
      result.latency = Date.now() - startTime;
      result.brief_id = brief.brief_id;

      return result;
    } catch (error) {
      console.error(`❌ Orchestration failed:`, error.message);

      // Fallback to fast track on orchestration failure
      console.log(`⚠️  Falling back to fast track...`);
      return await this.executeFastTrack(agentId, message, brief, context);
    }
  }

  /**
   * Map agent ID to intent type for orchestrator
   */
  mapAgentToIntentType(agentId) {
    const mapping = {
      'engineering': 'code_generation',
      'research': 'research',
      'devops': 'validation',
      'finance': 'analysis',
      'infosec': 'security_check'
    };

    return mapping[agentId.toLowerCase()] || 'general_query';
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      ...this.stats,
      fast_track_percentage: this.stats.total > 0
        ? ((this.stats.fast_track / this.stats.total) * 100).toFixed(1)
        : 0,
      orchestrated_percentage: this.stats.total > 0
        ? ((this.stats.orchestrated_track / this.stats.total) * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      fast_track: 0,
      orchestrated_track: 0,
      total: 0
    };
  }
}

// Export singleton
export const trackRouter = new TrackRouter();
