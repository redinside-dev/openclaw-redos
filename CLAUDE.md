# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Session Persistence

Claude Code automatically saves sessions. After crashes or terminal closes:

```bash
~/.local/bin/claude --resume   # resume last session
```

## What This Repo Is

**OpenClaw RedOS** — custom business logic, agent identities, skills, and orchestration built on top of the OpenClaw CLI runtime.

Two distinct layers:
- **OpenClaw CLI** at `/opt/homebrew/lib/node_modules/openclaw/` — compiled Node.js runtime. **Never edit `dist/` files.**
- **RedOS** at `/Users/redinside/.openclaw/` — this repo. All customizations live here.

## Common Commands

```bash
# ── Restart full stack after any config change ──
bash ~/.openclaw/scripts/redos-restart.sh

# Check status without restart
bash ~/.openclaw/scripts/redos-restart.sh --status

# Validate openclaw.json (run before every restart)
openclaw doctor

# Live logs
tail -f ~/.openclaw/logs/gateway.log
tail -f ~/.openclaw/logs/gateway.err.log
tail -f ~/.openclaw/logs/n8n.log

# Test agent response via CLI
openclaw agent --agent main --channel slack --message "test" --json

# Upgrade OpenClaw CLI
npm update -g openclaw
bash scripts/patch-pairing-reply.sh  # restore custom pairing reply after upgrade

# Check Ollama models (hatake only)
curl -s http://127.0.0.1:11434/api/tags | python3 -c "import json,sys; [print(m['name']) for m in json.load(sys.stdin)['models']]"

# Seed episodes.jsonl manually
python3 ~/.openclaw/workspace/scripts/seed-episodes.py

# Test n8n webhook
curl -s -X POST http://localhost:5678/webhook/echo-test \
  -H "Content-Type: application/json" -d '{"agent":"claude"}'
```

## Architecture

### The 8 Agents

| ID | Name/Role | Primary Model | Telegram Bot |
|---|---|---|---|
| `main` | RED (CEO) — orchestrator, Telegram approvals | 9router/free-unlimited | @RedinsideBot |
| `allrounder` | ZEN (CSO) — general assistant | 9router/free-unlimited | @ZenRedBot |
| `hatake` | HATAKE — internal intent parser | ollama/qwen2.5-coder:7b | *(internal only)* |
| `eng` | ENG — code & architecture | 9router/free-unlimited | @ENG_BOT |
| `research` | RESEARCH — analysis | 9router/free-unlimited | @RESEARCH_BOT |
| `finance` | FINANCE — financial analysis | 9router/free-unlimited | @FINANCE_BOT |
| `ops` | OPS — monitoring, SLA, health | 9router/free-unlimited | @OPS_BOT |
| `infosec` | INFOSEC — security, L3 approvals | 9router/free-unlimited | @INFOSECRED_BOT |

**Fallback chain (all except hatake):** `9router/free-unlimited` → `9router/heartbeat-cheap` → `openai-codex/gpt-5.2`

Hierarchy: RED → ZEN; ENG, RESEARCH, FINANCE, OPS, INFOSEC, HATAKE report to RED.

### Model Providers

| Provider | Models | Cost | Notes |
|---|---|---|---|
| 9Router (port 20128) | free-unlimited, heartbeat-cheap | $0 | Primary for all agents |
| openai-codex | gpt-5.2 | Subscription | Fallback only |
| Ollama (port 11434) | qwen2.5-coder:7b | $0 | HATAKE only |
| Perplexity | sonar-pro | Subscription | RESEARCH explicit calls |
| ZAI | glm-4.7, glm-4.7-flashx | PAYG | **Never use in crons or fallbacks** |

### Request Flow

```
User message (Telegram / Slack / DM)
  → OpenClaw native plugin (botToken → agentId)
  → Agent session (context pruning, memory-core plugin)
  → 9Router model call with auto-failover
  → Response back to channel
  → LLM Analytics plugin → workspace/logs/*.jsonl
```

### Bounded Autonomy (L0–L5)

```
L0 read-only          → auto-approve
L1 safe-write         → auto-approve
L2 reversible-change  → auto-approve
L3 infra/sensitive    → INFOSEC A2A review (120s timeout)
L4 external/money     → Telegram approval (10 min window)
L5 critical/irrevers. → Telegram approval (30 min window)
```

Defined in: `workspace/skills/maker-checker/SKILL.md`

### Skills System

Skills are declarative `SKILL.md` files in `workspace/skills/` — no code. OpenClaw applies them during execution. 65 total skills (31 ready / 34 missing optional deps). Enable in `openclaw.json` under `skills.entries`.

### Cron Jobs

115 cron definitions in `cron/jobs.json` — **30 enabled / 85 disabled**. Reduced from 110 active via event-driven migration (2026-03-02). **Never hardcode `model` in cron payloads** — omit it and let agent defaults apply. Runs logged to `workspace/logs/`.

### n8n Webhook Delegation

n8n runs on port 5678 (launchd `ai.openclaw.n8n`). Agents call webhook URLs for credential-isolated external API calls. See `workspace/skills/n8n-webhooks/SKILL.md`.

### Mission Control Dashboard

Port 19000 — basic auth `red` / `redos2026`. launchd managed (`ai.openclaw.dashboard`). Key endpoints: `/api/pipeline`, `/api/analytics`, `/api/agents`, `/api/tickets`, `/api/search`.

## Key Files

| File | Purpose |
|---|---|
| `openclaw.json` | Master runtime config — **Never commit** |
| `cron/jobs.json` | 115 cron definitions (30 enabled / 85 disabled) |
| `workspace/SOUL.md` | Company OS — injected into every agent session |
| `workspace/MEMORY.md` | Curated long-term memory |
| `workspace/GOALS.md` | Active company goals (RED only writes) |
| `workspace/STATE.yaml` | Live shared state (sprint, pipelines, metrics) |
| `workspace/AUTONOMOUS.md` | Agent task queue |
| `workspace/config/budget-guardrails.json` | Per-agent cost limits |
| `workspace/ops/TICKET-TRACKER.md` | Issue tracking |
| `workspace/ops/LEARNINGS.md` | Institutional knowledge |
| `workspace/scripts/seed-episodes.py` | Seeds episodes.jsonl from cron state |
| `identity/device.json` | Ed25519 keypair — **NEVER delete** |

## Authentication (Must Stay in Sync)

Three files must carry the same `OPENCLAW_GATEWAY_TOKEN`:
1. `openclaw.json` → `gateway.auth.token`
2. `~/Library/LaunchAgents/ai.openclaw.gateway.plist` → `OPENCLAW_GATEWAY_TOKEN`
3. `~/.zshrc` → `export OPENCLAW_GATEWAY_TOKEN=...`

## Critical Rules

- **Never edit** `/opt/homebrew/lib/node_modules/openclaw/dist/`
- **Never commit** `openclaw.json`, `identity/`, `devices/`, `credentials/`, `workspace/config/n8n-api-key.txt`
- **Never delete** `identity/device.json` — cannot be regenerated
- **Run `openclaw doctor`** after any `openclaw.json` change — schema is strict
- **Never hardcode `model` in cron payloads** — omit field, use agent defaults
- **Never use PAYG models** (zai) in crons or fallback chains
- **L4/L5 actions require Telegram approval** before execution
- **Secrets:** only in n8n credential store or env; never in skills or committed files
- After significant changes: update `workspace/MEMORY.md` and commit

## Git Identity

```
user.name = anuragg-saxenaa
user.email = anuragg.saxenaa@gmail.com
```

Gitignored: `openclaw.json`, `identity/`, `devices/`, `credentials/`, `logs/`, `workspace/config/n8n-api-key.txt`, `*.plist`
