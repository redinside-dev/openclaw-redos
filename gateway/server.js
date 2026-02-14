import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
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

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { agentId, message } = req.body;

  if (!agentId || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: { agentId: 'string', message: 'string' }
    });
  }

  try {
    // STEP 1: STATUS CHECK - Intercept if system not operational
    const clientId = req.headers['x-user-id'] || 'anonymous';
    const statusCheck = await statusMonitor.interceptClientRequest(message, clientId);

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

    // STEP 5: Process request with context
    const result = await handler.route(agentId, message, {
      userId: clientId,
      source: 'api',
      vectorContext: context,
      forceModel: forceModel, // Apply user's model override if set
      ...req.body.context
    });

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
      available: ['ollama/llama3.1:8b', 'ollama/qwen2.5-coder:7b', 'ollama/glm-4.7-flash:latest', 'perplexity/llama-3.1-sonar-small-128k-online'],
      preferred: 'ollama/llama3.1:8b'
    },
    cost: costMonitor.getState(),
    uptime: Math.floor(process.uptime()),
    version: '3.6.0',
    features: ['smart-routing', 'cost-tracking', 'ceo-agents', 'kanban', 'autonomous-learning', 'status-monitor', 'autonomous-issue-tracker', 'internet-detection']
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
