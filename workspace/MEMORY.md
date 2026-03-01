# MEMORY.md — OpenClaw RedOS Workspace

> Curated long-term memory. **Full reference:** `KNOWLEDGEBASE.md`. **History:** `MEMORY-ARCHIVE-2026-02-15.md`.

---

## ⚠️ TWO SEPARATE REPOS — Never Confuse These

| | OpenClaw Framework | ENG Infrastructure POC |
|---|---|---|
| **Local path** | `/Users/redinside/.openclaw` | `/Users/redinside/Development/Codebase/projects/RedTeam/github/redteam-coding-factory` |
| **GitHub** | `github.com/redinside-dev/openclaw-redos` | `github.com/anuragg-saxenaa/redteam-coding-factory` |
| **What** | Dashboard, SOUL.md, cron, skills, config — the runtime framework | Autonomous coding factory POC — worktrees, CI loop, PR automation |
| **Who commits** | Cascade + agents enhancing OpenClaw | ENG agent + Cascade building the POC |

**Rule:** Framework changes → `.openclaw` repo. ENG POC work → `redteam-coding-factory` repo. Never mix.

---

## Current State (as of 2026-03-01)

| Component | Status |
|-----------|--------|
| OpenClaw CLI | v2026.2.24 |
| Native gateway | Running — launchd `ai.openclaw.node` + `ai.openclaw.gateway`, port 18789 |
| Dashboard | Port 19000, launchd `ai.openclaw.dashboard` — Mission Control UI |
| Dashboard API | `/api/traces` reads live session files (`agents/*/sessions/*.jsonl`) — NOT stale logs |
| Telegram | Active — 8 bots, all connected. OPS bot token regenerated 2026-02-28 |
| WhatsApp | Linked +16476092313 |
| Agents | 8 active: main / allrounder / hatake / eng / research / finance / ops / infosec |
| Skills | 43 registered, all enabled |
| Cron jobs | 104 total — see `cron/jobs.json` |
| 9Router | Running :20128 — routing profile: `cost_saver` (PAYG blocked) — 20 provider connections, all healthy |
| Routing profile | `cost_saver` — `allowPayg: false`. Blocks openrouter/auto and zai from cron/fallback chains |
| Token refresh | Fully automated — direct refresh for ALL providers, zero human intervention needed |
| A2A | Active — `a2a-delegations.jsonl` logging mandated via SOUL.md |
| Architecture doc | `/Users/redinside/Development/Codebase/projects/RedTeam/docs/ARCHITECTURE.md` |

---

## Routing Policy (updated 2026-02-28 — DECISION-20260228-004)

All agents (except hatake) share the same model chain via `agents.defaults`:

| Agent | Bot | Identity | Primary | Fallback 1 | Fallback 2 |
|-------|-----|----------|---------|-----------|-----------|
| main | @RedinsideBot | RED | 9router/free-unlimited | 9router/heartbeat-cheap | openai-codex/gpt-5.2 |
| allrounder | @ZenRedBot | ZEN | 9router/free-unlimited | 9router/heartbeat-cheap | openai-codex/gpt-5.2 |
| eng | @ENG_BOT | ENG | 9router/free-unlimited | 9router/heartbeat-cheap | openai-codex/gpt-5.2 |
| research | @RESEARCH_BOT | RESEARCH | 9router/free-unlimited | 9router/heartbeat-cheap | openai-codex/gpt-5.2 |
| finance | @FINANCE_BOT | FINANCE | 9router/free-unlimited | 9router/heartbeat-cheap | openai-codex/gpt-5.2 |
| ops | @OPS_BOT | OPS | 9router/free-unlimited | 9router/heartbeat-cheap | openai-codex/gpt-5.2 |
| infosec | @INFOSECRED_BOT | INFOSEC | 9router/free-unlimited | 9router/heartbeat-cheap | openai-codex/gpt-5.2 |
| hatake | — | HATAKE | ollama/qwen2.5-coder:7b | *(none)* | *(none)* |

- **Codex account:** `io.anuragsaxena@gmail.com` — Team plan, 1-year subscription
- **Kimi (moonshot/kimi-k2.5):** NO subscription — do NOT use
- **ZAI/GLM-4.7:** PAYG — never hard-code in cron or fallback chains
- **openrouter:** Allowed in 9router as free-model source only. **NEVER use `openrouter/auto`** — it silently picks paid models. `cost_saver` profile (`allowPayg: false`) blocks all PAYG spending. Remove any `openrouter/auto` found in agent primary/fallback chains.
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
| P1 | TICKET-20260301-009 — embedded run timeouts (37x in window) — long-running cron jobs hitting 600s limit |
| P2 | TICKET-20260301-006 — `rg` not found in cron PATH — use `grep` as fallback (LEARNING-20260227-002) |
| P2 | TICKET-20260301-007 — `python` not found in cron PATH — cron shells need `python3` not `python` |
| P2 | TICKET-20260301-010 — `apply_patch` not found — codex CLI tool, not available in cron PATH |
| P3 | TICKET-20260216-002 — undici AbortErrors during Telegram polling, awaiting ENG fix |
| Low | Tailscale daemon down — `launchctl start com.tailscale.ipn.macos` needed after reboot |
| Low | Cloudflare quick tunnel URL changes on restart — consider named tunnel |
| Low | Dashboard not in launchd — must start manually after reboot: `node ~/.openclaw/dashboard/server.js` |
| Low | `SLACK_SIGNING_SECRET` placeholder in `.env` — Slack event verification disabled until set |

---

## Branch Strategy

- **`main`** — stable, all work merged here directly (feature branches merged and deleted)

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

---

## 2026-02-25 Session Changes — Autonomy & Resilience Overhaul

### Cron Optimization (71 → 73 jobs)
- **52 error states cleared** — all cached gemini-cli 400 errors wiped
- **6 standup crons staggered**: RED 9:05, ENG 9:07, RESEARCH 9:09, FINANCE 9:11, OPS 9:13, INFOSEC 9:15 (was simultaneous 9:05 → rate limit storm)
- **Inner Loop crons halved**: `0 */2 * * *` → `0 */4 * * *`
- **Model distribution**: 31 jobs → `9router/openrouter/auto` (free), 18 jobs → `ollama/llama3.1:8b` (free local), 17 jobs → agent default (OPS/HATAKE = free), 5 jobs → `mini`. Zero cron jobs touch Codex or Claude directly.
- **+2 new crons added**:
  - `System Pulse — Always-On Heartbeat` (every 5min, OPS, Ollama-only) — auto-restarts gateway/Ollama if down, alerts Anurag
  - `Telegram Approval Monitor` (every 2min, RED, Ollama-only) — watches Telegram for "approve/deny TICKET-XXX" replies

### Model Routing (interactive sessions)
- Primary: `openai-codex/gpt-5.2` → fallbacks: `9router/always-on-premium` → `9router/openrouter/auto` → `ollama/llama3.1:8b` → `zai/glm-4.7` → `zai/glm-4.7-flashx`
- Reverted from billing-optimized config (which broke on 2026-02-25) back to bak.1 + new routing

### Maker-Checker System (NEW — was empty before)
- **`exec-approvals.json`** populated with per-agent allowlists: 8 agents, 70+ pre-approved binaries (python3, bash, curl, git, openclaw, node, jq, cat, grep, find)
- **OPS gets `launchctl` pre-approved** for gateway/dashboard/Ollama self-healing restart (no Anurag needed)
- **ENG gets `claude` and `ccs-smart.sh`** approved for Claude Code CLI invocation
- **`workspace/skills/maker-checker/SKILL.md` created**: Full 3-level approval chain:
  - Level 0: No approval (reads, workspace writes, monitoring, pre-approved exec)
  - Level 1: INFOSEC approval via A2A (code commits, config changes, new dependencies)
  - Level 2: Anurag approval via Telegram async queue (sudo, launchctl new services, destructive ops)
- **Async approval queue**: `workspace/approvals/pending/`, `approved/`, `denied/`
- **SOUL.md updated**: Replaced synchronous blocking approval gate with async Telegram queue pattern

### Resilience Improvements
- 5-minute system pulse (Ollama-only) guarantees the heartbeat never stops even if all premium models fail
- Self-healing OPS can restart the full stack without Anurag intervention
- Telegram approval queue ensures agents never block on human input — they queue and continue

### Skills
- 31st skill registered: `maker-checker` (enabled)
- `openrouter` reinstated for cron jobs only (two OpenRouter accounts with $10 credit each = free models)

### Open Issues Resolved
- Telegram silent on send → reverted to bak.1, confirmed working
- 55-67 cron failures from rate limit storm → staggered + cheap model overrides

---

## 2026-02-28 Session Changes — Outage Recovery & Cost Containment

### Root Cause: 2-Day System Outage (3 simultaneous failures)
1. **`openrouter/auto` spending real credits** — routing profile was `balanced` (`allowPayg: true`); auto picked paid models when free `:free` models hit daily rate limits
2. **OPS Telegram bot 401** — token hardcoded in `openclaw.json` (not just `.env`) was revoked; third different old token found at line 2213
3. **"model not allowed: ollama/llama3.1:8b"** — 6 agents (main, allrounder, eng, research, finance, infosec) had cron jobs explicitly setting `ollama/llama3.1:8b` but the model wasn't in those agents' allowed fallback list in `openclaw.json`

### Fixes Applied
- **Routing profile**: `workspace/config/routing-profiles.json` active changed `balanced` → `cost_saver` (`allowPayg: false`). Blocks openrouter/auto and ZAI from all requests.
- **Ollama fallbacks**: Added `"ollama/llama3.1:8b"` to fallbacks of main, allrounder, eng, research, finance, infosec in `openclaw.json`. Now all 8 agents can use local Ollama.
- **OPS bot token**: Updated `openclaw.json` botToken (line ~2213) + `.env` `TELEGRAM_BOT_TOKEN_OPS` to `8230099863:AAG8mEFP87szMB9aI0UAo_P3Q1GUzS7bPrE`. Stack restarted, OPS reconnected.

### Auto-Refresh — All Providers (2026-03-01 upgrade)
- `9router-keepfresh-0001` cron (every 4min) calls `scripts/9router-token-refresh.js`
- **All 18 OAuth connections refresh directly — no browser, no human intervention, ever:**
  - **Qwen** (6h tokens, 30min buffer) — direct POST `chat.qwen.ai/api/v1/oauth2/token`
  - **iFlow** (48h tokens, 60min buffer) — direct POST `iflow.cn/oauth/token` + `getUserInfo?accessToken=` to refresh `apiKey` used for request signing
  - **Claude** (8h tokens, 60min buffer) — direct POST `console.anthropic.com/v1/oauth/token` (JSON, client_id=9d1c250a-...)
  - **Codex** (10d tokens, 120min buffer) — direct POST `auth.openai.com/oauth/token` (form-encoded, client_id=app_EMoamEEZ73f0CkXaXp7hrann)
  - **Kiro** (1h tokens, 15min buffer) — direct POST AWS OIDC endpoint
  - **Cursor** — synced from local SQLite, JWT valid ~52 days
  - **OpenRouter / NVIDIA NIM** — static API keys, no refresh needed
- **3110.js patch**: `developer` role → `system` in OpenAI normalizer (fixes Qwen 400 errors from Claude Code)
- Verified: `node scripts/9router-token-refresh.js --all` → 16/16 OAuth tokens refreshed successfully

### System Health (2026-03-01)
- 8 agents running, 76 cron jobs healthy
- 20 provider connections: 18 OAuth (all auto-refreshed) + 2 static API keys
- OpenRouter accounts in 429 (rate limited — irrelevant, cost_saver blocks PAYG)
- Tailscale daemon down (minor — internal routing only)

*Last updated: 2026-03-01 — Zero-intervention token refresh for all providers*

---

## 2026-03-01 Session Changes — Full Token Refresh Automation + Qwen Fix

### 9Router Patch: `developer` → `system` Role (3110.js)
- **Problem**: Claude Code sends `developer` role (Anthropic-specific). 9Router forwarded it to Qwen/iFlow unchanged → HTTP 400.
- **Fix**: Patched `/opt/homebrew/lib/node_modules/9router/app/.next/server/chunks/3110.js` — `"developer"===a.role&&(a={...a,role:"system"})` at top of OpenAI message map callback.
- **Result**: All Qwen accounts now return 200. Verified in sqlite: `roles: ['system','user',...]`.

### Token Refresh Script Upgrade (`scripts/9router-token-refresh.js`)
- **iFlow apiKey bug**: After OAuth refresh, now calls `GET iflow.cn/api/oauth/getUserInfo?accessToken=...` (query param — NOT Authorization Bearer header) to update `apiKey`. iFlow uses `apiKey` for request signing — missing this broke inference after token rotation.
- **Claude direct refresh**: Direct POST `console.anthropic.com/v1/oauth/token` (JSON, clientId=`9d1c250a-...`). 8h tokens, 60min buffer.
- **Codex direct refresh**: Direct POST `auth.openai.com/oauth/token` (form-encoded, clientId=`app_EMoamEEZ73f0CkXaXp7hrann`). 10-day tokens, 120min buffer.
- **Verified**: `--all` run → 16 refreshed, 0 failed. All 20 connections healthy.

---

## 2026-02-28 Session Changes — Git Cleanup & Auto-Refresh Verification

### Git Repo Cleanup
- **Problem**: 130+ runtime files tracked by git (heartbeat JSONs, agent-status, memory state, tmp files, goals)
- **Fix**: Added comprehensive `.gitignore` rules covering:
  - `workspace-*/` (all agent sandboxes — memory, sessions, tmp, ops state)
  - `workspace/logs/`, `workspace/approvals/`
  - `telegram/*.json` (update-offset files)
  - `cron/runs/`, `logs/`
  - Runtime state files (`*.heartbeat.json`, `agent-status/*.json`, `goals*.json`)
- **Result**: `git status` now only shows meaningful changes — runtime state silenced permanently
- **Pushed**: All gitignore + doc changes pushed to `origin/main`; repo is clean

### Auto-Refresh Verification
- `9router-keepfresh-0001` cron (every 4min, OPS, ollama) → calls `scripts/9router-token-refresh.js`
- **Claude Pro** auto-refreshes via `/api/providers/{id}/test` in last 5min window — CONFIRMED working
- **Kiro** refreshes via AWS OIDC automatically — CONFIRMED working
- **iFlow** `testStatus: error` = known false positive (health endpoint broken, inference fine) — script explicitly skips iFlow + openrouter test
- No manual re-authentication needed for Claude Pro or Kiro

---

## 2026-03-01 Session — Standards, RUNBOOK, New Skills

- OPENCLAW-STANDARDS, RUNBOOK, new skills (habit-tracker, rag-url-ingestion, earnings-tracker).
- **Awesome-OC:** AWESOME-OPENCLAW-USECASES-MAP.md; autonomy rule; research; idea-reality-mcp; merged→main.

---

## Pending Items (as of 2026-03-01)

### P1
| # | Item |
|---|------|
| 1 | Merge `feature/dashboard-realtime-sync` → main |
| 2 | Add Dashboard to launchd (start manually after reboot) |

### P2
| # | Item |
|---|------|
| 3 | Fix undici AbortErrors (TICKET-20260216-002) |
| 4 | Set `SLACK_SIGNING_SECRET` in `.env` |
| 5 | Provision 3rd Codex account OAuth (`anurawg.saxena@gmail.com`) |

### P3
| # | Item |
|---|------|
| 6 | Named Cloudflare tunnel; Tailscale after reboot; monthly RED self-improvement audit |

---
