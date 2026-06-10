#!/usr/bin/env node
// Minimal chat gateway for the Telegram bridge.
// Replaces the full gateway/server.js (which is structurally broken).
// Wraps `openclaw agent --json` and returns the shape telegram-bridge.js expects:
//   { agentId, content, latency, cost }
//
// Started by: launchd plist com.openclaw.chat-gateway on port 19010.

import 'dotenv/config';
import express from 'express';
import { execFile } from 'child_process';

const PORT = parseInt(process.env.CHAT_GATEWAY_PORT || '19010', 10);
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || '/opt/homebrew/bin/openclaw';
const AGENT_TIMEOUT_MS = parseInt(process.env.AGENT_TIMEOUT_MS || '180000', 10);

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, port: PORT, ts: Date.now() });
});

app.post('/api/chat', (req, res) => {
  const { agentId = 'main', message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message (string) required' });
  }
  const start = Date.now();
  execFile(
    OPENCLAW_BIN,
    ['agent', '--agent', String(agentId), '--message', message, '--json'],
    { timeout: AGENT_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 },
    (err, stdout, stderr) => {
      const latency = Date.now() - start;
      if (err) {
        console.error(`[chat-gw] ${agentId} exec error:`, err.message);
        if (err.killed) {
          return res.status(504).json({
            error: 'agent timed out',
            agentId,
            latency,
          });
        }
        return res.status(502).json({
          error: stderr?.toString() || err.message,
          agentId,
          latency,
        });
      }
      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (e) {
        return res.status(502).json({
          error: 'invalid json from openclaw',
          agentId,
          latency,
          raw: stdout.slice(0, 500),
        });
      }
      const content =
        parsed?.result?.finalAssistantVisibleText ||
        parsed?.result?.payloads?.[0]?.text ||
        '';
      const usage = parsed?.result?.meta?.agentMeta?.usage || {};
      // rough cost: 0 for free-unlimited, otherwise a placeholder
      const cost = 0;
      res.json({
        ok: true,
        agentId,
        content,
        latency,
        cost,
        runId: parsed?.runId,
        usage,
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`[chat-gw] listening on :${PORT} (wraps ${OPENCLAW_BIN})`);
});
