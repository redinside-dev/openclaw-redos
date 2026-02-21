#!/usr/bin/env node
/**
 * claude-proxy.js — Seamless 3-tier failover proxy
 *
 * Claude Code always talks to this proxy (port 19001).
 * Failover chain:
 *   1. Cloud 1 (primary) — passthrough to api.anthropic.com
 *   2. Cursor Pro (fallback on 429/529) — Anthropic↔OpenAI translation
 *   3. Cloud 2 (final fallback) — OAuth token swap to second Claude Pro account
 *
 * Format translation (Cursor only):
 *   Anthropic /v1/messages (Claude Code format)
 *     ↓  proxy translates  ↓
 *   OpenAI /v1/chat/completions (Cursor daemon format)
 *     ↓  proxy translates back  ↓
 *   Anthropic SSE stream (Claude Code format)
 *
 * Auto-start: launchd ai.openclaw.claude-proxy
 * Configured:  ~/.claude/settings.json env.ANTHROPIC_BASE_URL
 */

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { execSync } from 'node:child_process';

const PORT = 19001;
const ANTHROPIC_BASE = 'https://api.anthropic.com';
const CURSOR_BASE = 'http://localhost:20129';
const LOG_FILE = process.env.LOG_FILE || `${process.env.HOME}/.openclaw/logs/claude-proxy.log`;
const CURSOR_MODEL = 'gpt-5.3-codex'; // from ~/.ccs/config.yaml cursor.model

// --- Logging ---

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

// --- State: track which backend is currently healthy ---
let cursorActive = false;     // true when using Cursor due to rate limit
let cursorCooldown = null;    // timer to retry Anthropic after cooldown
const ANTHROPIC_RETRY_MS = 5 * 60 * 1000; // retry Anthropic after 5 min cooldown

// --- Cloud 2 state ---
const CLOUD2_KEYCHAIN_SERVICE = 'Claude Code-credentials-205fcd97';
const CLOUD2_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const CLOUD2_SCOPES = 'user:profile user:inference user:sessions:claude_code user:mcp_servers';
let cloud2Token = null;       // cached access token
let cloud2TokenExpiry = 0;    // ms timestamp
let cloud2RateLimited = false;
let cloud2Cooldown = null;
let cloud2Active = false;      // true when manually forced to Cloud 2

function markAnthropicRateLimited() {
  if (!cursorActive) {
    log('[proxy] Anthropic rate-limited — switching to Cursor backend');
    cursorActive = true;
  }
  // Reset cooldown timer on each rate limit hit
  if (cursorCooldown) clearTimeout(cursorCooldown);
  cursorCooldown = setTimeout(() => {
    log('[proxy] Cooldown elapsed — retrying Anthropic backend');
    cursorActive = false;
    cursorCooldown = null;
  }, ANTHROPIC_RETRY_MS);
}

function markCloud2RateLimited() {
  if (!cloud2RateLimited) {
    log('[proxy] Cloud 2 rate-limited — no more fallbacks');
    cloud2RateLimited = true;
  }
  if (cloud2Cooldown) clearTimeout(cloud2Cooldown);
  cloud2Cooldown = setTimeout(() => {
    log('[proxy] Cloud 2 cooldown elapsed — available again');
    cloud2RateLimited = false;
    cloud2Cooldown = null;
  }, ANTHROPIC_RETRY_MS);
}

// --- Cloud 2 OAuth token management ---

function getCloud2TokenFromKeychain() {
  try {
    const raw = execSync(
      `security find-generic-password -s "${CLOUD2_KEYCHAIN_SERVICE}" -w`,
      { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return JSON.parse(raw).claudeAiOauth || null;
  } catch (e) {
    log(`[proxy] Cloud2 Keychain read error: ${e.message}`);
    return null;
  }
}

function saveCloud2TokenToKeychain(oauth) {
  try {
    const payload = JSON.stringify({ claudeAiOauth: oauth });
    // Delete then re-add (security CLI has no upsert)
    try { execSync(`security delete-generic-password -s "${CLOUD2_KEYCHAIN_SERVICE}"`, { stdio: 'pipe' }); } catch {}
    execSync(
      `security add-generic-password -s "${CLOUD2_KEYCHAIN_SERVICE}" -a "Claude Code" -w ${JSON.stringify(payload)}`,
      { stdio: 'pipe', timeout: 5000 }
    );
  } catch (e) {
    log(`[proxy] Cloud2 Keychain write error: ${e.message}`);
  }
}

async function refreshCloud2Token() {
  const oauth = getCloud2TokenFromKeychain();
  if (!oauth || !oauth.refreshToken) {
    log('[proxy] Cloud2: no refresh token in Keychain');
    return null;
  }

  // If cached token is still valid (with 2 min buffer), use it
  if (cloud2Token && Date.now() < cloud2TokenExpiry - 120000) {
    return cloud2Token;
  }

  // If Keychain token is still fresh (with 2 min buffer), use it directly
  if (oauth.accessToken && oauth.expiresAt && Date.now() < oauth.expiresAt - 120000) {
    cloud2Token = oauth.accessToken;
    cloud2TokenExpiry = oauth.expiresAt;
    log('[proxy] Cloud2: using existing Keychain token');
    return cloud2Token;
  }

  // Refresh the token
  log('[proxy] Cloud2: refreshing OAuth token...');
  const refreshBody = JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: oauth.refreshToken,
    client_id: CLOUD2_CLIENT_ID,
    scope: CLOUD2_SCOPES,
  });

  return new Promise((resolve) => {
    const postData = Buffer.from(refreshBody, 'utf8');
    const req = https.request({
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (data.access_token) {
            cloud2Token = data.access_token;
            cloud2TokenExpiry = Date.now() + (data.expires_in || 28800) * 1000;
            log(`[proxy] Cloud2: token refreshed (expires in ${data.expires_in || 28800}s)`);

            // Save rotated tokens back to Keychain
            const updated = { ...oauth, accessToken: data.access_token, expiresAt: cloud2TokenExpiry };
            if (data.refresh_token) updated.refreshToken = data.refresh_token;
            saveCloud2TokenToKeychain(updated);

            resolve(cloud2Token);
          } else {
            log(`[proxy] Cloud2: refresh failed — ${JSON.stringify(data)}`);
            resolve(null);
          }
        } catch (e) {
          log(`[proxy] Cloud2: refresh parse error — ${e.message}`);
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      log(`[proxy] Cloud2: refresh request error — ${e.message}`);
      resolve(null);
    });
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.write(postData);
    req.end();
  });
}

// --- Forward request to Anthropic with Cloud 2's auth ---
function forwardRequestCloud2(originalReq, bodyBuffer, token) {
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
    // Ensure oauth beta flag is present (required for OAuth Bearer auth)
    const existingBeta = headers['anthropic-beta'] || '';
    if (!existingBeta.includes('oauth-2025-04-20')) {
      headers['anthropic-beta'] = existingBeta ? `${existingBeta},oauth-2025-04-20` : 'oauth-2025-04-20';
    }
    if (bodyBuffer.length) {
      headers['content-length'] = bodyBuffer.length;
    }

    const options = {
      hostname: target.hostname,
      port: 443,
      path: reqPath,
      method: originalReq.method,
      headers,
    };

    const proxyReq = https.request(options, proxyRes => resolve(proxyRes));
    proxyReq.on('error', reject);
    proxyReq.setTimeout(120000, () => proxyReq.destroy(new Error('cloud2 upstream timeout')));
    if (bodyBuffer.length) proxyReq.write(bodyBuffer);
    proxyReq.end();
  });
}

// --- Check if Cursor daemon is running ---
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

// --- Forward a raw request to a target base URL (for Anthropic passthrough) ---
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
    if (bodyBuffer.length) {
      headers['content-length'] = bodyBuffer.length;
    }

    const options = {
      hostname: target.hostname,
      port: target.port || (isTls ? 443 : 80),
      path: reqPath,
      method: originalReq.method,
      headers,
    };

    const proto = isTls ? https : http;
    const proxyReq = proto.request(options, proxyRes => resolve(proxyRes));
    proxyReq.on('error', reject);
    proxyReq.setTimeout(120000, () => proxyReq.destroy(new Error('upstream timeout')));
    if (bodyBuffer.length) proxyReq.write(bodyBuffer);
    proxyReq.end();
  });
}

// ============================================================
// FORMAT TRANSLATION: Anthropic Messages API ↔ OpenAI Chat
// ============================================================

/**
 * Translate an Anthropic /v1/messages request body to OpenAI /v1/chat/completions.
 * Returns a new Buffer with the translated JSON.
 */
function anthropicToOpenAI(bodyBuffer) {
  let body;
  try {
    body = JSON.parse(bodyBuffer.toString('utf8'));
  } catch (e) {
    throw new Error(`anthropicToOpenAI: invalid JSON body: ${e.message}`);
  }

  const messages = [];

  // System prompt → OpenAI system message
  if (body.system) {
    let text;
    if (typeof body.system === 'string') {
      text = body.system;
    } else if (Array.isArray(body.system)) {
      text = body.system.filter(b => b.type === 'text').map(b => b.text).join('\n');
    }
    if (text && text.trim()) {
      messages.push({ role: 'system', content: text });
    }
  }

  // Conversation messages
  for (const msg of (body.messages || [])) {
    let content = msg.content;
    if (Array.isArray(content)) {
      // Multi-part content — flatten text parts, skip tool_use / image blocks
      content = content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n');
    }
    messages.push({ role: msg.role, content: content || '' });
  }

  const out = {
    model: CURSOR_MODEL,
    messages,
    stream: body.stream !== false, // preserve streaming preference (default true)
  };

  if (body.max_tokens) out.max_tokens = body.max_tokens;
  if (body.temperature !== undefined) out.temperature = body.temperature;
  if (body.top_p !== undefined) out.top_p = body.top_p;

  return Buffer.from(JSON.stringify(out), 'utf8');
}

/**
 * Translate a full (non-streaming) OpenAI response to Anthropic format.
 */
function openAIToAnthropicFull(bodyBuffer, anthropicModel) {
  let d;
  try {
    d = JSON.parse(bodyBuffer.toString('utf8'));
  } catch (e) {
    throw new Error(`openAIToAnthropicFull: invalid JSON: ${e.message}`);
  }

  const choice = d.choices?.[0] || {};
  const text = choice.message?.content || '';
  const usage = d.usage || {};

  return Buffer.from(JSON.stringify({
    id: d.id || `msg_cursor_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    model: anthropicModel || 'claude-sonnet-4-6',
    content: [{ type: 'text', text }],
    stop_reason: choice.finish_reason === 'stop' ? 'end_turn' : (choice.finish_reason || 'end_turn'),
    stop_sequence: null,
    usage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
    },
  }), 'utf8');
}

/**
 * Emit a single SSE event in Anthropic format.
 */
function sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create a Transform stream that converts OpenAI SSE chunks → Anthropic SSE chunks.
 * OpenAI: data: {"choices":[{"delta":{"content":"text"}}]}  /  data: [DONE]
 * Anthropic: event: content_block_delta\ndata: {...}\n\n
 */
function createAnthropicStreamTransformer(anthropicModel) {
  const msgId = `msg_cursor_${Date.now()}`;
  let headerSent = false;
  let outputTokens = 0;
  let leftover = ''; // incomplete SSE line buffer

  return new Transform({
    transform(chunk, _enc, cb) {
      leftover += chunk.toString('utf8');
      const lines = leftover.split('\n');
      leftover = lines.pop(); // keep incomplete trailing line

      const out = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const raw = trimmed.slice(5).trim();

        if (raw === '[DONE]') {
          // Stream finished — emit closing events
          out.push(sseEvent('content_block_stop', { type: 'content_block_stop', index: 0 }));
          out.push(sseEvent('message_delta', {
            type: 'message_delta',
            delta: { stop_reason: 'end_turn', stop_sequence: null },
            usage: { output_tokens: outputTokens },
          }));
          out.push(sseEvent('message_stop', { type: 'message_stop' }));
          continue;
        }

        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }

        const choice = parsed.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta || {};

        // Send Anthropic header events once (on first content or role)
        if (!headerSent && (delta.role || delta.content !== undefined)) {
          out.push(sseEvent('message_start', {
            type: 'message_start',
            message: {
              id: msgId,
              type: 'message',
              role: 'assistant',
              content: [],
              model: anthropicModel || 'claude-sonnet-4-6',
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 0, output_tokens: 0 },
            },
          }));
          out.push(sseEvent('content_block_start', {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'text', text: '' },
          }));
          headerSent = true;
        }

        // Content delta
        if (delta.content) {
          outputTokens++;
          out.push(sseEvent('content_block_delta', {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: delta.content },
          }));
        }
      }

      if (out.length) this.push(out.join(''));
      cb();
    },

    flush(cb) {
      // Handle any leftover buffer
      if (leftover.trim().startsWith('data:')) {
        const raw = leftover.trim().slice(5).trim();
        if (raw === '[DONE]') {
          const out = [];
          out.push(sseEvent('content_block_stop', { type: 'content_block_stop', index: 0 }));
          out.push(sseEvent('message_delta', {
            type: 'message_delta',
            delta: { stop_reason: 'end_turn', stop_sequence: null },
            usage: { output_tokens: outputTokens },
          }));
          out.push(sseEvent('message_stop', { type: 'message_stop' }));
          this.push(out.join(''));
        }
      }

      // Ensure we always close properly
      if (!headerSent) {
        const out = [];
        out.push(sseEvent('message_start', {
          type: 'message_start',
          message: { id: msgId, type: 'message', role: 'assistant', content: [],
            model: anthropicModel || 'claude-sonnet-4-6', stop_reason: 'end_turn',
            stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } },
        }));
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

// --- Forward to Cursor daemon with Anthropic→OpenAI translation ---
async function forwardToCursor(originalReq, bodyBuffer, clientRes) {
  // Translate request body: Anthropic → OpenAI
  const openaiBody = anthropicToOpenAI(bodyBuffer);
  const isStreaming = (() => {
    try { return JSON.parse(bodyBuffer.toString('utf8')).stream !== false; } catch { return true; }
  })();
  const anthropicModel = (() => {
    try { return JSON.parse(bodyBuffer.toString('utf8')).model; } catch { return 'claude-sonnet-4-6'; }
  })();

  // Build translated request headers
  const headers = {
    'host': 'localhost',
    'content-type': 'application/json',
    'content-length': openaiBody.length,
    'authorization': 'Bearer cursor-local',
    'x-api-key': 'cursor-local',
  };

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 20129,
      path: '/v1/chat/completions',  // Cursor daemon endpoint
      method: 'POST',
      headers,
    };

    const req = http.request(options, cursorRes => {
      log(`[proxy] ← Cursor ${cursorRes.statusCode} (via translation)`);

      if (isStreaming) {
        // Stream: pipe through transformer that converts OpenAI SSE → Anthropic SSE
        const transformer = createAnthropicStreamTransformer(anthropicModel);
        clientRes.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        cursorRes.pipe(transformer).pipe(clientRes);
        transformer.on('finish', resolve);
        transformer.on('error', reject);
      } else {
        // Non-streaming: buffer, translate, send
        const chunks = [];
        cursorRes.on('data', c => chunks.push(c));
        cursorRes.on('end', () => {
          try {
            const translated = openAIToAnthropicFull(Buffer.concat(chunks), anthropicModel);
            clientRes.writeHead(200, {
              'Content-Type': 'application/json',
              'Content-Length': translated.length,
            });
            clientRes.end(translated);
            resolve();
          } catch (e) {
            reject(e);
          }
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

// --- Pipe Anthropic response directly back to client ---
function pipeResponse(proxyRes, clientRes) {
  clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
  proxyRes.pipe(clientRes);
}

// --- Main server ---
const server = http.createServer(async (req, res) => {
  // Collect request body
  const chunks = [];
  req.on('data', c => chunks.push(c));
  await new Promise(r => req.on('end', r));
  const body = Buffer.concat(chunks);

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      backend: cloud2Active ? 'cloud2' : cursorActive ? 'cursor' : 'anthropic',
      cursorCooldownActive: !!cursorCooldown,
      cloud2RateLimited,
      cloud2TokenCached: !!cloud2Token,
    }));
    return;
  }

  // Force cursor mode (for manual testing)
  if (req.url === '/force-cursor') {
    cursorActive = true;
    if (cursorCooldown) clearTimeout(cursorCooldown);
    cursorCooldown = setTimeout(() => { cursorActive = false; cursorCooldown = null; }, ANTHROPIC_RETRY_MS);
    log('[proxy] Manually forced to Cursor backend');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', backend: 'cursor', message: 'Switched to Cursor — resets in 5 min' }));
    return;
  }

  // Force Cloud 2 mode
  if (req.url === '/force-cloud2') {
    cursorActive = false;
    cloud2Active = true;
    cloud2RateLimited = false;
    if (cursorCooldown) { clearTimeout(cursorCooldown); cursorCooldown = null; }
    log('[proxy] Manually forced to Cloud 2 backend');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', backend: 'cloud2', message: 'Switched to Cloud 2 — use /reset to go back' }));
    return;
  }

  // Reset back to Anthropic
  if (req.url === '/reset') {
    cursorActive = false;
    cloud2RateLimited = false;
    if (cursorCooldown) { clearTimeout(cursorCooldown); cursorCooldown = null; }
    if (cloud2Cooldown) { clearTimeout(cloud2Cooldown); cloud2Cooldown = null; }
    cloud2Active = false;
    cloud2Token = null;
    cloud2TokenExpiry = 0;
    log('[proxy] Manually reset to Anthropic backend (all tiers cleared)');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', backend: 'anthropic', message: 'Reset all tiers — back to Cloud 1' }));
    return;
  }

  const isApiCall = req.url?.startsWith('/v1/');
  if (!isApiCall) {
    res.writeHead(404); res.end('Not found'); return;
  }

  // If manually forced to Cloud 2, go straight to Cloud 2
  if (cloud2Active) {
    log(`[proxy] → Cloud 2 direct (${req.method} ${req.url})`);
    const token = await refreshCloud2Token();
    if (!token) {
      log('[proxy] Cloud 2 token unavailable — falling back to Cloud 1');
      cloud2Active = false;
    } else {
      try {
        const c2Res = await forwardRequestCloud2(req, body, token);
        const c2Status = c2Res.statusCode;
        log(`[proxy] ← Cloud 2 ${c2Status}`);
        if (c2Status === 429 || c2Status === 529) {
          markCloud2RateLimited();
          cloud2Active = false;
          log('[proxy] Cloud 2 rate-limited — falling back to Cloud 1');
        } else {
          pipeResponse(c2Res, res);
          return;
        }
      } catch (e) {
        log(`[proxy] Cloud 2 error: ${e.message} — falling back to Cloud 1`);
        cloud2Active = false;
      }
    }
  }

  // If already in cursor-mode, go straight to cursor
  if (cursorActive) {
    log(`[proxy] → Cursor direct (${req.method} ${req.url})`);

    // Claude Code validates models via GET /v1/models before sending messages.
    // Cursor's model list doesn't include claude-sonnet-4-6 — fake it so Claude Code passes validation.
    if (req.method === 'GET' && req.url === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        object: 'list',
        data: [
          { id: 'claude-sonnet-4-6', object: 'model', created: 0, owned_by: 'anthropic' },
          { id: 'claude-opus-4-6', object: 'model', created: 0, owned_by: 'anthropic' },
          { id: 'claude-haiku-4-5', object: 'model', created: 0, owned_by: 'anthropic' },
        ],
      }));
      return;
    }

    const cursorRunning = await isCursorRunning();
    if (!cursorRunning) {
      log('[proxy] Cursor daemon not running — falling back to Anthropic anyway');
      cursorActive = false;
    } else {
      try {
        if (req.url?.startsWith('/v1/messages')) {
          await forwardToCursor(req, body, res);
        } else {
          // Other non-messages endpoints — pass through directly
          const proxyRes = await forwardRequest(CURSOR_BASE, req, body);
          log(`[proxy] ← Cursor raw ${proxyRes.statusCode}`);
          pipeResponse(proxyRes, res);
        }
        return;
      } catch (e) {
        log(`[proxy] Cursor error: ${e.message} — retrying Anthropic`);
        cursorActive = false;
      }
    }
  }

  // --- Helper: try Cloud 2 as final fallback ---
  async function tryCloud2(reason) {
    if (cloud2RateLimited) {
      log(`[proxy] Cloud 2 also rate-limited — no more fallbacks (${reason})`);
      return null;
    }
    const token = await refreshCloud2Token();
    if (!token) {
      log(`[proxy] Cloud 2 token unavailable — no more fallbacks (${reason})`);
      return null;
    }
    log(`[proxy] → Cloud 2 (${reason})`);
    try {
      const c2Res = await forwardRequestCloud2(req, body, token);
      const c2Status = c2Res.statusCode;
      log(`[proxy] ← Cloud 2 ${c2Status}`);
      if (c2Status === 429 || c2Status === 529) {
        markCloud2RateLimited();
        return c2Res; // return the 429 to caller to pass to client
      }
      return c2Res;
    } catch (e) {
      log(`[proxy] Cloud 2 error: ${e.message}`);
      return null;
    }
  }

  // ====== TIER 1: Try Anthropic (Cloud 1) first ======
  log(`[proxy] → Anthropic (${req.method} ${req.url})`);
  try {
    const proxyRes = await forwardRequest(ANTHROPIC_BASE, req, body);
    const status = proxyRes.statusCode;
    log(`[proxy] ← Anthropic ${status}`);

    if (status === 429 || status === 529) {
      // Rate limited — try Cursor, then Cloud 2
      markAnthropicRateLimited();
      proxyRes.resume(); // drain the 429 response

      // ====== TIER 2: Try Cursor ======
      const cursorRunning = await isCursorRunning();
      if (cursorRunning) {
        log(`[proxy] → Cursor (retry after ${status}, translating format)`);
        try {
          if (req.url?.startsWith('/v1/messages')) {
            await forwardToCursor(req, body, res);
          } else {
            const cursorRes = await forwardRequest(CURSOR_BASE, req, body);
            log(`[proxy] ← Cursor raw ${cursorRes.statusCode}`);
            pipeResponse(cursorRes, res);
          }
          return;
        } catch (cursorErr) {
          log(`[proxy] Cursor error: ${cursorErr.message} — trying Cloud 2`);
        }
      } else {
        log('[proxy] Cursor daemon not running — trying Cloud 2');
      }

      // ====== TIER 3: Try Cloud 2 ======
      const c2Res = await tryCloud2(`after Cloud1 ${status} + Cursor unavailable`);
      if (c2Res) {
        pipeResponse(c2Res, res);
      } else {
        // All tiers exhausted — return 429 to client
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'All backends rate-limited or unavailable', type: 'rate_limit_error' } }));
      }
      return;
    }

    pipeResponse(proxyRes, res);
  } catch (e) {
    log(`[proxy] Anthropic error: ${e.message}`);
    // Cloud 1 network error — try Cloud 2 directly
    const c2Res = await tryCloud2(`after Cloud1 error: ${e.message}`);
    if (c2Res) {
      pipeResponse(c2Res, res);
    } else {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `Proxy error: ${e.message}`, type: 'proxy_error' } }));
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  log(`[proxy] Claude 3-tier meta-proxy listening on http://127.0.0.1:${PORT}`);
  log(`[proxy] Tier 1: Cloud 1 (Anthropic passthrough) → ${ANTHROPIC_BASE}`);
  log(`[proxy] Tier 2: Cursor Pro (Anthropic↔OpenAI translation) → ${CURSOR_BASE}`);
  log(`[proxy] Tier 3: Cloud 2 (OAuth token swap) → ${ANTHROPIC_BASE}`);
  log(`[proxy] Cursor model: ${CURSOR_MODEL}`);
  log(`[proxy] Cooldown: ${ANTHROPIC_RETRY_MS / 60000}min`);
});

server.on('error', err => {
  log(`[proxy] Server error: ${err.message}`);
  process.exit(1);
});
