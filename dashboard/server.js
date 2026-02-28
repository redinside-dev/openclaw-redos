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

// SSE clients for real-time push
const sseClients = new Set();
function broadcastSSE(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

// Watch openclaw.json for changes and broadcast to SSE clients
const configFile = path.join(OPENCLAW_DIR, 'openclaw.json');
try {
  fs.watch(configFile, () => {
    broadcastSSE('config_changed', { ts: Date.now() });
  });
} catch (e) {
  console.warn('Could not watch openclaw.json:', e.message);
}

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

const HIERARCHY_FILE = path.join(OPENCLAW_DIR, 'workspace', 'ops', 'agent-hierarchy.json');

function getHierarchy() {
  try {
    if (fs.existsSync(HIERARCHY_FILE)) return JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf8'));
  } catch {}
  return { parentMap: {}, roles: {} };
}

function saveHierarchy(data) {
  fs.mkdirSync(path.dirname(HIERARCHY_FILE), { recursive: true });
  fs.writeFileSync(HIERARCHY_FILE, JSON.stringify(data, null, 2));
}

function getAgents() {
  const config = readJsonSafe(path.join(OPENCLAW_DIR, 'openclaw.json'));
  if (!config) return [];
  const agents = config.agents?.list || [];
  const defaults = config.agents?.defaults || {};
  const hier = getHierarchy();
  return agents.map(a => ({
    id: a.id,
    name: a.name || a.identity?.name || a.id,
    identityName: a.identity?.name || a.id,
    role: hier.roles?.[a.id] || '',
    model: a.model?.primary || defaults.model?.primary || 'unknown',
    fallbacks: a.model?.fallbacks || defaults.model?.fallbacks || [],
    parentId: hier.parentMap?.[a.id] || null,
    isDefault: a.default || false,
    bot: a.groupChat?.mentionPatterns?.[0] || null,
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
  // Parse into structured entries by splitting on ### Standup headers
  const entries = [];
  const blocks = content.split(/\n(?=### Standup )/).filter(b => b.trim().startsWith('### Standup'));
  for (const block of blocks.slice(-10).reverse()) {
    const titleMatch = block.match(/^### Standup (.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
    // Extract rows from the agent table
    const tableMatch = block.match(/\| Agent[^\n]*\n\|[-| ]+\n((?:\|[^\n]+\n?)+)/);
    const agents = [];
    if (tableMatch) {
      for (const row of tableMatch[1].trim().split('\n')) {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 2 && cells[0] && cells[0] !== 'Agent') {
          agents.push({
            name: cells[0],
            status: cells[1] || '',
            workingOn: cells[2] || '',
            blockers: cells[3] || '',
            eta: cells[4] || '',
            next: cells[5] || ''
          });
        }
      }
    }
    const ticketsMatch = block.match(/\*\*Open Tickets:\*\* (.+)/);
    const slaMatch = block.match(/\*\*SLA Breaches:\*\* (.+)/);
    const healthMatch = block.match(/\*\*System Health:\*\* (.+)/);
    const actionItems = [];
    const actionBlock = block.match(/\*\*Action Items:\*\*([\s\S]*?)(?:\n---|\n###|$)/);
    if (actionBlock) {
      for (const line of actionBlock[1].trim().split('\n')) {
        const m = line.match(/^\d+\.\s+(.+)/);
        if (m) actionItems.push(m[1].trim());
      }
    }
    entries.push({
      title,
      tickets: ticketsMatch ? ticketsMatch[1].trim() : null,
      slaBreaches: slaMatch ? slaMatch[1].trim() : null,
      systemHealth: healthMatch ? healthMatch[1].trim() : null,
      agents,
      actionItems,
      raw: block
    });
  }
  return { entries, rawContent: content };
}

function getAgentStatus() {
  const statusDir = path.join(OPENCLAW_DIR, 'workspace', 'ops', 'agent-status');
  const agents = ['main', 'eng', 'research', 'finance', 'ops', 'infosec'];
  const today = new Date().toISOString().slice(0, 10);

  // Build last-seen index from routing-decisions.jsonl (last 500 entries)
  const routingFile = path.join(OPENCLAW_DIR, 'workspace', 'logs', 'routing-decisions.jsonl');
  const analyticsFile = path.join(OPENCLAW_DIR, 'workspace', 'logs', 'llm-analytics.jsonl');
  const lastSeen = {};  // agentId -> { ts, model, sessionKey, callsToday, totalTokensToday }
  try {
    const todayPrefix = today;
    const rLines = fs.readFileSync(routingFile, 'utf8').split('\n').filter(Boolean).slice(-500);
    for (const l of rLines) {
      try {
        const r = JSON.parse(l);
        const agentId = r.agent;
        if (!agents.includes(agentId)) continue;
        if (!lastSeen[agentId] || new Date(r.ts) > new Date(lastSeen[agentId].ts)) {
          lastSeen[agentId] = { ts: r.ts, model: r.selected_model, sessionKey: r.session_key, callsToday: 0 };
        }
        if (r.ts && r.ts.startsWith(todayPrefix)) {
          lastSeen[agentId].callsToday = (lastSeen[agentId].callsToday || 0) + 1;
        }
      } catch {}
    }
    // Merge token totals from analytics log
    const aLines = fs.readFileSync(analyticsFile, 'utf8').split('\n').filter(Boolean).slice(-500);
    for (const l of aLines) {
      try {
        const a = JSON.parse(l);
        const agentId = a.agent;
        if (!agents.includes(agentId) || !a.ts.startsWith(todayPrefix)) continue;
        if (lastSeen[agentId]) {
          lastSeen[agentId].tokensToday = (lastSeen[agentId].tokensToday || 0) + (a.tokens_in || 0) + (a.tokens_out || 0);
        }
      } catch {}
    }
  } catch {}

  // Classify session type for display
  function sessionLabel(sk) {
    if (!sk) return null;
    if (sk.includes(':cron:')) return 'cron';
    if (sk.includes(':subagent:')) return 'sub-agent';
    if (sk.includes(':telegram:')) return 'Telegram';
    return 'direct';
  }

  const results = [];
  for (const agentId of agents) {
    const fp = path.join(statusDir, `${agentId}.json`);
    let checkin = null;
    try {
      checkin = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch {}

    const ls = lastSeen[agentId] || null;
    results.push({
      agent: agentId,
      // Check-in data (from 9am cron)
      date: checkin?.date || null,
      stale: !checkin || checkin.date !== today,
      sprintGoal: checkin?.sprintGoal || null,
      workingOn: checkin?.workingOn || null,
      completedYesterday: checkin?.completedYesterday || null,
      eta: checkin?.eta || null,
      blockers: checkin?.blockers || null,
      updatedAt: checkin?.updatedAt || null,
      // Live activity from routing log
      lastSeenAt: ls?.ts || null,
      lastModel: ls?.model || null,
      lastSessionType: sessionLabel(ls?.sessionKey) || null,
      callsToday: ls?.callsToday || 0,
      tokensToday: ls?.tokensToday || 0,
    });
  }
  return results;
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

  // SSE: real-time push for config changes
  if (url.pathname === '/api/events') {
    req.socket.setNoDelay(true);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 3000\n\n');
    res.write('event: connected\ndata: {}\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

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
        broadcastSSE('agents_changed', { agentId, ts: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, agentId, oldModel, newModel: model }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // --- Agent management ---
  if (url.pathname === '/api/agents' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getAgents()));
    return;
  }

  if (url.pathname === '/api/agents' && req.method === 'POST') {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      try {
        const { id, name, identityName, primaryModel, fallbacks, role, parentId, bot } = JSON.parse(body);
        if (!id || !name) { res.writeHead(400); res.end(JSON.stringify({ error: 'id and name are required' })); return; }
        const configFile = path.join(OPENCLAW_DIR, 'openclaw.json');
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        if ((config.agents?.list || []).find(a => a.id === id)) {
          res.writeHead(409); res.end(JSON.stringify({ error: 'agent id already exists' })); return;
        }
        const newAgent = {
          id,
          name,
          model: { primary: primaryModel || 'ollama/llama3.1:8b', fallbacks: fallbacks || ['openai-codex/gpt-5.2'] },
          identity: { name: identityName || name.split(' ')[0] },
          groupChat: { mentionPatterns: bot ? [bot] : [] },
          subagents: { allowAgents: ['*'] },
        };
        config.agents.list.push(newAgent);
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        const hier = getHierarchy();
        if (role) { hier.roles = hier.roles || {}; hier.roles[id] = role; }
        if (parentId) { hier.parentMap = hier.parentMap || {}; hier.parentMap[id] = parentId; }
        saveHierarchy(hier);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/agents/')) {
    const agentId = url.pathname.split('/api/agents/')[1];
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const configFile = path.join(OPENCLAW_DIR, 'openclaw.json');
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        const agent = (config.agents?.list || []).find(a => a.id === agentId);
        if (!agent) { res.writeHead(404); res.end(JSON.stringify({ error: 'agent not found' })); return; }
        if (updates.name !== undefined) { agent.name = updates.name; }
        if (updates.identityName !== undefined) { agent.identity = agent.identity || {}; agent.identity.name = updates.identityName; }
        if (updates.primaryModel !== undefined) { agent.model = agent.model || {}; agent.model.primary = updates.primaryModel; }
        if (updates.fallbacks !== undefined) { agent.model = agent.model || {}; agent.model.fallbacks = updates.fallbacks; }
        if (updates.bot !== undefined) { agent.groupChat = agent.groupChat || {}; agent.groupChat.mentionPatterns = updates.bot ? [updates.bot] : []; }
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        const hier = getHierarchy();
        if (updates.role !== undefined) { hier.roles = hier.roles || {}; hier.roles[agentId] = updates.role; }
        if (updates.parentId !== undefined) {
          hier.parentMap = hier.parentMap || {};
          if (updates.parentId) { hier.parentMap[agentId] = updates.parentId; } else { delete hier.parentMap[agentId]; }
        }
        saveHierarchy(hier);
        broadcastSSE('agents_changed', { agentId, ts: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const updatedConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        const updatedAgent = (updatedConfig.agents?.list || []).find(a => a.id === agentId);
        res.end(JSON.stringify({ ok: true, agent: updatedAgent }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/agents/')) {
    const agentId = url.pathname.split('/api/agents/')[1];
    try {
      const configFile = path.join(OPENCLAW_DIR, 'openclaw.json');
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      const idx = (config.agents?.list || []).findIndex(a => a.id === agentId);
      if (idx === -1) { res.writeHead(404); res.end(JSON.stringify({ error: 'agent not found' })); return; }
      if (config.agents.list[idx].default) { res.writeHead(403); res.end(JSON.stringify({ error: 'cannot remove the default agent' })); return; }
      config.agents.list.splice(idx, 1);
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
      const hier = getHierarchy();
      delete (hier.parentMap || {})[agentId];
      delete (hier.roles || {})[agentId];
      Object.keys(hier.parentMap || {}).forEach(k => { if (hier.parentMap[k] === agentId) delete hier.parentMap[k]; });
      saveHierarchy(hier);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
    }
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
    res.end(JSON.stringify(getStandups()));
    return;
  }
  if (url.pathname === '/api/agent-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getAgentStatus()));
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
  if (url.pathname === '/api/pipeline') {
    const logsDir = path.join(OPENCLAW_DIR, 'workspace', 'logs');
    const routingFile = path.join(logsDir, 'routing-decisions.jsonl');
    const analyticsFile = path.join(logsDir, 'llm-analytics.jsonl');
    const costFile = path.join(logsDir, 'cost-events.jsonl');

    const readTail = (fp, n) => {
      try {
        if (!fs.existsSync(fp)) return [];
        const lines = fs.readFileSync(fp, 'utf8').split('\n').filter(Boolean);
        return lines.slice(-n).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      } catch { return []; }
    };

    const routing = readTail(routingFile, 600);
    const analytics = readTail(analyticsFile, 600);
    const costs = readTail(costFile, 600);

    // Read Telegram session for user messages (find messages by timestamp)
    const telegramMessages = []; // [{ts, text}]
    try {
      const sessionsIdx = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'agents', 'main', 'sessions', 'sessions.json'), 'utf8'));
      const telegramMeta = sessionsIdx['agent:main:telegram:direct:1012034994'];
      if (telegramMeta) {
        const sessionFile = path.join(OPENCLAW_DIR, 'agents', 'main', 'sessions', `${telegramMeta.sessionId}.jsonl`);
        if (fs.existsSync(sessionFile)) {
          const sessionLines = fs.readFileSync(sessionFile, 'utf8').split('\n').filter(Boolean).slice(-200);
          for (const l of sessionLines) {
            try {
              const m = JSON.parse(l);
              if (m.message?.role === 'user' && m.timestamp) {
                const content = m.message.content;
                let text = '';
                if (Array.isArray(content)) {
                  for (const c of content) {
                    if (c.type === 'text') text += c.text;
                  }
                } else if (typeof content === 'string') {
                  text = content;
                }
                // Skip OpenClaw injected system notifications (subagent completion, etc.)
                const isSystemMsg = (
                  text.includes('[System Message]') ||
                  text.includes('[sessionId:') ||
                  /^\[(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{4}/.test(text.trim())
                );
                if (!isSystemMsg && text.trim()) {
                  // Clean up "Replied message" format — extract the body or show as reply
                  let cleanText = text;
                  if (text.startsWith('Replied message (untrusted')) {
                    // Try to extract text after the JSON block
                    const afterJson = text.replace(/```json[\s\S]*?```/g, '').replace('Replied message (untrusted, for context):', '').trim();
                    cleanText = afterJson || '[User replied to bot message]';
                  }
                  telegramMessages.push({ tsMs: new Date(m.timestamp).getTime(), text: cleanText.slice(0, 800) });
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    // Build analytics lookup by run_id (preferred) or agent+time
    const analyticsById = new Map();
    const analyticsByAgent = {};
    for (const a of analytics) {
      if (a.run_id) analyticsById.set(a.run_id, a);
      if (!analyticsByAgent[a.agent]) analyticsByAgent[a.agent] = [];
      analyticsByAgent[a.agent].push(a);
    }

    // Build cost lookup by session_key
    const costBySessionKey = {};
    for (const c of costs) {
      const k = c.session_key || '';
      if (!costBySessionKey[k]) costBySessionKey[k] = [];
      costBySessionKey[k].push(c);
    }

    // Join routing + analytics
    const merged = routing.map(r => {
      const rMs = new Date(r.ts).getTime();
      const sk = r.session_key || '';

      // Try run_id join first, then fallback to time+agent
      let match = r.run_id ? analyticsById.get(r.run_id) : null;
      if (!match) {
        const agentAnalytics = analyticsByAgent[r.agent] || [];
        match = agentAnalytics.find(a =>
          Math.abs((new Date(a.ts).getTime() - (a.latency_ms || 0)) - rMs) < 5000
        );
      }

      // Get cost event for this call (join by session_key + time proximity)
      const costCandidates = costBySessionKey[sk] || [];
      const costEntry = costCandidates.find(c => Math.abs(new Date(c.ts).getTime() - rMs) < 10000) || null;

      // Parse trigger type
      let triggerType = 'direct';
      let channel = null;
      let cronJobId = null;
      let userId = null;
      if (sk.includes(':subagent:')) triggerType = 'subagent';
      else if (sk.includes(':telegram:direct:')) {
        triggerType = 'telegram'; channel = 'DM';
        userId = sk.split(':telegram:direct:')[1];
      } else if (sk.includes(':telegram:group:')) {
        triggerType = 'telegram'; channel = 'Group';
      } else if (sk.includes(':whatsapp:')) {
        triggerType = 'whatsapp'; channel = 'WhatsApp';
      } else if (sk.includes(':cron:')) {
        triggerType = 'cron';
        cronJobId = sk.split(':cron:')[1]?.split(':')[0];
      }

      const isLocal = (r.provider || '').toLowerCase().startsWith('ollama');
      const latencyMs = match ? match.latency_ms : (costEntry ? costEntry.latency_ms : null);
      const tokensIn = match ? (match.tokens_in || 0) : (costEntry?.tokens?.input || 0);
      const tokensOut = match ? (match.tokens_out || 0) : (costEntry?.tokens?.output || 0);
      const tokensCached = match ? (match.tokens_cached || 0) : (costEntry?.tokens?.cache_read || 0);
      const costUsd = match ? (match.cost_usd || 0) : (costEntry?.cost_usd || 0);

      return {
        ts: r.ts, tsMs: rMs, endMs: latencyMs ? (rMs + latencyMs) : null,
        agent: r.agent, sessionKey: sk,
        model: r.selected_model || `${r.provider}/${r.model}` || 'unknown',
        provider: r.provider || 'unknown',
        triggerType, channel, cronJobId, userId,
        historyCount: r.history_messages || 0,
        promptLen: r.prompt_length || 0,
        promptTail: r.prompt_tail || match?.prompt_tail || null,
        responsePreview: match?.response_preview || null,
        responseChars: match?.response_chars || 0,
        latencyMs,
        tokensIn, tokensOut, tokensCached,
        costUsd, tier: isLocal ? 'free' : 'paid',
        billingType: costEntry?.billing_type || (isLocal ? 'free' : 'payg'),
        completed: !!match || !!costEntry,
        success: costEntry ? costEntry.success !== false : null,
      };
    }).sort((a, b) => a.tsMs - b.tsMs);

    // Cluster into pipelines (non-subagent trigger = new pipeline; subagents attach within 5 min)
    const WINDOW = 5 * 60 * 1000;
    const pipelines = [];
    let cur = null;
    for (const e of merged) {
      const isRoot = e.triggerType !== 'subagent';
      const sinceStart = cur ? (e.tsMs - new Date(cur.triggeredAt).getTime()) : Infinity;
      if (!cur || (isRoot && sinceStart > WINDOW)) {
        if (cur) pipelines.push(cur);
        cur = {
          triggeredAt: e.ts, triggerAtMs: e.tsMs,
          triggerType: e.triggerType, channel: e.channel,
          cronJobId: e.cronJobId, userId: e.userId,
          steps: [], lastMs: e.tsMs
        };
      }
      cur.steps.push(e);
      cur.lastMs = Math.max(cur.lastMs, e.endMs || e.tsMs);
    }
    if (cur) pipelines.push(cur);

    // Enrich each pipeline with metrics + trigger message
    const now = Date.now();
    const result = pipelines.slice(-25).reverse().map((p, i) => {
      const totalCost = p.steps.reduce((s, e) => s + (e.costUsd || 0), 0);
      const paidCost = p.steps.filter(e => e.tier === 'paid').reduce((s, e) => s + (e.costUsd || 0), 0);
      const freeCost = p.steps.filter(e => e.tier === 'free').reduce((s, e) => s + (e.costUsd || 0), 0);
      const uniqueAgents = [...new Set(p.steps.map(e => e.agent))];
      const paidModels = [...new Set(p.steps.filter(e => e.tier === 'paid').map(e => e.model))];
      const freeModels = [...new Set(p.steps.filter(e => e.tier === 'free').map(e => e.model))];
      const hasIncomplete = p.steps.some(e => !e.completed);
      const isLive = hasIncomplete || (now - p.lastMs) < 90000;
      const totalLatencyMs = p.lastMs - p.triggerAtMs;
      const totalTokensIn = p.steps.reduce((s, e) => s + (e.tokensIn || 0), 0);
      const totalTokensOut = p.steps.reduce((s, e) => s + (e.tokensOut || 0), 0);

      // Find the trigger message from Telegram session (closest user message before pipeline start, within 30s)
      let triggerMessage = null;
      if (p.triggerType === 'telegram') {
        const candidates = telegramMessages.filter(m => Math.abs(m.tsMs - p.triggerAtMs) < 90000);
        if (candidates.length > 0) {
          triggerMessage = candidates.sort((a, b) => Math.abs(a.tsMs - p.triggerAtMs) - Math.abs(b.tsMs - p.triggerAtMs))[0]?.text || null;
        }
      }

      // Get cron job name if applicable
      let cronJobName = null;
      if (p.triggerType === 'cron' && p.cronJobId) {
        try {
          const jobs = JSON.parse(fs.readFileSync(path.join(OPENCLAW_DIR, 'cron', 'jobs.json'), 'utf8'));
          const job = (jobs.jobs || []).find(j => j.id === p.cronJobId);
          cronJobName = job?.name || null;
        } catch {}
      }

      // Look for prompt_tail in root step for cron trigger message
      const rootStep = p.steps[0];
      const triggerPrompt = triggerMessage || (p.triggerType === 'cron' ? (cronJobName || 'Cron job') : null) || rootStep?.promptTail || null;

      // Stable request ID: date + sequential index within day
      const dayPrefix = p.triggeredAt.slice(0, 10).replace(/-/g, '');
      const reqId = `REQ-${dayPrefix}-${String(pipelines.length - i).padStart(3, '0')}`;

      return {
        id: reqId,
        triggeredAt: p.triggeredAt,
        triggerType: p.triggerType,
        channel: p.channel,
        cronJobName,
        triggerMessage: triggerPrompt,
        isLive,
        // Steps with full traceability
        steps: p.steps,
        // Aggregate metrics
        totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
        paidCost: Math.round(paidCost * 1_000_000) / 1_000_000,
        freeCost: Math.round(freeCost * 1_000_000) / 1_000_000,
        totalLatencyMs: totalLatencyMs > 0 ? totalLatencyMs : null,
        agentCount: uniqueAgents.length,
        agents: uniqueAgents,
        paidModels,
        freeModels,
        totalTokensIn,
        totalTokensOut,
        requestsToday: null, // filled by analytics tab
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
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

// ── /api/search — semantic memory search ────────────────────────────────────
if (url.pathname === '/api/search' && req.method === 'GET') {
  const q = url.searchParams.get('q') || '';
  const top = parseInt(url.searchParams.get('top') || '5', 10);
  if (!q) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'q param required' }));
    return;
  }
  const { execFile } = await import('node:child_process');
  execFile(
    'python3',
    [path.join(OPENCLAW_DIR, 'workspace', 'scripts', 'memsearch.py'), q, '--top', String(top), '--json'],
    { timeout: 30000 },
    (err, stdout, stderr) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, stderr }));
        return;
      }
      try {
        const results = JSON.parse(stdout);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ query: q, results }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'parse error', raw: stdout.slice(0, 500) }));
      }
    }
  );
  return;
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  🦞 Mission Control Dashboard`);
  console.log(`  ➜ http://localhost:${PORT}\n`);
});
