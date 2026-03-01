# RedOS — Autonomous AI Company on OpenClaw

**RedOS** is a fully autonomous AI company built on the [OpenClaw](https://openclaw.ai) runtime. Eight AI agents operate as a functioning team 24/7 with self-healing, bounded autonomy (L0–L5 approval tiers), and a Telegram-based human-in-the-loop for high-stakes decisions.

> **Start here:** [`workspace/SOUL.md`](./workspace/SOUL.md) — company operating system and full agent protocols.
> **Current task queue:** [`workspace/AUTONOMOUS.md`](./workspace/AUTONOMOUS.md)
> **Sprint state:** [`workspace/STATE.yaml`](./workspace/STATE.yaml)

---

## System at a Glance

| | |
|---|---|
| **OpenClaw CLI** | 2026.2.26 |
| **Host** | Mac Mini · macOS 26 Tahoe · ARM64 |
| **Gateway** | `ws://127.0.0.1:18789` — launchd `ai.openclaw.gateway` |
| **Mission Control** | `http://localhost:19000` — launchd `ai.openclaw.dashboard` · auth: `red/redos2026` |
| **9Router** | `http://localhost:20128` — multi-provider model proxy with auto-failover |
| **n8n** | `http://localhost:5678` — credential-isolated external integrations · launchd `ai.openclaw.n8n` |
| **Ollama** | `http://localhost:11434` — local models (hatake only) |
| **Channels** | Telegram (8 bots) · Slack (11 channels) |

---

## The 8 Agents

| Agent | Identity | Role | Primary Model | Telegram |
|---|---|---|---|---|
| `main` | RED | CEO — strategy, orchestration, Telegram approvals | 9router/free-unlimited | @RedinsideBot |
| `allrounder` | ZEN | CSO — general assistant, routing, synthesis | 9router/free-unlimited | @ZenRedBot |
| `eng` | ENG | Engineering lead — code, architecture, implementation | 9router/free-unlimited | @ENG_BOT |
| `research` | RESEARCH | Research analyst — market intel, deep analysis | 9router/free-unlimited | @RESEARCH_BOT |
| `finance` | FINANCE | Finance analyst — costs, budget, portfolio | 9router/free-unlimited | @FINANCE_BOT |
| `ops` | OPS | Scrum Master — health monitoring, tickets, SLA | 9router/free-unlimited | @OPS_BOT |
| `infosec` | INFOSEC | Security officer — audits, L3 A2A approvals | 9router/free-unlimited | @INFOSECRED_BOT |
| `hatake` | HATAKE | Intent parser — internal only, local model | ollama/qwen2.5-coder:7b | *(none)* |

**Fallback chain (all except hatake):** `9router/free-unlimited` → `9router/heartbeat-cheap` → `openai-codex/gpt-5.2`

**Hierarchy:** RED → ZEN; ENG, RESEARCH, FINANCE, OPS, INFOSEC, HATAKE all report to RED.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER CHANNELS                            │
│   Telegram (7 bots)    Slack (11 channels)    CLI               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│            OPENCLAW GATEWAY  (port 18789)                       │
│            v2026.2.26 · launchd managed                         │
│                                                                 │
│  Agent runtime · Skill executor · Cron scheduler (104 jobs)      │
│  Session memory (SQLite) · A2A delegation · memory-core plugin  │
└──────────┬──────────────────────┬──────────────────────┬────────┘
           │                      │                      │
           ▼                      ▼                      ▼
    ┌────────────┐         ┌────────────┐         ┌──────────────┐
    │  43 SKILLS │         │  9 ROUTER  │         │   n8n :5678  │
    │            │         │  :20128    │         │              │
    │ maker-chkr │         │ free-unlim │         │ 3 workflows  │
    │ telegram-  │         │ heartbeat- │         │ slack-post   │
    │  approvals │         │   cheap    │         │ gh-status    │
    │ autonomy-  │         │ gpt-5.2 fb │         │ echo-test    │
    │  scorecard │         │ + Ollama   │         │ credential   │
    │ n8n-webhks │         │  (hatake)  │         │  isolation   │
    │ + 38 more  │         └────────────┘         └──────────────┘
    └────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│        BOUNDED AUTONOMY  (L0–L5 Approval Tiers)                 │
│                                                                 │
│  L0 read-only  L1 safe-write  L2 reversible  → auto-approve    │
│  L3 infra changes  → INFOSEC A2A review (120s timeout)         │
│  L4 external/money → Telegram approval (10 min window)         │
│  L5 critical/irrev → Telegram approval (30 min window)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Model Providers

| Provider | Identifier | Type | Used For |
|---|---|---|---|
| **9Router** | `9router/free-unlimited` | Multi-provider proxy | All agents — primary |
| **9Router** | `9router/heartbeat-cheap` | Fast/cheap via proxy | All agents — fallback 1 |
| **openai-codex** | `openai-codex/gpt-5.2` | GPT-5.2 subscription | All agents — fallback 2 |
| **Ollama** | `ollama/qwen2.5-coder:7b` | Local, $0 | HATAKE only |
| **Perplexity** | `sonar-pro` | Subscription | RESEARCH (explicit calls) |
| **ZAI** | `zai/glm-4.*` | PAYG | **Never use in crons or fallbacks** |

---

## 24/7 Autonomy (104 Cron Jobs)

Key named cron jobs:

| ID | Agent | Schedule | Purpose |
|---|---|---|---|
| `telegram-approval-monitor-0001` | main | every 2min | Monitor Telegram for L4/L5 approvals |
| `system-pulse-always-on-0001` | ops | every 5min | Stack health + auto-restart |
| `autonomy-scorecard-daily-0001` | ops | 9:05am ET M–F | Daily autonomy score (1–10) → Slack |
| `context-overflow-monitor-0001` | ops | every 3h | Flag sessions >80% context |
| `episodes-seeder-0001` | ops | every 30min | Seed episodes.jsonl from cron state |
| `nightly-eval-cron-0001` | ops | 2am ET | Episode analysis + self-improvement |
| `research-eng-pipeline-0001` | eng | 10am/2pm/6pm ET M–F | Deliver research briefs to ENG |
| `research-weekly-digest-0001` | research | Mon 8am ET | Weekly market intelligence |
| `finance-weekly-cost-report-0001` | finance | Mon 8:45am ET | Weekly cost report → Slack |
| `weekly-improvement-proposal-0001` | ops | Mon 9am ET | Self-improvement proposal |
| `hourly-snapshot-cron-0001` | ops | hourly | Git snapshot + backup |

Full list: `cron/jobs.json`

---

## Skills (43+ in `workspace/skills/`)

| Skill | Purpose |
|---|---|
| `maker-checker` | L0–L5 bounded autonomy approval policy |
| `telegram-approvals` | L4/L5 human approval UX via Telegram |
| `a2a-verify` | A2A smoke tests + instrumentation |
| `autonomy-scorecard` | Daily 1–10 score from cron/A2A/ticket data |
| `n8n-webhooks` | Credential-isolated external API calls |
| `semantic-memory` | Qdrant vector search + RAG |
| `rag-url-ingestion` | Save URL/article → workspace/kb → reindex RAG |
| `habit-tracker` | Daily habit check-in → habit-log.md |
| `earnings-tracker` | Weekly earnings via web_search; symbols in workspace/config/earnings-symbols.json |
| `self-healing-auto` | Autonomous recovery protocols |
| `research-pipeline` | RESEARCH→ENG automated brief delivery |
| `idea-validator` | Pre-build reality check (score 0–100) |
| `command-catalog` | Per-agent behavioral command rules (YAML) |
| `policy-gate` | Audit-only exec gate (human use, not enforcement) |
| `competitive-intelligence` | Weekly market scan |
| `reflect-learn` | Episode-based self-improvement |

---

## File-Based Coordination

Agents share state via files — no message-passing bottlenecks, race-condition safe:

| File | Owner | Purpose |
|---|---|---|
| `workspace/STATE.yaml` | All agents | Sprint, pipeline status, per-agent focus, metrics |
| `workspace/GOALS.md` | RED only | Company goals driving all inner-loop work |
| `workspace/AUTONOMOUS.md` | RED assigns / workers claim | Task queue — agents pick & claim each session |
| `workspace/DECISIONS.md` | All agents | Append-only event-sourced decision log |
| `workspace/tasks-log.md` | Workers | Append-only completion log |
| `workspace/PROJECT_STATUS.md` | OPS (nightly) | Live board — work, metrics, blockers |

---

## Semantic Memory

| Component | Details |
|---|---|
| Vector index | `~/.openclaw/.memsearch/qdrant/` |
| Embedding model | `fastembed BAAI/bge-small-en-v1.5` |
| Python venv | `~/.openclaw/.venv` |
| Scripts | `workspace/scripts/memsearch.py`, `workspace/scripts/rag_query.py` |
| Dashboard API | `GET http://127.0.0.1:19000/api/search?q=...&n=5` |

---

## n8n Webhook Delegation

Credential-isolated external API calls. Agents POST to webhook URLs; credentials never leave n8n.

| Webhook | Purpose | Input |
|---|---|---|
| `POST /webhook/echo-test` | Health check | `{any}` |
| `POST /webhook/slack-post` | Post to Slack | `{channel: "C...", text: "..."}` |
| `POST /webhook/github-repo-status` | Fetch latest commits | `{repo: "owner/name"}` |

Dashboard: `http://127.0.0.1:5678` · API key: `workspace/config/n8n-api-key.txt` (gitignored)

---

## Slack Channels

| Channel | ID | Purpose |
|---|---|---|
| `#redos-scrum` | C0AEV3J2L23 | Daily standups |
| `#redos-mission-control` | C0AEV3MDEDD | CEO directives, autonomy scorecard |
| `#openclaw-optimization` | C0AF4KB4TUK | Knowledge sharing |
| `#all-redos` | C0AG4AY6VME | Company-wide |
| `#redos-red` | C0AFLUZ4P71 | RED work log |
| `#redos-zen` | C0AFZ09R9V3 | ZEN work log |
| `#redos-eng` | C0AFW1B0QUB | ENG work log |
| `#redos-research` | C0AG615R5E0 | RESEARCH work log |
| `#redos-finance` | C0AG6166CJ0 | FINANCE work log |
| `#redos-ops` | C0AGFA9417T | OPS work log |
| `#redos-infosec` | C0AG2CTU6AW | INFOSEC work log |

---

## Key Files

| File | Purpose |
|---|---|
| `openclaw.json` | Master runtime config **(gitignored)** |
| `cron/jobs.json` | All 104 cron job definitions |
| `workspace/SOUL.md` | **Company OS** — injected into every agent session |
| `workspace/MEMORY.md` | Curated long-term memory |
| `workspace/GOALS.md` | Active company goals |
| `workspace/STATE.yaml` | Live shared state |
| `workspace/AUTONOMOUS.md` | Agent task queue |
| `workspace/skills/` | 43 declarative skills |
| `workspace/ops/TICKET-TRACKER.md` | Issue tracker |
| `workspace/ops/OPENCLAW-STANDARDS.md` | OpenClaw standards checklist (Part 3.3) |
| `workspace/RUNBOOK.md` | Single reference: crons, skills, RAG, dashboard |
| `workspace/docs/AWESOME-OPENCLAW-USECASES-MAP.md` | Use-case vs RedOS mapping; agent handoff for enhancements |
| `workspace/scripts/seed-episodes.py` | Seeds episodes.jsonl |
| `dashboard/server.js` | Mission Control (port 19000) |
| `identity/device.json` | Ed25519 keypair — **NEVER delete** |

---

## Common Operations

```bash
# Full stack restart after any config change
bash ~/.openclaw/scripts/redos-restart.sh

# Check status without restart
bash ~/.openclaw/scripts/redos-restart.sh --status

# Validate config
openclaw doctor

# Live logs
tail -f ~/.openclaw/logs/gateway.log
tail -f ~/.openclaw/logs/gateway.err.log

# Test n8n webhook
curl -s -X POST http://localhost:5678/webhook/echo-test \
  -H "Content-Type: application/json" -d '{"agent":"test"}'

# Seed episodes manually
python3 ~/.openclaw/workspace/scripts/seed-episodes.py

# Upgrade OpenClaw CLI (then restore pairing reply)
npm update -g openclaw && bash scripts/patch-pairing-reply.sh
```

---

## Critical Rules

- **Never edit** `/opt/homebrew/lib/node_modules/openclaw/dist/`
- **Never commit** `openclaw.json`, `identity/`, `credentials/`, `workspace/config/n8n-api-key.txt`
- **Never delete** `identity/device.json`
- **Run `openclaw doctor`** after any `openclaw.json` change, then restart
- **Never hardcode `model` in cron payloads** — omit the field, let agent defaults apply
- **Never use PAYG models** (zai) in crons or fallback chains
- **L4/L5 actions require Telegram approval** from owner

---

## Project Structure

```
~/.openclaw/
├── README.md                        ← this file
├── CLAUDE.md                        ← Claude Code guidance
├── KNOWLEDGEBASE.md                 ← architecture quick reference
├── openclaw.json                    ← live config (gitignored)
├── cron/jobs.json                   ← 104 cron definitions
├── extensions/memory-core/          ← memory-core plugin
├── workspace/
│   ├── SOUL.md                      ← Company OS (START HERE)
│   ├── GOALS.md                     ← Active goals
│   ├── STATE.yaml                   ← Live shared state
│   ├── AUTONOMOUS.md                ← Task queue
│   ├── DECISIONS.md                 ← Decision log
│   ├── MEMORY.md                    ← Long-term memory
│   ├── PROJECT_STATUS.md            ← Live board
│   ├── skills/                      ← 43 skills
│   ├── scripts/                     ← seed-episodes.py + ops scripts
│   ├── ops/                         ← tickets, learnings
│   ├── logs/                        ← a2a-delegations, episodes, audit
│   ├── costs/                       ← weekly cost reports
│   ├── tmp/                         ← research briefs, probes
│   └── config/                      ← budget-guardrails, model-registry
├── dashboard/                       ← Mission Control
├── scripts/                         ← redos-restart.sh, hourly-snapshot.sh
└── identity/                        ← Ed25519 keypair (gitignored)
```

---

**Status: ✅ FULLY OPERATIONAL — 104-cron 24/7 autonomous AI company · bounded autonomy L0–L5**
