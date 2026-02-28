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
 *   codex,    → POST /api/providers/{id}/test — 9Router refreshes internally when within
 *   claude      its 5-min expiry window. Run every 4min to never miss the window.
 *   cursor    → Reads token directly from Cursor's local SQLite and patches db.json.
 *               JWT valid ~52 days; syncs automatically when stale.
 *   iflow     → getUserInfo health-check returns 400 (broken endpoint); skip /test.
 *               Inference still works. Will alert when token actually expires.
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

// Cursor SQLite path on macOS
const CURSOR_DB     = `${HOME}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
const CURSOR_READER = new URL('../scripts/cursor-sqlite-read.py', import.meta.url).pathname;

// Providers where /test returns false-negative errors — skip to avoid marking them as errored
const SKIP_TEST_PROVIDERS = new Set(['iflow', 'openrouter']);

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
    const m   = raw.match(/sk-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-[a-z0-9]+-[a-f0-9]+/);
    return m ? m[0] : null;
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

  for (const conn of conns) {
    const provider  = conn.provider;
    const name      = conn.name || conn.id;
    const hours     = hoursUntilExpiry(conn);
    const isExpired = hours < 0;

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
