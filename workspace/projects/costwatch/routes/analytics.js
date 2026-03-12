'use strict';
const { Router } = require('express');
const { store } = require('../data/seed');

const router = Router();

// GET /api/analytics?days=30
router.get('/', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const cutoff = new Date(Date.now() - days * 86400000);

  const filtered = store.usage.filter(u => new Date(u.timestamp) >= cutoff);

  // Daily totals
  const daily = {};
  for (const u of filtered) {
    const day = u.timestamp.slice(0, 10);
    daily[day] = (daily[day] || 0) + u.cost;
  }
  const dailySeries = Object.entries(daily)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost: +cost.toFixed(4) }));

  // Top models by cost
  const modelCosts = {};
  for (const u of filtered) modelCosts[u.modelId] = (modelCosts[u.modelId] || 0) + u.cost;
  const topModels = Object.entries(modelCosts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([modelId, cost]) => {
      const m = store.models.find(x => x.id === modelId);
      return { modelId, name: m?.name || modelId, cost: +cost.toFixed(4) };
    });

  // Token usage trend
  const tokenDaily = {};
  for (const u of filtered) {
    const day = u.timestamp.slice(0, 10);
    tokenDaily[day] = (tokenDaily[day] || 0) + u.tokens;
  }

  res.json({
    period: `${days}d`,
    totalCost: +filtered.reduce((s, u) => s + u.cost, 0).toFixed(4),
    totalCalls: filtered.length,
    totalTokens: filtered.reduce((s, u) => s + u.tokens, 0),
    dailyCosts: dailySeries,
    topModels,
    tokenTrend: Object.entries(tokenDaily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, tokens]) => ({ date, tokens })),
  });
});

module.exports = router;
