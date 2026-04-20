'use strict';
/**
 * Cost Tracker Middleware
 * Intercepts proxied LLM requests and logs cost to the in-memory store.
 * Usage: app.use('/api/proxy', costTracker, yourProxyHandler);
 */
const { store, uid } = require('../data/seed');

// Model cost lookup by name
function getCost(modelName, tokens) {
  const model = store.models.find(m => m.name === modelName);
  if (!model) return 0;
  return parseFloat((tokens * model.costPerToken).toFixed(6));
}

function costTracker(req, res, next) {
  const start = Date.now();
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    try {
      // Intercept OpenAI-style responses that have usage info
      if (body && body.usage && body.model) {
        const tokens = (body.usage.prompt_tokens || 0) + (body.usage.completion_tokens || 0);
        const cost = getCost(body.model, tokens);
        store.addUsage({
          id: `usg_${uid()}`,
          modelId: store.models.find(m => m.name === body.model)?.id || 'unknown',
          tokens,
          cost,
          timestamp: new Date().toISOString(),
          userId: req.headers['x-user-id'] || 'anonymous',
          latencyMs: Date.now() - start,
        });
      }
    } catch (_) {
      // Never let tracker break the response
    }
    return originalJson(body);
  };

  next();
}

module.exports = costTracker;
