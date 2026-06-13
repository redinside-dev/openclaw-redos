#!/usr/bin/env node
// OpenClaw System Health Verification Suite
// Run: /opt/homebrew/opt/node/bin/node verify-system.js

const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

async function fetch(url, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  const results = {};
  const PASS = '✓'; const FAIL = '✗'; const WARN = '⚠'; const INFO = '→';

  // ── GATEWAY (real port 19000) ──
  try {
    const r = await fetch('http://127.0.0.1:19000/api/health');
    const body = JSON.parse(r.body);
    const entry = Array.isArray(body) ? body[body.length - 1] : body;
    results.gateway = `${PASS} HTTP ${r.status} — ${entry.monitor_id}: ${entry.status} @ ${entry.timestamp}`;
  } catch(e) { results.gateway = `${FAIL} unreachable: ${e.message}`; }

  // ── 9ROUTER ──
  try {
    const r = await fetch('http://127.0.0.1:20128/api/health');
    results.router9 = `${PASS} HTTP ${r.status}: ${r.body.slice(0, 50)}`;
  } catch(e) { results.router9 = `${FAIL} unreachable: ${e.message}`; }

  // ── OLLAMA ──
  try {
    const r = await fetch('http://127.0.0.1:11434/api/tags');
    const body = JSON.parse(r.body);
    const count = body.models ? body.models.length : 0;
    results.ollama = count > 0
      ? `${PASS} running, ${count} model(s) loaded`
      : `${WARN} running, NO models loaded — run: ollama pull llama3.2`;
    results.ollamaModels = count;
  } catch(e) { results.ollama = `${FAIL} unreachable: ${e.message}`; }

  // ── HEALTH JSONL ──
  try {
    const lines = fs.readFileSync('/Users/redinside/.shared/system-health.jsonl', 'utf8')
      .trim().split('\n').filter(l => l.trim());
    const last = JSON.parse(lines[lines.length - 1]);
    const ageMs = Date.now() - new Date(last.timestamp).getTime();
    const ageH = Math.round(ageMs / 3600000 * 10) / 10;
    results.healthJsonl = ageH < 2
      ? `${PASS} last entry ${ageH}h ago (${last.timestamp})`
      : `${WARN} last entry ${ageH}h old — health monitor may be stalled`;
  } catch(e) { results.healthJsonl = `${FAIL} not found: ${e.message}`; }

  // ── CRON JOBS ──
  try {
    const jobs = JSON.parse(fs.readFileSync('/Users/redinside/.openclaw/cron/jobs.json', 'utf8'));
    const enabled = jobs.jobs.filter(j => j.enabled).length;
    const disabled = jobs.jobs.filter(j => !j.enabled).length;
    const financeEnabled = jobs.jobs.filter(j =>
      (j.name || '').toLowerCase().includes('finance') && j.enabled
    ).length;
    const financeDisabled = jobs.jobs.filter(j =>
      (j.name || '').toLowerCase().includes('finance') && !j.enabled
    ).length;
    results.cron = `${PASS} ${enabled}/${jobs.jobs.length} enabled (${financeEnabled} finance, ${financeDisabled} finance disabled)`;
    results.cronEnabled = enabled; results.cronTotal = jobs.jobs.length;
  } catch(e) { results.cron = `${FAIL} ${e.message}`; }

  // ── AGENT PROCESSES ──
  const agentProcs = ['main', 'allrounder', 'eng', 'research', 'finance', 'ops', 'infosec', 'hatake'];
  results.agents = {};
  for (const agent of agentProcs) {
    try {
      const out = execSync(`pgrep -f "queue-worker.py ${agent}"`, { encoding: 'utf8' });
      const pids = out.trim().split('\n').filter(Boolean);
      results.agents[agent] = pids.length > 0
        ? `${PASS} running (PID ${pids[0]})`
        : `${FAIL} not running`;
    } catch { results.agents[agent] = `${FAIL} not running`; }
  }

  // ── LOG SIZES ──
  const logFiles = [
    'session-overflow-monitor.log',
    'gateway.log',
    'gateway.err.log',
    'gateway-watchdog.log',
    'health-monitor.log',
  ];
  results.logs = {};
  for (const log of logFiles) {
    try {
      const size = fs.statSync(`/Users/redinside/.openclaw/logs/${log}`).size;
      const mb = Math.round(size / 1024 / 1024);
      results.logs[log] = mb > 500
        ? `${FAIL} ${mb}MB — CRITICAL bloat`
        : mb > 100
        ? `${WARN} ${mb}MB — consider rotation`
        : `${PASS} ${mb}MB`;
    } catch { results.logs[log] = `${INFO} not found`; }
  }

  // ── DISK ──
  try {
    const out = execSync('df -g / | tail -1', { encoding: 'utf8' });
    const avail = parseInt(out.trim().split(/\s+/)[3]);
    results.disk = avail < 20
      ? `${FAIL} only ${avail}GB available`
      : avail < 50
      ? `${WARN} ${avail}GB available`
      : `${PASS} ${avail}GB available`;
  } catch(e) { results.disk = `${INFO} unknown`; }

  // ── PRINT REPORT ──
  console.log('\n🟢 OPENCLAW SYSTEM HEALTH REPORT');
  console.log('═'.repeat(50));
  console.log(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC\n');

  const sections = [
    ['Gateway', ['gateway']],
    ['9Router', ['router9']],
    ['Ollama', ['ollama']],
    ['Health JSONL', ['healthJsonl']],
    ['Cron Jobs', ['cron']],
    ['Agent Processes', Object.fromEntries(Object.entries({ agents: true }).map(([k]) => [k, 'agents']))],
    ['Log Files', ['logs']],
    ['Disk Space', ['disk']],
  ];

  const green = results.ollamaModels > 0 ? [] : ['ollama'];
  const yellowFlags = [];

  console.log('COMPONENT          STATUS');
  console.log('─────────────────────────────────────────────────');

  const row = (label, value) => console.log(`  ${label.padEnd(18)} ${value}`);
  row('Gateway', results.gateway);
  row('9Router', results.router9);
  row('Ollama', results.ollama);

  const hlAge = results.healthJsonl;
  row('Health JSONL', hlAge);

  row('Cron Jobs', results.cron);

  console.log('\n  AGENTS:');
  for (const [agent, status] of Object.entries(results.agents)) {
    row(`  ${agent.padEnd(16)}`, status);
  }

  console.log('\n  LOGS:');
  for (const [log, status] of Object.entries(results.logs)) {
    row(`  ${log.padEnd(26)}`, status);
  }
  row('Disk', results.disk);

  // ── OVERALL ──
  const failCount = JSON.stringify(results).match(/✗/g)?.length || 0;
  const warnCount = JSON.stringify(results).match(/⚠/g)?.length || 0;
  const overall = failCount > 0 ? '🔴 RED' : warnCount > 0 ? '🟡 YELLOW' : '🟢 GREEN';
  console.log('\n' + '═'.repeat(50));
  console.log(`OVERALL: ${overall} — ${failCount} failures, ${warnCount} warnings\n`);
}

main().catch(console.error);