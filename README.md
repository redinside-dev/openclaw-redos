# OpenClaw RedOS

> Autonomous AI company running on OpenClaw CLI — 8 specialized agents, A2A delegation working, two revenue streams, zero humans in the loop.

**Owner:** [anuragg-saxenaa](https://github.com/anuragg-saxenaa) · **Infra:** [redinside-dev](https://github.com/redinside-dev) · **Platform:** macOS (Darwin 25) · **Updated:** 2026-03-22

---

## What This Is

RedOS is a custom business operating system built on the [OpenClaw](https://github.com/decolua/9router) runtime. It runs a team of 8 autonomous AI agents that:

- Ship open-source developer tools to GitHub daily
- Find real Ontario businesses without websites and pitch them
- Make OSS contributions to world-class agentic AI projects daily
- Monitor themselves, file tickets, and self-heal

Two distinct layers:
- **OpenClaw CLI** at `/opt/homebrew/lib/node_modules/openclaw/` — compiled runtime. Never edit.
- **RedOS** at `~/.openclaw/` — this repo. All business logic lives here.

---

## Agent Hierarchy

```
                        ┌─────────────────────┐
                        │   RED (main/CEO)     │
                        │  Orchestrator        │
                        │  Telegram approvals  │
                        │  @RedinsideBot       │
                        └──────────┬──────────┘
                                   │ commands
                        ┌──────────▼──────────┐
                        │   ZEN (allrounder)   │
                        │   COO / CSO          │
                        │   Cross-functional   │
                        │   @ZenRedBot         │
                        └──────────┬──────────┘
                                   │ delegates to
          ┌──────────┬─────────────┼──────────────┬──────────┬──────────┐
          ▼          ▼             ▼              ▼          ▼          ▼
   ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐
   │   ENG    │ │RESEARCH │ │ FINANCE  │ │   OPS    │ │INFOSEC │ │ HATAKE  │
   │ Code &   │ │ Market  │ │ CFO/Cost │ │ Monitor  │ │Security│ │ Intent  │
   │ Infra    │ │ Intel   │ │ Tracking │ │ SLA      │ │ L3     │ │ Parser  │
   │@ENGRED   │ │@RESEARCH│ │@FINANCE  │ │ @OPSRED  │ │@INFOSEC│ │internal │
   └──────────┘ └─────────┘ └──────────┘ └──────────┘ └────────┘ └─────────┘
```

---

## Request Flow

```
User (Telegram / Slack)
        │
        ▼
OpenClaw channel plugin
  (botToken → agentId lookup)
        │
        ▼
Agent session created
  ├── Context pruning
  ├── memory-core plugin (injects SOUL.md + working memory)
  └── Skills loaded (65 total, 31 active)
        │
        ▼
9Router model call  ──fail──▶  9router/heartbeat-cheap  ──fail──▶  openai-codex/gpt-5.2
  (free-unlimited)
        │ success
        ▼
Response → channel
        │
        ▼
LLM Analytics plugin
  └── workspace/logs/*.jsonl
```

---

## Full Autonomy Loop

```
Every 3h: RESEARCH inner loop
  │
  ├── Read twitter-feed.md + reddit-feed.md + ideas-index.json  ← live signal
  ├── web_search("github trending AI tools today")
  ├── Pick highest-scored unshipped pain point (with source URL)
  ├── Write workspace/projects/<slug>/SPEC.md
  ├── Add row to backlog.md (Status=READY)
  └── sessions_spawn → ENG
          │
          ▼
     ENG inner loop (every 4h)
          │
          ├── Read backlog.md → pick first READY project
          ├── GH_TOKEN=$ANURAGG_TOKEN gh repo create anuragg-saxenaa/<slug>
          ├── Implement MVP from SPEC.md
          ├── Add GitHub Actions CI (.github/workflows/ci.yml)
          ├── git push → GitHub
          ├── Update backlog.md (Status=SHIPPED)
          └── Post to Slack #redos-eng

Daily 11am Toronto: OSS Contributor
  │
  ├── Pick today's target (Mon=9router Tue=eko Wed=llm-functions Thu=LiteMultiAgent Fri=open-computer-use)
  ├── gh issue list → pick concrete fixable issue
  ├── Fork as anuragg-saxenaa
  ├── Implement fix
  ├── git push → anuragg-saxenaa/<repo>
  ├── Open PR via REST API  ← attributed to anuragg-saxenaa
  └── Log to pr-log.md + Slack #redos-eng
```

---

## Website Agency Pipeline

```
Daily 9am: lead_generator.py
  │  Overpass API (free, OpenStreetMap)
  │  Finds Ontario businesses missing "website" tag
  ▼
leads.json  (real names, addresses, lat/lon, OSM IDs)
  │
  ▼ Every 4h: website_auditor.py
audits.json  (grade A–F, speed, mobile, SEO)
  │
  ▼ Every 2h: website_builder.py
sites/<slug>.html  (generated landing page demo)
  │
  ▼ Every 3h: send_outreach.py
SMS / email → business owner
  │
  ▼ 10am / 2pm / 6pm: voice_followup.py
AI voice call follow-up
```

---

## Bounded Autonomy (L0–L5)

```
L0  read-only          ──▶  auto-approve
L1  safe-write         ──▶  auto-approve
L2  reversible-change  ──▶  auto-approve
L3  infra/sensitive    ──▶  INFOSEC A2A review (120s timeout)
L4  external/money     ──▶  Telegram approval → RED (10 min window)
L5  critical/irrevers. ──▶  Telegram approval → RED (30 min window)
```

---

## Model Providers

| Provider | Port | Models | Cost | Usage |
|----------|------|--------|------|-------|
| 9Router | 20128 | `free-unlimited`, `heartbeat-cheap` | $0 | Primary — all agents |
| openai-codex | — | `gpt-5.2` | Subscription | Final fallback only |
| Perplexity | — | `sonar-pro` | Subscription | RESEARCH explicit calls |
| ZAI | — | `glm-4.7`, `glm-4.7-flashx` | PAYG | **Never in crons/fallbacks** |

---

## Open Source Projects (GOAL-007)

Target: 10 public GitHub repos shipped by 2026-05-05. All repos have GitHub Actions CI. OSS contributions made daily as `anuragg-saxenaa`.

| # | Project | Status | Stack | GitHub |
|---|---------|--------|-------|--------|
| 1 | `costwatch` | 🔨 Building | Node.js, Express | — |
| 2 | `redos-website` | 🔨 Building | Next.js, TypeScript | — |
| 3 | `codebase-onboarding-agent` | ✅ Shipped | Python, AST, CLI | [repo](https://github.com/anuragg-saxenaa/codebase-onboarding-agent) |
| 4 | `a2a-protocol` | ✅ Shipped | TypeScript, WebSockets | [repo](https://github.com/anuragg-saxenaa/a2a-protocol) |
| 5 | `pr-auto-reviewer` | ✅ Shipped | Python, GitHub API | [repo](https://github.com/anuragg-saxenaa/pr-auto-reviewer) |
| 6 | `agent-loop-detection` | ✅ Shipped | Node.js | [repo](https://github.com/anuragg-saxenaa/agent-loop-detection) |
| 7 | `session-memory` | ✅ Shipped | TypeScript, Express | [repo](https://github.com/anuragg-saxenaa/session-memory) |
| 8 | `llm-gateway-proxy` | ✅ Shipped | Node.js, SQLite | [repo](https://github.com/anuragg-saxenaa/llm-gateway-proxy) |
| 9 | `agent-eval-harness` | ✅ Shipped | Python, YAML, CLI | [repo](https://github.com/anuragg-saxenaa/agent-eval-harness) |
| 10 | `context-window-optimizer` | ✅ Shipped | Python, tiktoken | [repo](https://github.com/anuragg-saxenaa/context-window-optimizer) |
| 11 | `llm-observability-hub` | ✅ Shipped | FastAPI, SQLite | [repo](https://github.com/anuragg-saxenaa/llm-observability-hub) |

---

## Daily OSS Contributions

Contributing to world-class agentic AI repos daily as **`anuragg-saxenaa`**:

| Day | Repo | Stars | Focus |
|-----|------|-------|-------|
| Mon | [decolua/9router](https://github.com/decolua/9router) | 909 | Our AI gateway — direct stakeholder |
| Tue | [FellouAI/eko](https://github.com/FellouAI/eko) | 4894 | Top agentic framework |
| Wed | [sigoden/llm-functions](https://github.com/sigoden/llm-functions) | 718 | LLM tool functions |
| Thu | [PathOnAIOrg/LiteMultiAgent](https://github.com/PathOnAIOrg/LiteMultiAgent) | 102 | Multi-agent framework |
| Fri | [coasty-ai/open-computer-use](https://github.com/coasty-ai/open-computer-use) | 372 | Computer use agent |
| Sat/Sun | [decolua/9router](https://github.com/decolua/9router) | 909 | 106 open issues |

Recent contributions: [pr-log.md](workspace/projects/pr-log.md)

---

## Agent-to-Agent (A2A) — Working as of 2026-03-21

All 8 agents can spawn each other via `sessions_spawn`. CEO runs `a2a-daily-proactive-0001` (10am ET weekdays) to delegate tasks automatically. Escalations that can't reach RED synchronously are written to the async inbox (`workspace-main/inbox/tasks.md`) and processed on the next heartbeat.

---

## Autonomous Coding Factory (decolua/9router)

CEO labels a GitHub issue `factory-ready` → fully autonomous pipeline:

```
CEO labels issue "factory-ready" on decolua/9router
        ↓
OpenClaw cron (every 15min) → ENG runs factory --once
        ↓
IssueWatcher claims issue, creates git worktree
        ↓
Claude Code agent implements fix (up to 10 min)
        ↓
Self-heals CI failures (up to 3 retries)
        ↓
Opens PR: anuragg-saxenaa/9router → decolua/9router
        ↓
Posts result to Slack #redos-eng
```

**Label an issue to queue it:**
```bash
GH_TOKEN=$ANURAGG_TOKEN gh issue edit <number> --repo decolua/9router --add-label factory-ready
```

**Config:** `~/Development/Codebase/projects/RedTeam/github/redteam-coding-factory/factory-9router.config.json`

---

## Self-Healing Layer (LLM-independent)

Two bash scripts run via system crontab, independent of OpenClaw/LLM — they fix things even when the whole AI stack is down:

| Script | Frequency | What it fixes |
|--------|-----------|---------------|
| `scripts/autonomous-healer.sh` | every 5 min | 9Router down → restart via launchd; Gateway down → restart; Codex tokens expired → auto-refresh; stale IN_PROGRESS tasks → reset to PENDING; factory not run in 20min → trigger |
| `scripts/agent-self-healer.sh` | every 15 min | Missing workspace files → create stubs; stuck consultant daemons → kill; bloated session files (>2MB) → clear; cron with >5 consecutive errors → alert |

Install (run once on a new machine):
```bash
(crontab -l; echo "*/5 * * * * bash ~/.openclaw/scripts/autonomous-healer.sh >> ~/.openclaw/logs/healer.log 2>&1") | crontab -
(crontab -l; echo "*/15 * * * * bash ~/.openclaw/scripts/agent-self-healer.sh >> ~/.openclaw/logs/agent-healer.log 2>&1") | crontab -
```

---

## Cron Schedule (active)

| Cron ID | Agent | Schedule (Toronto) | Purpose |
|---------|-------|-------------------|---------|
| `telegram-approval-monitor-0001` | RED | every 2 min | Watch approve/deny replies |
| `system-pulse-always-on-0001` | OPS | every 5 min | Health heartbeat |
| `inner-loop-research-0001` | RESEARCH | every 3h at :30 | Mine pain points → specs; claim AUTONOMOUS.md tasks |
| `inner-loop-eng-0001` | ENG | 6x/day | Ship projects from backlog; claim AUTONOMOUS.md tasks |
| `inner-loop-ops-0001` | OPS | every 4h | Monitor SLA + tickets; claim AUTONOMOUS.md tasks |
| `inner-loop-allrounder-0001` | ZEN | every 3h | Cross-agent coordination; claim AUTONOMOUS.md tasks |
| `eng-poc-continuous-0001` | ENG | every 4h | Factory self-healing + PR monitor (decolua/9router) |
| `factory-9router-watcher` | ENG | every 15 min | Process factory-ready issues on decolua/9router |
| `oss-contributor-0001` | ENG | 11am daily | OSS PR as anuragg-saxenaa |
| `website-agency-leads-daily` | HATAKE | 9am daily | 50 real leads via Overpass API |
| `website-agency-audit-cycle` | RESEARCH | every 4h | Audit pending leads |
| `website-agency-build-queue` | ENG | every 2h | Build sites for top leads |
| `website-agency-outreach-cycle` | ZEN | every 3h | SMS/email outreach |
| `website-agency-voice-followup` | ZEN | 10am/2pm/6pm | AI voice follow-up calls |

---

## Infrastructure

| Service | Port | Managed by | Purpose |
|---------|------|------------|---------|
| OpenClaw Gateway | 18789 | `ai.openclaw.gateway` | Agent runtime + API |
| 9Router | 20128 | `ai.openclaw.9router` | LLM proxy + failover |
| n8n | 5678 | `ai.openclaw.n8n` | Webhook delegation, credentials |
| Mission Control | 19000 | `ai.openclaw.dashboard` | Ops dashboard (`red`/`redos2026`) |

---

## Key Files

| File | Purpose |
|------|---------|
| `openclaw.json` | Master runtime config — **never commit** |
| `cron/jobs.json` | 82 cron definitions — A2A, inner loops, health monitors |
| `workspace-main/inbox/tasks.md` | Async CEO inbox — agents escalate here when RED is unreachable |
| `workspace/SOUL.md` | Company OS injected into every session |
| `workspace/GOALS.md` | Active goals (RED writes only) |
| `workspace/STATE.yaml` | Live sprint/metrics state |
| `workspace/AUTONOMOUS.md` | Agent task queue |
| `workspace/projects/backlog.md` | OSS project pipeline |
| `workspace/projects/pr-log.md` | All shipped + contributed PRs |
| `workspace-website-agency/` | Ontario Website Agency pipeline |
| `secrets.json` | API keys — **never commit** |
| `identity/device.json` | Ed25519 keypair — **never delete** |

---

## Quick Start

```bash
# Restart full stack
bash ~/.openclaw/scripts/redos-restart.sh

# Check status
bash ~/.openclaw/scripts/redos-restart.sh --status

# Validate config before restart
openclaw doctor

# Live logs
tail -f ~/.openclaw/logs/gateway.log

# Test an agent
openclaw agent --agent main --channel slack --message "status" --json

# Run a cron manually
openclaw cron run inner-loop-research-0001
openclaw cron run oss-contributor-0001

# Run website agency pipeline
python3 workspace-website-agency/scripts/lead_generator.py --count 50
```

---

## Critical Rules

- **Never edit** `/opt/homebrew/lib/node_modules/openclaw/dist/`
- **Never commit** `openclaw.json`, `identity/`, `credentials/`
- **Never hardcode `model`** in cron payloads — omit it, use agent defaults
- **Never use ZAI** in crons or fallback chains (PAYG = runaway cost risk)
- **L4/L5 actions** require Telegram approval from RED before execution
- **Run `openclaw doctor`** after any `openclaw.json` change

---

## Git Identity

```
user.name  = anuragg-saxenaa
user.email = anuragg.saxenaa@gmail.com
```

GitHub: `redinside-dev` (org / infra owner) · `anuragg-saxenaa` (OSS contributor identity, collaborator on all repos)
