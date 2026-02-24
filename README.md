# RedOS — Autonomous AI Company on OpenClaw

**RedOS** is a fully autonomous AI company built on the [OpenClaw](https://openclaw.ai) runtime. It runs 8 AI agents as a functioning team with 24/7 operation, self-healing, and zero human intervention required.

> **Single source of truth:** [`workspace/SOUL.md`](./workspace/SOUL.md) — the company operating system and complete agent protocols.

---

## System at a Glance

| | |
|---|---|
| **OpenClaw CLI** | 2026.2.21-2 |
| **Host** | Mac Mini · macOS 26 Tahoe · ARM64 |
| **Gateway** | `ws://127.0.0.1:18789` — launchd `ai.openclaw.gateway` |
| **Mission Control** | `http://localhost:19000` — launchd `ai.openclaw.dashboard` · auth: `red/redos2026` |
| **9Router** | `http://localhost:20128` — 44 models across 5 providers with auto-failover |
| **Channels** | Telegram (7 bots) · Slack (11 channels) |

---

## The 8 Agents

| Agent | Identity | Role | Model | Telegram | Combo |
|---|---|---|---|---|---|
| `main` | RED | CEO — strategic decisions, direct execution | openai-codex/gpt-5.2 | @RedinsideBot | always-on-premium |
| `allrounder` | ZEN | COO — orchestrates team, routes tasks | openai-codex/gpt-5.2 | @ZenRedBot | always-on-premium |
| `eng` | ENG | Engineering lead — coding factory | openai-codex/gpt-5.2 | @ENG_BOT | coding-factory |
| `research` | RESEARCH | Research analyst — deep reasoning | openai-codex/gpt-5.2 | @RESEARCH_BOT | research-deep |
| `finance` | FINANCE | Finance analyst — trading, cost tracking | openai-codex/gpt-5.2 | @FINANCE_BOT | always-on-premium |
| `ops` | OPS | DevOps & Scrum Master — system health | openai-codex/gpt-5.2 | @OPS_BOT | always-on-premium |
| `infosec` | INFOSEC | Security officer — audits, reviews | openai-codex/gpt-5.2 | @INFOSECRED_BOT | always-on-premium |
| `hatake` | HATAKE | Marketing & CI — campaigns, intel | openai-codex/gpt-5.2 | _(none)_ | always-on-premium |

**Hierarchy:** RED → ZEN → Teams (ENG, RESEARCH, FINANCE, OPS, INFOSEC, HATAKE)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   USER CHANNELS                     │
│   Telegram (7 bots)   Slack (11 channels)   CLI     │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│         OPENCLAW GATEWAY  (port 18789)              │
│         v2026.2.21-2 · launchd managed              │
│                                                     │
│  Agent runtime · Skill executor · Cron scheduler    │
│  Session memory (SQLite) · A2A delegation           │
└──────────────────────────┬──────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐    ┌────────────┐    ┌─────────────┐
   │  SKILLS   │    │   MODELS   │    │    CRON     │
   │           │    │            │    │             │
   │ 27 skills │    │ 9Router    │    │ 53 jobs     │
   │ a2a-trans.│    │ 44 models  │    │ 24/7 ops    │
   │ cost-track│    │ 5 providers │    │ meta checks │
   │ self-heal │    │ 6 combos   │    │ guardrails  │
   │ + more    │    │ auto-fail  │    │ standups    │
   └───────────┘    └────────────┘    └─────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│       9ROUTER PROXY (port 20128)                   │
│       44 models · 5 providers · 6 combos           │
│                                                     │
│  Codex(15) · Cursor(8) · Gemini(5) · iFlow(11)     │
│  Kiro(2) · Auto-failover · Zero downtime           │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│       MISSION CONTROL DASHBOARD  (port 19000)       │
│       dashboard/server.js · launchd managed         │
│                                                     │
│  Agents · Pipeline · Analytics · Standups           │
│  Team tab (A2A delegation) · Tickets · Costs        │
└─────────────────────────────────────────────────────┘
```

---

## Model Routing via 9Router

### 6 Intelligent Combos (Auto-Failover)

| Combo | Layers | Purpose | Route |
|---|---|---|---|
| **always-on-premium** | 10 | All agents (RED, ZEN, FINANCE, OPS, INFOSEC, HATAKE) | Codex → Cursor → Gemini → Kiro → iFlow |
| **coding-factory** | 9 | ENG coding tasks | Best coding models (Codex high, Opus, Sonnet thinking) |
| **research-deep** | 8 | RESEARCH deep reasoning | Best reasoning models (Opus high, Codex xhigh, DeepSeek) |
| **heartbeat-cheap** | 8 | Background heartbeats | Fast/free models (Gemini Flash, Haiku, Mini) |
| **subagent-reliable** | 8 | Sub-agent work | Reliable mid-tier (Codex, Sonnet, Gemini Pro) |
| **free-unlimited** | 10 | Emergency fallback ($0) | 10 free models (iFlow, Gemini, Kiro) |

### Provider Breakdown (44 Models Total)

| Provider | Models | Type | Cost |
|---|---|---|---|
| **Codex (cx)** | 15 | OpenAI GPT-5.3/5.2/5.1 | Subscription |
| **Cursor (cu)** | 8 | Claude 4.5 Opus/Sonnet/Haiku | Subscription |
| **Gemini (gc)** | 5 | Google Gemini 2.5/3 | Free via OAuth |
| **iFlow (if)** | 11 | Kimi K2, DeepSeek, GLM, Qwen | Free unlimited |
| **Kiro (kr)** | 2 | Claude 4.5 Sonnet/Haiku | Free unlimited |

**Fallback Strategy:** Primary GPT-5.2 → 9Router combo → Anthropic direct → free-unlimited combo. Zero downtime guaranteed.

---

## Slack Channels

| Channel | ID | Purpose |
|---|---|---|
| `#redos-scrum` | C0AEV3J2L23 | Daily standups (9:05am ET) |
| `#redos-mission-control` | C0AEV3MDEDD | CEO directives, A2A threads |
| `#openclaw-optimization` | C0AF4KB4TUK | Knowledge sharing |
| `#all-redos` | C0AG4AY6VME | Company-wide announcements |
| `#redos-red` | C0AFLUZ4P71 | RED work log |
| `#redos-zen` | C0AFZ09R9V3 | ZEN work log |
| `#redos-eng` | C0AFW1B0QUB | ENG work log |
| `#redos-research` | C0AG615R5E0 | RESEARCH work log |
| `#redos-finance` | C0AG6166CJ0 | FINANCE work log |
| `#redos-ops` | C0AGFA9417T | OPS work log |
| `#redos-infosec` | C0AG2CTU6AW | INFOSEC work log |

---

## 24/7 Operation (53 Cron Jobs)

| Agent | Jobs | Focus |
|---|---|---|
| **RED (CEO)** | 7 | Briefs, strategy, team pulse, meta check |
| **ZEN (COO)** | 3 | Team coordination, morning brief, meta check |
| **ENG** | 6 | GitHub, implementation, coding, meta check |
| **RESEARCH** | 5 | AI trends, knowledge updates, meta check |
| **FINANCE** | 8 | Trading, portfolio, market leads, meta check |
| **OPS** | 18 | Health, crons, SLA, tickets, guardrail, updates, meta check |
| **INFOSEC** | 3 | Security review, standup, meta check |
| **HATAKE** | 3 | Competitive intel, marketing, meta check |

**Key Cron Features:**
- Meta self-check every 2h (all agents) — validates tools, task queue, Slack
- Guardrail enforcer every 4h — escalates stale tickets
- Daily OpenClaw updates check (8am) — auto-updates if safe
- Heartbeats every 30m — all agents always active

---

## Engineering Pipeline (Coding Factory)

1. **Requirements** → RESEARCH delivers findings → ZEN routes to ENG
2. **Code** → `ccs-smart.sh` with Claude Code (auto backend selection)
3. **Test** → Run tests, lint check (never push untested)
4. **GitHub PR** → Create branch, commit, push, PR via `gh` CLI
5. **Review** → INFOSEC reviews (maker-checker system)
6. **Deploy** → Vercel CLI (`vercel --prod`) → post URL to Slack
7. **Monitor** → OPS monitors deployment health

**Tools Available:** Vercel CLI v50.22.1, gh CLI, CCS v7.47, Claude Code

---

## Self-Healing & Autonomy

- **Meta Checker:** Every agent self-validates every 2h (tools, tasks, Slack)
- **Self-Healing Protocol:** Agents fix issues themselves → update LEARNINGS.md → escalate only if stuck
- **Guardrails:** OPS enforces ticket resolution, no stale issues
- **Hire/Fire:** Agents can spawn sub-agents for parallel work (maxConcurrent=4)
- **Zero Human Intervention:** Only P0 critical decisions need owner approval (15-min window)

---

## Key Files

| File | Purpose |
|---|---|
| `openclaw.json` | Master config — agents, models, channels **(gitignored)** |
| `workspace/SOUL.md` | **Company OS** — complete agent protocols, read this first |
| `workspace/ops/LEARNINGS.md` | Institutional knowledge, fixes, learnings |
| `workspace/ops/TICKET-TRACKER.md` | Issue tracker, guardrail enforcement |
| `workspace/ops/task-registry.json` | Task assignment and tracking |
| `workspace/skills/` | 27 agent skills (declarative SKILL.md files) |
| `dashboard/server.js` | Mission Control dashboard (port 19000) |
| `identity/device.json` | Ed25519 keypair — **NEVER delete** |

---

## Common Operations

```bash
# Gateway status
openclaw status
openclaw status --deep

# Restart gateway
openclaw gateway restart

# Validate config
openclaw doctor

# List cron jobs
openclaw cron list

# Live logs
tail -f ~/.openclaw/logs/gateway.log

# Upgrade OpenClaw CLI
npm update -g openclaw

# Check 9Router models
curl -s http://localhost:20128/v1/models -H "Authorization: Bearer <key>"

# Test combo routing
curl -s http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer <key>" \
  -d '{"model":"always-on-premium","messages":[{"role":"user","content":"test"}],"stream":true}'
```

---

## Critical Rules

- **Never edit** `/opt/homebrew/lib/node_modules/openclaw/dist/` — compiled runtime
- **Never commit** `openclaw.json`, `identity/`, `devices/`, `credentials/`
- **Never delete** `identity/device.json` — cannot be regenerated
- **Run `openclaw doctor`** after any `openclaw.json` change
- **All agents are ALWAYS ON** — no "on-demand" agents
- **Never wait for human** — only P0 decisions need owner approval
- **Use 9Router combos** — never individual models for reliability

---

## Project Structure

```
~/.openclaw/                    ← this repo (RedOS)
├── README.md                   ← this file
├── openclaw.json               ← live config (gitignored)
├── workspace/
│   ├── SOUL.md                 ← Company OS (START HERE)
│   ├── skills/                 ← 27 agent skills
│   └── ops/                    ← tickets, learnings, task registry
├── dashboard/                  ← Mission Control (port 19000)
├── scripts/                    └── ccs-smart.sh (Claude Code wrapper)
└── identity/                   ← Ed25519 keypair (gitignored)
```

---

## License

Private project. All rights reserved.

---

**Status: ✅ FULLY OPERATIONAL — 24/7 autonomous AI company**
