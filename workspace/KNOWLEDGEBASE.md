# KNOWLEDGEBASE.md

Operational knowledgebase for this OpenClaw deployment.

Use this when something feels off (routing, auth, web search, channels). It’s meant to be a clean reference separate from daily logs.

## Baseline (Canonical)

### User preferences
- Channel: Telegram-only
- Portfolio scope: Ignore crypto entirely (stocks only)
- Ticker note: EMR = Emerson Electric

### Agents / Bots

| Agent | Bot | Identity | Primary | Fallback |
|-------|-----|----------|---------|---------|
| main | @RedinsideBot | RED | openai-codex/gpt-5.2 | ollama/llama3.1:8b |
| allrounder | @ZenRedBot | ZEN | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| hatake | — | HATAKE | ollama/qwen2.5-coder:7b | ollama/llama3.1:8b → gpt-5.2 |
| eng | @ENGRED_BOT | ENG | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| research | @RESEARCHRED_BOT | RESEARCH | openai-codex/gpt-5.2 | ollama/llama3.1:8b |
| finance | @FINANCERED_BOT | FINANCE | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| ops | @OPSRED_BOT | OPS | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| infosec | @INFOSECRED_BOT | INFOSEC | ollama/llama3.1:8b | openai-codex/gpt-5.2 |

- **Codex account:** `io.anuragsaxena@gmail.com` — Team plan, 1-year subscription
- **Kimi (moonshot/kimi-k2.5):** NO subscription — do NOT use
- **ZAI/GLM-4.7:** PAYG — never in fallback chains or cron jobs
- **openrouter:** NOT authorized — remove immediately if found in config
- Codex OAuth creds: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

### Web Search
- Tool: `tools.web.search`
- Provider: `perplexity`, Model id: `sonar-pro` (configured in `openclaw.json`)
- **Do NOT set `perplexity/sonar-pro` as an agent's primary LLM model** — it is a web search tool only
- Fallback: Exa MCP (`mcporter call exa.web_search_exa ...`)

### GLM/ZAI model guardrail
- Use **`zai/glm-4.7`** as the supported GLM model id in OpenClaw.
- Treat undocumented variants like **`zai/glm-4.7-flashx`** as unsupported/invalid unless OpenClaw docs explicitly add them.

### Briefing workflows (on-demand + scheduled)

**On-demand topic brief (A):**
- Send: `Brief: <topic>`
- Output format: 5–10 bullets (what happened) + 3 bullets (implications) + 3 bullets (what to watch) + links.
- Search: Perplexity first; if fails, Exa MCP fallback.

**On-demand X link read (B):**
- Send: `X: <url>` or paste an X URL.
- Fetch method: Jina mirror (`https://r.jina.ai/https://x.com/...`) then summarize + advice.

**Scheduled brief:**
- Daily “AI + OpenClaw trends” brief can be delivered via cron to Telegram DM.

### Report attachments (Email)
- Preferred attachment format: **PDF**
- PDF toolchain installed: `pandoc` + `tectonic`
- Convert Markdown → PDF:
  - `pandoc report.md -o report.pdf --pdf-engine=tectonic`

### Telegram Group Safety
- `requireMention: true`
- `groupPolicy: allowlist`
- `groupAllowFrom: ["1012034994"]`

## X/Twitter reading playbook (preferred order)

When asked to read an X post:
1) **Option 1 (default): Jina mirror**
   - Rewrite: `https://x.com/...` → `https://r.jina.ai/https://x.com/...`
   - If content is still blocked, look for a `pbs.twimg.com/media/...` image URL and open it directly.
2) **Option 2: Fetch media directly**
   - If the post contains a screenshot/template, open the `pbs.twimg.com/media/...` URL and OCR/summarize.
3) **Option 3: Browser Relay (logged-in X tab)**
   - If Options 1–2 fail, ask Anurag to attach the X tab via OpenClaw Browser Relay; then read from the attached tab.

(We keep this order because X blocks logged-out scraping and direct crawling often fails.)

## Troubleshooting quick checks

### “Perplexity invalid model”
- Check `openclaw.json` → `tools.web.search.perplexity.model` is `sonar`.

### “ZEN is still on old model”
- Sessions can be sticky; use `/reset` in the @ZenRedBot chat to start a fresh session.

### “Which creds is the agent using?”
- Inspect per-agent auth store:
  - `cat ~/.openclaw/agents/main/agent/auth-profiles.json`
  - `cat ~/.openclaw/agents/allrounder/agent/auth-profiles.json`

### “Confirm live models”
- `openclaw status --deep`

## Organization / Operating Model

- Org structure + roles + change control + rollback: `ORG_STRUCTURE.md`

## Organization Policy — Codebase Structure & Change Boundaries

### Canonical project root (MANDATORY)
All new projects (internal utilities, OSS, PoCs) MUST live under:

- `/Users/redinside/Development/Codebase/projects/`

### Department folders (recommended)
Within `.../projects/`, create department-scoped folders so work stays organized and budgeted:

- `superboss/` (Anurag / coordination meta)
- `engineering/` (apps, APIs, infra code)
- `research/` (benchmarks, eval harnesses, routing PoCs)
- `ops/` (automation scripts for cron/reporting/monitoring)
- `finance/` (trade/holdings analytics utilities)

Rule: If a PoC is “research”, it goes in `research/`. If it’s a build, it goes in `engineering/`, etc.

### Git hygiene
Anything created under `.../projects/` should be:
- committed
- pushed to the agreed remote

### OpenClaw workspace boundary (DO NOT PUSH)
Do NOT push OpenClaw workspace/config/docs to GitHub/shared repos until Anurag explicitly approves a backup/recovery strategy.

### Secrets policy (NON-NEGOTIABLE)
- Never commit or paste **any keys/tokens/private keys** into GitHub (public or private), chat, or docs.
- Keys live only in: OpenClaw config (`~/.openclaw/openclaw.json` via env vars), OS keychain/secret manager, or `.env` files that are **gitignored**.
- Before pushing any repo, run a quick secret scan (at minimum: `git grep -n "(API_KEY|SECRET|TOKEN|PRIVATE KEY|BEGIN)"`).

---

## Mission Control Dashboard (port 19000)

### Architecture

Two separate processes:
- **Native gateway** — port 18789, managed by launchd (`ai.openclaw.gateway`). All agent traffic flows through here.
- **Dashboard server** — port 19000, started manually (`node dashboard/server.js`). Reads log files and openclaw.json; exposes REST APIs for the UI.

**NOT in launchd** — dashboard must be restarted manually after reboots.

### Starting / restarting dashboard

```bash
pkill -f "dashboard/server.js" 2>/dev/null; sleep 1
cd ~/.openclaw && node dashboard/server.js >> /tmp/dashboard.log 2>&1 &
# Verify
curl -s -u red:redos2026 http://localhost:19000/api/analytics | head -c 200
```

> Do NOT use `openclaw gateway restart` — that only restarts the native gateway on port 18789.

### Tabs and their data sources

| Tab | Data source | Notes |
|-----|-------------|-------|
| Overview | System health, agent cards | Static + agent count |
| Agents | `openclaw.json` + `workspace/ops/agent-hierarchy.json` | CRUD + org chart |
| **Pipeline** | `routing-decisions.jsonl` + `llm-analytics.jsonl` | Joined, 3s poll |
| Cron Jobs | `cron/jobs.json` | Model editable inline |
| Tickets & SLA | `workspace/ops/TICKET-TRACKER.md` | 30s poll, breach detection |
| Learnings | `workspace/ops/LEARNINGS.md` | — |
| Skills | openclaw.json skills | — |
| Cost Estimator | `workspace/logs/cost-events.jsonl` | 5s poll, real data |
| Smart Routing | openclaw.json routing | — |
| Errors & Logs | Gateway error log | Live tail |

### API endpoints (dashboard server)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/analytics` | Cost breakdown by model/agent/provider + recent feed |
| GET | `/api/pipeline` | Last 20 request pipelines |
| GET | `/api/agents` | Live agent list with hierarchy (role, parentId, bot) |
| PATCH | `/api/agents/:id` | Edit agent (name, model, role, parentId, bot) |
| POST | `/api/agents` | Add new agent to openclaw.json + hierarchy sidecar |
| DELETE | `/api/agents/:id` | Remove agent (403 if default agent) |
| PATCH | `/api/cron-jobs/:id` | Change model for a cron job (`__default__` = delete override) |
| GET | `/api/tickets` | Live ticket list parsed from TICKET-TRACKER.md |

### Log files (written by LLM Analytics plugin)

All live at `workspace/logs/`:

| File | Written at | Key fields |
|------|------------|------------|
| `cost-events.jsonl` | Per call | ts, agent, model, provider, tokens_in, tokens_out, cost_usd, cost_source |
| `routing-decisions.jsonl` | Call START | ts, agent, session_key, selected_model, provider, prompt_length |
| `llm-analytics.jsonl` | Call END | ts, agent, model, latency_ms, tokens_in, tokens_out, cost_usd |

**session_key patterns:**
- `agent:main:telegram:direct:<userId>` — Telegram DM
- `agent:<id>:subagent:<uuid>` — sub-agent delegation
- `agent:<id>:cron:<uuid>` — cron job

### Pipeline join logic

`routing-decisions.jsonl` records call START; `llm-analytics.jsonl` records call END. To join them:

```
join key: same agent + abs((analytics.ts - latency_ms) - routing.ts) < 4000ms
```

Clustering: non-subagent trigger starts a new pipeline; subagent events within a 3-minute window from pipeline start attach to that pipeline.

### Agent hierarchy sidecar

`workspace/ops/agent-hierarchy.json` — stores `parentMap` and `roles` that cannot safely go into openclaw.json (schema validation risk):

```json
{
  "parentMap": {
    "allrounder": "main", "hatake": "allrounder",
    "eng": "main", "research": "main",
    "finance": "main", "ops": "main", "infosec": "main"
  },
  "roles": { "main": "CEO — ...", ... }
}
```

Edit this file or use the Agents tab → Edit button in the dashboard.

### Cron job model override

The `PATCH /api/cron-jobs/:id` endpoint edits `cron/jobs.json` in place, setting `job.payload.model`. Sending `"__default__"` deletes the override so the job uses the agent's configured model. Available choices: agent default / `ollama/llama3.1:8b` / `ollama/qwen2.5-coder:7b` / `openai-codex/gpt-5.2`.

### Tickets SLA

Breach detection is computed server-side:
```js
slaBreached = isOpen && slaDeadline && new Date(slaDeadline) < new Date()
```
Row tinting: red = breached, amber = open/blocked, green = resolved.

---

## Standup System

### How it works (fixed 2026-02-17)
Previous design used `sessions_send` to contact agents at 9am — agents are idle so it always failed silently. New design:

1. **9:05am ET** — 6 per-agent check-in crons (RED/main, ENG, RESEARCH, FINANCE, OPS, INFOSEC) each independently write `workspace/ops/agent-status/<agentId>.json`:
   ```json
   { "agent": "eng", "date": "YYYY-MM-DD", "workingOn": "...", "completedYesterday": "...", "eta": "...", "blockers": "...", "sprintGoal": "...", "updatedAt": "ISO" }
   ```
2. **9:15am ET** — OPS Scrum Master reads those files, compiles standup → `STANDUP-LOG.md` + Telegram DM to Anurag.

### Mission Control Standup tab
- **Live cards** (30s refresh): last active time + model + calls today (from routing log) + check-in data when available
- **Standup history**: parsed from STANDUP-LOG.md — agent table, tickets, SLA, action items

### Standup troubleshooting
- Cards show "No check-in today" → check-in crons haven't run yet (9:05am ET weekdays) or agent errored. Check cron tab.
- Cards show activity but no check-in text → routing log has the agent active but JSON file not written. Check that the check-in cron ran ok.

---

## Pipeline — Full Traceability

### What's captured (as of 2026-02-17)

| Field | Source | Notes |
|-------|--------|-------|
| Trigger type | `routing-decisions.jsonl` session_key | telegram/cron/subagent/direct |
| Trigger message | `agents/main/sessions/<id>.jsonl` | Telegram: actual user message text |
| Cron job name | `cron/jobs.json` | matched by cronJobId from session_key |
| Agent, model, provider | `routing-decisions.jsonl` | per step |
| Tier (free/paid) | `llm-analytics.jsonl` + `cost-events.jsonl` | ollama=free, cloud=paid |
| Latency per step | `llm-analytics.jsonl` `latency_ms` | in ms |
| Tokens in/out/cached | `cost-events.jsonl` `tokens.*` | per step |
| Cost per step | `cost-events.jsonl` `cost_usd` | estimated or provider-reported |
| Prompt context | `routing-decisions.jsonl` `prompt_tail` | last 600 chars — added 2026-02-17 |
| Response preview | `llm-analytics.jsonl` `response_preview` | first 600 chars — added 2026-02-17 |

**Note**: `prompt_tail` and `response_preview` are only populated for requests made **after** the gateway was restarted on 2026-02-17. Historical entries show session-extracted messages where available.

### Plugin enhancements (plugins/llm-analytics/index.js)
- `llm_input` hook now also writes `prompt_tail` (last 600 chars of event.prompt) and `run_id`
- `llm_output` hook now also writes `response_preview`, `run_id`, `session_key`, `response_chars`
- After any upgrade to the plugin, restart the gateway: `openclaw gateway restart`

---

## Troubleshooting

### Dashboard shows $0 / fake cost data
Dashboard and gateway are separate processes. Make sure `plugins/llm-analytics/index.js` is enabled in `openclaw.json` (plugins.entries) and the gateway has been restarted so costs flow to `workspace/logs/cost-events.jsonl`. Then restart the dashboard server.

### "EADDRINUSE: port 19000"
Old dashboard process still running. Kill it:
```bash
pkill -f "dashboard/server.js"; sleep 2; node dashboard/server.js &
```

### Pipeline tab shows nothing / all done:false
Join mismatch — ensure `routing-decisions.jsonl` and `llm-analytics.jsonl` both have recent entries. Pipeline requires at least 1 completed call (latency_ms must be set).

### Self-improvement cron modifying openclaw.json
The RED Self-Improvement cron has been observed adding `openrouter` provider and changing model chains autonomously. Check periodically:
```bash
grep -i openrouter ~/.openclaw/openclaw.json
```
If found: remove the entries, run `openclaw gateway restart`.

---
Last updated: 2026-02-17 — Standup system (check-in crons, Standup tab, live cards), pipeline full traceability (trigger message, prompt/response preview, per-step cost/latency), LLM analytics plugin enhanced
