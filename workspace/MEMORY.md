# MEMORY.md — OpenClaw RedOS Workspace

> Curated long-term memory. **Full reference:** `KNOWLEDGEBASE.md`. **History:** `MEMORY-ARCHIVE-2026-02-15.md`.

---

## Current State (as of 2026-02-17)

| Component | Status |
|-----------|--------|
| OpenClaw CLI | v2026.2.15 |
| Native gateway | Running — launchd `ai.openclaw.gateway`, port 18789 |
| Dashboard | Port 19000, basic auth (red / redos2026) — started manually via `node dashboard/server.js` |
| Dashboard tunnel | Cloudflare quick tunnel — URL in `workspace/DASHBOARD_URL.txt` |
| Telegram | 7/7 accounts OK |
| WhatsApp | Linked +16476092313, DM isolation `per-channel-peer` |
| Agents | 8 active: main / allrounder / hatake / eng / research / finance / ops / infosec |
| Sessions | Cleared 2026-02-17 — fresh start |
| Skills | 22 registered, all enabled |
| Cron jobs | Enabled — all use agent default model (no PAYG hard-coding) |
| Sandbox | mode: off — tools.deny active: `group:web`, `browser` |
| LLM Analytics plugin | Active — writing `workspace/logs/cost-events.jsonl` + `routing-decisions.jsonl` + `llm-analytics.jsonl` |

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
| **Pipeline** | **Real-time request flow** — shows how each message routes from trigger → RED → delegated agents; 3s poll |
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
- Pipeline: `workspace/logs/routing-decisions.jsonl` + `workspace/logs/llm-analytics.jsonl` (joined by agent + timestamp)
- Tickets: `workspace/ops/TICKET-TRACKER.md` (markdown parsed)
- Agent hierarchy: `workspace/ops/agent-hierarchy.json`

### Dashboard APIs added (this session)
| Endpoint | Purpose |
|----------|---------|
| `GET /api/analytics` | Cost breakdown by model/agent/provider + recent feed |
| `GET /api/pipeline` | Request flow pipelines (last 20) |
| `GET /api/agents` | Live agent list with hierarchy |
| `PATCH /api/agents/:id` | Edit agent (name, model, role, parent, bot) |
| `POST /api/agents` | Add new agent |
| `DELETE /api/agents/:id` | Remove agent |
| `PATCH /api/cron-jobs/:id` | Change model for a cron job on demand |
| `GET /api/tickets` | Live ticket list (30s poll) |

---

## Open Issues

| Priority | Description |
|----------|-------------|
| P1 | TICKET-20260216-005 — Health monitoring gap ~33h, SLA deadline 2026-02-17T05:11:00Z |
| P3 | TICKET-20260216-002 — undici AbortErrors during Telegram polling, awaiting ENG fix |
| Low | Cloudflare quick tunnel URL changes on restart — consider named tunnel |
| Low | Codex 3rd account (`anurawg.saxena@gmail.com`) needs OAuth tokens |
| Low | Dashboard process not in launchd — must be started manually after reboot |

---

## Branch Strategy

- **`main`** — stable, all work merged here incrementally (current HEAD: `103a5ca`)
- **`feature/cost-routing-fixes`** — original feature branch (preserved, all work now in main)

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

*Last updated: 2026-02-17 — dashboard fully upgraded: cost estimator (real data), pipeline tab, agent hierarchy + CRUD, cron model editing, tickets SLA tracking*
