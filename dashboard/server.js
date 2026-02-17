#!/usr/bin/env node
/**
 * Mission Control Dashboard Server
 * Reads local RedOS state files and serves them to the dashboard UI.
 * Run: node server.js
 * Open: http://localhost:19000
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import { config as dotenvConfig } from 'dotenv';
import { costMonitor } from '../cost-monitor/monitor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENCLAW_DIR = path.resolve(__dirname, '..');
const PORT = 19000;

// Load .env
dotenvConfig({ path: path.join(OPENCLAW_DIR, '.env') });

// Basic auth credentials (from .env or defaults for local-only access)
const DASH_USER = process.env.DASHBOARD_USER || 'red';
const DASH_PASS = process.env.DASHBOARD_PASS || '';

function checkAuth(req, res) {
  // Skip auth if no password set (local-only mode)
  if (!DASH_PASS) return true;
  // Skip auth for localhost direct access
  const fwd = req.headers['x-forwarded-for'] || '';
  const host = req.headers.host || '';
  if (!fwd && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) return true;
  // Check Basic Auth header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Mission Control"', 'Content-Type': 'text/plain' });
    res.end('Authentication required');
    return false;
  }
  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [user, pass] = decoded.split(':');
  if (user === DASH_USER && pass === DASH_PASS) return true;
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Mission Control"', 'Content-Type': 'text/plain' });
  res.end('Invalid credentials');
  return false;
}

// --- Helpers ---

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { return null; }
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch { return ''; }
}

function readJsonlTail(filePath, n = 20) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (!content) return [];
    const lines = content.split('\n').filter(Boolean).slice(-n);
    return lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

function fileStat(filePath) {
  try {
    const s = fs.statSync(filePath);
    return { size: s.size, modified: s.mtime.toISOString() };
  } catch { return null; }
}

// --- Data Loaders ---

function getAgents() {
  const config = readJsonSafe(path.join(OPENCLAW_DIR, 'openclaw.json'));
  if (!config) return [];
  const agents = config.agents?.list || [];
  const defaults = config.agents?.defaults || {};
  return agents.map(a => ({
    id: a.id,
    name: a.identity?.name || a.id,
    model: a.model?.primary || defaults.model?.primary || 'unknown',
    fallbacks: a.model?.fallbacks || defaults.model?.fallbacks || [],
    workspace: a.workspace || '',
    memoryDb: fileStat(path.join(OPENCLAW_DIR, 'memory', `${a.id}.sqlite`)),
  }));
}

function getCronJobs() {
  const data = readJsonSafe(path.join(OPENCLAW_DIR, 'cron', 'jobs.json'));
  if (!data) return [];
  return (data.jobs || []).map(j => ({
    id: j.id,
    name: j.name,
    agentId: j.agentId,
    enabled: j.enabled,
    schedule: j.schedule,
    model: j.payload?.model || null,
    lastStatus: j.state?.lastStatus || null,
    lastRunAtMs: j.state?.lastRunAtMs || null,
    lastDurationMs: j.state?.lastDurationMs || null,
    lastError: j.state?.lastError || null,
    consecutiveErrors: j.state?.consecutiveErrors || 0,
  }));
}

function getTickets() {
  const content = readFileSafe(path.join(OPENCLAW_DIR, 'workspace', 'ops', 'TICKET-TRACKER.md'));
  // Strip code fences (template blocks) before parsing
  const stripped = content.replace(/```[\s\S]*?```/g, '');
  const tickets = [];
  const ticketRegex = /### (TICKET-\d{8}-\d{3})\n([\s\S]*?)(?=\n### TICKET-|\n## |$)/g;
  let match;
  while ((match = ticketRegex.exec(stripped)) !== null) {
    const id = match[1];
    const body = match[2];
    const get = (key) => {
      const m = body.match(new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`));
      return m ? m[1].trim() : '';
    };
    const status = get('Status');
    const slaDeadline = get('SLA Deadline');
    const isOpen = status === 'OPEN' || status === 'IN_PROGRESS' || status === 'BLOCKED';
    const slaBreached = isOpen && slaDeadline ? new Date(slaDeadline) < new Date() : false;
    tickets.push({
      id, status, priority: get('Priority'),
      created: get('Created'), slaDeadline,
      reporter: get('Reporter'), assignee: get('Assignee'),
      summary: get('Summary'), details: get('Details'),
      rootCause: get('Root Cause'),
      resolution: get('Resolution'), resolvedAt: get('Resolved At'),
      slaBreached,
    });
  }
  return tickets;
}

function getLearnings() {
  const content = readFileSafe(path.join(OPENCLAW_DIR, 'workspace', 'ops', 'LEARNINGS.md'));
  // Strip code fences (template blocks) before parsing
  const stripped = content.replace(/```[\s\S]*?```/g, '');
  const learnings = [];
  const regex = /### (LEARNING-\d{8}-\d{3})\n([\s\S]*?)(?=\n### LEARNING-|\n## |$)/g;
  let match;
  while ((match = regex.exec(stripped)) !== null) {
    const id = match[1];
    const body = match[2];
    const get = (key) => {
      const m = body.match(new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`));
      return m ? m[1].trim() : '';
    };
    learnings.push({
      id, date: get('Date'), agent: get('Agent'),
      category: get('Category'), summary: get('Summary'),
      details: get('Details'), prevention: get('Prevention'),
      appliedTo: get('Applied To'), sourceTicket: get('Source Ticket'),
    });
  }
  return learnings;
}

function getStandups() {
  const content = readFileSafe(path.join(OPENCLAW_DIR, 'workspace', 'ops', 'STANDUP-LOG.md'));
  // Just return raw content for now
  return content;
}

function getRecentErrors() {
  return readJsonlTail(path.join(OPENCLAW_DIR, 'logs', 'errors.jsonl'), 20);
}

function getRecentHealth() {
  return readJsonlTail(path.join(OPENCLAW_DIR, 'logs', 'health.jsonl'), 10);
}

function getRecentTicketsLog() {
  return readJsonlTail(path.join(OPENCLAW_DIR, 'logs', 'tickets.jsonl'), 20);
}

function getGatewayErrors() {
  const content = readFileSafe(path.join(OPENCLAW_DIR, 'logs', 'gateway.err.log'));
  return content.split('\n').filter(Boolean).slice(-30);
}

function getSkills() {
  const config = readJsonSafe(path.join(OPENCLAW_DIR, 'openclaw.json'));
  if (!config) return [];
  const entries = config.skills?.entries || {};
  return Object.entries(entries).map(([name, cfg]) => ({
    name, enabled: cfg.enabled ?? false,
  }));
}

function getCostState() {
  return readJsonSafe(path.join(OPENCLAW_DIR, 'cost-monitor', 'state.json'));
}

function getVectorMemoryCount() {
  try {
    const content = fs.readFileSync(path.join(OPENCLAW_DIR, 'data', 'memory', 'vector-memory.jsonl'), 'utf-8');
    return content.trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

function getSkillDetails() {
  const skillsDir = path.join(OPENCLAW_DIR, 'workspace', 'skills');
  const config = readJsonSafe(path.join(OPENCLAW_DIR, 'openclaw.json'));
  const entries = config?.skills?.entries || {};
  const skills = [];
  try {
    const dirs = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory() || d.name.startsWith('_')) continue;
      const skillMd = readFileSafe(path.join(skillsDir, d.name, 'SKILL.md'));
      const firstLine = skillMd.split('\n').find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || d.name;
      const purpose = skillMd.match(/## Purpose\n([\s\S]*?)(?=\n##|$)/)?.[1]?.trim() || '';
      skills.push({
        name: d.name,
        title: firstLine,
        enabled: entries[d.name]?.enabled ?? false,
        purpose: purpose.substring(0, 200),
        hasSkillMd: skillMd.length > 0,
      });
    }
  } catch {}
  return skills;
}

function getCostDetails() {
  const state = getCostState();
  const config = readJsonSafe(path.join(OPENCLAW_DIR, 'openclaw.json'));
  // Model cost rates
  const modelCosts = {
    'openai-codex/gpt-5.2': { type: 'subscription', monthlyCost: 200, inputPer1k: 0, outputPer1k: 0 },
    'claude-code/sonnet-4.5': { type: 'subscription', monthlyCost: 100, inputPer1k: 0, outputPer1k: 0 },
    'perplexity/sonar': { type: 'subscription', monthlyCost: 20, inputPer1k: 0, outputPer1k: 0 },
    'perplexity/sonar-pro': { type: 'subscription', monthlyCost: 20, inputPer1k: 0, outputPer1k: 0 },
    'perplexity/sonar-reasoning': { type: 'subscription', monthlyCost: 20, inputPer1k: 0, outputPer1k: 0 },
    'ollama/qwen2.5-coder:7b': { type: 'free', monthlyCost: 0, inputPer1k: 0, outputPer1k: 0 },
    'ollama/llama3.1:8b': { type: 'free', monthlyCost: 0, inputPer1k: 0, outputPer1k: 0 },
    'zai/glm-4.7': { type: 'payg', monthlyCost: 0, inputPer1k: 0.0008, outputPer1k: 0.0012 },
    'moonshot/kimi-k2.5': { type: 'payg', monthlyCost: 0, inputPer1k: 0.0015, outputPer1k: 0.0025 },
  };
  const subscriptionTotal = Object.values(modelCosts).reduce((s, m) => s + m.monthlyCost, 0);

  // --- Read real cost data from LLM analytics JSONL (authoritative source) ---
  let todayPayg = 0;
  let todayRequests = 0;
  const byModel = {};
  const byAgent = {};
  try {
    const costFile = path.join(OPENCLAW_DIR, 'workspace', 'logs', 'cost-events.jsonl');
    const today = new Date().toISOString().slice(0, 10);
    if (fs.existsSync(costFile)) {
      const lines = fs.readFileSync(costFile, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const e = JSON.parse(line);
          if (!e.ts || !e.ts.startsWith(today)) continue;
          const cost = Number(e.cost_usd);
          if (!Number.isFinite(cost) || cost <= 0) continue;
          todayPayg += cost;
          todayRequests += 1;
          const m = e.model || 'unknown';
          const a = e.agent || 'unknown';
          if (!byModel[m]) byModel[m] = { cost: 0, requests: 0, tokens: 0 };
          byModel[m].cost += cost;
          byModel[m].requests += 1;
          byModel[m].tokens += (Number(e.tokens?.input) || 0) + (Number(e.tokens?.output) || 0);
          if (!byAgent[a]) byAgent[a] = { cost: 0, requests: 0 };
          byAgent[a].cost += cost;
          byAgent[a].requests += 1;
        } catch {}
      }
    }
  } catch {}
  todayPayg = Math.round(todayPayg * 1000000) / 1000000;

  // Savings: if all requests went through payg at avg $0.003/req
  const estimatedWithoutOptimization = todayRequests * 0.003;
  const savings = Math.max(0, estimatedWithoutOptimization - todayPayg);
  return {
    state,
    modelCosts,
    subscriptionMonthly: subscriptionTotal,
    todayPayg,
    todayRequests,
    byModel,
    byAgent,
    estimatedSavings: savings,
    dailyBudget: 5.00,
    dataSource: 'llm-analytics-jsonl',
  };
}

function getRoutingConfig() {
  const skillMd = readFileSafe(path.join(OPENCLAW_DIR, 'workspace', 'skills', 'smart-router', 'SKILL.md'));
  const config = readJsonSafe(path.join(OPENCLAW_DIR, 'openclaw.json'));
  const agents = config?.agents?.list || [];
  const defaults = config?.agents?.defaults || {};
  const routing = agents.map(a => ({
    id: a.id,
    name: a.identity?.name || a.id,
    primary: a.model?.primary || defaults.model?.primary || 'unknown',
    fallbacks: a.model?.fallbacks || defaults.model?.fallbacks || [],
  }));
  return { routing, skillContent: skillMd };
}

function getCachingConfig() {
  const config = readJsonSafe(path.join(OPENCLAW_DIR, 'openclaw.json'));
  const defaults = config?.agents?.defaults || {};
  return {
    contextPruning: defaults.contextPruning || {},
    compaction: defaults.compaction || {},
    models: Object.entries(defaults.models || {}).map(([id, cfg]) => ({
      id,
      cacheRead: cfg.cost?.cacheRead ?? null,
      cacheWrite: cfg.cost?.cacheWrite ?? null,
      params: cfg.params || {},
    })),
  };
}

function getPromptEngineering() {
  const hatakeMd = readFileSafe(path.join(OPENCLAW_DIR, 'workspace', 'skills', 'hatake-parser', 'SKILL.md'));
  const promptEngMd = readFileSafe(path.join(OPENCLAW_DIR, 'workspace', 'skills', 'prompt-engineering', 'SKILL.md'));
  return { hatake: hatakeMd, promptEng: promptEngMd };
}

function getGatewayLogTail(n = 50) {
  try {
    const logDir = '/tmp/openclaw';
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `openclaw-${today}.log`);
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').filter(Boolean).slice(-n);
    return lines.map(l => {
      try {
        const j = JSON.parse(l);
        return {
          time: j.time || j._meta?.date,
          level: j._meta?.logLevelName || 'INFO',
          msg: j['1'] || j['0'] || '',
          subsystem: typeof j['0'] === 'string' && j['0'].includes('subsystem') ? j['0'] : '',
        };
      } catch { return { time: '', level: 'RAW', msg: l.substring(0, 200) }; }
    });
  } catch { return []; }
}

function getCeoStatus() {
  const logPath = path.join(OPENCLAW_DIR, 'workspace', 'ops', 'ceo-hire-fire-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf-8')); } catch {}
  const agents = getAgents();
  return {
    agents: agents.map(a => ({
      id: a.id, name: a.name, model: a.model,
      status: 'active', // All configured agents are considered active
    })),
    hireFireLog: log.slice(-20),
    stats: {
      totalHires: log.filter(l => l.action === 'HIRE').length,
      totalFires: log.filter(l => l.action === 'FIRE').length,
      activeAgents: agents.length,
    }
  };
}

function getSystemSummary() {
  const agents = getAgents();
  const cronJobs = getCronJobs();
  const tickets = getTickets();
  const learnings = getLearnings();
  const skills = getSkills();
  const cost = getCostState();
  const vectorCount = getVectorMemoryCount();

  const enabledJobs = cronJobs.filter(j => j.enabled);
  const runningJobs = enabledJobs.filter(j => j.lastStatus === 'ok');
  const failedJobs = enabledJobs.filter(j => j.lastStatus === 'error');
  const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');

  return {
    agents, cronJobs, tickets, learnings, skills, cost,
    vectorMemoryEntries: vectorCount,
    summary: {
      agentCount: agents.length,
      skillCount: skills.filter(s => s.enabled).length,
      cronEnabled: enabledJobs.length,
      cronSucceeded: runningJobs.length,
      cronFailed: failedJobs.length,
      openTickets: openTickets.length,
      resolvedTickets: resolvedTickets.length,
      learningCount: learnings.length,
      totalCost: cost?.totalCost || 0,
    }
  };
}

// --- HTTP Server ---

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Basic auth check (skipped for localhost if no password set)
  if (!checkAuth(req, res)) return;

  // POST: Model override
  if (req.method === 'POST' && url.pathname === '/api/model-override') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { agentId, model } = JSON.parse(body);
        if (!agentId || !model) throw new Error('agentId and model required');
        const configPath = path.join(OPENCLAW_DIR, 'openclaw.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const agent = (config.agents?.list || []).find(a => a.id === agentId);
        if (!agent) throw new Error('Agent not found: ' + agentId);
        if (!agent.model) agent.model = {};
        const oldModel = agent.model.primary || config.agents?.defaults?.model?.primary || 'unknown';
        agent.model.primary = model;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, agentId, oldModel, newModel: model }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // --- Cron job model update ---
  if (req.method === 'PATCH' && url.pathname.startsWith('/api/cron-jobs/')) {
    const jobId = url.pathname.split('/api/cron-jobs/')[1];
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      try {
        const { model } = JSON.parse(body);
        const jobsFile = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');
        const data = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
        const job = (data.jobs || []).find(j => j.id === jobId);
        if (!job) { res.writeHead(404); res.end(JSON.stringify({ error: 'job not found' })); return; }
        if (!job.payload) job.payload = {};
        if (model && model !== '__default__') {
          job.payload.model = model;
        } else {
          delete job.payload.model;
        }
        fs.writeFileSync(jobsFile, JSON.stringify(data, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id: jobId, model: job.payload.model || null }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API routes
  if (url.pathname === '/api/dashboard') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getSystemSummary()));
    return;
  }
  if (url.pathname === '/api/errors') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getRecentErrors()));
    return;
  }
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getRecentHealth()));
    return;
  }
  if (url.pathname === '/api/gateway-errors') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getGatewayErrors()));
    return;
  }
  if (url.pathname === '/api/standups') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ content: getStandups() }));
    return;
  }
  if (url.pathname === '/api/tickets-log') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getRecentTicketsLog()));
    return;
  }
  if (url.pathname === '/api/tickets') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getTickets()));
    return;
  }
  if (url.pathname === '/api/cost-details') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getCostDetails()));
    return;
  }
  if (url.pathname === '/api/routing') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getRoutingConfig()));
    return;
  }
  if (url.pathname === '/api/caching') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getCachingConfig()));
    return;
  }
  if (url.pathname === '/api/prompt-engineering') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getPromptEngineering()));
    return;
  }
  if (url.pathname === '/api/skill-details') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getSkillDetails()));
    return;
  }
  if (url.pathname === '/api/gateway-logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getGatewayLogTail(50)));
    return;
  }

  // CEO hire/fire log
  if (url.pathname === '/api/ceo/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getCeoStatus()));
    return;
  }

  // POST: CEO hire worker
  if (req.method === 'POST' && url.pathname === '/api/ceo/hire') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { agentId } = JSON.parse(body);
        if (!agentId) throw new Error('agentId required');
        const config = readJsonSafe(path.join(OPENCLAW_DIR, 'openclaw.json'));
        const agent = (config?.agents?.list || []).find(a => a.id === agentId);
        if (!agent) throw new Error('Agent not found: ' + agentId);
        // Enable the agent by ensuring it's in the list (it already is)
        // Log the hire action
        const logPath = path.join(OPENCLAW_DIR, 'workspace', 'ops', 'ceo-hire-fire-log.json');
        let log = [];
        try { log = JSON.parse(fs.readFileSync(logPath, 'utf-8')); } catch {}
        log.push({ action: 'HIRE', workerId: agentId, timestamp: new Date().toISOString(), reason: 'Manual hire via dashboard', success: true });
        fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, action: 'HIRE', agentId }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // POST: CEO fire worker
  if (req.method === 'POST' && url.pathname === '/api/ceo/fire') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { agentId, reason } = JSON.parse(body);
        if (!agentId) throw new Error('agentId required');
        const logPath = path.join(OPENCLAW_DIR, 'workspace', 'ops', 'ceo-hire-fire-log.json');
        let log = [];
        try { log = JSON.parse(fs.readFileSync(logPath, 'utf-8')); } catch {}
        log.push({ action: 'FIRE', workerId: agentId, timestamp: new Date().toISOString(), reason: reason || 'Manual fire via dashboard', success: true });
        fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, action: 'FIRE', agentId }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // --- LLM Analytics API ---
  if (url.pathname === '/api/analytics') {
    const logsDir = path.join(OPENCLAW_DIR, 'workspace', 'logs');
    const costFile = path.join(logsDir, 'cost-events.jsonl');
    const routingFile = path.join(logsDir, 'routing-decisions.jsonl');
    const analyticsFile = path.join(logsDir, 'llm-analytics.jsonl');

    const readJsonl = (fp, limit = 100) => {
      try {
        if (!fs.existsSync(fp)) return [];
        const lines = fs.readFileSync(fp, 'utf8').split('\n').filter(Boolean);
        return lines.slice(-limit).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      } catch { return []; }
    };

    const costs = readJsonl(costFile, 200);
    const routing = readJsonl(routingFile, 200);
    const analytics = readJsonl(analyticsFile, 200);

    const today = new Date().toISOString().slice(0, 10);
    const todayCosts = costs.filter(c => c.ts && c.ts.startsWith(today));
    const dailySpend = todayCosts.reduce((sum, c) => {
      const v = Number(c.cost_usd);
      return sum + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);
    const totalCalls = todayCosts.length;

    const byModel = {};
    const byAgent = {};
    const byProvider = {};

    for (const c of todayCosts) {
      const model = c.model || 'unknown';
      const agent = c.agent || 'unknown';
      const provider = c.provider || (typeof model === 'string' && model.includes('/') ? model.split('/')[0] : 'unknown');

      const tin = Number(c.tokens?.input) || 0;
      const tout = Number(c.tokens?.output) || 0;
      const tcache = Number(c.tokens?.cache_read) || 0;
      const costRaw = Number(c.cost_usd);
      const cost = (Number.isFinite(costRaw) && costRaw >= 0) ? costRaw : 0;

      if (!byModel[model]) byModel[model] = { calls: 0, cost_usd: 0, tokens_in: 0, tokens_out: 0, tokens_cache_read: 0 };
      byModel[model].calls += 1;
      byModel[model].cost_usd += cost;
      byModel[model].tokens_in += tin;
      byModel[model].tokens_out += tout;
      byModel[model].tokens_cache_read += tcache;

      if (!byAgent[agent]) byAgent[agent] = { calls: 0, cost_usd: 0, tokens_in: 0, tokens_out: 0 };
      byAgent[agent].calls += 1;
      byAgent[agent].cost_usd += cost;
      byAgent[agent].tokens_in += tin;
      byAgent[agent].tokens_out += tout;

      if (!byProvider[provider]) byProvider[provider] = { calls: 0, cost_usd: 0 };
      byProvider[provider].calls += 1;
      byProvider[provider].cost_usd += cost;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      dailySpend: Math.round(dailySpend * 10000) / 10000,
      totalCalls,
      totalEntries: costs.length,
      byProvider,
      byModel,
      byAgent,
      recentCosts: todayCosts.slice(-20),
      recentRouting: routing.slice(-20),
      recentAnalytics: analytics.slice(-20),
    }));
    return;
  }

  // --- Proxy to native OpenClaw Control UI ---
  if (url.pathname === '/api/control-ui-url') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: 'http://127.0.0.1:18789/' }));
    return;
  }

  // Dynamic index: inject all data server-side so page works without fetch
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const allData = {
      ...getSystemSummary(),
      _errors: getRecentErrors(),
      _gatewayErrors: getGatewayErrors(),
      _costDetails: getCostDetails(),
      _routing: getRoutingConfig(),
      _caching: getCachingConfig(),
      _prompt: getPromptEngineering(),
      _skillDetails: getSkillDetails(),
      _gatewayLogs: getGatewayLogTail(50),
      _ceoStatus: getCeoStatus(),
      _controlUiUrl: 'http://127.0.0.1:18789/',
    };
    const htmlTemplate = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    // Inject data before closing </body>
    const dataScript = `<script>window.__INIT_DATA__=${JSON.stringify(allData).replace(/</g,'\\u003c')};</script>`;
    const html = htmlTemplate.replace('</body>', dataScript + '\n</body>');
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store' });
    res.end(html);
    return;
  }

  // Static files
  let filePath = url.pathname;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'text/plain';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  🦞 Mission Control Dashboard`);
  console.log(`  ➜ http://localhost:${PORT}\n`);
});
