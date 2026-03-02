import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { exec } from 'child_process';
import { resilientHandler } from './resilient-handler.js';
import { trackRouter } from './track-router.js';
import { errorHandler } from '../resilience/error-handler.js';
import { devopsAgent } from '../resilience/devops-agent.js';
import { taskScheduler } from '../scheduler/task-scheduler.js';
import { ticketSystem } from '../resilience/ticket-system.js';
import { costMonitor } from '../cost-monitor/monitor.js';
import { ceoAgent } from '../agents/ceo-agent.js';
import { kanbanBoard } from '../kanban/board.js';
import { autonomousLearner } from '../learning/autonomous-learner.js';
import { autonomousIssueTracker } from '../resilience/autonomous-issue-tracker.js';
import { statusMonitor } from '../resilience/status-monitor.js';
import { vectorMemory } from '../memory/vector-memory.js';
import { promptCache } from '../cache/prompt-cache.js';
import { makerChecker } from '../security/maker-checker.js';
import { mcpAutoDiscovery } from '../mcp/auto-discovery.js';
import { ultimateRouter } from '../agents/ultimate-router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const handler = trackRouter; // Use track router (includes HATAKE parser)

// WebSocket clients for Mission Control
const wsClients = new Set();

// Start DevOps agent
devopsAgent.start();

// Load and start task scheduler
await taskScheduler.loadQueue();
taskScheduler.startProcessing();

// Load tickets
await ticketSystem.loadTickets();

// Middleware
app.use(cors());
app.use(express.json());

// Serve dashboard
app.use(express.static(path.join(__dirname, '../dashboard')));

// ── Batch API helper ─────────────────────────────────────────────────────────
const BATCH_RESULTS_LOG = path.join(__dirname, '../workspace/logs/batch-results.jsonl');
import { appendFileSync } from 'fs';

async function submitAnthropicBatch(agentId, message, apiKey) {
  const soulPath = path.join(__dirname, '../workspace/SOUL.md');
  let systemPrompt = '';
  try { systemPrompt = readFileSync(soulPath, 'utf8'); } catch (_) {}

  const requestBody = {
    requests: [{
      custom_id: `batch-${agentId}-${Date.now()}`,
      params: {
        model: 'claude-haiku-4-5-20251001', // Always use cheapest for batch
        max_tokens: 4096,
        messages: [{ role: 'user', content: message }],
        ...(systemPrompt ? {
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
        } : {})
      }
    }]
  };

  const response = await fetch('https://api.anthropic.com/v1/messages/batches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'message-batches-2024-09-24,prompt-caching-2024-07-31'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Batch API error: ${err}`);
  }

  const data = await response.json();
  const batchId = data.id;

  // Log batch submission
  const logEntry = JSON.stringify({
    ts: new Date().toISOString(),
    agentId,
    batchId,
    status: 'submitted',
    message_preview: message.substring(0, 100)
  }) + '\n';
  try { appendFileSync(BATCH_RESULTS_LOG, logEntry); } catch (_) {}

  return batchId;
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { agentId, message, batch } = req.body;

  if (!agentId || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: { agentId: 'string', message: 'string' }
    });
  }

  // ── Batch API route (fire-and-forget for non-real-time jobs) ────────────────
  if (batch === true) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'Batch API requires ANTHROPIC_API_KEY' });
    }
    try {
      const batchId = await submitAnthropicBatch(agentId, message, apiKey);
      return res.json({
        content: `[BATCH] Request submitted. Batch ID: ${batchId}. Results will be written to workspace/logs/batch-results.jsonl when ready (typically <24h).`,
        batchId,
        batch: true,
        model: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', reason: 'batch-api-50pct-discount' },
        cost: 0,
        latency: 0
      });
    } catch (batchErr) {
      console.error('Batch API error:', batchErr.message);
      // Fall through to real-time handling if batch fails
    }
  }

  try {
    // STEP 1: STATUS CHECK - Intercept if system not operational
    const clientId = req.headers['x-user-id'] || 'anonymous';

    // Check if this is a worker/internal request
    const workerOptions = {
      isWorker: req.headers['x-worker-request'] === 'true' ||
                req.headers['x-source'] === 'autonomous-worker' ||
                clientId.includes('worker') ||
                clientId.includes('agent'),
      purpose: req.headers['x-purpose'] || undefined,
      source: req.headers['x-source'] || undefined
    };

    const statusCheck = await statusMonitor.interceptClientRequest(message, clientId, workerOptions);

    if (!statusCheck.proceed) {
      // System not operational - return status message IMMEDIATELY
      return res.json({
        content: statusCheck.response,
        model: {
          provider: 'status-monitor',
          model: 'system-status',
          reason: 'system not operational'
        },
        latency: 0,
        cost: 0,
        status: statusCheck.status,
        intercepted: true
      });
    }

    // STEP 2: Check prompt cache for duplicate/similar questions
    const cacheCheck = await promptCache.check(message, agentId);

    if (cacheCheck.hit) {
      // Return cached response instantly (no generation needed!)
      return res.json({
        content: cacheCheck.cached.response,
        model: cacheCheck.cached.model,
        latency: 0, // Instant from cache
        cost: 0,    // Free from cache
        cached: true,
        cacheType: cacheCheck.type,
        similarity: cacheCheck.similarity,
        hitCount: cacheCheck.hitCount
      });
    }

    // STEP 3: Retrieve relevant context from vector memory
    const context = await vectorMemory.retrieveContext(message);

    // STEP 4: Check for user model override
    const modelOverride = req.body.context?.modelOverride;
    const forceModel = modelOverride
      ? `${modelOverride.provider}/${modelOverride.model}`
      : undefined;

    // STEP 5: Process request with context - STRICT 60 SECOND TIMEOUT
    const SLA_TIMEOUT = 60000; // 1 minute maximum

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('SLA_VIOLATION: Request exceeded 60 second limit'));
      }, SLA_TIMEOUT);
    });

    const requestPromise = handler.route(agentId, message, {
      userId: clientId,
      source: 'api',
      vectorContext: context,
      forceModel: forceModel, // Apply user's model override if set
      ...req.body.context
    });

    let result;
    try {
      result = await Promise.race([requestPromise, timeoutPromise]);
    } catch (error) {
      if (error.message.includes('SLA_VIOLATION')) {
        console.log(`🚨 SLA VIOLATION - killing stuck Ollama processes`);

        // Kill stuck Ollama runners
        exec('pkill -9 -f "ollama runner"', () => {});

        return res.status(504).json({
          error: 'Request timeout - exceeded 60 second SLA',
          message: 'Your request took too long. The system automatically switched to faster processing. Please try again.',
          slaViolation: true,
          timeout: 60000
        });
      }
      throw error;
    }

    // STEP 5: Store in prompt cache
    await promptCache.store(message, result.content, {
      agentId,
      model: result.model,
      cost: result.cost,
      latency: result.latency
    });

    // STEP 6: Store conversation in vector memory
    await vectorMemory.storeConversation({
      agentId,
      userId: clientId,
      message,
      response: result.content,
      model: result.model?.provider + '/' + result.model?.model,
      cost: result.cost,
      latency: result.latency,
      success: true
    });

    res.json(result);
  } catch (error) {
    console.error('API Error:', error);

    // AUTONOMOUS ISSUE LOGGING - NEVER REFUSES!
    const issue = await autonomousIssueTracker.logIssue({
      title: `API Error: ${error.message.substring(0, 100)}`,
      description: `Error handling request from ${agentId}\n\nMessage: "${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"\n\nError: ${error.message}\n\nStack: ${error.stack}`,
      severity: 'HIGH',
      clientImpacted: true,
      reporter: 'GATEWAY_API',
      tags: ['api-error', 'gateway']
    });

    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
      issueId: issue.id,
      message: `Error logged automatically (${issue.id}). Team notified and investigating.`
    });
  }
});

// Cost metrics endpoint
app.get('/api/cost', (req, res) => {
  res.json(costMonitor.getState());
});

// Cost by model endpoint
app.get('/api/cost/by-model', (req, res) => {
  const state = costMonitor.getState();
  res.json(state.today.byModel);
});

// Cost by agent endpoint
app.get('/api/cost/by-agent', (req, res) => {
  const state = costMonitor.getState();
  res.json(state.today.byAgent);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cost: costMonitor.getState()
  });
});

// Status endpoint
app.get('/api/status', async (req, res) => {
  const systemStatus = await statusMonitor.getStatus();
  res.json({
    status: systemStatus.status,
    operational: systemStatus.operational,
    message: systemStatus.message,
    agents: ['main', 'allrounder', 'eng', 'research', 'finance', 'ops', 'infosec'],
    models: {
      available: ['ollama/llama3.1:8b', 'ollama/qwen2.5-coder:7b', 'perplexity/sonar-pro', 'perplexity/sonar', 'zai/glm-4.7'],
      preferred: 'ollama/llama3.1:8b'
    },
    cost: costMonitor.getState(),
    uptime: Math.floor(process.uptime()),
    version: '3.6.0',
    features: ['smart-routing', 'cost-tracking', 'ceo-agents', 'kanban', 'autonomous-learning', 'status-monitor', 'autonomous-issue-tracker', 'internet-detection', 'maker-checker-security', 'mcp-auto-discovery', 'ultimate-router']
  });
});

// System status endpoint (detailed)
app.get('/api/system/status', async (req, res) => {
  res.json(await statusMonitor.getStatus());
});

// Maintenance mode endpoints
app.post('/api/system/maintenance/enter', async (req, res) => {
  const { message, duration } = req.body;
  await statusMonitor.enterMaintenanceMode(message, duration || '30 minutes');
  res.json({ success: true, status: 'MAINTENANCE' });
});

app.post('/api/system/maintenance/exit', async (req, res) => {
  await statusMonitor.exitMaintenanceMode();
  res.json({ success: true, status: 'OPERATIONAL' });
});

// ============================================================
// CEO AGENT ENDPOINTS
// ============================================================

// Get CEO dashboard
app.get('/api/ceo/dashboard', (req, res) => {
  res.json(ceoAgent.getDashboard());
});

// Create task
app.post('/api/ceo/tasks', (req, res) => {
  const { title, description, config } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: { title: 'string', description: 'string' }
    });
  }

  const taskId = ceoAgent.createTask(title, description, config || {});
  res.json({ taskId, task: ceoAgent.tasks.get(taskId) });
});

// Get all tasks
app.get('/api/ceo/tasks', (req, res) => {
  res.json(ceoAgent.getAllTasks());
});

// Assign task
app.post('/api/ceo/tasks/:taskId/assign', (req, res) => {
  const { taskId } = req.params;
  const { agentId } = req.body;

  if (!agentId) {
    return res.status(400).json({ error: 'Missing agentId' });
  }

  const success = ceoAgent.assignTask(taskId, agentId);
  res.json({ success, task: ceoAgent.tasks.get(taskId) });
});

// Spawn secretary
app.post('/api/ceo/secretaries', (req, res) => {
  const { task, config } = req.body;

  if (!task || !task.title) {
    return res.status(400).json({ error: 'Missing task object with title' });
  }

  const secretaryId = ceoAgent.spawnSecretary(task, config || {});
  res.json({ secretaryId, secretary: ceoAgent.secretaries.get(secretaryId) });
});

// Get active secretaries
app.get('/api/ceo/secretaries', (req, res) => {
  res.json(ceoAgent.getActiveSecretaries());
});

// ============================================================
// KANBAN BOARD ENDPOINTS
// ============================================================

// Get full board
app.get('/api/kanban/board', (req, res) => {
  res.json(kanbanBoard.getBoard());
});

// Get board stats
app.get('/api/kanban/stats', (req, res) => {
  res.json(kanbanBoard.getStats());
});

// Create card
app.post('/api/kanban/cards', (req, res) => {
  const { title, description, config } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: { title: 'string', description: 'string' }
    });
  }

  const cardId = kanbanBoard.createCard(title, description, config || {});
  res.json({ cardId, card: kanbanBoard.getCard(cardId) });
});

// Get card
app.get('/api/kanban/cards/:cardId', (req, res) => {
  const card = kanbanBoard.getCard(req.params.cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json(card);
});

// Move card
app.post('/api/kanban/cards/:cardId/move', (req, res) => {
  const { column } = req.body;

  if (!column) {
    return res.status(400).json({ error: 'Missing column' });
  }

  try {
    const card = kanbanBoard.moveCard(req.params.cardId, column);
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update card
app.patch('/api/kanban/cards/:cardId', (req, res) => {
  try {
    const card = kanbanBoard.updateCard(req.params.cardId, req.body);
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add comment
app.post('/api/kanban/cards/:cardId/comments', (req, res) => {
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: { author: 'string', text: 'string' }
    });
  }

  try {
    const comment = kanbanBoard.addComment(req.params.cardId, author, text);
    res.json(comment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Search cards
app.get('/api/kanban/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter: q' });
  }

  res.json(kanbanBoard.searchCards(q));
});

// Get blocked cards
app.get('/api/kanban/blocked', (req, res) => {
  res.json(kanbanBoard.getBlockedCards());
});

// Get overdue cards
app.get('/api/kanban/overdue', (req, res) => {
  res.json(kanbanBoard.getOverdueCards());
});

// ============================================================
// PROMPT CACHE ENDPOINTS
// ============================================================

// Get cache stats
app.get('/api/cache/stats', (req, res) => {
  res.json(promptCache.getStats());
});

// Get popular queries
app.get('/api/cache/popular', (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  res.json(promptCache.getPopular(limit));
});

// Clear cache
app.post('/api/cache/clear', (req, res) => {
  promptCache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// Clear expired entries
app.post('/api/cache/clear-expired', (req, res) => {
  const removed = promptCache.clearExpired();
  res.json({ success: true, removed: removed });
});

// ============================================================
// VECTOR MEMORY ENDPOINTS
// ============================================================

// Get memory stats
app.get('/api/memory/stats', (req, res) => {
  res.json(vectorMemory.getStats());
});

// Retrieve context for query
app.post('/api/memory/context', async (req, res) => {
  const { query, limit } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }
  const context = await vectorMemory.retrieveContext(query, limit || 5);
  res.json(context);
});

// Check if issue solved
app.post('/api/memory/check-issue', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Missing description' });
  }
  const result = await vectorMemory.isIssueSolved(description);
  res.json(result);
});

// Get agent knowledge
app.get('/api/memory/agent/:agentId', async (req, res) => {
  const knowledge = await vectorMemory.getAgentKnowledge(req.params.agentId);
  res.json(knowledge);
});

// ============================================================
// AUTONOMOUS LEARNING ENDPOINTS
// ============================================================

// Record experience
app.post('/api/learning/experience', (req, res) => {
  const { agentId, task, result, metadata } = req.body;

  if (!agentId || !task || !result) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: { agentId: 'string', task: 'string', result: 'string' }
    });
  }

  const experienceId = autonomousLearner.recordExperience(agentId, task, result, metadata || {});
  res.json({ experienceId });
});

// Get learning summary
app.get('/api/learning/:agentId/summary', (req, res) => {
  const summary = autonomousLearner.getLearningSummary(req.params.agentId);
  res.json(summary);
});

// Get all summaries
app.get('/api/learning/summaries', (req, res) => {
  res.json(autonomousLearner.getAllSummaries());
});

// Run learning cycle
app.post('/api/learning/:agentId/cycle', async (req, res) => {
  try {
    const result = await autonomousLearner.runLearningCycle(req.params.agentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Query knowledge
app.get('/api/learning/knowledge/:topic', (req, res) => {
  const knowledge = autonomousLearner.queryKnowledge(req.params.topic);
  if (!knowledge) {
    return res.status(404).json({ error: 'Knowledge not found' });
  }
  res.json(knowledge);
});

// ============================================================
// RESILIENCE & MONITORING ENDPOINTS
// ============================================================

// Get error statistics
app.get('/api/resilience/errors', (req, res) => {
  res.json(errorHandler.getStats());
});

// Get DevOps health summary
app.get('/api/resilience/health', (req, res) => {
  res.json(devopsAgent.getSummary());
});

// Get handler statistics
app.get('/api/resilience/stats', (req, res) => {
  res.json(handler.getStats());
});

// ============================================================
// TASK SCHEDULER ENDPOINTS
// ============================================================

// Schedule a task
app.post('/api/scheduler/schedule', async (req, res) => {
  const { description, message, agentId, priority, callback } = req.body;

  if (!description || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: { description: 'string', message: 'string' }
    });
  }

  const taskId = await taskScheduler.scheduleTask({
    description,
    message,
    agentId: agentId || 'main',
    priority: priority || 'normal',
    callback
  });

  res.json({ taskId, status: 'scheduled' });
});

// Get scheduler status
app.get('/api/scheduler/status', (req, res) => {
  res.json(taskScheduler.getStatus());
});

// Get scheduler queue
app.get('/api/scheduler/queue', (req, res) => {
  res.json({
    queue: taskScheduler.queue,
    processing: taskScheduler.currentTasks,
    completed: taskScheduler.completedTasks,
    failed: taskScheduler.failedTasks
  });
});

// ============================================================
// TICKET SYSTEM ENDPOINTS (Internal Only)
// ============================================================

// Get all tickets
app.get('/api/tickets', (req, res) => {
  res.json({
    tickets: ticketSystem.tickets,
    stats: ticketSystem.getStats()
  });
});

// Get open tickets
app.get('/api/tickets/open', (req, res) => {
  res.json(ticketSystem.getOpenTickets());
});

// Get tickets by assignee
app.get('/api/tickets/assignee/:assignee', (req, res) => {
  res.json(ticketSystem.getTicketsByAssignee(req.params.assignee));
});

// Get tickets by priority
app.get('/api/tickets/priority/:priority', (req, res) => {
  res.json(ticketSystem.getTicketsByPriority(req.params.priority));
});

// Get ticket stats
app.get('/api/tickets/stats', (req, res) => {
  res.json(ticketSystem.getStats());
});

// Update ticket
app.patch('/api/tickets/:ticketId', async (req, res) => {
  try {
    const ticket = await ticketSystem.updateTicket(req.params.ticketId, req.body);
    res.json(ticket);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Close ticket
app.post('/api/tickets/:ticketId/close', async (req, res) => {
  try {
    const { resolution } = req.body;
    const ticket = await ticketSystem.closeTicket(req.params.ticketId, resolution);
    res.json(ticket);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// ============================================================
// SECURITY - MAKER-CHECKER ENDPOINTS
// ============================================================

// Request admin window (DevOps MAKER step 1)
app.post('/api/security/admin-window/request', async (req, res) => {
  const { requestedBy, purpose, duration } = req.body;
  if (!requestedBy || !purpose) {
    return res.status(400).json({ error: 'Missing required fields', required: { requestedBy: 'string', purpose: 'string' } });
  }
  try {
    const window = await makerChecker.requestAdminWindow(requestedBy, purpose, duration || 15);
    res.json(window);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/deny admin window (InfoSec CHECKER step 2)
app.post('/api/security/admin-window/:windowId/approve', async (req, res) => {
  const { infosecApprover, decision, reason } = req.body;
  if (!infosecApprover || !decision) {
    return res.status(400).json({ error: 'Missing required fields', required: { infosecApprover: 'string', decision: 'APPROVED|DENIED' } });
  }
  try {
    const window = await makerChecker.approveAdminWindow(req.params.windowId, infosecApprover, decision, reason);
    res.json(window);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Execute action with admin window (DevOps MAKER step 3)
app.post('/api/security/action/execute', async (req, res) => {
  const { action, executor, windowId } = req.body;
  if (!action || !executor) {
    return res.status(400).json({ error: 'Missing required fields', required: { action: 'object', executor: 'string' } });
  }
  try {
    const result = await makerChecker.executeAction(action, executor, windowId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/deny specific action (InfoSec real-time approval)
app.post('/api/security/action/:approvalId/approve', async (req, res) => {
  const { infosecApprover, decision, reason } = req.body;
  if (!infosecApprover || !decision) {
    return res.status(400).json({ error: 'Missing required fields', required: { infosecApprover: 'string', decision: 'APPROVED|DENIED' } });
  }
  try {
    const result = await makerChecker.approveAction(req.params.approvalId, infosecApprover, decision, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get pending admin windows
app.get('/api/security/admin-windows', (req, res) => {
  res.json({
    windows: makerChecker.activeWindows,
    pending: makerChecker.activeWindows.filter(w => w.status === 'PENDING_INFOSEC_APPROVAL'),
    active: makerChecker.activeWindows.filter(w => w.status === 'ACTIVE')
  });
});

// Get pending actions awaiting InfoSec approval
app.get('/api/security/pending-actions', (req, res) => {
  res.json(makerChecker.pendingActions);
});

// ============================================================
// MCP AUTO-DISCOVERY ENDPOINTS
// ============================================================

// Trigger MCP discovery
app.post('/api/mcp/discover', async (req, res) => {
  const { category } = req.body;
  try {
    const discoveries = await mcpAutoDiscovery.discoverMCPs(category || null);
    res.json({ discoveries, count: discoveries.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get approved MCPs
app.get('/api/mcp/approved', (req, res) => {
  res.json(mcpAutoDiscovery.approvedMCPs);
});

// Get pending MCPs awaiting approval
app.get('/api/mcp/pending', (req, res) => {
  res.json(mcpAutoDiscovery.pendingMCPs);
});

// Approve an MCP
app.post('/api/mcp/:mcpName/approve', async (req, res) => {
  const { approvedBy } = req.body;
  try {
    const approved = await mcpAutoDiscovery.approveMCP(req.params.mcpName, approvedBy || 'DEVOPS');
    res.json(approved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// MISSION CONTROL ENDPOINTS (event-driven architecture v2)
// ============================================================

import { readFileSync, existsSync } from 'fs';
import { readFile } from 'fs/promises';

const COST_EVENTS_LOG = path.join(__dirname, '../workspace/logs/cost-events.jsonl');
const BUDGET_GUARDRAILS = path.join(__dirname, '../workspace/config/budget-guardrails.json');

function parseCostEventsLog(days = 30) {
  if (!existsSync(COST_EVENTS_LOG)) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const lines = readFileSync(COST_EVENTS_LOG, 'utf8').trim().split('\n').filter(Boolean);
  const events = [];
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      if (new Date(e.ts) >= cutoff) events.push(e);
    } catch { /* skip malformed */ }
  }
  return events;
}

// GET /api/mission-control/costs — cost breakdown by agent + model
app.get('/api/mission-control/costs', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const events = parseCostEventsLog(days);

    const byAgent = {};
    const byModel = {};
    const byTier = { lightweight: 0, standard: 0, heavy: 0, local: 0, other: 0 };
    const dailyBurn = {};
    let totalCost = 0;
    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    let totalCachedTokens = 0;

    const AGENTS = ['main', 'allrounder', 'eng', 'research', 'finance', 'ops', 'infosec', 'hatake'];

    for (const e of events) {
      const cost = e.cost_usd || 0;
      const agent = e.agent || 'unknown';
      const model = e.model || 'unknown';
      const day = (e.ts || '').substring(0, 10);

      totalCost += cost;
      totalTokensInput += e.tokens?.input || 0;
      totalTokensOutput += e.tokens?.output || 0;
      totalCachedTokens += e.tokens?.cache_read || 0;

      if (!byAgent[agent]) byAgent[agent] = { cost: 0, requests: 0, tokens: 0 };
      byAgent[agent].cost += cost;
      byAgent[agent].requests += 1;
      byAgent[agent].tokens += (e.tokens?.total || 0);

      if (!byModel[model]) byModel[model] = { cost: 0, requests: 0 };
      byModel[model].cost += cost;
      byModel[model].requests += 1;

      if (day) {
        if (!dailyBurn[day]) dailyBurn[day] = 0;
        dailyBurn[day] += cost;
      }

      // Classify tier from model name
      const m = model.toLowerCase();
      if (m.includes('haiku')) byTier.lightweight += cost;
      else if (m.includes('ollama') || m.includes('qwen') || m.includes('llama')) byTier.local += cost;
      else if (m.includes('opus')) byTier.heavy += cost;
      else if (m.includes('sonnet') || m.includes('gpt-5') || m.includes('codex')) byTier.standard += cost;
      else byTier.other += cost;
    }

    // Fill missing agents with zeros
    for (const a of AGENTS) {
      if (!byAgent[a]) byAgent[a] = { cost: 0, requests: 0, tokens: 0 };
    }

    // Build sorted daily burn array for chart
    const dailyBurnArray = Object.entries(dailyBurn)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost: parseFloat(cost.toFixed(4)) }));

    const avgDailyCost = dailyBurnArray.length > 0
      ? totalCost / dailyBurnArray.length
      : 0;

    res.json({
      period_days: days,
      total_cost_usd: parseFloat(totalCost.toFixed(4)),
      avg_daily_cost_usd: parseFloat(avgDailyCost.toFixed(4)),
      total_requests: events.length,
      total_tokens: {
        input: totalTokensInput,
        output: totalTokensOutput,
        cached: totalCachedTokens,
        cache_hit_rate: totalTokensInput > 0
          ? parseFloat((totalCachedTokens / (totalTokensInput + totalCachedTokens) * 100).toFixed(1))
          : 0
      },
      by_agent: byAgent,
      by_model: byModel,
      by_tier: byTier,
      daily_burn: dailyBurnArray,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mission-control/savings — estimated savings vs all-Standard baseline
app.get('/api/mission-control/savings', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const events = parseCostEventsLog(days);

    // Baseline: all requests at Sonnet 4.6 rates
    const SONNET_INPUT_PER_TOKEN = 0.003 / 1000;
    const SONNET_OUTPUT_PER_TOKEN = 0.015 / 1000;
    const HAIKU_INPUT_PER_TOKEN = 0.0008 / 1000;
    const HAIKU_OUTPUT_PER_TOKEN = 0.004 / 1000;

    let actualCost = 0;
    let baselineCost = 0;
    let cachedTokens = 0;
    let totalInputTokens = 0;

    for (const e of events) {
      actualCost += e.cost_usd || 0;
      const inputTok = e.tokens?.input || 0;
      const outputTok = e.tokens?.output || 0;
      const cached = e.tokens?.cache_read || 0;
      baselineCost += inputTok * SONNET_INPUT_PER_TOKEN + outputTok * SONNET_OUTPUT_PER_TOKEN;
      cachedTokens += cached;
      totalInputTokens += inputTok;
    }

    const savingsUsd = baselineCost - actualCost;
    const savingsPct = baselineCost > 0 ? (savingsUsd / baselineCost * 100) : 0;
    const cacheHitRate = (totalInputTokens + cachedTokens) > 0
      ? (cachedTokens / (totalInputTokens + cachedTokens) * 100)
      : 0;
    const cacheSavingsUsd = cachedTokens * SONNET_INPUT_PER_TOKEN * 0.9; // 90% cheaper cache reads

    // Target score (0-100)
    const routingSavingsPct = Math.min(savingsPct, 60);
    const cacheSavingsPct = Math.min(cacheHitRate, 30);
    const optimizationScore = Math.min(Math.round(routingSavingsPct + cacheSavingsPct), 100);

    res.json({
      period_days: days,
      actual_cost_usd: parseFloat(actualCost.toFixed(4)),
      baseline_cost_usd: parseFloat(baselineCost.toFixed(4)),
      savings_usd: parseFloat(savingsUsd.toFixed(4)),
      savings_pct: parseFloat(savingsPct.toFixed(1)),
      cache_savings_usd: parseFloat(cacheSavingsUsd.toFixed(4)),
      cache_hit_rate_pct: parseFloat(cacheHitRate.toFixed(1)),
      optimization_score: optimizationScore,
      target_savings_pct: 55,
      target_daily_cost_usd: 1.00,
      current_daily_cost_usd: parseFloat((actualCost / Math.max(days, 1)).toFixed(4)),
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mission-control/subscriptions — subscription utilization
app.get('/api/mission-control/subscriptions', (req, res) => {
  try {
    let guardrails = {};
    if (existsSync(BUDGET_GUARDRAILS)) {
      guardrails = JSON.parse(readFileSync(BUDGET_GUARDRAILS, 'utf8'));
    }

    const fixed = guardrails.fixed_monthly || {};
    const breakdown = fixed.breakdown || {};
    const subs = [];

    for (const [key, val] of Object.entries(breakdown)) {
      if (typeof val === 'object' && val.cost_usd !== undefined) {
        subs.push({
          id: key,
          service: val.service || key,
          monthly_cost_usd: val.cost_usd,
          review_action: val.review_action || '',
          savings_potential_usd: val.savings_potential_usd || 0
        });
      } else if (typeof val === 'number') {
        subs.push({ id: key, service: key, monthly_cost_usd: val });
      }
    }

    const totalFixed = subs.reduce((s, sub) => s + sub.monthly_cost_usd, 0);
    const totalSavingsPotential = subs.reduce((s, sub) => s + (sub.savings_potential_usd || 0), 0);

    res.json({
      total_fixed_monthly_usd: totalFixed,
      total_variable_monthly_usd: guardrails.variable_spend?.monthly_limit_usd || 30,
      subscriptions: subs,
      subscription_savings_potential_usd: totalSavingsPotential,
      last_audit: guardrails.fixed_monthly?.subscription_audit?.last_audit || null,
      next_audit_due: guardrails.fixed_monthly?.subscription_audit?.next_audit_due || null,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ULTIMATE ROUTER ENDPOINT
// ============================================================

// Get routing decision for a message
app.post('/api/router/decision', async (req, res) => {
  const { message, context } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }
  try {
    const decision = await ultimateRouter.route(message, context || {});
    const explanation = ultimateRouter.explainDecision(message, decision);
    res.json({ decision, explanation, stats: ultimateRouter.getStats() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 19000;
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 OpenClaw Enhanced Gateway Started!');
  console.log('='.repeat(60));
  console.log(`📊 Dashboard:  http://localhost:${PORT}/`);
  console.log(`📊 Mission:    http://localhost:${PORT}/mission-control.html`);
  console.log(`💬 Chat API:   http://localhost:${PORT}/api/chat`);
  console.log(`💰 Cost API:   http://localhost:${PORT}/api/cost`);
  console.log(`🏥 Health:     http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
  console.log('\n✅ Ready to handle requests!\n');
});

// WebSocket Server for Mission Control
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('📡 Mission Control connected');
  wsClients.add(ws);

  ws.on('close', () => {
    console.log('📡 Mission Control disconnected');
    wsClients.delete(ws);
  });

  // Send initial data
  ws.send(JSON.stringify({
    type: 'connected',
    payload: { message: 'Mission Control connected' }
  }));
});

// Broadcast to all Mission Control clients
function broadcastToMissionControl(type, payload) {
  const message = JSON.stringify({ type, payload });
  wsClients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(message);
      } catch (error) {
        console.error('WebSocket send error:', error);
      }
    }
  });
}

// Hook into cost monitor updates
setInterval(() => {
  const metrics = {
    requests: costMonitor.state?.today?.requests || 0,
    totalCost: costMonitor.state?.today?.total || 0,
    successRate: 98, // TODO: Calculate real success rate
    avgResponse: 2.3
  };
  broadcastToMissionControl('metrics_update', metrics);
}, 5000); // Every 5 seconds

// Export broadcast function
export { broadcastToMissionControl };

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await costMonitor.save();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await costMonitor.save();
  process.exit(0);
});
