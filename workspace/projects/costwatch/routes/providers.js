'use strict';
const { Router } = require('express');
const { store, uid } = require('../data/seed');

const router = Router();

router.get('/', (req, res) => {
  // Never expose apiKey
  res.json(store.providers.map(({ apiKey, ...p }) => p));
});

router.post('/', (req, res) => {
  const { name, apiKey, enabled } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const provider = { id: `prov_${uid()}`, name, apiKey: apiKey || '', enabled: enabled !== false };
  store.upsertProvider(provider);
  const { apiKey: _, ...safe } = provider;
  res.status(201).json(safe);
});

router.put('/:id', (req, res) => {
  const p = store.providers.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  store.upsertProvider({ ...p, ...req.body, id: p.id });
  const { apiKey: _, ...safe } = store.providers.find(x => x.id === req.params.id);
  res.json(safe);
});

module.exports = router;
