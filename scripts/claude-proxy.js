#!/usr/bin/env node
/**
 * claude-proxy.js — Seamless Anthropic→Cursor failover proxy
 *
 * Claude Code always talks to this proxy (port 19001).
 * This proxy forwards to Anthropic first. If rate-limited (429/529),
 * it automatically retries through the CCS Cursor daemon (port 20129).
 * Claude Code never knows the difference — fully seamless mid-session.
 *
 * Format translation:
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
      backend: cursorActive ? 'cursor' : 'anthropic',
      cursorCooldownActive: !!cursorCooldown,
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

  // Reset back to Anthropic
  if (req.url === '/reset') {
    cursorActive = false;
    if (cursorCooldown) { clearTimeout(cursorCooldown); cursorCooldown = null; }
    log('[proxy] Manually reset to Anthropic backend');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', backend: 'anthropic', message: 'Switched back to Anthropic' }));
    return;
  }

  const isApiCall = req.url?.startsWith('/v1/');
  if (!isApiCall) {
    res.writeHead(404); res.end('Not found'); return;
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

  // Try Anthropic first
  log(`[proxy] → Anthropic (${req.method} ${req.url})`);
  try {
    const proxyRes = await forwardRequest(ANTHROPIC_BASE, req, body);
    const status = proxyRes.statusCode;
    log(`[proxy] ← Anthropic ${status}`);

    if (status === 429 || status === 529) {
      // Rate limited — switch to Cursor
      markAnthropicRateLimited();
      const cursorRunning = await isCursorRunning();
      if (cursorRunning) {
        log(`[proxy] → Cursor (retry after ${status}, translating format)`);
        proxyRes.resume(); // drain the 429 response
        if (req.url?.startsWith('/v1/messages')) {
          await forwardToCursor(req, body, res);
        } else {
          const cursorRes = await forwardRequest(CURSOR_BASE, req, body);
          log(`[proxy] ← Cursor raw ${cursorRes.statusCode}`);
          pipeResponse(cursorRes, res);
        }
      } else {
        log('[proxy] Cursor daemon not running — returning rate limit to client');
        pipeResponse(proxyRes, res);
      }
      return;
    }

    pipeResponse(proxyRes, res);
  } catch (e) {
    log(`[proxy] Anthropic error: ${e.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: `Proxy error: ${e.message}`, type: 'proxy_error' } }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  log(`[proxy] Claude meta-proxy listening on http://127.0.0.1:${PORT}`);
  log(`[proxy] Anthropic: ${ANTHROPIC_BASE}`);
  log(`[proxy] Cursor fallback: ${CURSOR_BASE} (via Anthropic→OpenAI translation)`);
  log(`[proxy] Cursor model: ${CURSOR_MODEL}`);
  log(`[proxy] Anthropic retry cooldown: ${ANTHROPIC_RETRY_MS / 60000}min`);
});

server.on('error', err => {
  log(`[proxy] Server error: ${err.message}`);
  process.exit(1);
});
