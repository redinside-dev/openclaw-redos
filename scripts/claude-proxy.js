#!/usr/bin/env node
/**
 * claude-proxy.js — Cyclic failover proxy for Claude Code
 *
 * Claude Code always talks to this proxy (port 19001).
 * Accounts are loaded from:
 *   ~/.openclaw/config/proxy-accounts.json  — account list + Keychain service names
 *   ~/.ccs/config.yaml                       — account ordering (fallback)
 *
 * Failover chain: cyclic round-robin across all configured accounts.
 * Failover triggers: ONLY on quota exhaustion (402, credit_balance_too_low, etc.)
 * NOT on general 429 rate-limits (those are passed through to client).
 * State: global sticky — once exhausted, stays on next account until /reset.
 * Context: never lost — same Claude Code session keeps running throughout.
 *
 * Manual override endpoints:
 *   GET /health           — current status + account list
 *   GET /force?account=X  — pin to account X (still falls forward if X fails)
 *   GET /reset            — clear pin + all exhausted states, back to account[0]
 *   GET /reload           — reload account config from disk without restart
 *
 * Backward-compat endpoints (legacy, still work):
 *   GET /force-cloud2     — same as /force?account=cloud2
 *   GET /force-cloud3     — same as /force?account=cloud3
 *   GET /force-cursor     — same as /force?account=cursor
 *
 * Auto-start: launchd ai.openclaw.claude-proxy
 * Configured:  ~/.claude/settings.json env.ANTHROPIC_BASE_URL = http://127.0.0.1:19001
 * Account config: ~/.openclaw/config/proxy-accounts.json
 */

import http from 'node:http';
import https from 'node:https';
import { URL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { execSync } from 'node:child_process';

const SCRIPT_PATH = fileURLToPath(import.meta.url);

const PORT = 19001;
const ANTHROPIC_BASE = 'https://api.anthropic.com';
const CURSOR_BASE = 'http://localhost:20129';
const LOG_FILE = process.env.LOG_FILE || `${process.env.HOME}/.openclaw/logs/claude-proxy.log`;
const CURSOR_MODEL = 'gpt-5.3-codex';
const PROXY_CONFIG = `${process.env.HOME}/.openclaw/config/proxy-accounts.json`;
const CCS_CONFIG   = `${process.env.HOME}/.ccs/config.yaml`;
const CCS_INSTANCES = `${process.env.HOME}/.ccs/instances`;
const CCS_SETTINGS = (name) => `${process.env.HOME}/.ccs/${name}.settings.json`;

// MiniMax model IDs — included in merged /v1/models list; request body is forwarded as-is when model is in this list
const MINIMAX_MODEL_IDS = [
  'MiniMax-M2.5',
  'MiniMax-M2.5-highspeed',
  'MiniMax-M2.5-lightning',
  'MiniMax-M2.1',
  'MiniMax-M2.1-highspeed',
  'MiniMax-M2',
];

// Claude model IDs shown in merged list so client can pick Sonnet/Opus/Haiku for cloud tiers
const CLAUDE_MODEL_IDS = [
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-haiku-4-5',
];

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic account config
//
// accounts array: [{ name, type: 'passthrough'|'oauth'|'cursor',
//                     keychainService?, tokenCache?, refreshToken? }]
// ─────────────────────────────────────────────────────────────────────────────

let accounts = [];      // loaded at startup + /reload
let tierStates = {};    // name → { exhausted: bool }

// Global cyclic pointer — sticky, advances only on exhaustion
let currentTierIdx = 0;
// Manual pin: null = auto cyclic
let forcedStart = null;

function readProxyConfig() {
  try {
    const raw = fs.readFileSync(PROXY_CONFIG, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    log(`[proxy] proxy-accounts.json read error: ${e.message} — using defaults`);
    return null;
  }
}

function readCCSOrder() {
  try {
    const yaml = fs.readFileSync(CCS_CONFIG, 'utf8');
    // Extract account names from the 'accounts:' section (simple regex, no YAML parser needed)
    const section = yaml.match(/^accounts:\s*\n((?:[ \t]+\w[^\n]*\n?)*)/m);
    if (!section) return [];
    return section[1].split('\n')
      .map(l => l.match(/^[ \t]+(\w+):\s*$/))
      .filter(Boolean).map(m => m[1]);
  } catch { return []; }
}

function loadAccounts() {
  const cfg = readProxyConfig();
  const accountMap = cfg?.accounts || {};
  const cursorEnabled = cfg?.cursor ?? true;

  // Account order: explicit in proxy config > CCS YAML order > instance dir scan
  let order = cfg?.order;
  if (!order || order.length === 0) {
    order = readCCSOrder();
  }
  if (!order || order.length === 0) {
    try {
      order = fs.readdirSync(CCS_INSTANCES)
        .filter(d => { try { return fs.statSync(path.join(CCS_INSTANCES, d)).isDirectory(); } catch { return false; } });
      order.sort(); // deterministic order when from filesystem
    } catch {}
  }
  if (!order || order.length === 0) {
    log('[proxy] No accounts found in config — falling back to cloud1 passthrough');
    order = ['cloud1'];
  }

  const result = [];
  for (const name of order) {
    const val = accountMap[name];
    if (val === undefined || val === null || val === 'passthrough' || name === order[0] && !val) {
      // First account or explicitly marked passthrough → forward client's existing auth headers
      result.push({ name, type: 'passthrough' });
      log(`[proxy] Account ${name} → passthrough`);
    } else if (typeof val === 'string' && val.startsWith('Claude Code-credentials-')) {
      const tokenCache = { token: null, expiry: 0 };
      result.push({
        name,
        type: 'oauth',
        keychainService: val,
        tokenCache,
        refreshToken: makeRefreshTokenFn(val, tokenCache),
      });
      log(`[proxy] Account ${name} → oauth (${val})`);
    } else if (val === 'api') {
      // API tier: baseUrl + apiKey + model from ~/.ccs/<name>.settings.json
      try {
        const settingsPath = CCS_SETTINGS(name).replace(/^~/, process.env.HOME);
        const raw = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(raw);
        const env = settings.env || {};
        const baseUrl = env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
        const apiKey = env.ANTHROPIC_AUTH_TOKEN || '';
        const model = env.ANTHROPIC_MODEL || settings.model || 'MiniMax-M2.5';
        const opusModel = env.ANTHROPIC_DEFAULT_OPUS_MODEL || model;
        const sonnetModel = env.ANTHROPIC_DEFAULT_SONNET_MODEL || model;
        const haikuModel = env.ANTHROPIC_DEFAULT_HAIKU_MODEL || 'MiniMax-M2.5-lightning';
        if (!apiKey) {
          log(`[proxy] Account ${name} → api skipped (no ANTHROPIC_AUTH_TOKEN in ${settingsPath})`);
        } else {
          result.push({ name, type: 'api', baseUrl, apiKey, model, opusModel, sonnetModel, haikuModel });
          log(`[proxy] Account ${name} → api (${baseUrl}, opus=${opusModel}, sonnet=${sonnetModel}, haiku=${haikuModel})`);
        }
      } catch (e) {
        log(`[proxy] Account ${name} → api failed: ${e.message}`);
      }
    } else {
      log(`[proxy] Account ${name} → unknown config value "${val}", skipping`);
    }
  }

  // Cursor tier (appended last if enabled)
  if (cursorEnabled) {
    result.push({ name: 'cursor', type: 'cursor' });
    log(`[proxy] Cursor → enabled`);
  }

  log(`[proxy] Loaded ${result.length} tiers: ${result.map(a => a.name).join(' → ')}`);
  return result;
}

function markExhausted(name) {
  if (!tierStates[name]) tierStates[name] = { exhausted: false };
  if (!tierStates[name].exhausted) {
    log(`[proxy] ${name} EXHAUSTED — skipping for the rest of this session`);
    tierStates[name].exhausted = true;
    advanceTierIdx();
  }
}

function advanceTierIdx() {
  const n = accounts.length;
  for (let i = 1; i <= n; i++) {
    const idx = (currentTierIdx + i) % n;
    if (!tierStates[accounts[idx].name]?.exhausted) {
      currentTierIdx = idx;
      log(`[proxy] Cyclic advance → ${accounts[idx].name} (idx=${idx})`);
      return;
    }
  }
  log('[proxy] All tiers exhausted');
}

function isExhaustion(status, bodyBuf) {
  if (status === 402) return true;
  try {
    const text = bodyBuf.toString('utf8');
    const { error } = JSON.parse(text);
    const type = error?.type || '';
    const msg  = (error?.message || '').toLowerCase();
    return (
      type === 'billing_error' ||
      msg.includes('credit_balance_too_low') ||
      msg.includes('quota_exceeded') ||
      msg.includes('usage limit') ||
      msg.includes('out of credits') ||
      msg.includes('maximum usage') ||
      msg.includes("you've hit your limit") ||
      msg.includes('hit your limit')
    );
  } catch { return false; }
}

const SSE_EXHAUSTION_PATTERNS = [
  'usage limit',
  'quota_exceeded',
  'credit_balance_too_low',
  'billing_error',
  'out of credits',
  'maximum usage',
  "you've hit your limit",
  "hit your limit",
  "you've reached your",
  'plan usage limit',
  'rate_limit_error',
];

function sseChunkIsExhaustion(chunk) {
  const text = chunk.toString('utf8').toLowerCase();
  return SSE_EXHAUSTION_PATTERNS.some(p => text.includes(p));
}

function getCyclicSequence() {
  const n = accounts.length;
  const start = forcedStart
    ? Math.max(accounts.findIndex(a => a.name === forcedStart), 0)
    : currentTierIdx;
  return Array.from({ length: n }, (_, i) => accounts[(start + i) % n]);
}

/** Route by model: MiniMax models → api tier first, Claude models → cloud tiers first, else cyclic. Always respects forcedStart. */
function getSequenceForModel(model) {
  if (forcedStart) return getCyclicSequence();
  const m = (model || '').trim();
  if (!m) return getCyclicSequence();
  if (MINIMAX_MODEL_IDS.includes(m)) {
    const api = accounts.find((a) => a.type === 'api' && !tierStates[a.name]?.exhausted);
    if (!api) return getCyclicSequence();
    const rest = accounts.filter((a) => a !== api);
    return [api, ...rest];
  }
  return getCyclicSequence();
}

function readBody(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth token management (shared helpers)
// ─────────────────────────────────────────────────────────────────────────────
const OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const OAUTH_SCOPES    = 'user:profile user:inference user:sessions:claude_code user:mcp_servers';

function getTokenFromKeychain(service) {
  try {
    const raw = execSync(
      `security find-generic-password -s "${service}" -w`,
      { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return JSON.parse(raw).claudeAiOauth || null;
  } catch (e) {
    log(`[proxy] Keychain read error (${service}): ${e.message}`);
    return null;
  }
}

function saveTokenToKeychain(service, oauth) {
  try {
    const payload = JSON.stringify({ claudeAiOauth: oauth });
    try { execSync(`security delete-generic-password -s "${service}"`, { stdio: 'pipe' }); } catch {}
    execSync(
      `security add-generic-password -s "${service}" -a "Claude Code" -w ${JSON.stringify(payload)}`,
      { stdio: 'pipe', timeout: 5000 }
    );
  } catch (e) {
    log(`[proxy] Keychain write error (${service}): ${e.message}`);
  }
}

function makeRefreshTokenFn(service, tokenCache) {
  return function refreshToken() {
    return new Promise((resolve) => {
      const oauth = getTokenFromKeychain(service);
      if (!oauth || !oauth.refreshToken) {
        log(`[proxy] ${service}: no refresh token in Keychain`);
        return resolve(null);
      }

      // Use cached token if still fresh (with 2-min buffer)
      if (tokenCache.token && Date.now() < tokenCache.expiry - 120000) {
        return resolve(tokenCache.token);
      }

      // Use Keychain token if still fresh
      if (oauth.accessToken && oauth.expiresAt && Date.now() < oauth.expiresAt - 120000) {
        tokenCache.token = oauth.accessToken;
        tokenCache.expiry = oauth.expiresAt;
        log(`[proxy] ${service}: using existing Keychain token`);
        return resolve(tokenCache.token);
      }

      // Refresh
      log(`[proxy] ${service}: refreshing OAuth token...`);
      const postData = Buffer.from(JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: oauth.refreshToken,
        client_id: OAUTH_CLIENT_ID,
        scope: OAUTH_SCOPES,
      }), 'utf8');

      const req = https.request({
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/oauth/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length },
      }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (data.access_token) {
              tokenCache.token = data.access_token;
              tokenCache.expiry = Date.now() + (data.expires_in || 28800) * 1000;
              log(`[proxy] ${service}: token refreshed (expires in ${data.expires_in || 28800}s)`);
              const updated = { ...oauth, accessToken: data.access_token, expiresAt: tokenCache.expiry };
              if (data.refresh_token) updated.refreshToken = data.refresh_token;
              saveTokenToKeychain(service, updated);
              resolve(tokenCache.token);
            } else {
              log(`[proxy] ${service}: refresh failed — ${JSON.stringify(data)}`);
              resolve(null);
            }
          } catch (e) {
            log(`[proxy] ${service}: refresh parse error — ${e.message}`);
            resolve(null);
          }
        });
      });
      req.on('error', (e) => { log(`[proxy] ${service}: refresh request error — ${e.message}`); resolve(null); });
      req.setTimeout(10000, () => { req.destroy(); resolve(null); });
      req.write(postData);
      req.end();
    });
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Body sanitization — strip thinking blocks with signatures from conversation
// history so switching between providers doesn't cause "Invalid signature" errors
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeBodyForProvider(bodyBuffer) {
  if (!bodyBuffer.length) return bodyBuffer;
  try {
    const body = JSON.parse(bodyBuffer.toString('utf8'));
    if (!Array.isArray(body.messages)) return bodyBuffer;
    let changed = false;
    for (const msg of body.messages) {
      if (msg.role !== 'assistant' || !Array.isArray(msg.content)) continue;
      const filtered = msg.content.filter((block) => {
        if (block.type === 'thinking' && block.signature) {
          changed = true;
          return false;
        }
        return true;
      });
      if (changed) msg.content = filtered;
    }
    if (!changed) return bodyBuffer;
    return Buffer.from(JSON.stringify(body), 'utf8');
  } catch (_) {
    return bodyBuffer;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Forward helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Passthrough to a target base URL (used for Cloud 1 → api.anthropic.com) */
function forwardRequest(targetBase, originalReq, bodyBuffer) {
  return new Promise((resolve, reject) => {
    const target = new URL(targetBase);
    const isTls = target.protocol === 'https:';
    const reqPath = originalReq.url || '/v1/messages';

    const headers = {};
    for (const [k, v] of Object.entries(originalReq.headers)) {
      const kl = k.toLowerCase();
      if (['host', 'connection', 'transfer-encoding'].includes(kl)) continue;
      headers[k] = v;
    }
    headers['host'] = target.hostname;
    if (bodyBuffer.length) headers['content-length'] = bodyBuffer.length;

    const proto = isTls ? https : http;
    const proxyReq = proto.request({
      hostname: target.hostname,
      port: target.port || (isTls ? 443 : 80),
      path: reqPath,
      method: originalReq.method,
      headers,
    }, proxyRes => resolve(proxyRes));
    proxyReq.on('error', reject);
    proxyReq.setTimeout(120000, () => proxyReq.destroy(new Error('upstream timeout')));
    if (bodyBuffer.length) proxyReq.write(bodyBuffer);
    proxyReq.end();
  });
}

/** Forward with OAuth Bearer token (used for Cloud 2 and Cloud 3) */
function forwardRequestOAuth(originalReq, bodyBuffer, token) {
  return new Promise((resolve, reject) => {
    const target = new URL(ANTHROPIC_BASE);
    const reqPath = originalReq.url || '/v1/messages';

    const headers = {};
    for (const [k, v] of Object.entries(originalReq.headers)) {
      const kl = k.toLowerCase();
      if (['host', 'connection', 'transfer-encoding', 'authorization', 'x-api-key'].includes(kl)) continue;
      headers[k] = v;
    }
    headers['host'] = target.hostname;
    headers['authorization'] = `Bearer ${token}`;

    // OAuth beta flag required for Bearer auth
    const existingBeta = headers['anthropic-beta'] || '';
    if (!existingBeta.includes('oauth-2025-04-20')) {
      headers['anthropic-beta'] = existingBeta ? `${existingBeta},oauth-2025-04-20` : 'oauth-2025-04-20';
    }
    if (bodyBuffer.length) headers['content-length'] = bodyBuffer.length;

    const proxyReq = https.request({
      hostname: target.hostname,
      port: 443,
      path: reqPath,
      method: originalReq.method,
      headers,
    }, proxyRes => resolve(proxyRes));
    proxyReq.on('error', reject);
    proxyReq.setTimeout(120000, () => proxyReq.destroy(new Error('oauth upstream timeout')));
    if (bodyBuffer.length) proxyReq.write(bodyBuffer);
    proxyReq.end();
  });
}

/** Forward to API tier (e.g. MiniMax). If request model is already a MiniMax model, send as-is; else use account default. Returns { proxyRes, clientModel, upstreamModel }. */
/** Trims long conversation history so MiniMax context limit (2013) is not exceeded. */
const MINIMAX_MAX_MESSAGES = 30;

function forwardRequestApi(originalReq, bodyBuffer, account) {
  const { baseUrl, apiKey, model } = account;
  let clientModel = null;
  let upstreamModel = model;
  let outBody = bodyBuffer;
  if (bodyBuffer.length) {
    try {
      const body = JSON.parse(bodyBuffer.toString('utf8'));
      clientModel = body.model || null;
      const requested = (clientModel || '').trim();
      if (requested && MINIMAX_MODEL_IDS.includes(requested)) {
        upstreamModel = requested;
      } else {
        body.model = model;
        upstreamModel = model;
      }
      // Trim messages to avoid MiniMax "context window exceeds limit (2013)"
      if (Array.isArray(body.messages) && body.messages.length > MINIMAX_MAX_MESSAGES) {
        body.messages = body.messages.slice(-MINIMAX_MAX_MESSAGES);
      }
      outBody = Buffer.from(JSON.stringify(body), 'utf8');
    } catch (_) {}
  }
  return new Promise((resolve, reject) => {
    const target = new URL(baseUrl);
    const isTls = target.protocol === 'https:';
    const reqPath = originalReq.url || '/v1/messages';
    const basePath = target.pathname.endsWith('/') ? target.pathname.slice(0, -1) : target.pathname;
    const path = basePath ? `${basePath}${reqPath.startsWith('/') ? reqPath : '/' + reqPath}` : reqPath;

    const headers = {};
    for (const [k, v] of Object.entries(originalReq.headers)) {
      const kl = k.toLowerCase();
      if (['host', 'connection', 'transfer-encoding', 'authorization', 'x-api-key'].includes(kl)) continue;
      headers[k] = v;
    }
    headers['host'] = target.hostname;
    headers['authorization'] = `Bearer ${apiKey}`;
    headers['x-api-key'] = apiKey;
    if (!headers['anthropic-version']) headers['anthropic-version'] = '2023-06-01';
    headers['content-length'] = outBody.length;

    const proto = isTls ? https : http;
    const proxyReq = proto.request({
      hostname: target.hostname,
      port: target.port || (isTls ? 443 : 80),
      path,
      method: originalReq.method,
      headers,
    }, proxyRes => resolve({ proxyRes, clientModel, upstreamModel }));
    proxyReq.on('error', reject);
    proxyReq.setTimeout(120000, () => proxyReq.destroy(new Error('api upstream timeout')));
    proxyReq.write(outBody);
    proxyReq.end();
  });
}

/** Pipe a proxy response directly back to the client */
function pipeResponse(proxyRes, clientRes) {
  clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
  proxyRes.pipe(clientRes);
}

/** Pipe API tier response, rewriting response body so "model" matches what the client sent (avoids "model may not exist" when we defaulted the request). */
function pipeApiResponse(proxyRes, clientRes, clientModel, upstreamModel) {
  if (clientModel === upstreamModel || !clientModel) {
    pipeResponse(proxyRes, clientRes);
    return;
  }
  const safe = (s) => (s || '').replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(safe(upstreamModel), 'g');
  readBody(proxyRes).then((bodyBuf) => {
    const out = bodyBuf.toString('utf8').replace(re, clientModel);
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    clientRes.end(Buffer.from(out, 'utf8'));
  }).catch((e) => {
    log(`[proxy] pipeApiResponse read error: ${e.message}`);
    clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({ error: { message: 'Proxy response read failed' } }));
  });
}

/** Check if Cursor daemon is running */
function isCursorRunning() {
  return new Promise(resolve => {
    const req = http.get('http://localhost:20129/v1/models', res => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Format translation: Anthropic Messages API ↔ OpenAI Chat Completions
// (used only for Cursor, which speaks OpenAI format)
// ─────────────────────────────────────────────────────────────────────────────

function anthropicToOpenAI(bodyBuffer) {
  let body;
  try { body = JSON.parse(bodyBuffer.toString('utf8')); }
  catch (e) { throw new Error(`anthropicToOpenAI: invalid JSON: ${e.message}`); }

  const messages = [];
  if (body.system) {
    let text = typeof body.system === 'string'
      ? body.system
      : (Array.isArray(body.system) ? body.system.filter(b => b.type === 'text').map(b => b.text).join('\n') : '');
    if (text.trim()) messages.push({ role: 'system', content: text });
  }
  for (const msg of (body.messages || [])) {
    let content = msg.content;
    if (Array.isArray(content)) {
      content = content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    }
    messages.push({ role: msg.role, content: content || '' });
  }

  const out = { model: CURSOR_MODEL, messages, stream: body.stream !== false };
  if (body.max_tokens) out.max_tokens = body.max_tokens;
  if (body.temperature !== undefined) out.temperature = body.temperature;
  if (body.top_p !== undefined) out.top_p = body.top_p;
  return Buffer.from(JSON.stringify(out), 'utf8');
}

function openAIToAnthropicFull(bodyBuffer, anthropicModel) {
  let d;
  try { d = JSON.parse(bodyBuffer.toString('utf8')); }
  catch (e) { throw new Error(`openAIToAnthropicFull: invalid JSON: ${e.message}`); }

  const choice = d.choices?.[0] || {};
  const text = choice.message?.content || '';
  const usage = d.usage || {};
  return Buffer.from(JSON.stringify({
    id: d.id || `msg_cursor_${Date.now()}`,
    type: 'message', role: 'assistant',
    model: anthropicModel || 'claude-sonnet-4-6',
    content: [{ type: 'text', text }],
    stop_reason: choice.finish_reason === 'stop' ? 'end_turn' : (choice.finish_reason || 'end_turn'),
    stop_sequence: null,
    usage: { input_tokens: usage.prompt_tokens || 0, output_tokens: usage.completion_tokens || 0 },
  }), 'utf8');
}

function sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function createAnthropicStreamTransformer(anthropicModel) {
  const msgId = `msg_cursor_${Date.now()}`;
  let headerSent = false;
  let outputTokens = 0;
  let leftover = '';

  return new Transform({
    transform(chunk, _enc, cb) {
      leftover += chunk.toString('utf8');
      const lines = leftover.split('\n');
      leftover = lines.pop();
      const out = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.slice(5).trim();

        if (raw === '[DONE]') {
          out.push(sseEvent('content_block_stop', { type: 'content_block_stop', index: 0 }));
          out.push(sseEvent('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: outputTokens } }));
          out.push(sseEvent('message_stop', { type: 'message_stop' }));
          continue;
        }

        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }
        const choice = parsed.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta || {};

        if (!headerSent && (delta.role || delta.content !== undefined)) {
          out.push(sseEvent('message_start', { type: 'message_start', message: { id: msgId, type: 'message', role: 'assistant', content: [], model: anthropicModel || 'claude-sonnet-4-6', stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } }));
          out.push(sseEvent('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }));
          headerSent = true;
        }
        if (delta.content) {
          outputTokens++;
          out.push(sseEvent('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: delta.content } }));
        }
      }
      if (out.length) this.push(out.join(''));
      cb();
    },

    flush(cb) {
      if (leftover.trim().startsWith('data:')) {
        const raw = leftover.trim().slice(5).trim();
        if (raw === '[DONE]') {
          const out = [];
          out.push(sseEvent('content_block_stop', { type: 'content_block_stop', index: 0 }));
          out.push(sseEvent('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: outputTokens } }));
          out.push(sseEvent('message_stop', { type: 'message_stop' }));
          this.push(out.join(''));
        }
      }
      if (!headerSent) {
        const out = [];
        out.push(sseEvent('message_start', { type: 'message_start', message: { id: msgId, type: 'message', role: 'assistant', content: [], model: anthropicModel || 'claude-sonnet-4-6', stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } }));
        out.push(sseEvent('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }));
        out.push(sseEvent('content_block_stop', { type: 'content_block_stop', index: 0 }));
        out.push(sseEvent('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 0 } }));
        out.push(sseEvent('message_stop', { type: 'message_stop' }));
        this.push(out.join(''));
      }
      cb();
    },
  });
}

/** Forward to Cursor daemon with Anthropic→OpenAI translation */
async function forwardToCursor(originalReq, bodyBuffer, clientRes) {
  const openaiBody = anthropicToOpenAI(bodyBuffer);
  const isStreaming = (() => { try { return JSON.parse(bodyBuffer.toString('utf8')).stream !== false; } catch { return true; } })();
  const anthropicModel = (() => { try { return JSON.parse(bodyBuffer.toString('utf8')).model; } catch { return 'claude-sonnet-4-6'; } })();

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 20129,
      path: '/v1/chat/completions', method: 'POST',
      headers: {
        'host': 'localhost', 'content-type': 'application/json',
        'content-length': openaiBody.length,
        'authorization': 'Bearer cursor-local', 'x-api-key': 'cursor-local',
      },
    }, cursorRes => {
      log(`[proxy] ← cursor ${cursorRes.statusCode} (translated)`);
      if (isStreaming) {
        const transformer = createAnthropicStreamTransformer(anthropicModel);
        clientRes.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        cursorRes.pipe(transformer).pipe(clientRes);
        transformer.on('finish', resolve);
        transformer.on('error', reject);
      } else {
        const chunks = [];
        cursorRes.on('data', c => chunks.push(c));
        cursorRes.on('end', () => {
          try {
            const translated = openAIToAnthropicFull(Buffer.concat(chunks), anthropicModel);
            clientRes.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': translated.length });
            clientRes.end(translated);
            resolve();
          } catch (e) { reject(e); }
        });
        cursorRes.on('error', reject);
      }
    });
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('cursor timeout')));
    req.write(openaiBody);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main server — cyclic failover on exhaustion only
// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  await new Promise(r => req.on('end', r));
  const body = Buffer.concat(chunks);

  // ── Health check ──────────────────────────────────────────────────────────
  if (req.url === '/health') {
    const active = forcedStart || accounts[currentTierIdx]?.name || 'none';
    const acctStatus = accounts.map(a => ({
      name: a.name,
      type: a.type,
      exhausted: !!(tierStates[a.name]?.exhausted),
      active: a.name === active,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      backend: active,
      forced: forcedStart,
      accounts: acctStatus,
      configFile: PROXY_CONFIG,
    }, null, 2));
    return;
  }

  // ── Test failover (simulate exhaustion on an account) ────────────────────
  // GET /test-exhaust?account=cloud1  → marks account exhausted, returns new active
  const exhaustMatch = req.url?.match(/^\/test-exhaust(?:\?account=(\w+))?$/);
  if (exhaustMatch) {
    const target = exhaustMatch[1] || accounts[currentTierIdx]?.name;
    if (!target || !accounts.find(a => a.name === target)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Unknown account: ${target}`, available: accounts.map(a => a.name) }));
      return;
    }
    markExhausted(target);
    const nowActive = accounts[currentTierIdx]?.name;
    log(`[proxy] TEST: simulated exhaustion on ${target} → now on ${nowActive}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ test: 'ok', exhausted: target, nowActive, allStates: accounts.map(a => ({ name: a.name, exhausted: !!(tierStates[a.name]?.exhausted) })) }));
    return;
  }

  // ── Reload config ─────────────────────────────────────────────────────────
  if (req.url === '/reload') {
    const prevOrder = accounts.map(a => a.name);
    const currentBackend = forcedStart || accounts[currentTierIdx]?.name;
    accounts = loadAccounts();
    tierStates = {};
    forcedStart = null;
    // Preserve current backend: stay on same tier by name so curl /reload doesn't cause a jump
    const idx = accounts.findIndex(a => a.name === currentBackend);
    currentTierIdx = idx >= 0 ? idx : 0;
    const currOrder = accounts.map(a => a.name);
    log(`[proxy] Config reloaded: [${prevOrder.join(',')}] → [${currOrder.join(',')}], staying on ${accounts[currentTierIdx]?.name || 'none'}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', backend: accounts[currentTierIdx]?.name, accounts: accounts.map(a => ({ name: a.name, type: a.type })) }));
    return;
  }

  // ── Manual force endpoints ────────────────────────────────────────────────
  const forceMatch = req.url?.match(/^\/force(?:\?account=(\w+)|-(\w+))$/);
  const legacyForceMap = { 'force-cloud1': 'cloud1', 'force-cloud2': 'cloud2', 'force-cloud3': 'cloud3', 'force-cloud4': 'cloud4', 'force-minimax': 'minimax', 'force-cursor': 'cursor' };
  const legacyTarget = legacyForceMap[req.url?.slice(1)];
  const forceTarget = forceMatch?.[1] || forceMatch?.[2] || legacyTarget;

  if (forceTarget) {
    const acct = accounts.find(a => a.name === forceTarget);
    if (!acct) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Unknown account: ${forceTarget}`, available: accounts.map(a => a.name) }));
      return;
    }
    forcedStart = forceTarget;
    if (tierStates[forceTarget]) tierStates[forceTarget].exhausted = false;
    log(`[proxy] Manually pinned to ${forceTarget}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', backend: forceTarget, message: `Pinned to ${forceTarget} — use /reset to return to auto` }));
    return;
  }

  if (req.url === '/reset') {
    const currentBackend = forcedStart || accounts[currentTierIdx]?.name;
    forcedStart = null;
    tierStates = {};
    // Clear token caches so next use re-reads from Keychain
    for (const a of accounts) { if (a.tokenCache) { a.tokenCache.token = null; a.tokenCache.expiry = 0; } }
    // Stay on current backend (don't jump to first) — reset = clear exhausted + unpin only
    const idx = accounts.findIndex(a => a.name === currentBackend);
    currentTierIdx = idx >= 0 ? idx : 0;
    log(`[proxy] Reset — exhausted cleared, staying on ${accounts[currentTierIdx]?.name || 'none'} (use /force?account=X to pin)`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', backend: accounts[currentTierIdx]?.name, message: 'Reset — exhausted states cleared, same backend' }));
    return;
  }

  const pathname = (req.url || '').split('?')[0] || '';
  if (!pathname.startsWith('/v1/')) {
    res.writeHead(404); res.end('Not found'); return;
  }

  // ── GET /v1/models: always return merged list so client sees Claude + MiniMax (and can pick MiniMax-M2.5 without forcing first)
  if (req.method === 'GET' && pathname === '/v1/models') {
    const data = [
      ...CLAUDE_MODEL_IDS.map((id) => ({ id, object: 'model', created: 0, owned_by: 'anthropic' })),
      ...MINIMAX_MODEL_IDS.map((id) => ({ id, object: 'model', created: 0, owned_by: 'minimax' })),
    ];
    if (accounts.some((a) => a.type === 'cursor')) {
      data.push({ id: CURSOR_MODEL, object: 'model', created: 0, owned_by: 'cursor' });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ object: 'list', data }));
    return;
  }

  // ── Requested model from body (for routing: try the tier that supports this model first)
  let requestedModel = null;
  if (body.length) {
    try {
      const parsed = JSON.parse(body.toString('utf8'));
      requestedModel = parsed.model || null;
    } catch (_) {}
  }
  const sequence = getSequenceForModel(requestedModel);
  let responseClientModel = null;
  let responseUpstreamModel = null;
  const safeBody = sanitizeBodyForProvider(body);

  // ── Try each tier in order ────────────────────────────────────────────────
  for (const account of sequence) {
    if (tierStates[account.name]?.exhausted) {
      log(`[proxy] ${account.name} exhausted — skipping`);
      continue;
    }

    log(`[proxy] → ${account.name} (${req.method} ${req.url})`);

    try {
      // ── Cursor tier ──────────────────────────────────────────────────────
      if (account.type === 'cursor') {
        const cursorRunning = await isCursorRunning();
        if (!cursorRunning) {
          log('[proxy] Cursor daemon not running — skipping');
          continue; // not exhausted, just unavailable — keep in pool
        }

        if (req.url?.startsWith('/v1/messages')) {
          await forwardToCursor(req, safeBody, res);
        } else {
          const cursorRes = await forwardRequest(CURSOR_BASE, req, safeBody);
          log(`[proxy] ← cursor raw ${cursorRes.statusCode}`);
          pipeResponse(cursorRes, res);
        }
        return; // success
      }

      // ── Cloud tiers (passthrough, OAuth, or API) ─────────────────────────
      let proxyRes;
      if (account.type === 'passthrough') {
        proxyRes = await forwardRequest(ANTHROPIC_BASE, req, safeBody);
      } else if (account.type === 'oauth') {
        const token = await account.refreshToken();
        if (!token) {
          log(`[proxy] ${account.name} token unavailable — skipping`);
          continue;
        }
        proxyRes = await forwardRequestOAuth(req, safeBody, token);
      } else if (account.type === 'api') {
        const apiMeta = await forwardRequestApi(req, safeBody, account);
        proxyRes = apiMeta.proxyRes;
        responseClientModel = apiMeta.clientModel;
        responseUpstreamModel = apiMeta.upstreamModel;
      } else {
        log(`[proxy] ${account.name} unknown type — skipping`);
        continue;
      }

      const status = proxyRes.statusCode;
      log(`[proxy] ← ${account.name} ${status}`);

      // Subscription accounts (oauth/passthrough): ANY 429 = exhaustion (daily/weekly limit)
      // API accounts: check body for specific exhaustion patterns
      if (status === 402 || status === 429) {
        const bodyBuf = await readBody(proxyRes);
        const isSubscription = account.type === 'oauth' || account.type === 'passthrough';
        if (status === 402 || (isSubscription && status === 429) || isExhaustion(status, bodyBuf)) {
          log(`[proxy] ${account.name} → exhaustion (${status}, subscription=${isSubscription})`);
          markExhausted(account.name);
          continue;
        }
        res.writeHead(status, proxyRes.headers);
        res.end(bodyBuf);
        return;
      }

      // 404 from oauth accounts = token/account issue, skip to next
      if (status === 404 && (account.type === 'oauth' || account.type === 'passthrough')) {
        log(`[proxy] ${account.name} → 404 (account issue, skipping)`);
        continue;
      }

      // For 200 SSE responses: inspect stream for body-level exhaustion signals
      // (Claude subscription quota errors arrive as 200 OK with error event in stream)
      const isSSE = (proxyRes.headers['content-type'] || '').includes('text/event-stream');
      if (status === 200 && isSSE) {
        const exhausted = await new Promise((resolve) => {
          let headerWritten = false;
          let detected = false;
          const needReplace = responseClientModel && responseUpstreamModel && responseClientModel !== responseUpstreamModel;
          const esc = (s) => (s || '').replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
          const re = needReplace ? new RegExp(esc(responseUpstreamModel), 'g') : null;
          let carryover = ''; // so model string split across chunks is still replaced
          const maxCarry = needReplace ? Math.max(0, (responseUpstreamModel || '').length - 1) : 0;

          function writeChunk(buf) {
            if (!headerWritten) {
              res.writeHead(status, proxyRes.headers);
              headerWritten = true;
            }
            if (buf.length) res.write(buf);
          }

          proxyRes.on('data', chunk => {
            if (detected) return;
            if (sseChunkIsExhaustion(chunk)) {
              detected = true;
              log(`[proxy] ${account.name} SSE exhaustion detected mid-stream — failing over`);
              proxyRes.destroy();
              resolve(true);
              return;
            }
            let str = carryover + chunk.toString('utf8');
            if (re) str = str.replace(re, responseClientModel);
            if (maxCarry > 0 && str.length > maxCarry) {
              carryover = str.slice(-maxCarry);
              str = str.slice(0, -maxCarry);
            } else {
              carryover = '';
            }
            writeChunk(Buffer.from(str, 'utf8'));
          });

          proxyRes.on('end', () => {
            if (!detected) {
              if (carryover) writeChunk(Buffer.from(carryover, 'utf8'));
              if (!headerWritten) res.writeHead(status, proxyRes.headers);
              res.end();
              resolve(false);
            }
          });

          proxyRes.on('error', (e) => {
            if (!detected) {
              log(`[proxy] ${account.name} SSE stream error: ${e.message}`);
              resolve(false);
            }
          });
        });

        if (exhausted) {
          markExhausted(account.name);
          continue; // retry with next account
        }
        return; // success — response already piped
      }

      if (responseClientModel != null) {
        pipeApiResponse(proxyRes, res, responseClientModel, responseUpstreamModel);
      } else {
        pipeResponse(proxyRes, res);
      }
      return; // success

    } catch (e) {
      // Network/timeout error — skip to next tier (don't mark exhausted)
      log(`[proxy] ${account.name} error: ${e.message} — trying next tier`);
      continue;
    }
  }

  // All tiers tried — none succeeded
  const allExhausted = accounts.every(a => tierStates[a.name]?.exhausted);
  log(`[proxy] All tiers ${allExhausted ? 'exhausted' : 'unavailable'} — returning 529 to client`);
  res.writeHead(529, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: { message: `All backends ${allExhausted ? 'exhausted' : 'unavailable'} — use /reset after refilling credits`, type: 'overloaded_error' }
  }));
});

server.listen(PORT, '127.0.0.1', () => {
  log(`[proxy] Claude cyclic failover proxy listening on http://127.0.0.1:${PORT}`);
  log(`[proxy] Config: ${PROXY_CONFIG}`);
  log(`[proxy] Failover: exhaustion-only (402 + credit errors), cyclic round-robin`);
});

server.on('error', err => {
  log(`[proxy] Server error: ${err.message}`);
  process.exit(1);
});

// ── Self-watch: restart when script is updated (launchd KeepAlive brings us back) ──
(function watchSelf() {
  let restartTimer = null;
  try {
    fs.watch(SCRIPT_PATH, (eventType) => {
      if (eventType !== 'change') return;
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        log(`[proxy] Script updated — exiting for launchd restart (no human intervention)`);
        process.exit(0);
      }, 800);
    });
    log(`[proxy] Self-watch enabled on ${SCRIPT_PATH} — updates applied automatically`);
  } catch (e) {
    log(`[proxy] Self-watch not available: ${e.message}`);
  }
})();

// ── Initialize ────────────────────────────────────────────────────────────────
accounts = loadAccounts();
