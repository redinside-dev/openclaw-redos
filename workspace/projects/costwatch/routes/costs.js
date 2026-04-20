'use strict';
const { Router } = require('express');
const { store } = require('../data/seed');

const router = Router();

// GET /api/costs — current cost breakdown
router.get('/', (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayUsage   = store.usage.filter(u => new Date(u.timestamp) >= todayStart);
  const monthUsage   = store.usage.filter(u => new Date(u.timestamp) >= monthStart);
  const allUsage     = store.usage;

  // By provider
  const byProvider = {};
  for (const p of store.providers) {
    const provModels = store.models.filter(m => m.providerId === p.id).map(m => m.id);
    const todayCost  = todayUsage.filter(u => provModels.includes(u.modelId)).reduce((s, u) => s + u.cost, 0);
    const monthCost  = monthUsage.filter(u => provModels.includes(u.modelId)).reduce((s, u) => s + u.cost, 0);
    byProvider[p.name] = {
      providerId: p.id,
      today:  +todayCost.toFixed(4),
      month:  +monthCost.toFixed(4),
      enabled: p.enabled,
    };
  }

  // By model (top 8)
  const byModel = store.models.map(m => {
    const prov = store.providers.find(p => p.id === m.providerId);
    const todayCost = todayUsage.filter(u => u.modelId === m.id).reduce((s, u) => s + u.cost, 0);
    const monthCost = monthUsage.filter(u => u.modelId === m.id).reduce((s, u) => s + u.cost, 0);
    return { modelId: m.id, name: m.name, provider: prov?.name, today: +todayCost.toFixed(4), month: +monthCost.toFixed(4) };
  }).sort((a, b) => b.month - a.month);

  res.json({
    totals: {
      today: +todayUsage.reduce((s, u) => s + u.cost, 0).toFixed(4),
      month: +monthUsage.reduce((s, u) => s + u.cost, 0).toFixed(4),
      all:   +allUsage.reduce((s, u) => s + u.cost, 0).toFixed(4),
    },
    byProvider,
    byModel,
    currency: 'USD',
    updatedAt: now.toISOString(),
  });
});

module.exports = router;
