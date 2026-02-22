# RedOS — AI Company on OpenClaw

**RedOS** is a multi-agent AI company built on top of the [OpenClaw](https://openclaw.ai) runtime. It runs 8 AI agents as a functioning team — each with a role, a Telegram bot, Slack channels, scheduled standups, and a shared task registry.

> **Single source of truth:** [`KNOWLEDGEBASE.md`](./KNOWLEDGEBASE.md) — read this first for full context, auth setup, known fixes, and operational procedures.

---

## System at a Glance

| | |
|---|---|
| **OpenClaw CLI** | 2026.2.21-2 |
| **Host** | Mac Mini · macOS 26 Tahoe · ARM64 |
| **Gateway** | `ws://127.0.0.1:18789` — launchd `ai.openclaw.gateway` |
| **Mission Control** | `http://localhost:19000` — launchd `ai.openclaw.dashboard` · auth: `red/redos2026` |
| **Channels** | Telegram (7 bots) · WhatsApp · Slack |

---

## The 8 Agents

| Agent | Identity | Role | Model | Telegram |
|---|---|---|---|---|
| `main` | RED | CEO — orchestrator | openai-codex/gpt-5.2 | @RedinsideBot |
| `allrounder` | ZEN | CSO — general assistant | openai-codex/gpt-5.2 | @ZenRedBot |
| `hatake` | HATAKE | Intent parser (internal) | ollama/qwen2.5-coder:7b | _(none)_ |
| `eng` | ENG | Engineering lead | openai-codex/gpt-5.2 | @ENG_BOT |
| `research` | RESEARCH | Research analyst | openai-codex/gpt-5.2 | @RESEARCH_BOT |
| `finance` | FINANCE | Finance analyst | ollama/llama3.1:8b | @FINANCE_BOT |
| `ops` | OPS | Scrum master / monitoring | openai-codex/gpt-5.2 | @OPS_BOT |
| `infosec` | INFOSEC | Security officer | openai-codex/gpt-5.2 | @INFOSECRED_BOT |

**Hierarchy:** RED → ZEN (+ HATAKE under ZEN); ENG, RESEARCH, FINANCE, OPS, INFOSEC report to RED.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   USER CHANNELS                     │
│   Telegram (7 bots)   WhatsApp   Slack   CLI        │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│         OPENCLAW GATEWAY  (port 18789)              │
│         v2026.2.19-2 · launchd managed              │
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
   │ a2a-      │    │ gpt-5.2    │    │ 23 jobs     │
   │  transpar.│    │  (RED/ZEN/ │    │ standups    │
   │ hatake-   │    │   RSRCH)   │    │ health chks │
   │  parser   │    │            │    │ summaries   │
   │ smart-    │    │ llama3.1:8b│    │ OPS monitor │
   │  router   │    │  (ENG/FIN/ │    │             │
   │ cost-     │    │  OPS/ISEC) │    └─────────────┘
   │  tracker  │    │            │
   │ + more    │    │ qwen2.5:7b │
   └───────────┘    │  (HATAKE)  │
                    └────────────┘
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

## Model Assignments & Fallback Strategy

### Primary Models
| Tier | Models | Agents | Cost |
|---|---|---|---|
| **Premium** | openai-codex/gpt-5.2 | RED, ZEN, ENG, RESEARCH, OPS, INFOSEC | 💰 Paid — 5-account pool |
| **Local free** | ollama/llama3.1:8b | FINANCE, HATAKE | 🆓 Free · 58s cold start |
| **Local free** | ollama/qwen2.5-coder:7b | HATAKE (fallback) | 🆓 Free · 11s |

### 4-Tier Intelligent Fallback System
```
🔥 Tier 1: OpenAI Codex (5 accounts: 3 Team + 2 Free)
🧠 Tier 2: Anthropic Claude (1 account)
🏠 Tier 3: Local Ollama (3 models, unlimited)
💎 Tier 4: ZAI GLM Models (paid, cost-effective)
```

**OpenAI Account Pool:**
- Miranda (Team/Business) - default
- byionrun (Team/Business) - account2  
- Anurag (Team/Business) - account4
- Ryan (Free) - account5
- redinside (Free) - account3

**ZAI Models:**
- `glm-4-plus` - 128K context, supports images
- `glm-4` - 128K context, text only

**Tested Ollama models (2026-02-20):**
- ✅ `llama3.1:8b` — working (58s cold start)
- ✅ `qwen2.5-coder:7b` — working (11s)
- ⚠️ `gpt-oss:20b` — unstable (empty responses) — do not assign as primary
- ❌ `glm-4.7-flash:latest` — broken (times out)

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

## Daily Scrum Schedule (Mon–Fri)

| Time (ET) | Event |
|---|---|
| 9:05am | 6 agents post standup to `#redos-scrum` |
| 9:15am | OPS compiles team digest, posts to `#redos-scrum` |
| 6:00pm | RED CEO Daily Summary → Telegram |

---

## Key Files

| File | Purpose |
|---|---|
| `openclaw.json` | Master config — agents, models, channels, auth **(gitignored — contains secrets)** |
| `KNOWLEDGEBASE.md` | Full project context — **read this before making changes** |
| `CLAUDE.md` | Instructions for Claude Code working in this repo |
| `cron/jobs.json` | All 23 cron job definitions |
| `workspace/SOUL.md` | Shared system prompt for all agents |
| `workspace/config/model-registry.json` | All models, status, tested cold starts |
| `workspace/config/slack-channels.json` | Per-agent Slack channel IDs |
| `workspace/ops/task-registry.json` | OPS-managed task tracker |
| `workspace/ops/TICKET-TRACKER.md` | Open issues and tickets |
| `workspace/ops/LEARNINGS.md` | Institutional knowledge |
| `workspace/skills/` | All agent skills (declarative SKILL.md files) |
| `dashboard/server.js` | Mission Control dashboard server |
| `scripts/patch-pairing-reply.sh` | Re-run after every OpenClaw upgrade |
| `identity/device.json` | Ed25519 keypair — **NEVER delete** |

---

## Common Operations

```bash
# Gateway status
openclaw status
openclaw status --deep

# Restart gateway
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist && sleep 1 && launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# Restart dashboard
launchctl unload ~/Library/LaunchAgents/ai.openclaw.dashboard.plist && sleep 1 && launchctl load ~/Library/LaunchAgents/ai.openclaw.dashboard.plist

# Validate config (run after every openclaw.json change)
openclaw doctor

# Live logs
tail -f ~/.openclaw/logs/gateway.log
tail -f ~/.openclaw/logs/dashboard.log

# Upgrade OpenClaw CLI
npm update -g openclaw
# Then re-run:
bash scripts/patch-pairing-reply.sh
# Then restart gateway

# Check available Ollama models
curl -s http://127.0.0.1:11434/api/tags | python3 -c "import json,sys; [print(m['name']) for m in json.load(sys.stdin)['models']]"
```

---

## Authentication — Three-Token Rule

`OPENCLAW_GATEWAY_TOKEN` must be **identical** in all three places or gateway auth fails:
1. `~/.zshrc` → `export OPENCLAW_GATEWAY_TOKEN=...`
2. `~/Library/LaunchAgents/ai.openclaw.gateway.plist` → `OPENCLAW_GATEWAY_TOKEN`
3. `openclaw.json` → `gateway.auth.token`

---

## Critical Rules

- **Never edit** `/opt/homebrew/lib/node_modules/openclaw/dist/` — compiled runtime
- **Never assign PAYG models** (zai, openrouter) to cron jobs — use Ollama (free) or gpt-5.2 (subscription)
- **Run `openclaw doctor`** after any `openclaw.json` change
- **Re-run `patch-pairing-reply.sh`** after every OpenClaw CLI upgrade
- **Never delete** `identity/device.json` — cannot be regenerated
- **Never commit** `openclaw.json`, `identity/`, `devices/`, `credentials/`

---

## Project Structure

```
~/.openclaw/                    ← this repo (RedOS)
├── KNOWLEDGEBASE.md            ← full context (start here)
├── CLAUDE.md                   ← Claude Code instructions
├── openclaw.json               ← live config (gitignored)
├── cron/jobs.json              ← all cron jobs
├── dashboard/                  ← Mission Control (port 19000)
│   ├── server.js
│   └── index.html
├── workspace/
│   ├── SOUL.md                 ← shared agent system prompt
│   ├── MEMORY.md               ← agent long-term memory
│   ├── skills/                 ← all agent skills
│   ├── config/                 ← model registry, slack channels, budgets
│   └── ops/                    ← tickets, learnings, task registry
├── workspace-main/             ← RED agent working directory
├── workspace-allrounder/       ← ZEN agent working directory
├── workspace-eng/              ← ENG agent working directory
├── workspace-research/         ← RESEARCH agent working directory
├── workspace-finance/          ← FINANCE agent working directory
├── workspace-ops/              ← OPS agent working directory
├── workspace-infosec/          ← INFOSEC agent working directory
├── scripts/
│   └── patch-pairing-reply.sh  ← re-run after every OpenClaw upgrade
├── identity/                   ← Ed25519 keypair (gitignored)
├── ai.openclaw.gateway.plist   ← gateway launchd template
└── ai.openclaw.dashboard.plist ← dashboard launchd template
```

---

## License

Private project. All rights reserved.
