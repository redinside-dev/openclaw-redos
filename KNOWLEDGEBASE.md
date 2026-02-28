# RedOS Knowledgebase — Architecture Quick Reference

> **This file is a concise quick-reference. For full details see:**
> - `workspace/SOUL.md` — company OS and agent protocols (authoritative)
> - `workspace/MEMORY.md` — curated long-term memory
> - `workspace/DECISIONS.md` — architectural decision log
> - `README.md` — system overview

**Last updated:** 2026-02-28

---

## Stack

| Component | Location | Version | Notes |
|---|---|---|---|
| OpenClaw CLI | `/opt/homebrew/lib/node_modules/openclaw/` | 2026.2.26 | Never edit dist/ |
| RedOS repo | `~/.openclaw/` | main branch | This repo |
| Gateway | `ws://127.0.0.1:18789` | launchd `ai.openclaw.gateway` | Auto-restarts |
| Dashboard | `http://127.0.0.1:19000` | launchd `ai.openclaw.dashboard` | auth: red/redos2026 |
| 9Router | `http://127.0.0.1:20128` | launchd `ai.openclaw.9router` | Multi-provider proxy |
| n8n | `http://127.0.0.1:5678` | v2.9.4 · launchd `ai.openclaw.n8n` | Webhook delegation |
| Ollama | `http://127.0.0.1:11434` | homebrew managed | HATAKE only |

---

## Agent Roster

| Agent | Role | Model (primary) | Fallbacks |
|---|---|---|---|
| `main` (RED) | CEO, orchestration, Telegram approvals | 9router/free-unlimited | heartbeat-cheap → gpt-5.2 |
| `allrounder` (ZEN) | CSO, general assistant | 9router/free-unlimited | heartbeat-cheap → gpt-5.2 |
| `eng` (ENG) | Engineering lead | 9router/free-unlimited | heartbeat-cheap → gpt-5.2 |
| `research` (RESEARCH) | Research analyst | 9router/free-unlimited | heartbeat-cheap → gpt-5.2 |
| `finance` (FINANCE) | Finance analyst | 9router/free-unlimited | heartbeat-cheap → gpt-5.2 |
| `ops` (OPS) | Scrum Master, health monitoring | 9router/free-unlimited | heartbeat-cheap → gpt-5.2 |
| `infosec` (INFOSEC) | Security officer, L3 approvals | 9router/free-unlimited | heartbeat-cheap → gpt-5.2 |
| `hatake` (HATAKE) | Intent parser (internal only) | ollama/qwen2.5-coder:7b | *(none)* |

---

## Bounded Autonomy (L0–L5)

Defined in `workspace/skills/maker-checker/SKILL.md`.

| Level | Scope | Approval |
|---|---|---|
| L0 | Read-only | Auto |
| L1 | Safe writes (workspace files) | Auto |
| L2 | Reversible changes | Auto |
| L3 | Infra / sensitive config | INFOSEC A2A review (120s timeout) |
| L4 | External actions, money, messaging | Telegram approval — 10 min window |
| L5 | Critical / irreversible | Telegram approval — 30 min window |

Emergency stop: send `/STOP` to @RedinsideBot on Telegram.

---

## A2A Sessions

Agents communicate via `sessions_send` (active sessions) or `sessions_spawn` (new tasks).

Key session keys:
```
agent:main:main          ← RED
agent:allrounder:main    ← ZEN
agent:eng:main           ← ENG
agent:ops:main           ← OPS
agent:infosec:main       ← INFOSEC
agent:research:main      ← RESEARCH
agent:finance:main       ← FINANCE
```

Timeouts (per SOUL.md): 45s default, 90s for complex delegation. Log all A2A to `workspace/logs/a2a-delegations.jsonl`.

---

## File-Based Coordination

| File | Owner | Purpose |
|---|---|---|
| `workspace/STATE.yaml` | All | Sprint, pipelines, metrics |
| `workspace/GOALS.md` | RED only | Company goals |
| `workspace/AUTONOMOUS.md` | RED assigns / workers claim | Task queue |
| `workspace/DECISIONS.md` | All | Append-only decision log |
| `workspace/tasks-log.md` | Workers | Append-only completion log |
| `workspace/PROJECT_STATUS.md` | OPS | Nightly live board |

---

## Cron Schedule Summary (98 jobs)

Key cadences:
- **Every 2min** — Telegram approval monitor (main)
- **Every 5min** — System pulse / health (ops)
- **Every 30min** — Episodes seeder (ops), heartbeats
- **Every 3h** — Context overflow monitor (ops)
- **9:05am ET M–F** — Autonomy scorecard (ops)
- **10am/2pm/6pm ET M–F** — Research→ENG pipeline check (eng)
- **2am ET** — Nightly eval + self-improvement (ops)
- **Mon 8am ET** — Research weekly digest
- **Mon 8:45am ET** — Finance weekly cost report
- **Mon 9am ET** — Improvement proposal (ops)
- **Hourly** — Git snapshot + backup

Do NOT hardcode `model` in cron payloads — omit the field.

---

## n8n Webhooks

Base URL: `http://127.0.0.1:5678/webhook/`
API key: `workspace/config/n8n-api-key.txt` (gitignored)
Dashboard login: `anuragg.saxenaa@gmail.com`

| Path | Workflow ID | Purpose |
|---|---|---|
| `echo-test` | `SWmkldgx4OypuhOn` | Echo / health check |
| `slack-post` | `zIoMz7Ug5oVeZz5T` | Post `{channel, text}` → Slack |
| `github-repo-status` | `g7fy6gWny65rhStr` | Fetch latest commits `{repo}` |

---

## Semantic Memory

- **Index:** `~/.openclaw/.memsearch/qdrant/`
- **Venv:** `~/.openclaw/.venv`
- **API:** `python3 workspace/memsearch.py "query"`
- **RAG:** `python3 workspace/rag_query.py "query"`
- **Dashboard:** `GET http://127.0.0.1:19000/api/search?q=...&n=5`
- `qdrant-client` 1.17.0 — use `client.query_points()` (not `client.search` — removed in 1.13+)

---

## Plugins

| Plugin | ID | Status | Purpose |
|---|---|---|---|
| memory-core | `memory-core` | loaded (global) | File-backed session memory search |
| slack | `slack` | loaded | Slack messaging |
| telegram | `telegram` | loaded | Telegram bots |

---

## Key Decisions (see `workspace/DECISIONS.md` for full log)

| Decision | Date | Summary |
|---|---|---|
| DECISION-20260228-001 | 2026-02-28 | Removed small unsandboxed models (llama3.1:8b, glm-4.7) from main/allrounder/research fallbacks |
| DECISION-20260228-002 | 2026-02-28 | Adopted file-based coordination (STATE.yaml, GOALS.md, DECISIONS.md) |
| DECISION-20260228-003 | 2026-02-28 | Removed sandbox from eng and ops to allow workspace file writes |
| DECISION-20260228-004 | 2026-02-28 | OPS primary model: llama3.1:8b → 9router/free-unlimited (A2A latency fix) |
| DECISION-20260228-005 | 2026-02-28 | File-based coordination adopted (awesome-openclaw pattern) |

---

## Security Model

- Slack DM policy: `allowlist` — only messages from owner UID `U0AFDLJDPD2`
- Sandboxed agents: infosec (sandbox active)
- `tools.deny`: browser, web_fetch, web_search on sandboxed agents
- `subagents.allowAgents`: scoped per agent (see openclaw.json)
- n8n: loopback only (127.0.0.1), never exposed to internet
- PAYG models (zai): never in crons or fallbacks — PAYG violation risk

---

## Common Fixes

| Problem | Fix |
|---|---|
| Gateway won't start after config change | Run `openclaw doctor` first — fix all schema errors, then restart |
| Agent not responding (A2A timeout) | Check if session is `isolated` — isolated sessions block outbound sessions_send |
| `env: node: No such file or directory` in n8n log | Harmless — n8n Python task runner (not used); ignore |
| `payload.model not allowed` in gateway.err.log | Cron job has hardcoded model — remove `model` field from cron payload |
| `memory slot plugin not found` doctor WARN | Run: `openclaw plugins install /opt/homebrew/lib/node_modules/openclaw/extensions/memory-core` |
| Doctor shows `duplicate plugin id` for memory-core | Harmless — local install wins over stock, stock auto-disabled |
