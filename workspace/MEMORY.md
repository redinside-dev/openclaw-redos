# MEMORY.md — OpenClaw RedOS Workspace

> Curated long-term memory. **Full reference:** `KNOWLEDGEBASE.md`. **History:** `MEMORY-ARCHIVE-2026-02-15.md`.

---

## Current State (as of 2026-02-24)

| Component | Status |
|-----------|--------|
| OpenClaw CLI | v2026.2.22-2 |
| Native gateway | Running — launchd `ai.openclaw.gateway`, port 18789 |
| Dashboard | Port 19000, launchd `ai.openclaw.dashboard` — Mission Control UI |
| Dashboard API | `/api/traces` reads live session files (`agents/*/sessions/*.jsonl`) — NOT stale logs |
| Telegram | Active — source detection fixed (3 formats: `Conversation info`, `[Day Date TZ]`, `[telegram]`) |
| WhatsApp | Linked +16476092313 |
| Agents | 8 active: main / allrounder / hatake / eng / research / finance / ops / infosec |
| Skills | 30 registered, all enabled — `competitive-intelligence` enabled 2026-02-24 |
| Cron jobs | 20+ active — see `cron/jobs.json` |
| 9Router | Running :20128 — primary model routing layer |
| A2A | 37 subagent sessions/day but `a2a-delegations.jsonl` was empty — SOUL.md now mandates logging |
| Architecture doc | `/Users/redinside/Development/Codebase/projects/RedTeam/docs/ARCHITECTURE.md` |

---

## Routing Policy (CANONICAL — DO NOT CHANGE WITHOUT EXPLICIT REQUEST)

| Agent | Bot | Identity | Primary | Fallback |
|-------|-----|----------|---------|---------|
| main | @RedinsideBot | RED | openai-codex/gpt-5.2 | ollama/llama3.1:8b |
| allrounder | @ZenRedBot | ZEN | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| hatake | — | HATAKE | ollama/qwen2.5-coder:7b | ollama/llama3.1:8b → gpt-5.2 |
| eng | — | ENG | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| research | — | RESEARCH | openai-codex/gpt-5.2 | ollama/llama3.1:8b |
| finance | — | FINANCE | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| ops | — | OPS | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| infosec | @INFOSECRED_BOT | INFOSEC | ollama/llama3.1:8b | openai-codex/gpt-5.2 |

- **Codex account:** `io.anuragsaxena@gmail.com` — Team plan, 1-year subscription
- **Kimi (moonshot/kimi-k2.5):** NO subscription — do NOT use
- **ZAI/GLM-4.7:** PAYG — never hard-code in cron or fallback chains
- **openrouter:** NOT authorized — remove immediately if found in config
- **Web search:** Perplexity (sonar-pro) via `tools.web.search` — NOT as agent primary model
- **Coding:** cursor-agent with Claude Sonnet 4.5
- **Git identity:** `anuragg-saxenaa` / `anuragg.saxenaa@gmail.com`
- **Pairing reply:** patched to "Anurag's virtual assistant" — re-run `scripts/patch-pairing-reply.sh` after upgrades

---

## Agent Hierarchy

Defined in `workspace/ops/agent-hierarchy.json`. Canonical org structure:

```
👑 RED (main) — CEO
├── 🌐 ZEN (allrounder) — CSO
│   └── 🥷 HATAKE (hatake) — Parser
├── 💻 ENG (eng) — Engineering Lead
├── 🔬 RESEARCH (research) — Research Analyst
├── 💰 FINANCE (finance) — Finance Analyst
├── ⚙️ OPS (ops) — Scrum Master
└── 🔒 INFOSEC (infosec) — Security Officer
```

- Roles + parent relationships stored in `workspace/ops/agent-hierarchy.json`
- Editable from Mission Control → Agents tab

---

## Mission Control Dashboard (port 19000)

All tabs and what they show:

| Tab | What it does |
|-----|-------------|
| Overview | System health, agent cards, recent activity |
| Agents | Hierarchy tree (org chart) + agent cards; Edit / Add / Sub-agent management |
| **Pipeline** | **DynaTrace-style per-request drill-down** — collapsed request list (REQ-ID, source, msg preview, latency, cost); click row to expand full trace tree; each node always shows model, tier, latency bar, token counts, response snippet; click node to expand full prompt context + response; 15s poll with open-state preserved |
| **Standup** | **Live agent status cards** (last seen, model, calls today) + standup history; 30s poll |
| Cron Jobs | All cron jobs with status, last run, model dropdown (change model on demand) |
| Tickets & SLA | Live ticket tracker, SLA countdown/breach detection, 30s poll |
| Learnings | Institutional knowledge base |
| Skills | Registered skills |
| Cost Estimator | Real-time cost from `cost-events.jsonl`; live request feed (5s poll); by model/agent breakdown |
| Smart Routing | Agent model assignments |
| Prompt Eng | Prompt pipeline view |
| Caching | Cache config |
| Errors & Logs | Gateway error log + live log tail |
| OpenClaw | Embedded native OpenClaw UI |
| CEO Controls | Hire/fire agents, ceo controls |

### Dashboard data sources
- Cost data: `workspace/logs/cost-events.jsonl` (authoritative — written by LLM analytics plugin)
- Pipeline: all 3 logs joined: `routing-decisions.jsonl` (start ts, prompt_tail) + `llm-analytics.jsonl` (end ts, response_preview) + `cost-events.jsonl` (tokens, tier); Telegram session file for user message
- Standup history: `workspace/ops/STANDUP-LOG.md` (parsed)
- Agent live status: `workspace/ops/agent-status/<id>.json` (written by 9:05am check-in crons) + `routing-decisions.jsonl` (last seen, calls today)
- Tickets: `workspace/ops/TICKET-TRACKER.md` (markdown parsed)
- Agent hierarchy: `workspace/ops/agent-hierarchy.json`

### Dashboard APIs
| Endpoint | Purpose |
|----------|---------|
| `GET /api/analytics` | Cost breakdown by model/agent/provider + recent feed |
| `GET /api/pipeline` | Full pipeline traceability (last 25) with trigger message, per-step metrics |
| `GET /api/agents` | Live agent list with hierarchy |
| `PATCH /api/agents/:id` | Edit agent (name, model, role, parent, bot) |
| `POST /api/agents` | Add new agent |
| `DELETE /api/agents/:id` | Remove agent |
| `PATCH /api/cron-jobs/:id` | Change model for a cron job on demand |
| `GET /api/tickets` | Live ticket list (30s poll) |
| `GET /api/standups` | Parsed standup history (last 10 entries) |
| `GET /api/agent-status` | Per-agent live status + last seen from routing log |
| `GET /api/events` | SSE stream — `agents_changed` + `config_changed` events for real-time UI sync |

### Standup system
- **9:05am ET** — 6 check-in crons (RED, ENG, RESEARCH, FINANCE, OPS, INFOSEC) each write `workspace/ops/agent-status/<id>.json` with: sprintGoal, workingOn, completedYesterday, ETA, blockers
- **9:15am ET** — OPS Scrum Master reads those files, compiles standup → `STANDUP-LOG.md` + Telegram summary
- **Fix**: removed sessions_send dependency (agents are idle at 9am; sessions_send silently fails)

### LLM Analytics plugin enhancements
- `prompt_tail` (last 600 chars of prompt) now written to `routing-decisions.jsonl` — captures the actual user message/task for all new requests
- `response_preview` (first 600 chars), `run_id`, `session_key` now written to `llm-analytics.jsonl` — enables full round-trip tracing
- Gateway restart required to activate: done 2026-02-17

---

## Open Issues

| Priority | Description |
|----------|-------------|
| P3 | TICKET-20260216-002 — undici AbortErrors during Telegram polling, awaiting ENG fix |
| Low | Cloudflare quick tunnel URL changes on restart — consider named tunnel |
| Low | Codex 3rd account (`anurawg.saxena@gmail.com`) needs OAuth tokens |
| Low | Dashboard process not in launchd — must be started manually after reboot |
| Low | Verify Slack socket-mode channel replies live (CLI deliver confirmed, real socket-mode not yet confirmed) |

---

## Branch Strategy

- **`main`** — stable, all work merged here incrementally
- **`feature/cost-routing-fixes`** — original feature branch (preserved, all work now in main)
- **`feature/dashboard-realtime-sync`** — dashboard SSE + real-time fixes (pending merge to main)

---

## Critical Rules

### Config safety (LEARNING-007)
**NEVER add unvalidated keys to `openclaw.json`.** Always run `openclaw doctor` first.

### Cost rule
**Never hard-code a PAYG model (ZAI, openrouter) in cron jobs or fallback chains.** Use agent default — Ollama is primary and free.

### Self-improvement cron warning
The RED Self-Improvement cron has been observed autonomously modifying `openclaw.json` — adding openrouter provider, changing model chains. Check config periodically. Recovery: remove unauthorized entries, run `openclaw gateway restart`.

### Canonical doc filenames
- `workspace/KNOWLEDGEBASE.md` — architecture + troubleshooting
- `workspace/MEMORY.md` — this file
- NO `KNOWLEDGE_BASE.md`, NO `knowledge.md` — delete if found

---

---

## 2026-02-18 Session Changes

- **Slack channel auto-reply fixed**: `buildGroupIntro` lurk mode root-caused. Per-channel `systemPrompt` overrides added to `openclaw.json → channels.slack.channels`. Wildcard `"*"` + 4 channel-specific entries. SOUL.md updated with Slack response mandate, synced to all 12 agent sandboxes.
- **Dashboard real-time sync**: SSE endpoint (`GET /api/events`) added to `dashboard/server.js` with `fs.watch` on `openclaw.json`. `saveAgentModal`/`deleteAgent` now call `loadAll()`. Polling 30s→10s. Dead WebSocket to port 18789 disabled.
- **CLAUDE.md created**: `/Users/redinside/.openclaw/CLAUDE.md` — Claude Code guidance for this repo.
- **Feature branch**: `feature/dashboard-realtime-sync` (dashboard changes).

*Last updated: 2026-02-18 — Slack channel auto-reply fix, dashboard SSE real-time sync, CLAUDE.md*
