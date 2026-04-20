# Skill: n8n-webhooks

**Credential-isolated external API calls via n8n webhooks.**

Agents never hold API secrets. External integrations (GitHub, Notion, Slack, etc.) live in n8n. Agents call webhook URLs — credentials stay in n8n. n8n is the event bus for the entire RedOS architecture.

---

## n8n endpoint

- Dashboard: http://127.0.0.1:5678 (local only)
- Base URL for webhooks: `http://127.0.0.1:5678/webhook/`
- Managed by: OPS (restart via launchctl if down)

## n8n auth

- API key: stored at `workspace/config/n8n-api-key.txt` (agents read this for management calls)
- Dashboard login: `anuragg.saxenaa@gmail.com` / RedOS2026!
- Public API: `http://127.0.0.1:5678/api/v1/` with header `X-N8N-API-KEY: <key>`

## How agents call webhooks

```bash
exec: curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/<path> \
  -H "Content-Type: application/json" \
  -d '<json payload>'
```

Always log the call to `workspace/logs/audit.jsonl` after execution.

---

## Available workflows

### Core Integrations (live)

| Path | n8n ID | Purpose | Input | Output |
|------|--------|---------|-------|--------|
| `echo-test` | `SWmkldgx4OypuhOn` | Test — echoes back payload | `{any}` | webhook data + body |
| `slack-post` | `zIoMz7Ug5oVeZz5T` | Post message to Slack channel | `{channel: "C...", text: "..."}` | `{ok: true, ts: "..."}` |
| `github-repo-status` | `g7fy6gWny65rhStr` | Fetch latest 3 commits from a GitHub repo | `{repo: "owner/name"}` | array of commit objects |

### Social Monitoring Workflows (added 2026-03-04, Code-node based)

| Workflow | n8n ID | Schedule | Purpose | DB Table |
|----------|--------|----------|---------|---------|
| `twitter-service` | `7YRs0yJOR5pDvj6k` | every 30min | Fetch AI/tech tweets via RESEARCH agent + scrapling | `content_raw`, `content_signals` |
| `reddit-service` | `bPsStF6AKUYzJSI9` | every 1h | Fetch ML/tech Reddit posts via Reddit JSON API | `content_raw`, `content_signals` |
| `aggregator-service` | `rRPKQxc8xwrhXnQJ` | daily 9am | Daily report: stats + top keywords + alerts → Slack | `reports_daily` |
| `shared-observability` | `rJiesCoch2belvSQ` | every 5min | Monitor workflow health, SLOs, DLQ backlog | `workflow_runs`, `dlq_events` |

SQLite DB: `workspace/data/social-monitoring.db`
Ingest webhook: `POST http://localhost:19000/webhook/ingest-idea` `{platform, title, url, summary, score}`
Ideas KB: `workspace/ideas/twitter-feed.md`, `workspace/ideas/reddit-feed.md`, `workspace/ideas/ideas-index.json`

> **Node type note:** n8n 2.9.4 has no native SQLite node. Code nodes use `require('child_process').execSync` to call `sqlite3` CLI. `n8n-nodes-base.executeCommand` also cannot be activated — use Code node instead.

### Event Receivers (n8n as inbound webhook — GitHub/Slack call n8n, n8n calls gateway)

| Path | Trigger source | Purpose | Replaces |
|------|---------------|---------|---------|
| `github-events` | GitHub webhook (push/PR/issue/comment) | Fire agent task when code changes | `2ef34ad2` GitHub polling (4x/day) |
| `slack-inbound-router` | Slack Events API | Route Slack messages to correct agent | Slack polling crons |
| `github-pr-review` | GitHub PR opened/updated | Trigger ENG+INFOSEC for review | Manual PR check crons |

> **Setup:** Register n8n as GitHub/Slack receiver via Cloudflare Tunnel or ngrok.
> GitHub: Settings → Webhooks → `https://<tunnel>/webhook/github-events`
> Slack: App settings → Event Subscriptions → `https://<tunnel>/webhook/slack-inbound-router`
> n8n then POSTs to `http://localhost:19000/api/chat` to dispatch the agent task.

### Alerting & Escalation

| Path | Purpose | Input | When to call |
|------|---------|-------|-------------|
| `cost-alert-escalation` | Post cost chart snapshot to Slack when spend threshold hit | `{current_usd: 1.60, limit_usd: 2.00, pct: 80, agent_breakdown: {...}}` | At 80% daily budget |
| `error-escalation` | Auto-create ticket in TICKET-TRACKER.md + alert OPS on Slack | `{error_type: "...", agent: "...", count: 5, log_snippet: "..."}` | >5 new errors in 30min window |

### Scheduled Workflows (n8n schedule node — replaces cron)

| Path / Workflow name | Schedule | Purpose | Replaces |
|---------------------|---------|---------|---------|
| `daily-standup` | 8am weekdays | Trigger RED standup → compile status → post to Slack | `sa-*-checkin` x6 crons |
| `model-health-check` | Every 30min | Ping Ollama + 9Router; alert only on failure | `c8481b2a` + `76777b7a` system health crons |
| `trading-window` | Market open (9:30am ET) + Market close (4pm ET) | FINANCE agent trade review | Reduce 30-min cadence to event-based |
| `autonomous-ta[REDACTED] | Every 15min | Single job checks AUTONOMOUS.md, dispatches | All 8 inner loop crons + 8 meta-self-check crons |
| `memory-sync` | Nightly (1:30am ET) | Compact + sync all agent memories | `episodes-seeder-0001`, `health-jsonl-writer-0001` |

### Utility Workflows

| Path | Purpose | Input | Output |
|------|---------|-------|--------|
| `perplexity-search` | Web search via Perplexity Pro (RESEARCH agent use) | `{query: "...", max_results: 5}` | array of search results |
| `notion-sync` | Sync task/goal state to Notion | `{page_id: "...", content: "..."}` | `{ok: true}` |

---

## Usage examples

```bash
# Echo test
curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/echo-test \
  -H "Content-Type: application/json" -d '{"agent":"ops","check":"alive"}'

# Post to Slack #redos-mission-control
curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/slack-post \
  -H "Content-Type: application/json" \
  -d '{"channel":"C0AEV3MDEDD","text":"⚙️ *OPS*: message via n8n relay"}'

# GitHub repo status
curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/github-repo-status \
  -H "Content-Type: application/json" \
  -d '{"repo":"anuragg-saxenaa/spring-boot-product-api"}'

# Cost alert (call when at 80% budget)
curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/cost-alert-escalation \
  -H "Content-Type: application/json" \
  -d '{"current_usd":1.60,"limit_usd":2.00,"pct":80,"triggered_by":"cost-monitor"}'

# Error escalation (call when >5 errors in window)
curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/error-escalation \
  -H "Content-Type: application/json" \
  -d '{"error_type":"gateway_timeout","agent":"eng","count":7,"log_snippet":"..."}'
```

---

## Webhook Registration Strategy (live as of 2026-03-02)

**Cloudflare quick tunnel** is running as launchd `ai.openclaw.cloudflared`. URL changes on reboot but is auto-updated via `ai.openclaw.tunnel-sync`.

```bash
# Check current tunnel URL
bash ~/.openclaw/scripts/tunnel-url.sh
```

**GitHub webhook** is registered on `redinside-dev/openclaw-redos` → `/webhook/github-events`. Auto-updated on reboot after one-time PAT setup:
```bash
bash ~/.openclaw/scripts/setup-tunnel-auth.sh  # one-time only
```

**Slack inbound:** Uses OpenClaw native Socket Mode (not n8n webhook). Agents already receive Slack messages natively. The `slack-inbound-router` n8n workflow is available as a supplementary keyword router if needed.

**CRITICAL — n8n webhook import rule:** When importing workflow JSON, every Webhook trigger node MUST have `"webhookId": "<uuid>"` at the node level. Without it, n8n generates composite paths (`workflowId/nodeName/path`) that never resolve at `/webhook/<path>`. See LEARNING-20260302-001.

n8n receives events → calls `POST http://localhost:19000/api/chat` to dispatch agent task. **Secrets never leave n8n.**

---

## Adding a new workflow

1. Open n8n dashboard: http://127.0.0.1:5678
2. Create workflow with a Webhook trigger node (or Schedule trigger for scheduled workflows)
3. Add credential nodes (GitHub, Slack, etc.) — credentials NEVER leave n8n
4. Add HTTP Request node to call `http://localhost:19000/api/chat` with agent payload
5. Activate the workflow
6. Copy the webhook URL path (after `/webhook/`)
7. Add a row to the Available workflows table above
8. Test: `curl -s http://127.0.0.1:5678/webhook/<path> -H "Content-Type: application/json" -d '{}'`
9. Update `workspace/MEMORY.md` with the new workflow

---

## Classifying: Should this be a cron or an n8n workflow?

| Question | Answer → |
|---------|----------|
| Does it trigger on an external event (GitHub push, Slack message, email)? | **n8n inbound webhook** |
| Does it run at a fixed schedule with batch logic? | **Keep as cron** |
| Does it poll for a state change that could be a webhook? | **Migrate to n8n** |
| Is it a health check that should run every 2-5min? | **Keep as cron (lightweight)** |
| Does it call multiple external APIs in sequence? | **n8n workflow** |

See `workspace/skills/event-driven-patterns/SKILL.md` for full classification guide.

---

## OPS self-healing for n8n

If n8n is down (curl returns connection refused):
```bash
exec: launchctl stop ai.openclaw.n8n && launchctl start ai.openclaw.n8n
```
Wait 10s, retry. If still down: Telegram alert to 1012034994.

## Security rules

- n8n runs on 127.0.0.1 only — never exposed to internet directly
- Public events come via Cloudflare Tunnel → n8n → local gateway
- Agents pass only data payloads to webhooks — never credentials
- n8n workflows are the only place external API keys are stored
- All webhook calls logged to workspace/logs/audit.jsonl by the calling agent:
  `{"ts":"<ISO>","agent":"<id>","tool":"n8n_webhook","workflow":"<id>","action":"<action>"}`
