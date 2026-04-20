/**
 * policy-gate.js — Lightweight L0–L5 policy gate for OpenClaw tool calls
 *
 * Classifies tool calls by risk tier and enforces the maker-checker policy.
 * Rules loaded from tier-rules.json in this directory.
 *
 * Usage (from gateway wrapper or agent hook):
 *   const { classify, enforce } = require('./policy-gate');
 *   const tier = classify('exec', { command: 'git push origin main' }, 'eng');
 *   const decision = enforce(tier, { agentId: 'eng', tool: 'exec' });
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RULES_PATH = path.join(__dirname, 'tier-rules.json');
let TIER_RULES = null;

function loadRules() {
  if (!TIER_RULES) {
    TIER_RULES = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
  }
  return TIER_RULES;
}

/**
 * Classify a tool call into a risk tier (0–5).
 *
 * @param {string} toolName  - The tool being called (e.g. 'exec', 'write', 'message')
 * @param {object} params    - Tool parameters (e.g. { command: 'git push ...' })
 * @param {string} agentId   - The agent making the call (e.g. 'eng', 'ops')
 * @returns {number} tier    - Risk tier 0–5
 */
function classify(toolName, params, agentId) {
  const rules = loadRules();
  const paramsStr = JSON.stringify(params);

  // Check deny patterns first — these hard-fail before any tier check
  const HARD_DENY = [
    /rm -rf \//,
    /rm -rf ~/,
    /mkfs\s+\/dev\//,
    /curl .* \| (sh|bash|zsh)/,
    /wget .* \| (sh|bash|zsh)/,
  ];

  if (toolName === 'exec') {
    const cmd = params.command || params.cmd || paramsStr;
    for (const pattern of HARD_DENY) {
      if (pattern.test(cmd)) {
        return -1; // Hard deny — do not execute under any circumstance
      }
    }
  }

  // Match rules in order — first match wins
  for (const rule of rules) {
    if (rule._comment) continue;

    // Agent match
    if (rule.agent && rule.agent !== '*' && rule.agent !== agentId) continue;

    // Tool match
    if (rule.tool && rule.tool !== '*' && rule.tool !== toolName) continue;

    // Pattern match (applied to JSON-stringified params)
    if (rule.pattern) {
      try {
        const re = new RegExp(rule.pattern);
        const target = toolName === 'exec'
          ? (params.command || params.cmd || paramsStr)
          : paramsStr;
        if (!re.test(target)) continue;
      } catch {
        continue; // Invalid regex — skip rule
      }
    }

    return rule.tier;
  }

  // Default: L2 for eng, L3 for ops, L2 for everything else
  if (agentId === 'ops') return 3;
  return 2;
}

/**
 * Enforce the tier policy — returns the action to take.
 *
 * @param {number} tier      - Risk tier from classify()
 * @param {object} context   - { agentId, tool, action? }
 * @returns {object} decision - { action, timeout?, log }
 */
function enforce(tier, context) {
  if (tier === -1) {
    return {
      action: 'HARD_DENY',
      reason: 'Matched hard-deny pattern — blocked unconditionally',
      log: true,
    };
  }

  if (tier <= 2) {
    return {
      action: 'ALLOW',
      tier,
      log: true,
    };
  }

  if (tier === 3) {
    return {
      action: 'INFOSEC_REVIEW',
      tier,
      timeout: 120,
      timeoutBehavior: 'auto_deny',
      log: true,
      instructions: 'sessions_send to agent:infosec:main with MAKER-CHECKER L3 REVIEW message. Wait up to 120s.',
    };
  }

  if (tier === 4) {
    return {
      action: 'TELEGRAM_APPROVAL',
      tier,
      timeout: 600,
      timeoutBehavior: 'hold_at_canary',
      gracePeriodSec: 0,
      log: true,
      instructions: 'Send L4 Telegram approval message to 1012034994. See telegram-approvals/SKILL.md.',
    };
  }

  if (tier >= 5) {
    return {
      action: 'TELEGRAM_APPROVAL',
      tier: 5,
      timeout: 1800,
      timeoutBehavior: 'auto_cancel',
      gracePeriodSec: 120, // 2-minute wait after approval before execution
      log: true,
      instructions: 'Send L5 Telegram approval message to 1012034994. See telegram-approvals/SKILL.md. Wait 2min after approval.',
    };
  }

  // Fallback
  return { action: 'ALLOW', tier, log: true };
}

/**
 * Format an audit log entry for append to workspace/logs/audit.jsonl
 */
function auditEntry(toolName, params, agentId, tier, decision) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    agent: agentId,
    tool: toolName,
    tier,
    action: decision.action,
    command: toolName === 'exec' ? (params.command || params.cmd) : undefined,
  });
}

module.exports = { classify, enforce, auditEntry, loadRules };
