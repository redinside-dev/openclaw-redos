'use strict';
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { store } = require('./data/seed');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-id');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/costs',     require('./routes/costs'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/budgets',   require('./routes/budgets'));
app.use('/api/alerts',    require('./routes/alerts'));
app.use('/api/providers', require('./routes/providers'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  uptime: process.uptime(),
  usageRecords: store.usage.length,
  providers: store.providers.length,
  ts: new Date().toISOString(),
}));

// ── Socket.IO — real-time cost updates ──────────────────────────────────────
io.on('connection', (socket) => {
  // Send current costs immediately on connect
  socket.emit('cost_snapshot', buildSnapshot());

  socket.on('disconnect', () => {});
});

function buildSnapshot() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayUsage = store.usage.filter(u => new Date(u.timestamp) >= todayStart);
  return {
    todayCost: +todayUsage.reduce((s, u) => s + u.cost, 0).toFixed(4),
    todayCalls: todayUsage.length,
    todayTokens: todayUsage.reduce((s, u) => s + u.tokens, 0),
    ts: now.toISOString(),
  };
}

// Override addUsage to emit events
const _addUsage = store.addUsage.bind(store);
store.addUsage = (entry) => {
  _addUsage(entry);
  io.emit('cost_update', { entry, snapshot: buildSnapshot() });
};

// ── Simulate live usage every 30s (dev mode) ────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const { uid } = require('./data/seed');
  setInterval(() => {
    const models = store.models;
    const m = models[Math.floor(Math.random() * models.length)];
    const tokens = Math.floor(Math.random() * 2000) + 100;
    store.addUsage({
      id: `usg_${uid()}`,
      modelId: m.id,
      tokens,
      cost: parseFloat((tokens * m.costPerToken).toFixed(6)),
      timestamp: new Date().toISOString(),
      userId: 'user_system',
    });
  }, 30000);
}

// ── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`CostWatch running on http://localhost:${PORT}`);
  console.log(`  Usage records seeded: ${store.usage.length}`);
  console.log(`  Providers: ${store.providers.map(p => p.name).join(', ')}`);
});
