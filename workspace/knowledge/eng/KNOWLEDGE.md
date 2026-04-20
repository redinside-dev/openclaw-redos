# ENG Domain Knowledge Base

**Agent:** ENG (💻) | **Maintained by:** ENG + RED | **Updated:** 2026-03-04

---

## Stack

| Layer | Tech | Location |
|-------|------|----------|
| Agent runtime | OpenClaw 2026.3.2 | `/opt/homebrew/lib/node_modules/openclaw/` |
| Custom gateway | Node.js ESM | `~/.openclaw/gateway/` (NOT live — informational only) |
| Dashboard | Node.js HTTP | `~/.openclaw/dashboard/server.js` (port 19000, launchd) |
| Automation | n8n 2.9.4 | port 5678, launchd `ai.openclaw.n8n` |
| Workflows | 12 active | `~/.openclaw/workspace/ops/n8n-workflows/` |
| Scripts | Python 3.14 / bash | `~/.openclaw/workspace/scripts/`, `~/.openclaw/scripts/` |
| Scraping | Scrapling v0.4.1 | `/Users/redinside/.local/bin/scrapling` |

## Live Services (launchd managed)
- `ai.openclaw.gateway` — OpenClaw gateway (port 18789)
- `ai.openclaw.dashboard` — Dashboard (port 19000) — **all new HTTP endpoints go here**
- `ai.openclaw.n8n` — n8n workflows
- `ai.openclaw.watchdog` — Watchdog every 30min
- `homebrew.mxcl.ollama` — Ollama (headless, NOT Ollama.app)

## Critical Rules
- **NEVER edit** `/opt/homebrew/lib/node_modules/openclaw/dist/`
- **NEVER commit** `openclaw.json`, `identity/`, `credentials/`, `*.plist`
- **Always run** `openclaw doctor` after any `openclaw.json` change
- **Always add new HTTP endpoints** to `dashboard/server.js` (not gateway/server.js)
- **Body parsing** in dashboard is callback-style: `req.on('data', chunk => ...)` — no express body-parser

## n8n Critical Rules
- Every webhook trigger node needs `"webhookId": "<uuid>"` — without it, paths never resolve
- No native SQLite node — use `n8n-nodes-base.code` with `require('child_process').execSync('sqlite3 ...')`
- `/api/chat` is async — returns `{status:"dispatched"}` immediately. NEVER use inside n8n for data retrieval
- Strip these fields before PUT: updatedAt, createdAt, id, active, isArchived, meta, pinData, staticData, versionId
- Use `last_insert_rowid()` carefully — always wrap in a temp SQL file for sqlite3 CLI

## Model Routing (current)
- ENG primary: `9router/coding-factory` (optimized for code tasks)
- Fallback: `9router/openrouter/openrouter/free` → `9router/free-unlimited`
- NEVER use ZAI/GLM models — PAYG, banned from crons/fallbacks

## Security (INFOSEC sign-off required before)
- New npm dependencies
- New exec commands or shell scripts added to skills
- New outbound domains (check `workspace/config/security/outbound-url-allowlist.json`)
- Any change to `openclaw.json` auth/token sections

## Common Patterns
```bash
# Deploy n8n workflow
N8N_KEY=$(cat ~/.openclaw/workspace/config/n8n-api-key.txt)
curl -s -X POST http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_KEY" -H "Content-Type: application/json" --data @workflow.json

# Add dashboard endpoint (pattern)
app.post('/webhook/my-endpoint', (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const data = JSON.parse(body);
    // ... process ...
    res.json({ ok: true });
  });
});

# Run scrapling
bash ~/.openclaw/scripts/scrapling-fetch.sh get https://example.com "h1"
bash ~/.openclaw/scripts/scrapling-fetch.sh stealthy https://x.com/search?q=AI
```
