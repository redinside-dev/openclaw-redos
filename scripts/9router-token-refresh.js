#!/usr/bin/env node
/**
 * 9router-token-refresh.js
 *
 * Keeps 9Router OAuth tokens fresh automatically — no browser interaction needed.
 *
 * Strategy per provider:
 *   kiro      → Direct AWS IDC OIDC refresh (JSON body, camelCase fields).
 *               Tokens expire every 1h; refresh tokens are long-lived. No browser needed.
 *               Refreshes in the last KIRO_BUFFER_MINS (default 15min) before expiry.
 *   claude    → Direct POST https://console.anthropic.com/v1/oauth/token (JSON body).
 *               client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e. Tokens expire every 8h.
 *               Refreshes in the last CLAUDE_BUFFER_MINS (default 60min). Fully automatic.
 *   codex     → Direct POST https://auth.openai.com/oauth/token (form-encoded).
 *               client_id=app_EMoamEEZ73f0CkXaXp7hrann. Tokens expire every ~10 days.
 *               Refreshes in the last CODEX_BUFFER_MINS (default 120min). Fully automatic.
 *   cursor    → Reads token directly from Cursor's local SQLite and patches db.json.
 *               JWT valid ~52 days; syncs automatically when stale.
 *   iflow     → POST https://iflow.cn/oauth/token with grant_type=refresh_token + client_secret.
 *               client_id=10009311001. Tokens expire every 48h; refresh tokens rotate.
 *               After token refresh, fetches fresh apiKey from getUserInfo endpoint.
 *               Refreshes in the last IFLOW_BUFFER_MINS (default 60min). Fully automatic.
 *   qwen      → POST https://chat.qwen.ai/api/v1/oauth2/token with grant_type=refresh_token.
 *               client_id=f0304373b74a44d2b584a3fb70ca9e56, form-encoded.
 *               Tokens expire every 6h; refresh tokens rotate on each use.
 *               Refreshes in the last QWEN_BUFFER_MINS (default 30min) before expiry.
 *               Fully automatic — no browser interaction needed.
 *   openrouter → API keys, no expiry. Skip.
 *
 * Usage:
 *   node scripts/9router-token-refresh.js              # refresh/sync tokens expiring within 1h
 *   node scripts/9router-token-refresh.js --all        # test/sync ALL active connections
 *   node scripts/9router-token-refresh.js --dry-run    # show what would happen
 *   WARN_HOURS=2 node ...                              # custom warning window (default 1h)
 *
 * Exit codes: 0 = all ok, 1 = script error, 2 = auth alert (token expired, re-auth needed)
 * Run every 4 minutes via cron to never miss 9Router's 5-min refresh window.
 */

import fs           from 'fs';
import http         from 'http';
import https        from 'https';
import { execSync } from 'child_process';

const HOME       = process.env.HOME;
const DB_PATH    = `${HOME}/.9router/db.json`;
const NINER_PORT = 20128;
const NINER_HOST = '127.0.0.1';
const DRY_RUN          = process.argv.includes('--dry-run');
const ALL              = process.argv.includes('--all');
const WARN_HOURS       = parseFloat(process.env.WARN_HOURS || '1');
// Kiro tokens last 1h — only refresh in the last 15min (or if already expired)
const KIRO_BUFFER_MINS = parseFloat(process.env.KIRO_BUFFER_MINS || '15');
// Qwen tokens last 6h — refresh in the last 30min before expiry
const QWEN_BUFFER_MINS  = parseFloat(process.env.QWEN_BUFFER_MINS || '30');
const QWEN_TOKEN_URL    = 'https://chat.qwen.ai/api/v1/oauth2/token';
const QWEN_CLIENT_ID    = 'f0304373b74a44d2b584a3fb70ca9e56';

// iFlow tokens last 48h — refresh in the last 60min before expiry
const IFLOW_BUFFER_MINS   = parseFloat(process.env.IFLOW_BUFFER_MINS || '60');
const IFLOW_TOKEN_URL     = 'https://iflow.cn/oauth/token';
const IFLOW_CLIENT_ID     = '10009311001';
const IFLOW_CLIENT_SECRET = '4Z3YjXycVsQvyGF1etiNlIBB4RsqSDtW';
const IFLOW_USERINFO_URL  = 'https://iflow.cn/api/oauth/getUserInfo';

// Claude tokens last 8h — refresh in the last 60min before expiry
// Source: 9Router module 2255 (7647.js), function f() in 7189.js
const CLAUDE_BUFFER_MINS = parseFloat(process.env.CLAUDE_BUFFER_MINS || '60');
const CLAUDE_TOKEN_URL   = 'https://console.anthropic.com/v1/oauth/token';
const CLAUDE_CLIENT_ID   = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

// Codex tokens last ~10 days — refresh in the last 120min before expiry
// Source: 9Router module 2255 (7647.js), function h() codex case in 6084.js
const CODEX_BUFFER_MINS = parseFloat(process.env.CODEX_BUFFER_MINS || '120');
const CODEX_TOKEN_URL   = 'https://auth.openai.com/oauth/token';
const CODEX_CLIENT_ID   = 'app_EMoamEEZ73f0CkXaXp7hrann';

// Cursor SQLite path on macOS
const CURSOR_DB     = `${HOME}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
const CURSOR_READER = new URL('../scripts/cursor-sqlite-read.py', import.meta.url).pathname;

// Providers handled via dedicated refresh functions — skip the generic /test path
const SKIP_TEST_PROVIDERS = new Set(['iflow', 'openrouter', 'qwen', 'claude', 'codex']);

// ── Self-healing alert ────────────────────────────────────────────────────────
// When a provider is exhausted/expired, send a Telegram DM to RED so the team
// can detect and recover. Message includes provider name + recovery action.
// Uses the same Telegram bot token that the gateway uses for @RedinsideBot.
function buildExhaustionAlert(providerAlerts) {
  if (!providerAlerts.length) return null;
  const lines = [
    '🚨 *9ROUTER RESOURCE ALERT*',
    '',
    'The following providers need attention to keep the coding factory running:',
    '',
    ...providerAlerts.map(a => `• ${a}`),
    '',
    '→ Re-authenticate at http://localhost:20128 → Providers',
    '→ Or run: `node scripts/9router-token-refresh.js --all`',
  ];
  return lines.join('\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoursUntilExpiry(conn) {
  if (!conn.expiresAt) return Infinity;
  return (new Date(conn.expiresAt) - Date.now()) / 3600000;
}

function getNinerKey() {
  try {
    const raw = fs.readFileSync(`${HOME}/.openclaw/openclaw.json`, 'utf8');
    // Fast path: key directly embedded in openclaw.json (legacy format)
    const m = raw.match(/sk-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-[a-z0-9]+-[a-f0-9]+/);
    if (m) return m[0];

    // SecretRef path: key stored in credentials file (OpenClaw 2026.3.2+ format)
    // models.providers['9router'].apiKey = {source:'file', provider:'credentials-file', id:'/providers/9router'}
    const cfg = JSON.parse(raw);
    const apiKeyRef = cfg?.models?.providers?.['9router']?.apiKey;
    if (!apiKeyRef || typeof apiKeyRef !== 'object' || apiKeyRef.source !== 'file') return null;

    const providerName = apiKeyRef.provider;
    const providerCfg  = cfg?.secrets?.providers?.[providerName];
    if (!providerCfg?.path) return null;

    // Path may be absolute or relative to ~/.openclaw/
    const credPath = providerCfg.path.startsWith('/')
      ? providerCfg.path
      : `${HOME}/.openclaw/${providerCfg.path}`;
    const secrets = JSON.parse(fs.readFileSync(credPath, 'utf8'));

    // Resolve JSON pointer: '/providers/9router' → secrets['providers']['9router']
    const ptr = (apiKeyRef.id || '').replace(/^\//, '').split('/');
    let val = secrets;
    for (const seg of ptr) { val = val?.[seg]; }
    return typeof val === 'string' && val.length > 0 ? val : null;
  } catch { return null; }
}

function apiTest(connId, apiKey) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: NINER_HOST,
      port:     NINER_PORT,
      path:     `/api/providers/${connId}/test`,
      method:   'POST',
      headers:  {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'Content-Length': 0,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ valid: false, error: `bad JSON: ${data.slice(0,100)}` }); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// ── Kiro: refresh via AWS IDC OIDC token endpoint ────────────────────────────
// Source: 9Router's KiroAuthService.refreshToken() — JSON body, camelCase keys.
// Access tokens expire in 3600s; refresh tokens are long-lived and don't rotate.

function kiroRefresh(clientId, clientSecret, refreshToken, region = 'us-east-1') {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify({
      clientId, clientSecret, refreshToken, grantType: 'refresh_token',
    }));
    const req = https.request({
      hostname: `oidc.${region}.amazonaws.com`,
      path:     '/token',
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': body.length },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (res.statusCode === 200) resolve(j);
          else reject(new Error(j.error_description || j.error || `HTTP ${res.statusCode}`));
        } catch { reject(new Error(`bad JSON (${res.statusCode}): ${data.slice(0, 100)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end(body);
  });
}

async function applyKiroRefresh(conn) {
  const psd    = conn.providerSpecificData || {};
  const { clientId, clientSecret } = psd;
  const refreshToken = conn.refreshToken;
  if (!clientId || !clientSecret || !refreshToken) {
    return { refreshed: false, error: 'missing clientId/clientSecret/refreshToken in db.json' };
  }
  try {
    const result = await kiroRefresh(clientId, clientSecret, refreshToken);
    conn.accessToken = result.accessToken;
    if (result.refreshToken) conn.refreshToken = result.refreshToken; // rotate if provided
    conn.expiresAt   = new Date(Date.now() + result.expiresIn * 1000).toISOString();
    conn.isActive    = true;
    conn.testStatus  = 'active';
    conn.lastError   = null;
    conn.lastErrorAt = null;
    conn.updatedAt   = new Date().toISOString();
    return { refreshed: true, expiresIn: result.expiresIn };
  } catch (err) {
    return { refreshed: false, error: err.message };
  }
}

// ── Cursor: read from local SQLite via Python3 ────────────────────────────────

function readCursorTokenFromSQLite() {
  if (!fs.existsSync(CURSOR_DB)) return null;
  try {
    // cursor-sqlite-read.py reads the SQLite and decodes the JWT expiry — no npm deps needed
    const out = execSync(
      `python3 ${JSON.stringify(CURSOR_READER)} ${JSON.stringify(CURSOR_DB)}`,
      { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return JSON.parse(out.trim());
  } catch {
    return null;
  }
}

function applyCursorSync(conn) {
  const fresh = readCursorTokenFromSQLite();
  if (!fresh || !fresh.token) {
    return { synced: false, error: 'Could not read Cursor SQLite — is Cursor installed?' };
  }

  const changed = conn.accessToken !== fresh.token
    || conn.expiresAt   !== fresh.expiresAt
    || conn.machineId   !== fresh.machineId;

  if (!changed) return { synced: false, unchanged: true };

  conn.accessToken = fresh.token;
  conn.machineId   = fresh.machineId;
  conn.expiresAt   = fresh.expiresAt;
  conn.isActive    = true;
  conn.testStatus  = 'active';
  conn.lastError   = null;
  conn.lastErrorAt = null;
  conn.updatedAt   = new Date().toISOString();

  return { synced: true };
}

// ── Qwen: direct refresh_token grant ─────────────────────────────────────────
// Endpoint: POST https://chat.qwen.ai/api/v1/oauth2/token (form-encoded)
// Tokens expire every 6h; refresh tokens rotate on each use.
// Source: qwen-code/packages/core/src/qwen/qwenOAuth2.js

function qwenRefresh(refreshToken) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(
      `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=${QWEN_CLIENT_ID}`
    );
    const req = https.request({
      hostname: 'chat.qwen.ai',
      path:     '/api/v1/oauth2/token',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Accept':         'application/json',
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (res.statusCode === 200 && j.access_token) resolve(j);
          else reject(new Error(j.error_description || j.error || j.detail || `HTTP ${res.statusCode}`));
        } catch { reject(new Error(`bad JSON (${res.statusCode}): ${data.slice(0, 100)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end(body);
  });
}

async function applyQwenRefresh(conn) {
  const refreshToken = conn.refreshToken;
  if (!refreshToken) return { refreshed: false, error: 'no refresh token stored' };
  try {
    const result = await qwenRefresh(refreshToken);
    conn.accessToken  = result.access_token;
    conn.refreshToken = result.refresh_token; // rotates each use
    conn.expiresAt    = new Date(Date.now() + result.expires_in * 1000).toISOString();
    conn.expiresIn    = result.expires_in;
    conn.isActive     = true;
    conn.testStatus   = 'active';
    conn.lastError    = null;
    conn.lastErrorAt  = null;
    conn.updatedAt    = new Date().toISOString();
    return { refreshed: true, expiresIn: result.expires_in };
  } catch (err) {
    return { refreshed: false, error: err.message };
  }
}

async function handleQwenAccounts(conns, alerts) {
  const qwenConns = conns.filter(c => c.provider === 'qwen' && c.isActive);
  if (qwenConns.length === 0) return { skipped: 0, refreshed: 0, dbChanged: false };

  const bufferHours = QWEN_BUFFER_MINS / 60;
  let skipped = 0, refreshed = 0;
  let dbChanged = false;

  for (const conn of qwenConns) {
    const name   = conn.name || conn.id;
    const hours  = hoursUntilExpiry(conn);
    const isExp  = hours < 0;
    const needsRefresh = ALL || isExp || hours < bufferHours;

    if (!needsRefresh) { skipped++; continue; }

    const timeLabel = isExp
      ? `EXPIRED ${Math.abs(hours * 60).toFixed(0)}min ago`
      : `expires in ${(hours * 60).toFixed(0)}min`;

    if (DRY_RUN) {
      console.log(`🔍 [qwen] ${name}: would refresh via token endpoint (${timeLabel})`);
      continue;
    }

    process.stdout.write(`🔄 [qwen] ${name} (${timeLabel}) → `);
    const r = await applyQwenRefresh(conn);
    if (r.refreshed) {
      console.log(`✅ refreshed — new expiry in ${r.expiresIn}s (${conn.expiresAt?.slice(0, 19)})`);
      dbChanged = true;
      refreshed++;
    } else {
      console.log(`❌ ${r.error}`);
      alerts.push(`⛔ [qwen] ${name}: ${r.error} — re-auth at http://localhost:20128`);
    }
  }

  if (!DRY_RUN && !needsRefreshAny(qwenConns, bufferHours)) {
    // All healthy — log summary when --all requested
    if (ALL) {
      const minH = Math.min(...qwenConns.map(hoursUntilExpiry));
      console.log(`🔍 [qwen] ${qwenConns.length} account(s) healthy (min expiry in ${(minH * 60).toFixed(0)}min)`);
    }
  }
  if (DRY_RUN && !qwenConns.some(c => { const h = hoursUntilExpiry(c); return ALL || h < 0 || h < bufferHours; })) {
    const minH = Math.min(...qwenConns.map(hoursUntilExpiry));
    console.log(`🔍 [qwen] ${qwenConns.length} account(s) healthy (min expiry in ${(minH * 60).toFixed(0)}min — refresh triggers at <${QWEN_BUFFER_MINS}min)`);
  }

  return { skipped, refreshed, dbChanged };
}

function needsRefreshAny(conns, bufferHours) {
  return conns.some(c => { const h = hoursUntilExpiry(c); return ALL || h < 0 || h < bufferHours; });
}

// ── iFlow: direct refresh_token grant ────────────────────────────────────────
// Endpoint: POST https://iflow.cn/oauth/token (form-encoded)
// Requires client_secret in addition to client_id.
// Tokens expire every 48h; refresh tokens rotate on each use.

function iflowRefresh(refreshToken) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(
      `grant_type=refresh_token` +
      `&refresh_token=${encodeURIComponent(refreshToken)}` +
      `&client_id=${IFLOW_CLIENT_ID}` +
      `&client_secret=${encodeURIComponent(IFLOW_CLIENT_SECRET)}`
    );
    const req = https.request({
      hostname: 'iflow.cn',
      path:     '/oauth/token',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Accept':         'application/json',
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (res.statusCode === 200 && j.access_token) resolve(j);
          else reject(new Error(j.error_description || j.error || j.message || `HTTP ${res.statusCode}`));
        } catch { reject(new Error(`bad JSON (${res.statusCode}): ${data.slice(0, 100)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end(body);
  });
}

// iFlow apiKey is separate from accessToken — fetch via getUserInfo after each token refresh.
// 9Router's iFlow provider uses apiKey (not accessToken) for request signing + Bearer auth.
// Endpoint uses query param ?accessToken=..., NOT an Authorization header.
function iflowGetUserInfo(accessToken) {
  return new Promise((resolve) => {
    const path = `/api/oauth/getUserInfo?accessToken=${encodeURIComponent(accessToken)}`;
    const req = https.request({
      hostname: 'iflow.cn',
      path,
      method:   'GET',
      headers:  { 'Accept': 'application/json', 'User-Agent': 'iFlow-Cli' },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve((res.statusCode === 200 && j.success) ? j.data : null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function applyIflowRefresh(conn) {
  const refreshToken = conn.refreshToken;
  if (!refreshToken) return { refreshed: false, error: 'no refresh token stored' };
  try {
    const result = await iflowRefresh(refreshToken);
    conn.accessToken  = result.access_token;
    conn.refreshToken = result.refresh_token; // rotates each use
    conn.expiresAt    = new Date(Date.now() + result.expires_in * 1000).toISOString();
    conn.expiresIn    = result.expires_in;
    conn.isActive     = true;
    conn.testStatus   = 'active';
    conn.lastError    = null;
    conn.lastErrorAt  = null;
    conn.updatedAt    = new Date().toISOString();
    // Fetch fresh apiKey — iFlow uses apiKey (not accessToken) for inference request signing
    const userInfo = await iflowGetUserInfo(result.access_token);
    if (userInfo?.apiKey) conn.apiKey = userInfo.apiKey;
    return { refreshed: true, expiresIn: result.expires_in, apiKeyUpdated: !!userInfo?.apiKey };
  } catch (err) {
    return { refreshed: false, error: err.message };
  }
}

async function handleIflowAccounts(conns, alerts) {
  const iflowConns = conns.filter(c => c.provider === 'iflow' && c.isActive);
  if (iflowConns.length === 0) return { skipped: 0, refreshed: 0, dbChanged: false };

  const bufferHours = IFLOW_BUFFER_MINS / 60;
  let skipped = 0, refreshed = 0;
  let dbChanged = false;

  for (const conn of iflowConns) {
    const name   = conn.name || conn.id;
    const hours  = hoursUntilExpiry(conn);
    const isExp  = hours < 0;
    const needsRefresh = ALL || isExp || hours < bufferHours;

    if (!needsRefresh) { skipped++; continue; }

    const timeLabel = isExp
      ? `EXPIRED ${Math.abs(hours * 60).toFixed(0)}min ago`
      : `expires in ${(hours * 60).toFixed(0)}min`;

    if (DRY_RUN) {
      console.log(`🔍 [iflow] ${name}: would refresh via token endpoint (${timeLabel})`);
      continue;
    }

    process.stdout.write(`🔄 [iflow] ${name} (${timeLabel}) → `);
    const r = await applyIflowRefresh(conn);
    if (r.refreshed) {
      const apiKeyNote = r.apiKeyUpdated ? ', apiKey updated' : ', apiKey unchanged';
      console.log(`✅ refreshed — new expiry in ${r.expiresIn}s (${conn.expiresAt?.slice(0, 19)}${apiKeyNote})`);
      dbChanged = true;
      refreshed++;
    } else {
      console.log(`❌ ${r.error}`);
      alerts.push(`⛔ [iflow] ${name}: ${r.error} — re-auth at http://localhost:20128`);
    }
  }

  if (!DRY_RUN && !needsRefreshAny(iflowConns, bufferHours)) {
    if (ALL) {
      const minH = Math.min(...iflowConns.map(hoursUntilExpiry));
      console.log(`🔍 [iflow] ${iflowConns.length} account(s) healthy (min expiry in ${(minH * 60).toFixed(0)}min)`);
    }
  }
  if (DRY_RUN && !iflowConns.some(c => { const h = hoursUntilExpiry(c); return ALL || h < 0 || h < bufferHours; })) {
    const minH = Math.min(...iflowConns.map(hoursUntilExpiry));
    console.log(`🔍 [iflow] ${iflowConns.length} account(s) healthy (min expiry in ${(minH * 60).toFixed(0)}min — refresh triggers at <${IFLOW_BUFFER_MINS}min)`);
  }

  return { skipped, refreshed, dbChanged };
}

// ── Claude: direct OAuth refresh via Anthropic token endpoint ────────────────
// Tokens expire every 8h (28800s). Direct refresh — no dependency on 9Router /test.
// Source: 9Router 7189.js function f(), module 2255 claude config.

function claudeRefresh(refreshToken) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify({
      grant_type: 'refresh_token', refresh_token: refreshToken, client_id: CLAUDE_CLIENT_ID,
    }));
    const req = https.request({
      hostname: 'console.anthropic.com',
      path:     '/v1/oauth/token',
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': body.length },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (res.statusCode === 200 && j.access_token) resolve(j);
          else reject(new Error(j.error_description || j.error || `HTTP ${res.statusCode}`));
        } catch { reject(new Error(`bad JSON (${res.statusCode}): ${data.slice(0, 100)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end(body);
  });
}

async function applyClaudeRefresh(conn) {
  const refreshToken = conn.refreshToken;
  if (!refreshToken) return { refreshed: false, error: 'no refresh token stored' };
  try {
    const result = await claudeRefresh(refreshToken);
    conn.accessToken  = result.access_token;
    if (result.refresh_token) conn.refreshToken = result.refresh_token; // rotate if returned
    if (result.expires_in) {
      conn.expiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString();
      conn.expiresIn = result.expires_in;
    }
    conn.isActive    = true;
    conn.testStatus  = 'active';
    conn.lastError   = null;
    conn.lastErrorAt = null;
    conn.updatedAt   = new Date().toISOString();
    return { refreshed: true, expiresIn: result.expires_in };
  } catch (err) {
    return { refreshed: false, error: err.message };
  }
}

async function handleClaudeAccounts(conns, alerts) {
  const claudeConns = conns.filter(c => c.provider === 'claude' && c.isActive);
  if (claudeConns.length === 0) return { skipped: 0, refreshed: 0, dbChanged: false };

  const bufferHours = CLAUDE_BUFFER_MINS / 60;
  let skipped = 0, refreshed = 0, dbChanged = false;

  for (const conn of claudeConns) {
    const name  = conn.name || conn.id;
    const hours = hoursUntilExpiry(conn);
    const isExp = hours < 0;
    const needsRefresh = ALL || isExp || hours < bufferHours;

    if (!needsRefresh) { skipped++; continue; }

    const timeLabel = isExp
      ? `EXPIRED ${Math.abs(hours * 60).toFixed(0)}min ago`
      : `expires in ${(hours * 60).toFixed(0)}min`;

    if (DRY_RUN) {
      console.log(`🔍 [claude] ${name}: would refresh via Anthropic token endpoint (${timeLabel})`);
      continue;
    }

    process.stdout.write(`🔄 [claude] ${name} (${timeLabel}) → `);
    const r = await applyClaudeRefresh(conn);
    if (r.refreshed) {
      console.log(`✅ refreshed — new expiry in ${r.expiresIn}s (${conn.expiresAt?.slice(0, 19)})`);
      dbChanged = true; refreshed++;
    } else {
      console.log(`❌ ${r.error}`);
      alerts.push(`⛔ [claude] ${name}: ${r.error} — re-auth at http://localhost:20128`);
    }
  }

  if (!DRY_RUN && !needsRefreshAny(claudeConns, bufferHours) && ALL) {
    const minH = Math.min(...claudeConns.map(hoursUntilExpiry));
    console.log(`🔍 [claude] ${claudeConns.length} account(s) healthy (min expiry in ${(minH * 60).toFixed(0)}min)`);
  }
  if (DRY_RUN && !claudeConns.some(c => { const h = hoursUntilExpiry(c); return ALL || h < 0 || h < bufferHours; })) {
    const minH = Math.min(...claudeConns.map(hoursUntilExpiry));
    console.log(`🔍 [claude] ${claudeConns.length} account(s) healthy (min expiry in ${(minH * 60).toFixed(0)}min — refresh triggers at <${CLAUDE_BUFFER_MINS}min)`);
  }

  return { skipped, refreshed, dbChanged };
}

// ── Codex: direct OAuth refresh via OpenAI token endpoint ────────────────────
// Tokens expire every ~10 days (863999s). Direct refresh — more robust than /test.
// Source: 9Router 6084.js function h() codex case, module 2255 codex config.

function codexRefresh(refreshToken) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(
      `grant_type=refresh_token` +
      `&refresh_token=${encodeURIComponent(refreshToken)}` +
      `&client_id=${CODEX_CLIENT_ID}`
    );
    const req = https.request({
      hostname: 'auth.openai.com',
      path:     '/oauth/token',
      method:   'POST',
      headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'Content-Length': body.length },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (res.statusCode === 200 && j.access_token) resolve(j);
          else {
            // Safely serialize error — j.error can be a string or an object
            const errStr = j.error_description
              || (typeof j.error === 'string' ? j.error : j.error ? JSON.stringify(j.error) : null)
              || `HTTP ${res.statusCode}: ${data.slice(0, 120)}`;
            reject(new Error(errStr));
          }
        } catch { reject(new Error(`bad JSON (${res.statusCode}): ${data.slice(0, 100)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end(body);
  });
}

async function applyCodexRefresh(conn) {
  const refreshToken = conn.refreshToken;
  if (!refreshToken) return { refreshed: false, error: 'no refresh token stored' };
  try {
    const result = await codexRefresh(refreshToken);
    conn.accessToken  = result.access_token;
    if (result.refresh_token) conn.refreshToken = result.refresh_token;
    if (result.id_token)      conn.idToken      = result.id_token;
    if (result.expires_in) {
      conn.expiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString();
      conn.expiresIn = result.expires_in;
    }
    conn.isActive    = true;
    conn.testStatus  = 'active';
    conn.lastError   = null;
    conn.lastErrorAt = null;
    conn.updatedAt   = new Date().toISOString();
    return { refreshed: true, expiresIn: result.expires_in };
  } catch (err) {
    return { refreshed: false, error: err.message };
  }
}

async function handleCodexAccounts(conns, alerts) {
  const codexConns = conns.filter(c => c.provider === 'codex' && c.isActive);
  if (codexConns.length === 0) return { skipped: 0, refreshed: 0, dbChanged: false };

  const bufferHours = CODEX_BUFFER_MINS / 60;
  let skipped = 0, refreshed = 0, dbChanged = false;

  for (const conn of codexConns) {
    const name  = conn.name || conn.id;
    const hours = hoursUntilExpiry(conn);
    const isExp = hours < 0;
    const needsRefresh = ALL || isExp || hours < bufferHours;

    if (!needsRefresh) { skipped++; continue; }

    const timeLabel = isExp
      ? `EXPIRED ${Math.abs(hours * 60).toFixed(0)}min ago`
      : hours === Infinity ? 'no expiry set' : `expires in ${(hours * 60 / 60).toFixed(1)}h`;

    if (DRY_RUN) {
      console.log(`🔍 [codex] ${name}: would refresh via OpenAI token endpoint (${timeLabel})`);
      continue;
    }

    process.stdout.write(`🔄 [codex] ${name} (${timeLabel}) → `);
    const r = await applyCodexRefresh(conn);
    if (r.refreshed) {
      const expLabel = r.expiresIn ? `new expiry in ${(r.expiresIn / 86400).toFixed(1)}d` : 'expiry unknown';
      console.log(`✅ refreshed — ${expLabel} (${conn.expiresAt?.slice(0, 19)})`);
      dbChanged = true; refreshed++;
    } else {
      console.log(`❌ ${r.error}`);
      alerts.push(`⛔ [codex] ${name}: ${r.error} — re-auth at http://localhost:20128`);
    }
  }

  if (!DRY_RUN && !needsRefreshAny(codexConns, bufferHours) && ALL) {
    const finiteH = codexConns.map(hoursUntilExpiry).filter(isFinite);
    if (finiteH.length) {
      const minH = Math.min(...finiteH);
      console.log(`🔍 [codex] ${codexConns.length} account(s) healthy (min expiry in ${(minH / 24).toFixed(1)}d)`);
    }
  }
  if (DRY_RUN && !codexConns.some(c => { const h = hoursUntilExpiry(c); return ALL || h < 0 || h < bufferHours; })) {
    const finiteH = codexConns.map(hoursUntilExpiry).filter(isFinite);
    if (finiteH.length) {
      const minH = Math.min(...finiteH);
      console.log(`🔍 [codex] ${codexConns.length} account(s) healthy (min expiry in ${(minH / 24).toFixed(1)}d — refresh triggers at <${CODEX_BUFFER_MINS}min)`);
    }
  }

  return { skipped, refreshed, dbChanged };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Quick port check — ensures 9Router is up before API calls
  try {
    await apiTest('__ping__', 'x');
  } catch (err) {
    if (!err.message.startsWith('HTTP')) {
      console.error('9Router not reachable on port', NINER_PORT, '—', err.message);
      process.exit(1);
    }
  }

  if (!fs.existsSync(DB_PATH)) {
    console.error('db.json not found at', DB_PATH);
    process.exit(1);
  }

  const apiKey = getNinerKey();
  if (!apiKey) {
    console.error('Could not find 9Router API key in openclaw.json');
    process.exit(1);
  }

  const data  = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const conns = data.providerConnections || [];

  let tested    = 0;
  let refreshed = 0;
  let synced    = 0;
  let failed    = 0;
  let skipped   = 0;
  let dbChanged = false;
  const alerts  = [];

  // ── Qwen: direct refresh_token grant (fully automatic) ─────────────────────
  const qwenResult = await handleQwenAccounts(conns, alerts);
  skipped   += qwenResult.skipped;
  refreshed += qwenResult.refreshed;
  if (qwenResult.dbChanged) dbChanged = true;

  // ── iFlow: direct refresh + getUserInfo for apiKey (fully automatic) ────────
  const iflowResult = await handleIflowAccounts(conns, alerts);
  skipped   += iflowResult.skipped;
  refreshed += iflowResult.refreshed;
  if (iflowResult.dbChanged) dbChanged = true;

  // ── Claude: direct Anthropic token endpoint (8h tokens, 60min buffer) ───────
  const claudeResult = await handleClaudeAccounts(conns, alerts);
  skipped   += claudeResult.skipped;
  refreshed += claudeResult.refreshed;
  if (claudeResult.dbChanged) dbChanged = true;

  // ── Codex: 9Router handles codex refresh internally — skip to avoid refresh_token_reused conflict
  // codex tokens last ~10 days; 9Router auto-refreshes them. Script must not touch them.
  const codexConns = conns.filter(c => c.provider === 'codex');
  skipped += codexConns.length;

  for (const conn of conns) {
    const provider  = conn.provider;
    const name      = conn.name || conn.id;
    const hours     = hoursUntilExpiry(conn);
    const isExpired = hours < 0;

    // ── Qwen / iFlow / Claude / Codex: already handled above ────────────────
    if (provider === 'qwen' || provider === 'iflow' || provider === 'claude' || provider === 'codex') continue;

    // ── Kiro: refresh directly via AWS IDC OIDC (no browser needed) ──────────
    // Tokens expire every 1h. We refresh in the last KIRO_BUFFER_MINS (15min default).
    // Runs BEFORE the isActive check — we restore connections even if 9Router disabled them.
    if (provider === 'kiro') {
      const bufferHours = KIRO_BUFFER_MINS / 60;
      const needsRefresh = ALL || isExpired || hours < bufferHours;
      if (!needsRefresh) { skipped++; continue; }

      const timeLabel = isExpired
        ? `EXPIRED ${Math.abs(hours * 60).toFixed(0)}min ago`
        : hours === Infinity ? 'no expiry set' : `expires in ${(hours * 60).toFixed(0)}min`;

      if (DRY_RUN) {
        console.log(`🔍 [kiro] ${name}: would refresh via AWS OIDC (${timeLabel})`);
        continue;
      }

      process.stdout.write(`🔄 [kiro] ${name} (${timeLabel}) → `);
      const r = await applyKiroRefresh(conn);
      if (r.refreshed) {
        console.log(`✅ refreshed — new expiry in ${r.expiresIn}s (${conn.expiresAt?.slice(0, 19)})`);
        dbChanged = true;
        refreshed++;
      } else {
        console.log(`❌ ${r.error}`);
        failed++;
        alerts.push(`⛔ [kiro] ${name}: ${r.error}`);
      }
      continue;
    }

    // All remaining providers require an active connection
    if (!conn.isActive) { skipped++; continue; }

    // ── Cursor: sync from local SQLite (no OAuth call needed) ────────────────
    if (provider === 'cursor') {
      const needsSync = ALL || isExpired || hours < WARN_HOURS;
      if (!needsSync) { skipped++; continue; }

      const timeLabel = isExpired
        ? `EXPIRED ${Math.abs(hours * 60).toFixed(0)}min ago`
        : hours === Infinity ? 'no expiry set' : `expires in ${(hours * 60).toFixed(0)}min`;

      if (DRY_RUN) {
        console.log(`🔍 [cursor] ${name}: would sync from Cursor SQLite (${timeLabel})`);
        continue;
      }

      process.stdout.write(`🔄 [cursor] ${name} (${timeLabel}) → `);
      const r = applyCursorSync(conn);
      if (r.synced) {
        const daysLeft = (hoursUntilExpiry(conn) / 24).toFixed(0);
        console.log(`✅ synced from SQLite — expires in ${daysLeft}d (${conn.expiresAt?.slice(0,10)})`);
        dbChanged = true;
        synced++;
      } else if (r.unchanged) {
        console.log('ok (token unchanged in SQLite)');
      } else {
        console.log(`❌ ${r.error}`);
        failed++;
        alerts.push(`⛔ [cursor] ${name}: ${r.error}`);
      }
      continue;
    }

    // ── Skip providers with known broken health-check endpoints ──────────────
    if (SKIP_TEST_PROVIDERS.has(provider)) { skipped++; continue; }
    if (!conn.expiresAt && !ALL)           { skipped++; continue; }

    const needsCheck = ALL || isExpired || hours < WARN_HOURS;
    if (!needsCheck) { skipped++; continue; }

    const timeLabel = isExpired
      ? `EXPIRED ${Math.abs(hours * 60).toFixed(0)}min ago`
      : `expires in ${(hours * 60).toFixed(0)}min`;

    if (DRY_RUN) {
      console.log(`🔍 [${provider}] ${name}: would test via 9Router API (${timeLabel})`);
      continue;
    }

    process.stdout.write(`🔄 [${provider}] ${name} (${timeLabel}) → `);

    try {
      const result = await apiTest(conn.id, apiKey);
      tested++;

      if (result.valid && result.refreshed) {
        console.log('✅ refreshed');
        refreshed++;
      } else if (result.valid) {
        console.log('ok (healthy; 9Router will refresh in the last 5min of token life)');
      } else {
        const msg = result.error || 'unknown error';
        console.log(`❌ FAILED: ${msg}`);
        failed++;
        alerts.push(`⛔ [${provider}] ${name}: ${msg} — re-auth at http://localhost:20128`);
      }
    } catch (err) {
      console.log(`❌ API error: ${err.message}`);
      failed++;
    }
  }

  if (dbChanged && !DRY_RUN) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    // Notify 9Router to reload its in-memory state (best-effort — non-fatal if it fails)
    try { await apiTest('__reload__', apiKey); } catch { /* ignore — 9Router reloads db.json on next request */ }
  }

  if (!DRY_RUN) {
    const parts = [];
    if (tested)    parts.push(`${tested} tested`);
    if (refreshed) parts.push(`${refreshed} refreshed`);
    if (synced)    parts.push(`${synced} synced`);
    if (failed)    parts.push(`${failed} failed`);
    parts.push(`${skipped} skipped`);
    console.log(`\nSummary: ${parts.join(', ')}.`);
  }

  if (alerts.length > 0) {
    console.log('\n🔑 9ROUTER AUTH ALERTS:');
    alerts.forEach(a => console.log(a));
    // Build a structured alert so the keepfresh cron can forward it to RED via Telegram
    const alertMsg = buildExhaustionAlert(alerts);
    if (alertMsg) console.log('\n--- ALERT_PAYLOAD ---\n' + alertMsg + '\n--- END_PAYLOAD ---');
    process.exit(2);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
