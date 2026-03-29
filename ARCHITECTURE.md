# RedOS Architecture

> Last updated: 2026-03-29

## Overview

RedOS is an autonomous AI company built on top of the **OpenClaw CLI** runtime. It consists of 8 AI agents with distinct roles, running 24/7 on a Mac mini, communicating via Telegram, Slack, and internal A2A calls.

## Two-Layer Design

```
┌─────────────────────────────────────────────────────────┐
│  RedOS  (~/.openclaw/)                                  │
│  Agent identities, skills, crons, workspace, config     │
└───────────────────┬─────────────────────────────────────┘
                    │ uses
┌───────────────────▼─────────────────────────────────────┐
│  OpenClaw CLI  (/opt/homebrew/lib/node_modules/openclaw/)│
│  Runtime, gateway, sessions, exec sandbox               │
│  ⛔ Never edit dist/ files                              │
└─────────────────────────────────────────────────────────┘
```

## Agent Hierarchy

```
              RED (main) — CEO, orchestrator
             /    \      \      \      \
           ZEN    ENG   OPS  FINANCE RESEARCH
        (allrounder)              \
                                INFOSEC
                    HATAKE (internal intent parser)
```

| Agent | ID | Telegram Bot | Role |
|---|---|---|---|
| RED | main | @RedinsideBot | CEO — orchestration, approvals, strategy |
| ZEN | allrounder | @ZenRedBot | CSO — general assistant |
| ENG | eng | @ENG_BOT | Engineering, OSS PRs, coding factory |
| RESEARCH | research | @RESEARCHRED_BOT | Analysis, competitive intel |
| FINANCE | finance | @FINANCE_BOT | Financial analysis |
| OPS | ops | @OPSRED_BOT | Monitoring, SLA, health |
| INFOSEC | infosec | @INFOSECRED_BOT | Security, L3 approvals |
| HATAKE | hatake | *(internal)* | Intent parsing |

## Request Flow

```
User (Telegram/Slack)
  → OpenClaw native plugin (botToken → agentId)
  → Agent session (context pruning, memory-core plugin)
  → 9Router :20128 (free-unlimited → cc/claude-sonnet-4-6 → always-on-premium)
  → LLM response
  → Back to channel
  → LLM Analytics plugin → workspace/logs/*.jsonl
```

## Model Routing

| Route | Model | Cost | Use |
|---|---|---|---|
| `9router/free-unlimited` | Auto-selected free | $0 | Primary for all agents |
| `9router/cc/claude-sonnet-4-6` | Claude Sonnet 4.6 | Subscription | Fallback 1 |
| `9router/always-on-premium` | Premium fallback | PAYG | Fallback 2 |
| `openai-codex/gpt-5.2` | GPT-5.2 | Subscription | Last resort fallback |

> ⛔ `openrouter/auto` is BANNED — OpenRouter free key exhausted (403 as of 2026-03-29)
> ⛔ ZAI models (zai/glm-*) — PAYG, never use in crons or fallback chains

## Coding Factory (3 Pipelines)

```
Pipeline 1: RESEARCH → ENG
  RESEARCH writes SPEC.md → ENG implements → creates repo → opens PR
  Crons: inner-loop-research-0001 (3h), inner-loop-eng-0001 (4h)

Pipeline 2: Daily OSS Contributor
  Cron: oss-contributor-0001 (daily 11am ET)
  ENG picks daily repo, fixes one issue, opens PR
  Schedule: 9router(Mon/Sun), everything-claude-code(Tue), eko(Wed),
            llm-functions(Thu), LiteMultiAgent(Fri), open-computer-use(Sat)

Pipeline 3: On-Demand (RED → ENG)
  User → Telegram → RED → AUTONOMOUS.md task → ENG picks up → PR opened
```

## Autonomy Levels (L0–L5)

```
L0  read-only          → auto-approve
L1  safe-write         → auto-approve
L2  reversible-change  → auto-approve
L3  infra/sensitive    → INFOSEC A2A review (120s timeout)
L4  external/money     → Telegram approval (10 min window)
L5  critical/irrevers. → Telegram approval (30 min window)
```

## Exec Security

- All agents: `security: allowlist`, `ask: off`
- `ask: off` = immediate approve if on allowlist, immediate deny if not (no human wait)
- **Never set `ask: on-miss`** — causes 120s hang on every unrecognized command → all agents stall
- Config: `~/.openclaw/exec-approvals.json` (gitignored)

## Infrastructure

| Service | Port | Managed by |
|---|---|---|
| OpenClaw gateway | 18789 | launchd `ai.openclaw.gateway` |
| Mission Control dashboard | 19000 | launchd `ai.openclaw.dashboard` |
| n8n automation | 5678 | launchd `ai.openclaw.n8n` |
| 9Router LLM proxy | 20128 | launchd `ai.openclaw.9router` |
| Cloudflared tunnel | — | launchd `ai.openclaw.cloudflared` |

## Key Files

| File | Purpose |
|---|---|
| `openclaw.json` | Master runtime config — **gitignored, never commit** |
| `cron/jobs.json` | 82 cron definitions |
| `exec-approvals.json` | Exec allowlist per agent — **gitignored** |
| `workspace/SOUL.md` | Company OS — injected into every agent |
| `workspace/MEMORY.md` | Long-term shared memory |
| `workspace/AUTONOMOUS.md` | Agent task queue |
| `workspace/STATE.yaml` | Live shared state |
| `workspace/GOALS.md` | Company goals (RED writes) |
| `workspace/ops/TICKET-TRACKER.md` | Incident log |
| `identity/device.json` | Ed25519 keypair — **NEVER delete** |

## Authentication Sync Rule

Three files must carry the same `OPENCLAW_GATEWAY_TOKEN`:
1. `openclaw.json` → `gateway.auth.token`
2. `~/Library/LaunchAgents/ai.openclaw.gateway.plist` → env var
3. `~/.zshrc` → `export OPENCLAW_GATEWAY_TOKEN=...`

## Restart & Diagnosis

```bash
# Full stack restart
bash ~/.openclaw/scripts/redos-restart.sh

# Status only
bash ~/.openclaw/scripts/redos-restart.sh --status

# Validate config (always run before restart)
openclaw doctor

# Live logs
tail -f ~/.openclaw/logs/gateway.log
tail -f ~/.openclaw/logs/gateway.err.log

# Test agent
openclaw agent --agent main --channel slack --message "hi" --json
```

## Diagnosis Checklist (when something breaks)

1. `wc -c ~/.openclaw/openclaw.json` — if 0, restore from backup
2. Check `exec-approvals.json` — `ask` must be `off` for all agents, not `on-miss`
3. Session bloat? `wc -c ~/.openclaw/agents/main/sessions/sessions.json` — if >300KB, clear telegram session key
4. Gateway up? `curl http://localhost:18789/health`
5. 9Router up? `curl http://localhost:20128/health`
6. Model correct? `primary: 9router/free-unlimited` (never `openrouter/auto`)
