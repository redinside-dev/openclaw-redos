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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENCLAW_DIR = path.resolve(__dirname, '..');
const PORT = 19000;

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
    tickets.push({
      id, status: get('Status'), priority: get('Priority'),
      created: get('Created'), slaDeadline: get('SLA Deadline'),
      reporter: get('Reporter'), assignee: get('Assignee'),
      summary: get('Summary'), rootCause: get('Root Cause'),
      resolution: get('Resolution'), resolvedAt: get('Resolved At'),
    });
  }
  return tickets;
}

function getLearnings() {
  const content = readFileSafe(path.join(OPENCLAW_DIR, 'workspace', 'ops', 'LEARNINGS.md'));
  const learnings = [];
  const regex = /### (LEARNING-\S+)\n([\s\S]*?)(?=\n### LEARNING-|\n## |$)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
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
  res.setHeader('Access-Control-Allow-Methods', 'GET');

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

  // Static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
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
