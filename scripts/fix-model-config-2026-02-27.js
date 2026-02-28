#!/usr/bin/env node
/**
 * fix-model-config-2026-02-27.js
 *
 * What this does:
 *  1. Sets ollama/llama3.1:8b as PRIMARY for ALL agents so cron jobs that
 *     explicitly request ollama can run (OpenClaw only allows explicit model
 *     override when the model is the agent primary).
 *  2. Builds a clean fallback chain for every agent:
 *       ollama/llama3.1:8b  →  9router/free-unlimited  →  openai-codex/gpt-5.2  →  zai/glm-4.7-flashx
 *  3. Removes 9router/openrouter/auto and 9router/always-on-premium from ALL
 *     fallback chains — openrouter/auto consumed OpenRouter credits (Feb-25
 *     incident); always-on-premium is premium-only and should be triggered
 *     deliberately, not used as a generic fallback.
 *  4. hatake keeps qwen2.5-coder:7b as primary (it's the intent parser that
 *     needs the coder model) but gets the same fallback chain.
 *
 * Run from repo root:
 *   node scripts/fix-model-config-2026-02-27.js
 * Then:
 *   openclaw doctor
 *   bash scripts/redos-restart.sh
 */

import fs from 'fs';
import path from 'path';

const OPENCLAW_JSON = process.env.OPENCLAW_JSON_PATH ||
  path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');

// Standard fallback chain — free first, premium as last resort.
// 9router/free-unlimited routes to: Kiro (claude-sonnet/haiku), Gemini, iFlow,
// and OpenRouter :free models — all subscription/free, no per-call billing.
const FALLBACK_CHAIN = [
  '9router/free-unlimited',
  'openai-codex/gpt-5.2',
  'zai/glm-4.7-flashx',
];

// Models to REMOVE from all agent configs (caused credit burn or are broken).
const BANNED_FALLBACKS = new Set([
  '9router/openrouter/auto',
  '9router/always-on-premium',
  'anthropic/claude-opus-4-6',
]);

// Per-agent primary model overrides.
// All others → ollama/llama3.1:8b (fast local, always free, warms up once).
const PRIMARY_OVERRIDES = {
  hatake: 'ollama/qwen2.5-coder:7b',  // coder model better for intent parsing
};

function buildFallbacks(agentId, currentPrimary) {
  const base = [...FALLBACK_CHAIN];
  // If the agent's primary is Ollama, the fallbacks don't need another Ollama entry.
  // If it was previously codex or 9router, add ollama as a fallback too — belt+suspenders.
  if (!currentPrimary.startsWith('ollama/')) {
    base.unshift('ollama/llama3.1:8b');
  }
  return [...new Set(base)]; // deduplicate
}

function main() {
  if (!fs.existsSync(OPENCLAW_JSON)) {
    console.error('openclaw.json not found at', OPENCLAW_JSON);
    process.exit(1);
  }

  const raw = fs.readFileSync(OPENCLAW_JSON, 'utf8');
  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON in openclaw.json:', e.message);
    process.exit(1);
  }

  const agents = config?.agents?.list;
  if (!Array.isArray(agents)) {
    console.error('No agents.list found');
    process.exit(1);
  }

  let changedCount = 0;

  for (const agent of agents) {
    const id = agent.id || agent.agentId;
    if (!id) continue;

    const model = agent.model || {};
    const oldPrimary = typeof model === 'string' ? model : (model.primary || '');
    const oldFallbacks = Array.isArray(model.fallbacks) ? model.fallbacks : [];

    const newPrimary = PRIMARY_OVERRIDES[id] || 'ollama/llama3.1:8b';
    const newFallbacks = buildFallbacks(id, newPrimary)
      .filter(m => !BANNED_FALLBACKS.has(m) && m !== newPrimary);

    const changed = oldPrimary !== newPrimary ||
      JSON.stringify(oldFallbacks.filter(m => !BANNED_FALLBACKS.has(m))) !==
      JSON.stringify(newFallbacks);

    if (changed) {
      agent.model = {
        ...(typeof model === 'object' ? model : {}),
        primary: newPrimary,
        fallbacks: newFallbacks,
      };
      changedCount++;
      console.log(`${id}:`);
      console.log(`  primary:   ${oldPrimary || '(none)'} → ${newPrimary}`);
      console.log(`  fallbacks: [${oldFallbacks.join(', ')}]`);
      console.log(`          → [${newFallbacks.join(', ')}]`);
    } else {
      console.log(`${id}: already correct (primary=${newPrimary})`);
    }
  }

  if (changedCount === 0) {
    console.log('\nNo changes needed.');
    return;
  }

  // Backup
  const backup = OPENCLAW_JSON + '.bak-' + new Date().toISOString().slice(0,10) + '-fix-model-config';
  fs.copyFileSync(OPENCLAW_JSON, backup);
  console.log(`\nBackup saved: ${backup}`);

  fs.writeFileSync(OPENCLAW_JSON, JSON.stringify(config, null, 2), 'utf8');
  console.log(`Updated ${OPENCLAW_JSON} (${changedCount} agents changed)`);
  console.log('\nNext steps:');
  console.log('  openclaw doctor');
  console.log('  bash scripts/redos-restart.sh');
}

main();
