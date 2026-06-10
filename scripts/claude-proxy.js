#!/usr/bin/env node
/**
 * claude-proxy.js — Cyclic failover proxy for Claude Code
 *
 * Claude Code always talks to this proxy (port 19001).
 * Accounts are loaded from:
 *   ~/.openclaw/config/proxy-accounts.json  — account list + Keychain service names
 *   ~/.ccs/config.yaml                       — account ordering (fallback)
 *
 * Failover chain: cyclic round-robin across all configured accounts (order in proxy-accounts.json).
 * Failover triggers: quota exhaustion — 402; for OAuth/passthrough also 429; SSE body patterns;
 * API (MiniMax) uses body checks. 429 on subscription tiers advances to next account when treated as limit.
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
import { execSync, exec } from 'node:child_process';

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
  'MiniMax-M3',
  'MiniMax-M2.7',
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

// Version caching for CCS
let ccsVersionCache = {
  current: 'unknown',
  latest: 'unknown',
  lastChecked: 0
};

async function getCCSVersions() {
  const now = Date.now();
  // Cache for 1 hour
  if (ccsVersionCache.current !== 'unknown' && now - ccsVersionCache.lastChecked < 3600000) {
    return ccsVersionCache;
  }

  try {
    // 1. Get current version
    let current = 'unknown';
    try {
      const pkgPath = '/opt/homebrew/lib/node_modules/@kaitranntt/ccs/package.json';
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        current = pkg.version;
      } else {
        current = execSync('ccs --version', { encoding: 'utf8', timeout: 5000 }).trim().replace('CCS CLI v', '');
      }
    } catch {
      try {
        current = execSync('ccs --version', { encoding: 'utf8', timeout: 5000 }).trim().replace('CCS CLI v', '');
      } catch {}
    }

    // 2. Get latest version
    let latest = 'unknown';
    try {
      latest = await new Promise((resolve) => {
        https.get('https://registry.npmjs.org/@kaitranntt/ccs/latest', { timeout: 3000 }, (res) => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data).version || 'unknown');
            } catch { resolve('unknown'); }
          });
        }).on('error', () => resolve('unknown'));
      });
    } catch {
      latest = 'unknown';
    }

    ccsVersionCache = { current, latest, lastChecked: now };
  } catch (e) {
    log(`[proxy] Error getting CCS versions: ${e.message}`);
  }
  return ccsVersionCache;
}

let accountUsage = {};

function extractUsageFromChunk(chunkStr) {
  let inputTokens = 0;
  let outputTokens = 0;
  const inputMatch = chunkStr.match(/"input_tokens"\s*:\s*(\d+)/);
  if (inputMatch) inputTokens = parseInt(inputMatch[1], 10);
  const outputMatch = chunkStr.match(/"output_tokens"\s*:\s*(\d+)/);
  if (outputMatch) outputTokens = parseInt(outputMatch[1], 10);
  
  if (!inputTokens) {
    const promptMatch = chunkStr.match(/"prompt_tokens"\s*:\s*(\d+)/);
    if (promptMatch) inputTokens = parseInt(promptMatch[1], 10);
  }
  if (!outputTokens) {
    const compMatch = chunkStr.match(/"completion_tokens"\s*:\s*(\d+)/);
    if (compMatch) outputTokens = parseInt(compMatch[1], 10);
  }
  return { inputTokens, outputTokens };
}

function trackUsageData(accountName, chunk) {
  if (!accountName) return;
  if (!accountUsage[accountName]) {
    accountUsage[accountName] = { requests: 0, inputTokens: 0, outputTokens: 0 };
  }
  const str = chunk.toString('utf8');
  const usage = extractUsageFromChunk(str);
  if (usage.inputTokens) accountUsage[accountName].inputTokens += usage.inputTokens;
  if (usage.outputTokens) accountUsage[accountName].outputTokens += usage.outputTokens;
}

function incrementRequestCount(accountName) {
  if (!accountName) return;
  if (!accountUsage[accountName]) {
    accountUsage[accountName] = { requests: 0, inputTokens: 0, outputTokens: 0 };
  }
  accountUsage[accountName].requests++;
}

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
    if (forcedStart === name) {
      log(`[proxy] Clearing pin (${name} exhausted) — failover can use other accounts`);
      forcedStart = null;
    }
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
      msg.includes('hit your limit') ||
      msg.includes('invalid_grant') ||
      msg.includes('invalid_api_key') ||
      msg.includes('authentication_error')
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
  'invalid_grant',
  'invalid_api_key',
  'authentication_error',
  'overloaded_error',
];

function sseChunkIsExhaustion(chunk) {
  const text = chunk.toString('utf8').toLowerCase();
  return SSE_EXHAUSTION_PATTERNS.some(p => text.includes(p));
}

function getSequenceForModel(model) {
  const m = (model || '').trim();
  
  // 1. If explicit MiniMax model requested, route to minimax.
  if (m && MINIMAX_MODEL_IDS.includes(m)) {
    const minimaxAcc = accounts.find(a => a.name === 'minimax');
    return minimaxAcc ? [minimaxAcc] : [];
  }

  // 2. If forced to minimax, only use minimax.
  if (forcedStart === 'minimax') {
    const minimaxAcc = accounts.find(a => a.name === 'minimax');
    return minimaxAcc ? [minimaxAcc] : [];
  }
  
  // 3. If forced to cloud1, start with cloud1, then fall back to cloud2, then minimax.
  if (forcedStart === 'cloud1') {
    const c1 = accounts.find(a => a.name === 'cloud1');
    const c2 = accounts.find(a => a.name === 'cloud2');
    const mx = accounts.find(a => a.name === 'minimax');
    const seq = [];
    if (c1) seq.push(c1);
    if (c2) seq.push(c2);
    if (mx) seq.push(mx);
    return seq;
  }
  
  // 4. If forced to cloud2, start with cloud2, then fall back to cloud1, then minimax.
  if (forcedStart === 'cloud2') {
    const c1 = accounts.find(a => a.name === 'cloud1');
    const c2 = accounts.find(a => a.name === 'cloud2');
    const mx = accounts.find(a => a.name === 'minimax');
    const seq = [];
    if (c2) seq.push(c2);
    if (c1) seq.push(c1);
    if (mx) seq.push(mx);
    return seq;
  }

  // 5. Default auto behavior (no forced start, no minimax model requested):
  // Cycle failover between cloud1 and cloud2, falling back to minimax.
  const c1 = accounts.find(a => a.name === 'cloud1');
  const c2 = accounts.find(a => a.name === 'cloud2');
  const mx = accounts.find(a => a.name === 'minimax');
  const seq = [];
  if (currentTierIdx === 1) { // cloud2
    if (c2) seq.push(c2);
    if (c1) seq.push(c1);
  } else { // default cloud1
    if (c1) seq.push(c1);
    if (c2) seq.push(c2);
  }
  if (mx) seq.push(mx);
  return seq;
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
function pipeResponse(proxyRes, clientRes, accountName) {
  clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
  if (accountName) {
    proxyRes.on('data', chunk => {
      trackUsageData(accountName, chunk);
    });
  }
  proxyRes.pipe(clientRes);
}

/** Pipe API tier response, rewriting response body so "model" matches what the client sent (avoids "model may not exist" when we defaulted the request). */
function pipeApiResponse(proxyRes, clientRes, clientModel, upstreamModel, accountName) {
  if (clientModel === upstreamModel || !clientModel) {
    pipeResponse(proxyRes, clientRes, accountName);
    return;
  }
  const safe = (s) => (s || '').replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(safe(upstreamModel), 'g');
  readBody(proxyRes).then((bodyBuf) => {
    if (accountName) trackUsageData(accountName, bodyBuf);
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
// Dashboard UI Template (Premium Glassmorphism Design)
// ─────────────────────────────────────────────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CCS Claude & MiniMax Proxy Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b081a;
      --glow-purple: rgba(147, 51, 234, 0.15);
      --card-bg: rgba(255, 255, 255, 0.03);
      --card-border: rgba(255, 255, 255, 0.05);
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --active: #10b981;
      --active-glow: rgba(16, 185, 129, 0.4);
      --exhausted: #ef4444;
      --exhausted-glow: rgba(239, 68, 68, 0.4);
      --accent: #a855f7;
      --accent-hover: #c084fc;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 10% 20%, var(--glow-purple) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, var(--glow-purple) 0%, transparent 40%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    header {
      text-align: center;
      margin-bottom: 2rem;
      max-width: 600px;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #f3e8ff, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
      letter-spacing: -0.05em;
    }
    header p {
      color: var(--text-muted);
      font-size: 1.1rem;
      font-weight: 300;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      background: rgba(168, 85, 247, 0.2);
      color: #d8b4fe;
      border: 1px solid rgba(168, 85, 247, 0.3);
      margin-top: 0.75rem;
    }
    
    /* Pipeline Styles */
    .pipeline-container {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 1.5rem;
      width: 100%;
      max-width: 1100px;
      margin-bottom: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    .pipeline-flow {
      display: flex;
      align-items: center;
      justify-content: space-around;
      position: relative;
      margin: 0.5rem 0;
    }
    @media (max-width: 768px) {
      .pipeline-flow { flex-direction: column; gap: 1rem; }
      .pipeline-arrow { transform: rotate(90deg); margin: 0.25rem 0; }
    }
    .pipeline-node {
      background: rgba(255, 255, 255, 0.02);
      border: 2px dashed rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1rem 1.5rem;
      text-align: center;
      min-width: 200px;
      transition: all 0.3s ease;
    }
    .pipeline-node.active {
      border: 2px solid var(--active);
      background: rgba(16, 185, 129, 0.05);
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
    }
    .pipeline-node.exhausted {
      border: 2px solid var(--exhausted);
      background: rgba(239, 68, 68, 0.05);
      opacity: 0.7;
    }
    .pipeline-node.standby {
      border: 2px solid rgba(255, 255, 255, 0.15);
      opacity: 0.5;
    }
    .pipeline-node h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      text-transform: capitalize;
    }
    .pipeline-node p {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .pipeline-arrow {
      font-size: 1.5rem;
      color: var(--text-muted);
      animation: pulse 1.5s infinite alternate;
    }
    @keyframes pulse {
      from { opacity: 0.4; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1.05); }
    }
    .pipeline-explanation {
      font-size: 0.9rem;
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.25);
      padding: 0.75rem 1rem;
      border-radius: 10px;
      border-left: 3px solid var(--accent);
      line-height: 1.4;
    }

    main {
      width: 100%;
      max-width: 1100px;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
    }
    @media (max-width: 900px) {
      main { grid-template-columns: 1fr; }
    }
    .panel {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    h2 {
      font-size: 1.3rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      border-left: 3px solid var(--accent);
      padding-left: 0.75rem;
    }
    .accounts-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
    .account-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .account-card.active {
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.02);
    }
    .account-card.exhausted {
      border-color: rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.02);
    }
    .account-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: var(--text-muted);
    }
    .account-card.active .status-indicator {
      background-color: var(--active);
      box-shadow: 0 0 10px var(--active-glow);
    }
    .account-card.exhausted .status-indicator {
      background-color: var(--exhausted);
      box-shadow: 0 0 10px var(--exhausted-glow);
    }
    .account-details h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.15rem;
      text-transform: capitalize;
    }
    .account-details p {
      color: var(--text-muted);
      font-size: 0.85rem;
      font-family: monospace;
    }
    .account-actions {
      display: flex;
      gap: 0.5rem;
      z-index: 2;
    }
    button {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Outfit', sans-serif;
    }
    .btn-primary {
      background: var(--accent);
      color: white;
    }
    .btn-primary:hover {
      background: var(--accent-hover);
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.4);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.2);
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
    }
    .btn-disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .controls {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    label {
      font-size: 0.9rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    input {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.75rem;
      color: var(--text);
      font-family: monospace;
      font-size: 0.95rem;
      transition: border-color 0.2s ease;
    }
    input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #1e1b4b;
      border: 1px solid var(--accent);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      display: none;
      z-index: 100;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .re-auth-box {
      background: rgba(168, 85, 247, 0.05);
      border: 1px solid rgba(168, 85, 247, 0.15);
      border-radius: 12px;
      padding: 1rem;
      font-size: 0.85rem;
      line-height: 1.4;
    }
    .re-auth-box code {
      background: rgba(0,0,0,0.3);
      padding: 0.15rem 0.3rem;
      border-radius: 4px;
      font-family: monospace;
      color: #f472b6;
    }
    .footer {
      margin-top: 4rem;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 300;
    }
  </style>
</head>
<body>
  <header>
    <h1>CCS Proxy Dashboard</h1>
    <p>Premium management control for your local Claude & MiniMax failover system</p>
    <div class="badge" id="current-backend-badge">Active: Auto (Loading...)</div>
  </header>

  <!-- Live Flow Pipeline Visualizer -->
  <div class="pipeline-container" id="pipeline-section">
    <h2>Live Routing Pipeline</h2>
    <div class="pipeline-flow" id="pipeline-flow">
      <!-- Generated dynamically -->
    </div>
    <div class="pipeline-explanation" id="pipeline-explanation">
      Detecting system routing state...
    </div>
  </div>

  <main>
    <div class="panel">
      <h2>Active Account Profiles</h2>
      <div class="accounts-grid" id="accounts-container">
        <!-- Account cards will be populated by JavaScript -->
      </div>
      
      <div class="re-auth-box">
        💡 <strong>Re-authentication instructions:</strong> If any Claude account returns an authentication issue (401), open a terminal and run:<br>
        <code>ccs auth create cloud1 --force</code> or <code>ccs auth create cloud2 --force</code>.<br>
        This logs you back in via browser and refreshes your keys automatically.
      </div>
    </div>

    <div class="panel controls">
      <h2>System Controls</h2>
      
      <button class="btn-primary" onclick="resetProxy()">Reset Routing to Auto</button>
      <button class="btn-secondary" onclick="reloadConfig()">Force Config Reload</button>
      
      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 1rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
          <span style="color: var(--text-muted);">CCS CLI Version:</span>
          <span id="ccs-version-span" style="font-weight: 600; font-family: monospace; color: var(--accent);">Loading...</span>
        </div>
        <button class="btn-primary" id="ccs-update-btn" onclick="updateCCS()" style="width: 100%; margin-top: 0.25rem; display: none;">Update CCS CLI</button>
      </div>
      
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 0.5rem 0;">
      
      <h2>MiniMax Model Upgrade</h2>
      <div class="form-group">
        <label for="minimax-model-input">MiniMax Model ID</label>
        <input type="text" id="minimax-model-input" placeholder="e.g. MiniMax-M3">
        <button class="btn-primary" onclick="saveSettings()">Save & Apply Model</button>
      </div>
    </div>
  </main>

  <div class="toast" id="toast">Settings saved successfully</div>

  <footer class="footer">
    CCS Proxy port 19001 — Running on local environment
  </footer>

  <script>
    let currentData = null;

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 3000);
    }

    async function fetchHealth() {
      try {
        const res = await fetch('/health');
        const data = await res.json();
        currentData = data;
        updateUI(data);
      } catch (err) {
        console.error('Error fetching health:', err);
      }
    }

    function updateUI(data) {
      // Update badge
      const badge = document.getElementById('current-backend-badge');
      if (data.forced) {
        badge.innerText = \`Pinned: \${data.forced.toUpperCase()}\`;
        badge.style.background = 'rgba(234, 179, 8, 0.2)';
        badge.style.color = '#fef08a';
        badge.style.borderColor = 'rgba(234, 179, 8, 0.3)';
      } else {
        badge.innerText = \`Active Auto: \${data.backend.toUpperCase()}\`;
        badge.style.background = 'rgba(168, 85, 247, 0.2)';
        badge.style.color = '#d8b4fe';
        badge.style.borderColor = 'rgba(168, 85, 247, 0.3)';
      }

      // Populate pipeline flow
      const pipelineFlow = document.getElementById('pipeline-flow');
      const pipelineExplanation = document.getElementById('pipeline-explanation');
      pipelineFlow.innerHTML = '';

      let explanationText = '';
      const accts = data.accounts;

      accts.forEach((acct, idx) => {
        const isExhausted = acct.exhausted;
        const isActive = acct.active;
        const name = acct.name;

        let stateClass = 'standby';
        let statusText = 'Standby';

        if (isActive) {
          stateClass = 'active';
          statusText = 'Active Routing';
        } else if (isExhausted) {
          stateClass = 'exhausted';
          statusText = 'Exhausted (Skipped)';
        }

        const node = document.createElement('div');
        node.className = \`pipeline-node \${stateClass}\`;
        
        let desc = 'Claude Subscription';
        if (name === 'minimax') desc = 'MiniMax v3 API';
        if (name === 'cursor') desc = 'Cursor Local Daemon';
        if (acct.type === 'passthrough') desc = 'Claude Passthrough';

        node.innerHTML = \`
          <h4>\${name}</h4>
          <p>\${desc}</p>
          <p style="font-weight: 600; margin-top: 0.25rem; font-size: 0.7rem;">\${statusText}</p>
        \`;
        pipelineFlow.appendChild(node);

        if (idx < accts.length - 1) {
          const arrow = document.createElement('div');
          arrow.className = 'pipeline-arrow';
          arrow.innerHTML = '➔';
          pipelineFlow.appendChild(arrow);
        }
      });

      // Compute pipeline explanation
      if (data.forced) {
        explanationText = \`📌 <strong>Manual Override Active:</strong> Pinned to <strong>\${data.forced}</strong>. The automatic failover cascade is bypassed. All incoming requests route solely to this account.\`;
      } else {
        const activeAcct = accts.find(a => a.active);
        const exhaustedAccts = accts.filter(a => a.exhausted).map(a => \`<strong>\${a.name}</strong>\`);
        
        if (activeAcct) {
          if (exhaustedAccts.length > 0) {
            explanationText = \`🔄 <strong>Automatic Failover Active:</strong> \${exhaustedAccts.join(' and ')} returned exhaustion or token auth issues and was skipped. Traffic was automatically and seamlessly redirected to <strong>\${activeAcct.name}</strong>. Your context was not lost!\`;
          } else {
            explanationText = \`✅ <strong>All Systems Normal:</strong> Primary routing is active on <strong>\${activeAcct.name}</strong>. If this account becomes exhausted, traffic will automatically cascade down the pipeline.\`;
          }
        } else {
          explanationText = \`⚠️ <strong>Routing Error:</strong> No active backend could be found. Please check your credentials or click "Reset Routing to Auto" below.\`;
        }
      }
      pipelineExplanation.innerHTML = explanationText;

      // Populate accounts panel
      const container = document.getElementById('accounts-container');
      container.innerHTML = '';

      data.accounts.forEach(acct => {
        const isExhausted = acct.exhausted;
        const isActive = acct.active;
        const name = acct.name;
        const usage = acct.usage || { requests: 0, inputTokens: 0, outputTokens: 0 };
        const usageStr = \`\${usage.requests} requests • \${(usage.inputTokens / 1000).toFixed(1)}K in • \${(usage.outputTokens / 1000).toFixed(1)}K out\`;

        const card = document.createElement('div');
        card.className = \`account-card \${isActive ? 'active' : ''} \${isExhausted ? 'exhausted' : ''}\`;
        
        let actions = '';
        if (acct.type === 'oauth' || acct.type === 'api') {
          const forceBtnText = isActive && data.forced ? 'Pinned' : 'Pin Backend';
          const forceBtnClass = isActive && data.forced ? 'btn-secondary btn-disabled' : 'btn-primary';
          
          actions = \`
            <div class="account-actions">
              <button class="\${forceBtnClass}" onclick="forceAccount('\${name}')" \${isActive && data.forced ? 'disabled' : ''}>\${forceBtnText}</button>
              <button class="btn-danger" onclick="simulateExhaust('\${name}')" \${isExhausted ? 'disabled' : ''}>\${isExhausted ? 'Exhausted' : 'Failover Test'}</button>
            </div>
          \`;
        } else if (acct.name === 'cursor') {
          actions = \`
            <div class="account-actions">
              <button class="btn-secondary btn-disabled" disabled>Local Daemon</button>
            </div>
          \`;
        }

        card.innerHTML = \`
          <div class="account-info">
            <div class="status-indicator"></div>
            <div class="account-details">
              <h3>\${name}</h3>
              <p>\${acct.email || acct.type}</p>
              <p style="font-size: 0.75rem; color: #c084fc; margin-top: 0.25rem; font-weight: 600; font-family: monospace;">\${usageStr}</p>
            </div>
          </div>
          \${actions}
        \`;
        container.appendChild(card);
      });

      // Update minimax model input value if not already focused/edited
      const minimaxInput = document.getElementById('minimax-model-input');
      if (data.accounts.find(a => a.name === 'minimax') && !minimaxInput.dataset.edited) {
        if (!minimaxInput.value) {
          minimaxInput.value = 'MiniMax-M3';
        }
      }

      // Update CCS version
      const ccsSpan = document.getElementById('ccs-version-span');
      const ccsUpdateBtn = document.getElementById('ccs-update-btn');
      if (data.ccs) {
        const current = data.ccs.current;
        const latest = data.ccs.latest;
        if (current === latest) {
          ccsSpan.innerHTML = current + ' <span style="color: var(--active); font-size: 0.75rem; margin-left: 0.25rem; font-weight: 800;">(Latest)</span>';
          ccsUpdateBtn.style.display = 'none';
        } else if (latest !== 'unknown') {
          ccsSpan.innerHTML = current + ' <span style="color: var(--exhausted); font-size: 0.75rem; margin-left: 0.25rem; font-weight: 800;">➔ ' + latest + '</span>';
          ccsUpdateBtn.style.display = 'block';
          ccsUpdateBtn.innerText = 'Update to ' + latest;
        } else {
          ccsSpan.innerText = current;
          ccsUpdateBtn.style.display = 'none';
        }
      }
    }

    async function forceAccount(name) {
      try {
        const res = await fetch(\`/force?account=\${name}\`);
        const data = await res.json();
        showToast(data.message || \`Pinned to \${name}\`);
        fetchHealth();
      } catch (e) {
        showToast('Action failed');
      }
    }

    async function simulateExhaust(name) {
      try {
        const res = await fetch(\`/test-exhaust?account=\${name}\`);
        const data = await res.json();
        showToast(\`Simulated exhaustion on \${name}. Failover to \${data.nowActive}\`);
        fetchHealth();
      } catch (e) {
        showToast('Action failed');
      }
    }

    async function resetProxy() {
      try {
        const res = await fetch('/reset');
        const data = await res.json();
        showToast('Proxy reset to automatic failover mode.');
        fetchHealth();
      } catch (e) {
        showToast('Reset failed');
      }
    }

    async function reloadConfig() {
      try {
        const res = await fetch('/reload');
        const data = await res.json();
        showToast('Configuration reloaded from disk.');
        fetchHealth();
      } catch (e) {
        showToast('Reload failed');
      }
    }

    async function updateCCS() {
      const btn = document.getElementById('ccs-update-btn');
      const originalText = btn.innerText;
      btn.innerText = 'Updating CCS... (Please wait)';
      btn.disabled = true;
      btn.classList.add('btn-disabled');
      showToast('Starting CCS CLI update...');
      try {
        const res = await fetch('/ccs-update', { method: 'POST' });
        if (res.status === 200) {
          const data = await res.json();
          showToast('CCS CLI updated successfully!');
        } else {
          try {
            const data = await res.json();
            showToast('Update failed: ' + (data.error || 'Unknown error'));
          } catch {
            showToast('Update failed. Server returned error.');
          }
        }
      } catch (e) {
        showToast('Network error triggering update');
      } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
        fetchHealth();
      }
    }

    async function saveSettings() {
      const modelVal = document.getElementById('minimax-model-input').value.trim();
      if (!modelVal) return;
      try {
        const res = await fetch('/save-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minimaxModel: modelVal })
        });
        const data = await res.json();
        if (data.status === 'ok') {
          showToast(data.message);
          fetchHealth();
        } else {
          showToast('Save failed: ' + data.error);
        }
      } catch (e) {
        showToast('Network error saving settings');
      }
    }

    document.getElementById('minimax-model-input').addEventListener('input', () => {
      document.getElementById('minimax-model-input').dataset.edited = 'true';
    });

    fetchHealth();
    setInterval(fetchHealth, 2000);
  </script>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
// Main server — cyclic failover on exhaustion only
// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  await new Promise(r => req.on('end', r));
  const body = Buffer.concat(chunks);

  // ── Dashboard GET ────────────────────────────────────────────────────────
  if (req.method === 'GET' && (req.url === '/' || req.url === '/dashboard')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(DASHBOARD_HTML);
    return;
  }

  // ── Save Settings POST ────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/save-settings') {
    try {
      const data = JSON.parse(body.toString('utf8'));
      const minimaxModel = data.minimaxModel;
      if (minimaxModel) {
        const settingsPath = CCS_SETTINGS('minimax').replace(/^~/, process.env.HOME);
        let settings = {};
        try {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch {}
        if (!settings.env) settings.env = {};
        settings.env.ANTHROPIC_MODEL = minimaxModel;
        settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL = minimaxModel;
        settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL = minimaxModel;
        settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = minimaxModel;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        
        if (!MINIMAX_MODEL_IDS.includes(minimaxModel)) {
          MINIMAX_MODEL_IDS.unshift(minimaxModel);
        }
        
        accounts = loadAccounts();
        log(`[proxy] Updated MiniMax model to ${minimaxModel} and reloaded settings`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: `Model updated to ${minimaxModel}` }));
        return;
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // ── CCS CLI Update POST ───────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/ccs-update') {
    log('[proxy] Triggered CCS update from dashboard');
    exec('ccs update', { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        log(`[proxy] CCS update failed: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, stderr }));
      } else {
        log(`[proxy] CCS update succeeded`);
        // Force version cache reload on next check
        ccsVersionCache.lastChecked = 0;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'CCS updated successfully', stdout }));
      }
    });
    return;
  }

  // ── Health check ──────────────────────────────────────────────────────────
  if (req.url === '/health') {
    const active = forcedStart || accounts[currentTierIdx]?.name || 'none';
    const ACCOUNT_EMAILS = {
      cloud1: 'anuragsaxena.ai@gmail.com',
      cloud2: 'io.anuragsaxena@gmail.com',
      cloud3: 'anuragg.saxenaa@gmail.com',
      minimax: 'MiniMax API',
      cursor: 'Cursor daemon (port 20129)',
    };
    const acctStatus = accounts.map(a => ({
      name: a.name,
      email: ACCOUNT_EMAILS[a.name] || '',
      type: a.type,
      exhausted: !!(tierStates[a.name]?.exhausted),
      active: a.name === active,
      usage: accountUsage[a.name] || { requests: 0, inputTokens: 0, outputTokens: 0 }
    }));
    const ccsInfo = await getCCSVersions();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      backend: active,
      forced: forcedStart,
      accounts: acctStatus,
      configFile: PROXY_CONFIG,
      ccs: ccsInfo,
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
  const legacyForceMap = { 'force-cloud1': 'cloud1', 'force-cloud2': 'cloud2', 'force-cloud3': 'cloud3', 'force-minimax': 'minimax', 'force-cursor': 'cursor' };
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

  // ── OAuth token endpoints: always pass through directly to Anthropic ──────
  if (pathname.includes('/oauth/')) {
    log(`[proxy] Passthrough OAuth request: ${req.method} ${req.url}`);
    try {
      const proxyRes = await forwardRequest(ANTHROPIC_BASE, req, body);
      pipeResponse(proxyRes, res);
    } catch (e) {
      log(`[proxy] OAuth passthrough error: ${e.message}`);
      res.writeHead(502); res.end('OAuth passthrough failed');
    }
    return;
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
    incrementRequestCount(account.name);

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
          pipeResponse(cursorRes, res, account.name);
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
          log(`[proxy] ${account.name} token unavailable — marking exhausted and skipping`);
          markExhausted(account.name);
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

      const isSSE = (proxyRes.headers['content-type'] || '').includes('text/event-stream');
      const isSubscription = account.type === 'oauth' || account.type === 'passthrough';

      if (status !== 200) {
        let bodyBuf = Buffer.alloc(0);
        if (!isSSE) {
          try {
            bodyBuf = await readBody(proxyRes);
          } catch (e) {
            log(`[proxy] Error reading error body from ${account.name}: ${e.message}`);
          }
        }

        // 1. Quota / exhaustion check
        const isExhaustedErr = status === 402 || (isSubscription && status === 429) || (bodyBuf.length > 0 && isExhaustion(status, bodyBuf));
        if (isExhaustedErr) {
          log(`[proxy] ${account.name} → exhaustion (${status}, subscription=${isSubscription})`);
          markExhausted(account.name);
          continue;
        }

        // 1.5. Rate limits (429) on non-subscription accounts — try next tier without marking exhausted
        if (status === 429) {
          log(`[proxy] ${account.name} → rate limit 429 — trying next tier`);
          continue;
        }

        // 2. Auth issues for oauth/passthrough (401, 403, 404)
        if ((status === 401 || status === 403 || status === 404) && isSubscription) {
          log(`[proxy] ${account.name} → ${status} (auth/not found) — marking exhausted and trying next tier`);
          markExhausted(account.name);
          continue;
        }

        // 3. Server errors (5xx) — retry next tier without marking exhausted
        if (status >= 500 && status < 600) {
          log(`[proxy] ${account.name} → server error ${status} — trying next tier`);
          continue;
        }

        // 4. Other client errors (e.g. 400 Bad Request) -> return directly to client
        res.writeHead(status, proxyRes.headers);
        res.end(bodyBuf);
        return;
      }

      // For 200 SSE responses: inspect stream for body-level exhaustion signals
      // (Claude subscription quota errors arrive as 200 OK with error event in stream)
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
            trackUsageData(account.name, chunk);
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
        pipeApiResponse(proxyRes, res, responseClientModel, responseUpstreamModel, account.name);
      } else {
        pipeResponse(proxyRes, res, account.name);
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
