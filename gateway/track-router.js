#!/usr/bin/env node

/**
 * Track Router - Routes messages to Fast Track or Orchestrated Track
 * Based on HATAKE's structured brief
 */

import { hatakeParser } from '../agents/hatake-parser.js';
import { resilientHandler } from './resilient-handler.js';
import { edRedOrchestrator } from '../agents/ed-red-orchestrator.js';

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

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📨 NEW REQUEST`);
    console.log(`Agent: ${agentId}`);
    console.log(`Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    console.log(`${'='.repeat(60)}`);

    // Step 1: HATAKE parses message
    const brief = await hatakeParser.parse(message, context);

    // Step 2: Route based on track
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
