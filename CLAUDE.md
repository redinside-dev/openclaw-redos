# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Persistence

**Never lose context!** Claude Code automatically saves sessions. After crashes or terminal closes:

```bash
# Resume last session (keeps all context)
~/.local/bin/claude --resume

# Or just run claude - it often auto-resumes
~/.local/bin/claude
```

Your conversation history, context, and work state are preserved automatically.

## What This Repo Is

**OpenClaw RedOS** — custom business logic, agent identities, skills, and orchestration built on top of the OpenClaw CLI runtime. This is the git repo (`https://github.com/redinside-dev/openclaw-redos.git`).

Two distinct layers:
- **OpenClaw CLI** at `/opt/homebrew/lib/node_modules/openclaw/` — compiled Node.js runtime by Anthropic. **Never edit its `dist/` files.**
- **RedOS** at `/Users/redinside/.openclaw/` — this repo. All customizations live here.

## Common Commands

```bash
# ── SINGLE COMMAND to restart the full stack after any config change ──
bash ~/.openclaw/scripts/redos-restart.sh

# Check stack status (no restart)
bash ~/.openclaw/scripts/redos-restart.sh --status

# On Mac Mini boot: NOTHING needed — all services auto-start via launchd:
#   Ollama:    homebrew.mxcl.ollama   (brew manages this)
#   Gateway:   ai.openclaw.node + ai.openclaw.gateway
#   Dashboard: ai.openclaw.dashboard
#   9Router:   ai.openclaw.9router (after running setup-eng-tools.sh once)

# Check system status (OpenClaw native)
openclaw status
openclaw status --deep

# Validate config changes
openclaw doctor

# Live gateway logs
tail -f ~/.openclaw/logs/gateway.log
tail -f ~/.openclaw/logs/gateway.err.log

# Test agent response via CLI
openclaw agent --agent main --channel slack --message "test" --json

# Start Mission Control dashboard (port 19000)
node /Users/redinside/.openclaw/dashboard/server.js

# Check available Ollama models
curl -s http://127.0.0.1:11434/api/tags | python3 -c "import json,sys; [print(m['name']) for m in json.load(sys.stdin)['models']]"

# Upgrade OpenClaw CLI (then restart gateway)
npm update -g openclaw

# After any OpenClaw upgrade — restore custom pairing reply text
bash scripts/patch-pairing-reply.sh
```

## Architecture

### The 8 Agents

| ID | Name/Role | Primary Model | Telegram Bot |
|---|---|---|---|
| `main` | RED (CEO) — orchestrator | openai-codex/gpt-5.2 | @RedinsideBot |
| `allrounder` | ZEN (CSO) — general assistant | openai-codex/gpt-5.2 | @ZenRedBot |
| `hatake` | HATAKE — internal intent parser | ollama/qwen2.5-coder:7b | *(internal only)* |
| `eng` | ENG — code & architecture | openai-codex/gpt-5.2 | @ENG_BOT |
| `research` | RESEARCH — analysis | openai-codex/gpt-5.2 | @RESEARCH_BOT |
| `finance` | FINANCE — financial analysis | openai-codex/gpt-5.2 | @FINANCE_BOT |
| `ops` | OPS — monitoring, QA | ollama/llama3.1:8b | @OPS_BOT |
| `infosec` | INFOSEC — security | openai-codex/gpt-5.2 | @INFOSECRED_BOT |

Hierarchy: RED → ZEN (+ HATAKE under ZEN); ENG, RESEARCH, FINANCE, OPS, INFOSEC all report to RED.

### Model Providers

| Provider | Models | Cost |
|---|---|---|
| Ollama (local, port 11434) | llama3.1:8b, qwen2.5-coder:7b, gpt-oss:20b | $0 |
| openai-codex | gpt-5.2 | Subscription |
| zai | glm-4.7, glm-4.7-flashx | PAYG — **never use in crons** |
| perplexity | sonar-pro | Subscription |

### Request Flow

```
User message (Telegram / Slack / DM)
  → OpenClaw native plugin (matches botToken → agentId)
  → Agent session (context pruning, 1h TTL, 30m heartbeat)
  → Model call with fallback chain (primary → moonshot → zai)
  → Response streamed back to channel
  → LLM Analytics plugin writes workspace/logs/*.jsonl
```

Complex tasks additionally route through:
```
HATAKE Parser (intent + complexity score 1–10)
  → Ed/RED Orchestrator (plan → delegate to specialists)
  → Resilient Handler (3-retry, never-crash)
  → Smart Router V2 (model scoring + budget gate)
  → OPS gate validation → assembled response
```

### Skills System

Skills are declarative `SKILL.md` files in `workspace/skills/` — no code. OpenClaw's runtime applies them during agent execution. Add a skill by creating a new directory with a `SKILL.md`, then enable it in `openclaw.json` under `skills.entries`.

### Cron Jobs

All cron definitions live in `cron/jobs.json` (schedules, agents, prompts). Runs logged to `cron/runs/`. OPS agent runs health checks every ~17 minutes; standups fire daily at 9:05–9:15am ET.

### Mission Control Dashboard

Port 19000 — basic auth `red` / `redos2026`. Not in launchd; must start manually after reboots. Exposed via Cloudflare quick tunnel (URL in `workspace/DASHBOARD_URL.txt`). Key endpoints: `/api/pipeline`, `/api/analytics`, `/api/agents`, `/api/tickets`, `/api/standups`.

## Key Files

| File | Purpose |
|---|---|
| `openclaw.json` | Master runtime config — models, agents, channels, auth. **Never commit.** |
| `cron/jobs.json` | All cron job definitions |
| `workspace/SOUL.md` | Shared system prompt for all agents (personality, delegation, A2A protocol) |
| `KNOWLEDGEBASE.md` | Full system documentation |
| `workspace/MEMORY.md` | Curated long-term memory |
| `workspace/config/model-registry.json` | Available models + scoring weights |
| `workspace/config/budget-guardrails.json` | Per-agent cost limits |
| `workspace/ops/TICKET-TRACKER.md` | Issue tracking |
| `workspace/ops/LEARNINGS.md` | Institutional knowledge — read before complex tasks |
| `identity/device.json` | Ed25519 keypair — **NEVER delete, cannot be regenerated** |

## Authentication (Must Stay in Sync)

Three files must all carry the same `OPENCLAW_GATEWAY_TOKEN` value (check `~/.zshrc` for the actual value — never commit it), or gateway auth fails:
1. `openclaw.json` → `gateway.auth.token`
2. `~/Library/LaunchAgents/ai.openclaw.gateway.plist` → `OPENCLAW_GATEWAY_TOKEN`
3. `~/.zshrc` → `export OPENCLAW_GATEWAY_TOKEN=...`

## Critical Rules

- **Never edit** `/opt/homebrew/lib/node_modules/openclaw/dist/` — it's the compiled runtime.
- **Never hard-code PAYG models** (zai, openrouter) in cron jobs or fallback chains — Ollama is free and preferred.
- **Run `openclaw doctor` after any `openclaw.json` change** — the schema is strict; unknown keys will cause errors.
- **After `openclaw devices rotate`** — manually sync the new token to `identity/device-auth.json`.
- **After any OpenClaw CLI upgrade** — re-run `scripts/patch-pairing-reply.sh` to restore custom pairing reply text.
- **Self-improvement cron risk** — the RED agent may autonomously modify `openclaw.json`. Audit periodically for unauthorized entries.
- After significant changes, update `KNOWLEDGEBASE.md` and `workspace/MEMORY.md`.

## Git Identity

```
user.name = anuragg-saxenaa
user.email = anuragg.saxenaa@gmail.com
```

`openclaw.json`, `identity/`, `devices/`, `credentials/`, `logs/`, `memory/*.sqlite`, and `*.plist` are gitignored (they contain secrets or binary state).
