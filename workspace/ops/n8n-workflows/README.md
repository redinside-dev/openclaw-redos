# n8n Workflow Reference — RedOS

**Status:** All 12 workflows active and verified as of 2026-03-04.
**Instance:** `http://127.0.0.1:5678`
**API key:** `workspace/config/n8n-api-key.txt` (gitignored)

---

## Active Workflows (12 total)

### Core Infrastructure

| Workflow | ID | Trigger | Purpose |
|----------|-----|---------|---------|
| `echo-test` | `SWmkldgx4OypuhOn` | Agent POST | Health check — returns input |
| `slack-post` | `zIoMz7Ug5oVeZz5T` | Agent POST | Post `{channel, text}` → Slack |
| `github-repo-status` | `g7fy6gWny65rhStr` | Agent POST | Fetch latest commits `{repo: "owner/name"}` |
| `github-events` | `RS3wjcMCSrUeaRlR` | GitHub webhook | push/PR/issue → dispatch agent |
| `slack-inbound-router` | `EInxQVFsBEAcNKS1` | Slack Events API | Route Slack messages → agents |
| `cost-alert-escalation` | `GyjnDmZn38ZJVpN7` | Gateway cost monitor | Budget breach → escalate to OPS |
| `error-escalation` | `NdKRqbHyxP7j9ihZ` | Gateway error handler | Critical error → escalate |
| `daily-standup` | `C0gFamBjnzPGH8Y3` | Schedule 8am ET M–F | Dispatch standup check-ins to 6 agents |

### Social Monitoring Pipeline

| Workflow | ID | Trigger | Purpose |
|----------|-----|---------|---------|
| `twitter-service` | `7YRs0yJOR5pDvj6k` | every 30min | Authenticated Twitter/X scraping → SQLite (`content_raw`, `content_signals`) |
| `reddit-service` | `bPsStF6AKUYzJSI9` | every 1h | Reddit ML/tech posts via JSON API → SQLite |
| `aggregator-service` | `rRPKQxc8xwrhXnQJ` | daily 9am | Stats + top keywords + alerts → Slack + `/webhook/ingest-idea` |
| `shared-observability` | `rJiesCoch2belvSQ` | every 5min | SLO health, DLQ backlog, circuit breaker monitoring |

---

## Webhook URLs

| Path | Full URL | Auth |
|------|----------|------|
| Echo test | `http://127.0.0.1:5678/webhook/echo-test` | None |
| Slack post | `http://127.0.0.1:5678/webhook/slack-post` | None |
| GitHub repo status | `http://127.0.0.1:5678/webhook/github-repo-status` | None |
| GitHub events | via Cloudflare tunnel `/webhook/github-events` | GitHub HMAC |
| Slack inbound | via Cloudflare tunnel `/webhook/slack-inbound-router` | Slack token |

---

## Social Monitoring Database

**Path:** `workspace/data/social-monitoring.db`

| Table | Purpose | Current rows |
|-------|---------|-------------|
| `content_raw` | All ingested posts (platform, author, text, url, dedupe_key) | 16 |
| `content_signals` | Enriched signals with sentiment + content_id FK | 1 |
| `workflow_runs` | Run audit log (start, end, status, items processed) | 8 |
| `dlq_events` | Dead-letter queue — failed items for retry | 0 |

**Ideas KB:**
- `workspace/ideas/twitter-feed.md` — auto-appended via `/webhook/ingest-idea`
- `workspace/ideas/reddit-feed.md` — auto-appended via `/webhook/ingest-idea`
- `workspace/ideas/ideas-index.json` — rebuilt nightly by `ideas-indexer-nightly-0001`

---

## CRITICAL — n8n Implementation Rules

### 1. webhookId is mandatory
Every webhook trigger node in imported JSON **MUST** have `"webhookId": "<uuid>"` at node level. Without it, n8n registers composite paths that never resolve. Add it, PUT via API, deactivate/reactivate.

### 2. /api/chat is async — never use for data retrieval
`POST http://localhost:19000/api/chat` returns `{status: "dispatched"}` immediately. Agents run async and post results to Telegram/Slack — NOT back to n8n. Use `execSync` with scrapling CLI or direct API calls inside Code nodes instead.

### 3. n8n Code node (typeVersion 2) mode
- `runOnceForAllItems`: input is `$input.all()` array, must return `[{json:{...}}]`
- `runOnceForEachItem` (default): input is `$input.item.json`, must return `{json:{...}}`

### 4. n8n PUT API — strip read-only fields
Only send: `name, nodes, connections, settings`. Strip: `updatedAt, createdAt, id, active, isArchived, meta, pinData, staticData, versionId, activeVersionId, versionCounter, triggerCount, shared, tags, activeVersion`

### 5. sqlite3 shell escaping
Use temp file approach for SQL with embedded strings — never rely on shell quoting:
```javascript
const tmpFile = `/tmp/n8n_${Date.now()}.sql`;
fs.writeFileSync(tmpFile, sql);
execSync(`sqlite3 '/path/to/db' < '${tmpFile}'`);
fs.unlinkSync(tmpFile);
```

### 6. last_insert_rowid() returns 0 across connections
Each `execSync('sqlite3 ...')` is a new process. Use `SELECT id FROM table WHERE dedupe_key='...' LIMIT 1` instead of `last_insert_rowid()`.

### 7. No native SQLite node in n8n 2.9.4
Use `n8n-nodes-base.code` (typeVersion 2) with `require('child_process').execSync` calling `sqlite3` CLI. `NODE_FUNCTION_ALLOW_BUILTIN=child_process,fs,path,os` is set in the n8n LaunchAgent.
