#!/usr/bin/env node
/**
 * Ensures EVERY agent has ollama/llama3.1:8b in their model config so the whole
 * AI company keeps working when external providers (codex, 9router, zai) are down.
 * Cron and chat can always fall back to Ollama.
 *
 * Run from repo root: node scripts/ensure-ollama-allowed-in-openclaw.js
 * Optional: PREFER_OLLAMA_FOR_MAIN=1 — set main (RED) primary to Ollama (Telegram first).
 * Optional: PREFER_OLLAMA_FOR_OPS=1 — set ops primary to Ollama (cron/jobs avoid 9router 403).
 * Requires openclaw.json at OPENCLAW_JSON_PATH (default ~/.openclaw/openclaw.json).
 */

import fs from 'fs';
import path from 'path';

const OPENCLAW_JSON_PATH = process.env.OPENCLAW_JSON_PATH ||
  path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');

const OLLAMA_MODEL = 'ollama/llama3.1:8b';
const PREFER_OLLAMA_FOR_MAIN = process.env.PREFER_OLLAMA_FOR_MAIN === '1' || process.env.PREFER_OLLAMA_FOR_MAIN === 'true';
const PREFER_OLLAMA_FOR_OPS = process.env.PREFER_OLLAMA_FOR_OPS === '1' || process.env.PREFER_OLLAMA_FOR_OPS === 'true';

// Desired fallback order: Ollama first, then 9router, then zai/glm, then rest.
function orderFallbacks(list) {
  const ollama = list.filter((m) => m.startsWith('ollama/'));
  const nine = list.filter((m) => m.startsWith('9router/'));
  const zai = list.filter((m) => m.startsWith('zai/'));
  const rest = list.filter((m) => !m.startsWith('ollama/') && !m.startsWith('9router/') && !m.startsWith('zai/'));
  return [...ollama, ...nine, ...zai, ...rest];
}

function main() {
  if (!fs.existsSync(OPENCLAW_JSON_PATH)) {
    console.error('openclaw.json not found at', OPENCLAW_JSON_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(OPENCLAW_JSON_PATH, 'utf8');
  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON in openclaw.json:', e.message);
    process.exit(1);
  }

  const agents = config?.agents?.list;
  if (!Array.isArray(agents)) {
    console.error('Could not find agents.list array in openclaw.json');
    process.exit(1);
  }

  let changed = false;
  for (const agent of agents) {
    const id = agent.id || agent.agentId;
    if (!id) continue;

    const model = agent.model;
    if (!model) {
      agent.model = { primary: OLLAMA_MODEL, fallbacks: [] };
      changed = true;
      console.log(id, ': set model.primary to', OLLAMA_MODEL);
      continue;
    }

    let primary = typeof model === 'string' ? model : model.primary;
    let fallbacks = Array.isArray(model.fallbacks) ? [...model.fallbacks] : [];

    // Optional: main (RED) uses Ollama as primary so Telegram gets fast local reply.
    if (PREFER_OLLAMA_FOR_MAIN && id === 'main' && primary !== OLLAMA_MODEL) {
      fallbacks = [primary, ...fallbacks.filter((m) => m !== primary && m !== OLLAMA_MODEL)];
      primary = OLLAMA_MODEL;
      agent.model = typeof model === 'string' ? { primary, fallbacks } : { ...model, primary, fallbacks };
      changed = true;
      console.log(id, ': primary set to Ollama — PREFER_OLLAMA_FOR_MAIN');
      continue;
    }
    // Optional: ops uses Ollama as primary so cron/jobs avoid 9router 403.
    if (PREFER_OLLAMA_FOR_OPS && id === 'ops' && primary !== OLLAMA_MODEL) {
      fallbacks = [primary, ...fallbacks.filter((m) => m !== primary && m !== OLLAMA_MODEL)];
      primary = OLLAMA_MODEL;
      agent.model = typeof model === 'string' ? { primary, fallbacks } : { ...model, primary, fallbacks };
      changed = true;
      console.log(id, ': primary set to Ollama — PREFER_OLLAMA_FOR_OPS');
      continue;
    }

    // Ensure Ollama is in the list (for agents whose primary is not Ollama).
    if (primary !== OLLAMA_MODEL && !fallbacks.includes(OLLAMA_MODEL)) {
      fallbacks.push(OLLAMA_MODEL);
    }
    // Order: Ollama → 9router → zai/glm → rest.
    const wantFallbacks = orderFallbacks([...new Set(fallbacks)]);

    if (primary === OLLAMA_MODEL) {
      const rest = wantFallbacks.filter((m) => m !== OLLAMA_MODEL);
      agent.model = typeof model === 'string' ? { primary: model, fallbacks: rest } : { ...model, fallbacks: rest };
      if (JSON.stringify(model.fallbacks) !== JSON.stringify(rest)) changed = true;
      console.log(id, ': primary is Ollama, fallbacks:', rest.length ? rest.join(', ') : '(none)');
      continue;
    }

    if (JSON.stringify(fallbacks) !== JSON.stringify(wantFallbacks)) {
      agent.model = typeof model === 'string' ? { primary: model, fallbacks: wantFallbacks } : { ...model, fallbacks: wantFallbacks };
      changed = true;
      console.log(id, ': fallbacks ordered: Ollama → 9router → zai → rest:', wantFallbacks.join(', '));
    } else {
      console.log(id, ': fallbacks already ordered (Ollama → 9router → zai → rest)');
    }
  }

  if (!changed) {
    console.log('No changes needed.');
    return;
  }

  fs.writeFileSync(OPENCLAW_JSON_PATH, JSON.stringify(config, null, 2), 'utf8');
  console.log('Updated', OPENCLAW_JSON_PATH);
  console.log('Run: openclaw doctor && bash scripts/redos-restart.sh');
}

main();
