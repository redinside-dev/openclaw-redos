'use strict';
const { Router } = require('express');
const { store } = require('../data/seed');

const router = Router();

router.get('/', (req, res) => {
  const active = req.query.active === 'true';
  const list = active ? store.alerts.filter(a => !a.resolved) : store.alerts;
  res.json(list);
});

router.post('/:id/resolve', (req, res) => {
  const alert = store.alerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Not found' });
  alert.resolved = true;
  alert.resolvedAt = new Date().toISOString();
  res.json(alert);
});

module.exports = router;
