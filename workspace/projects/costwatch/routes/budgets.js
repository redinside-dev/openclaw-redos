'use strict';
const { Router } = require('express');
const { store, uid } = require('../data/seed');

const router = Router();

router.get('/', (req, res) => res.json(store.budgets));

router.post('/', (req, res) => {
  const { userId, providerId, limit, period, alertsEnabled, alertThreshold } = req.body;
  if (!limit || !period) return res.status(400).json({ error: 'limit and period required' });
  const budget = {
    id: `bgt_${uid()}`,
    userId: userId || 'user_system',
    providerId: providerId || null,
    limit: parseFloat(limit),
    period,
    alertsEnabled: alertsEnabled !== false,
    alertThreshold: parseFloat(alertThreshold) || 0.8,
  };
  store.upsertBudget(budget);
  res.status(201).json(budget);
});

router.put('/:id', (req, res) => {
  const budget = store.budgets.find(b => b.id === req.params.id);
  if (!budget) return res.status(404).json({ error: 'Not found' });
  store.upsertBudget({ ...budget, ...req.body, id: budget.id });
  res.json(store.budgets.find(b => b.id === req.params.id));
});

module.exports = router;
