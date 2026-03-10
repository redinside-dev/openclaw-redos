# OpenClaw RedOS

**RedOS** is a custom AI operating system — business logic, agent identities, skills, and orchestration — built on top of the [OpenClaw](https://openclaw.ai) CLI runtime.

Two distinct layers:
- **OpenClaw CLI** at `/opt/homebrew/lib/node_modules/openclaw/` — compiled Node.js runtime. **Never edit `dist/` files.**
- **RedOS** at `~/.openclaw/` — this repo. All customizations live here.

---

## Quick Start

```bash
# Restart full stack after any config change
bash ~/.openclaw/scripts/redos-restart.sh

# Check status without restarting
bash ~/.openclaw/scripts/redos-restart.sh --status

# Validate config (run before every restart)
openclaw doctor

# Test an agent
openclaw agent --agent main --channel slack --message "test" --json
```

---

## Architecture

### The 8 Agents

| ID | Name / Role | Telegram Bot |
|---|---|---|
| `main` | **RED** (CEO) — orchestrator, Telegram approvals | @RedinsideBot |
| `allrounder` | **ZEN** (COO) — general assistant, cross-functional | @ZenRedBot |
| `eng` | **ENG** — code, APIs, infrastructure | @ENGRED_BOT |
| `research` | **RESEARCH** — market & competitive intelligence | @RESEARCHRED_BOT |
| `finance` | **FINANCE** (CFO) — portfolio, cost tracking | @FINANCERED_BOT |
| `ops` | **OPS** — cron, health monitoring, SLA | @OPSRED_BOT |
| `infosec` | **INFOSEC** — security, L3 approvals | @INFOSECRED_BOT |
| `hatake` | **HATAKE** — internal intent parser (no channel) | *(internal only)* |

**Hierarchy:** RED → ZEN; ENG, RESEARCH, FINANCE, OPS, INFOSEC, HATAKE all report to RED.

**Fallback chain (all except hatake):**
```
9router/free-unlimited → minimax/MiniMax-M2.5 → 9router/cx/gpt-5.3-codex
```

### Model Providers

| Provider | Port | Models | Cost | Notes |
|---|---|---|---|---|
| 9Router | 20128 | free-unlimited, heartbeat-cheap | $0 | Primary for all agents |
| Minimax | — | MiniMax-M2.5 | PAYG | Fallback #1 |
| OpenAI Codex | — | gpt-5.3-codex | Subscription | Fallback #2 |
| Ollama | 11434 | qwen3.5:4b | $0 | Local, OPS fallback |
| Perplexity | — | sonar-pro | Subscription | RESEARCH web_search only |
| ZAI | — | glm-4.7, glm-4.7-flashx | PAYG | **Never use in crons or fallbacks** |

### Request Flow

```
User message (Telegram / Slack)
  → OpenClaw channel plugin (botToken → agentId)
  → Agent session (context pruning, memory-core plugin)
  → 9Router model call with auto-failover
  → Response back to channel
  → LLM Analytics plugin → workspace/logs/*.jsonl
```

### Bounded Autonomy (L0–L5)

Agents operate within a tiered approval system:

| Level | Scope | Approval |
|---|---|---|
| L0 | Read-only | Auto-approve |
| L1 | Safe writes | Auto-approve |
| L2 | Reversible changes | Auto-approve |
| L3 | Infra / sensitive | INFOSEC A2A review (120s timeout) |
| L4 | External / money | Telegram approval (10 min window) |
| L5 | Critical / irreversible | Telegram approval (30 min window) |

Defined in: `workspace/skills/maker-checker/SKILL.md`

### Skills System

Skills are declarative `SKILL.md` files in `workspace/skills/` — no code. OpenClaw applies them during execution.

- **65 total skills** (31 ready / 34 missing optional deps)
- Enable in `openclaw.json` under `skills.entries`

### Cron Jobs

`cron/jobs.json` — 115 definitions, **30 enabled / 85 disabled**.

- **Never hardcode `model` in cron payloads** — omit the field, let agent defaults apply
- Runs logged to `workspace/logs/`

### n8n Webhook Delegation

n8n runs on port `5678` (launchd `ai.openclaw.n8n`). Agents call webhook URLs for credential-isolated external API calls.

See: `workspace/skills/n8n-webhooks/SKILL.md`

### Mission Control Dashboard

- URL: `http://localhost:19000`
- Auth: `red` / `redos2026`
- Managed by: launchd `ai.openclaw.dashboard`
- Key endpoints: `/api/pipeline`, `/api/analytics`, `/api/agents`, `/api/tickets`, `/api/search`

---

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
| `agents/autonomous-worker-v2.js` | Autonomous task worker |
| `scripts/redos-restart.sh` | Full stack restart script |
| `workspace-website-agency/` | Ontario Website Agency automation |

---

## Services & Ports

| Service | Port | launchd Label |
|---|---|---|
| OpenClaw Gateway | 18789 | `ai.openclaw.gateway` |
| Mission Control Dashboard | 19000 | `ai.openclaw.dashboard` |
| n8n Workflow Engine | 5678 | `ai.openclaw.n8n` |
| 9Router (model proxy) | 20128 | `com.9router.autostart` |
| Ollama (local LLM) | 11434 | `homebrew.mxcl.ollama` |
| Browser Control | 18791 | *(gateway subprocess)* |

---

## Authentication

Three places must carry the same `OPENCLAW_GATEWAY_TOKEN`:
1. `openclaw.json` → `gateway.auth.token`
2. `~/Library/LaunchAgents/ai.openclaw.gateway.plist` → `OPENCLAW_GATEWAY_TOKEN`
3. `~/.zprofile` → `export OPENCLAW_GATEWAY_TOKEN=...`

Also required in `~/.zprofile`:
```bash
export OPENCLAW_GATEWAY_URL="http://127.0.0.1:18789"
```

---

## Common Commands

```bash
# Live logs
tail -f ~/.openclaw/logs/gateway.log
tail -f ~/.openclaw/logs/gateway.err.log
tail -f ~/.openclaw/logs/n8n.log

# Full diagnosis
openclaw doctor
openclaw doctor --fix

# Check Ollama models
curl -s http://127.0.0.1:11434/api/tags | python3 -c "import json,sys; [print(m['name']) for m in json.load(sys.stdin)['models']]"

# Upgrade OpenClaw CLI
npm update -g openclaw
bash scripts/patch-pairing-reply.sh  # restore custom pairing reply after upgrade

# Seed episodes.jsonl manually
python3 ~/.openclaw/workspace/scripts/seed-episodes.py

# Test n8n webhook
curl -s -X POST http://localhost:5678/webhook/echo-test \
  -H "Content-Type: application/json" -d '{"agent":"claude"}'
```

---

## Critical Rules

- **Never edit** `/opt/homebrew/lib/node_modules/openclaw/dist/`
- **Never commit** `openclaw.json`, `identity/`, `devices/`, `credentials/`, `*.plist`
- **Never delete** `identity/device.json` — the Ed25519 keypair cannot be regenerated
- **Run `openclaw doctor`** after any `openclaw.json` change — schema is strict
- **Never hardcode `model`** in cron payloads — omit it, use agent defaults
- **Never use ZAI (PAYG)** in crons or fallback chains
- **L4/L5 actions require Telegram approval** before execution
- **Secrets** belong only in n8n credential store or env vars — never in skills or committed files

---

## Git Identity

```
user.name  = anuragg-saxenaa
user.email = anuragg.saxenaa@gmail.com
```

**Gitignored:** `openclaw.json`, `identity/`, `devices/`, `credentials/`, `logs/`, `*.plist`, `memory/*.sqlite`, `.memsearch/qdrant/`
