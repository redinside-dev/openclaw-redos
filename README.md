# OpenClaw RedOS

> Autonomous AI company running 24/7 on [OpenClaw](https://openclaw.ai) — 8 specialized agents, coding factory, OSS contributions across Java/Spring/TypeScript/Python, self-healing infrastructure.

**Owner:** [anuragg-saxenaa](https://github.com/anuragg-saxenaa) · **Infra:** [redinside-dev](https://github.com/redinside-dev) · **Platform:** macOS (Darwin 25) · **Updated:** 2026-04-05

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          RedOS Stack                                │
│                                                                     │
│   Telegram / Slack / WhatsApp / Web                                 │
│          │                                                          │
│   ┌──────▼─────────────────────────────────────────────────────┐   │
│   │            OpenClaw Gateway  :18789                         │   │
│   │  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │   │
│   │  │ Agent Engine │  │  Cron Runner   │  │  A2A / Spawn   │  │   │
│   │  │  (sessions)  │  │  (82 jobs)     │  │  (subagents)   │  │   │
│   │  └──────┬───────┘  └──────┬─────────┘  └───────┬────────┘  │   │
│   └─────────┼────────────────┼──────────────────────┼──────────┘   │
│             │                │                      │              │
│   ┌─────────▼────────────────▼──────────────────────▼──────────┐   │
│   │                     Model Router                            │   │
│   │  Primary: MiniMax Coding Plan  (api.minimax.io/v1)          │   │
│   │    ├─ MiniMax-M2.7  → ENG agent (coding, 1M ctx)            │   │
│   │    └─ MiniMax-M2.5  → all other agents (200K ctx)           │   │
│   │  Fallback: 9Router :20128                                    │   │
│   │    └─ cu/default  →  cc/claude-haiku-4-5                    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Supporting Services                                         │   │
│   │  Dashboard :19000  │  n8n :5678  │  Cloudflared tunnel      │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Agent Hierarchy

```
                        ┌─────────────────────┐
                        │    RED  (main/CEO)   │
                        │  Orchestrator        │
                        │  Telegram approvals  │
                        │  @RedinsideBot       │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   ZEN (allrounder)   │
                        │   COO / CSO          │
                        │   @ZenRedBot         │
                        └──────────┬──────────┘
                                   │
      ┌──────────┬─────────────────┼──────────────┬──────────┬──────────┐
      ▼          ▼                 ▼              ▼          ▼          ▼
┌──────────┐ ┌─────────┐   ┌──────────┐  ┌──────────┐ ┌────────┐ ┌─────────┐
│   ENG    │ │RESEARCH │   │ FINANCE  │  │   OPS    │ │INFOSEC │ │ HATAKE  │
│ Coding   │ │ Market  │   │ CFO/Cost │  │ Monitor  │ │Security│ │ Intent  │
│ Factory  │ │ Intel   │   │ Tracking │  │ SLA      │ │ L3     │ │ Parser  │
│@ENGRED   │ │@RESEARCH│   │@FINANCE  │  │@OPSRED   │ │@INFOSEC│ │internal │
│M2.7 ⚡   │ │M2.5     │   │M2.5      │  │M2.5      │ │M2.5    │ │M2.5     │
└──────────┘ └─────────┘   └──────────┘  └──────────┘ └────────┘ └─────────┘
```

| Agent | ID | Model | Telegram | Role |
|---|---|---|---|---|
| RED | `main` | MiniMax-M2.5 | @RedinsideBot | CEO — orchestration, approvals |
| ZEN | `allrounder` | MiniMax-M2.5 | @ZenRedBot | CSO — cross-functional |
| ENG | `eng` | **MiniMax-M2.7** | @ENGRED_BOT | Engineering — coding factory |
| RESEARCH | `research` | MiniMax-M2.5 | @RESEARCHRED_BOT | Market intel |
| FINANCE | `finance` | MiniMax-M2.5 | @FINANCERED_BOT | Cost tracking |
| OPS | `ops` | MiniMax-M2.5 | @OPSRED_BOT | Monitoring, SLA |
| INFOSEC | `infosec` | MiniMax-M2.5 | @INFOSECRED_BOT | Security, L3 reviews |
| HATAKE | `hatake` | MiniMax-M2.5 | internal | Intent parser |

---

## Coding Factory

ENG runs autonomously 24/7 — real code commits, real PRs, no humans in the loop.

### Flow

```
Every 15 min — IssueWatcher (decolua/9router)
  ├─ gh issue list → pick concrete bug/feature
  ├─ Read source, implement FULL fix (no stubs)
  ├─ git commit && git push fork
  └─ gh pr create --no-edit → log to pr-log.md

Daily — OSS Contributor (5 streams, rotating by day)
  Stream A — Java/Spring:
    Tue: spring-projects/spring-ai   (Java Spring AI)
    Thu: langchain4j/langchain4j     (Java LangChain4j)
    Sat: spring-projects/spring-boot (Java Spring Boot)
  Stream B — JavaScript/TypeScript:
    Mon: decolua/9router             (JS/Next.js AI gateway)
    Wed: FellouAI/eko                (TypeScript agentic AI)
  Stream C — Python:
    Fri: PathOnAIOrg/LiteMultiAgent  (Python multi-agent)
  Stream D — Mobile (iOS Swift + React Native):
    Sun: nicklockwood/SwiftFormat    (Swift/iOS)
         react-native-community repos (Android/RN)
  Stream E — Claude Code + MCP + Java Expert:
    Deep Java projects via ccs-smart.sh + context7 MCP

Every 4h — PR Monitor
  └─ Fix CI failures on open PRs autonomously
```

### Tech Stacks (5 Streams)

| Stream | Stack | Frameworks | Use Cases |
|---|---|---|---|
| A | **Java 21** | Spring Boot 3.4, Spring AI 1.0, LangChain4j 0.36 | REST APIs, AI agents, microservices |
| B | **TypeScript** | Node.js ESM, tsc, vitest | CLIs, tooling, agents |
| C | **Python 3** | FastAPI, pytest, asyncio | ML, data, scripting |
| D | **Mobile** | Swift/SPM (iOS), React Native/Gradle (Android) | iOS + Android apps |
| E | **Claude Code + MCP** | context7, exa-mcp, Spring AI/LangChain4j docs | Deep Java architecture |

### Implementation Contract

Every ENG output is guaranteed to be:
- ✅ **Fully implemented** — no `// TODO`, no stubs, no placeholder methods
- ✅ **Tested** — JUnit 5 / vitest / pytest with real assertions
- ✅ **Buildable** — `mvn verify` / `npm run build` / `pytest` passes clean
- ✅ **Documented** — README with quickstart and example output

### Project Backlog (41 projects)

| # | Project | Stack | Status |
|---|---|---|---|
| 41 | spring-ai-mcp-bridge | Java 21 + Spring AI + MCP | ⭐ READY |
| 40 | langchain4j-agent-workflows | Java 21 + LangChain4j + Spring Boot | ⭐ READY |
| 39 | spring-boot-ai-agent-starter | Java 21 + Spring AI + LangChain4j | ⭐ READY |
| 38 | java-ai-code-reviewer | Java 21 + Spring AI + GitHub Actions | ⭐ READY |
| 37 | context-optimizer | TypeScript — LLM context proxy | ⭐ READY |
| 36 | agent-xray | TypeScript — agent observability TUI | ⭐ READY |
| 35 | intent-guard | TypeScript — prompt injection guard | ⭐ READY |
| 34 | mcp-param-validator | TypeScript — MCP tool validator | ⭐ READY |

Full backlog: [workspace/projects/backlog.md](workspace/projects/backlog.md)

### Recent Autonomous PRs

| Date | Repo | PR | Description |
|---|---|---|---|
| 2026-04-05 | decolua/9router | pending | fix: Next.js dashboard host binding |
| 2026-04-03 | decolua/9router | [#493](https://github.com/decolua/9router/pull/493) | fix: optional API key for ollama-local |
| 2026-04-03 | decolua/9router | [#487](https://github.com/decolua/9router/pull/487) | fix: skip empty function_call items (Codex 400) |
| 2026-04-02 | decolua/9router | [#482](https://github.com/decolua/9router/pull/482) | fix: pass HOME for MITM server data dir |

Full log: [workspace/projects/pr-log.md](workspace/projects/pr-log.md)

---

## Bounded Autonomy (L0–L5)

```
L0  read-only          → auto-approve
L1  safe-write         → auto-approve
L2  reversible-change  → auto-approve
L3  infra/sensitive    → INFOSEC A2A review  (120s timeout)
L4  external/money     → Telegram approval   (10 min window)
L5  critical/irrevers. → Telegram approval   (30 min window)
```

Defined in: `workspace/skills/maker-checker/SKILL.md`

---

## Cron Jobs (82 total, 77 enabled)

| Job | Schedule | Agent | Purpose |
|---|---|---|---|
| IssueWatcher | every 15min | ENG | Fix 9router issues → PRs |
| OSS Contributor | daily | ENG | Multi-repo OSS contributions |
| PR Monitor | every 4h | ENG | Fix CI failures on open PRs |
| Inner loops (×6) | every 4h | all | Agent heartbeat + task processing |
| Health monitor | every 15min | OPS | Session cleanup, gateway health |
| Telegram approval | every 2min | main | L4/L5 approval queue |

---

## Model Provider

**Primary:** MiniMax Coding Plan — `https://api.minimax.io/v1`
- Key type: `sk-cp-...` ← Coding Plan (unlimited subscription)
- **Never use** `sk-api-...` (Pay-as-you-go separate balance, exhausts)

**Fallback chain:** `9router/cu/default` → `9router/cc/claude-haiku-4-5`

---

## Key Files

| File | Purpose |
|---|---|
| `openclaw.json` | Master runtime config — never commit |
| `cron/jobs.json` | 82 cron job definitions |
| `exec-approvals.json` | Per-agent exec allowlist |
| `workspace/SOUL.md` | Company OS — injected into every session |
| `workspace/AUTONOMOUS.md` | Agent task queue |
| `workspace/projects/backlog.md` | 41 OSS project specs |
| `workspace/projects/pr-log.md` | Autonomous PR history |
| `workspace/skills/eng-coding/SKILL.md` | Coding factory contract |
| `identity/device.json` | Ed25519 keypair — NEVER delete |

---

## Quick Start

```bash
# Status check
bash ~/.openclaw/scripts/redos-restart.sh --status

# Full restart
bash ~/.openclaw/scripts/redos-restart.sh

# Validate config (always run after openclaw.json changes)
openclaw doctor

# Manually trigger coding factory
openclaw cron run c66709c1-965b-4f5a-9469-e87c096f730b  # IssueWatcher (15min)
openclaw cron run oss-contributor-0001                   # OSS Contributor (daily)

# Live logs
tail -f ~/.openclaw/logs/gateway.log
tail -f ~/.openclaw/logs/gateway.err.log
```

---

## Diagnosis Checklist

When something breaks:

1. Sessions bloated? → `health-monitor.sh` auto-clears >300KB sessions
2. `AUTONOMOUS.md` >50KB? → `health-monitor.sh` trims it
3. `openclaw.json` >1000 bytes? ✓
4. Gateway up on :18789? → `curl http://localhost:18789/health`
5. MiniMax billing error? → Key must be `sk-cp-...` (Coding Plan), not `sk-api-...`
6. exec blocked in cron? → check `exec-approvals.json` has `ask: off` for agent
7. `gh pr create` blocked? → ensure `--no-edit` flag is in cron prompt

---

*RedOS is fully autonomous. Agents handle everything — coding, research, finance, ops, security — without human intervention except L4/L5 approvals.*
