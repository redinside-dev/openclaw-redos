# RedOS Self-Healing System — Design Specification

> **Goal:** RedOS monitors itself, auto-restarts everything, and sends Telegram status updates. You intervene only via Telegram questions.

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  TELEGRAM  ← your only interface (status updates only)      │
└──────────────────────────┬───────────────────────────────────┘
                           │ Telegram Bot API
┌──────────────────────────▼───────────────────────────────────┐
│  HERMES AGENT  (ai.openclaw.hermes-scheduler)                │
│  • Schedules cron jobs                                       │
│  • Active monitor: polls all services every 60s              │
│  • Rule-based diagnostic loop (80% of failures)             │
│  • LLM diagnostic fallback (novel failures)                 │
│  • launchctl restart on failure                              │
│  • Telegram Bot alerts on restart events                     │
└──────────────────────────┬───────────────────────────────────┘
                           │ launchd + shell
┌──────────────────────────▼───────────────────────────────────┐
│  LAUNCHD  (always-on supervision)                             │
│  • ai.openclaw.watchdog          → hermes-monitor.py         │
│  • ai.openclaw.agent-health-watchdog → restart dead agents  │
│  • Agent plists: eng, ops, research, main, allrounder,      │
│    finance, infosec, hatake                                  │
│  • n8n, dashboard, gateway, 9router, claude-proxy            │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  SERVICES                                                     │
│  • 8× autonomous-worker-v2.js  (autonomous agents)           │
│  • openclaw-node (gateway)                                     │
│  • claude-proxy.js                                            │
│  • 9router/cli.js                                             │
│  • n8n                                                        │
│  • dashboard/server.js                                        │
│  • ollama                                                     │
└──────────────────────────────────────────────────────────────┘
```

**Core principle:** Hermes does the thinking. launchd does the babysitting. You get Telegram pings only.

---

## 2. Components

### 2.1 Hermes Active Monitor (`hermes-monitor.py`)

A Python daemon registered as `ai.openclaw.hermes-scheduler` (already running per launchctl list).

**Responsibilities:**
- Poll all monitored services every 60s
- Maintain a heartbeat log at `~/.shared/system-health.jsonl`
- On service death: run diagnostic loop, restart, send Telegram alert
- On restart failure: escalate to LLM diagnostic, retry

**Monitored services (service registry):**
| Label | launchd label | Health check |
|-------|--------------|--------------|
| `gateway` | `ai.openclaw.gateway` / `ai.openclaw.node` | `launchctl print output` |
| `agent:eng` | `ai.openclaw.worker.eng` | `launchctl list` PID present |
| `agent:ops` | `ai.openclaw.worker.ops` | `launchctl list` PID present |
| `agent:research` | `ai.openclaw.worker.research` | `launchctl list` PID present |
| `agent:main` | `ai.openclaw.queue-worker.main` | `launchctl list` PID present |
| `agent:allrounder` | `ai.openclaw.queue-worker.allrounder` | `launchctl list` PID present |
| `agent:finance` | `ai.openclaw.queue-worker.finance` | `launchctl list` PID present |
| `agent:infosec` | `ai.openclaw.queue-worker.infosec` | `launchctl list` PID present |
| `agent:hatake` | `ai.openclaw.queue-worker.hatake` | `launchctl list` PID present |
| `claude-proxy` | `ai.openclaw.claude-proxy` | `launchctl list` PID present |
| `9router` | Process check (pidfile/port) | Port 8080 check |
| `n8n` | `ai.openclaw.n8n` | `launchctl list` PID present |
| `dashboard` | `ai.openclaw.dashboard` | Port 19000 check |
| `ollama` | Process check | Port 11434 check |

### 2.2 Diagnostic Engine

**Tier 1 — Rule-based (always runs first):**
- `launchctl list | grep PID` → if missing, `launchctl start <label>`
- Port scan failures → `launchctl start <label>` + log
- Crash loop detection: if same service restarted 3× in 10 min → pause, alert via Telegram "X in crash loop — manual review needed"

**Tier 2 — LLM fallback (when rule-based can't diagnose):**
- If restart fails 2× consecutively, collect: recent log lines, launchd stdout, `launchctl error` output
- Prompt: `classify_failure_and_suggest_fix(error_logs: string) -> {diagnosis: str, fix_command: str}`
- Use local Ollama or 9Router as LLM backend
- Execute returned fix command, log result

### 2.3 Telegram Bridge (`telegram-bridge.py`)

- Reads Telegram bot token from `~/.openclaw/credentials/telegram-bot-token.txt`
- Sends formatted status messages: `[REDOS] ✓ agent:eng restarted (was down 2m)`
- On crash loop: `[REDOS] ⚠️ agent:ops in crash loop — manual review needed`
- No commands accepted from Telegram (read-only status output)

### 2.4 Watchdog Launchd Plist (`hermes-watchdog.plist`)

- Wrapper that starts `hermes-monitor.py`
- KeepAlive: true (restarts if Hermes dies)
- RunAtLoad: true
- Placed at `~/Library/LaunchAgents/ai.openclaw.hermes-watchdog.plist`

### 2.5 Agent Health Watchdog (`agent-watchdog.plist`)

- Separate launchd job that monitors autonomous-worker processes directly
- Falls back to `launchctl start` if Hermes is also down
- Ensures at least one watchdog is always watching agents

### 2.6 Health Heartbeat Log

- File: `~/.shared/system-health.jsonl`
- Format: `{"ts": "ISO8601", "service": "label", "status": "up|down|restarting", "pid": N|null}`
- Used by Hermes to detect flapping and compute downtime

---

## 3. Data Flow

```
1. hermes-monitor.py polls all services every 60s
2. Service is DOWN:
   a. Write "down" to system-health.jsonl
   b. Run rule-based diagnostic (try launchctl start)
   c. If restart succeeds → Telegram: "[REDOS] ✓ <label> restarted (was down <dur>)"
   d. If restart fails → run LLM diagnostic
   e. If LLM suggests fix → execute + Telegram: "[REDOS] 🤖 <label> fixed by LLM"
   f. If all fails → Telegram: "[REDOS] ⚠️ <label> unrecoverable — manual needed"
3. Crash loop detected (3 restarts in 10 min):
   a. Telegram: "[REDOS] ⚠️ <label> in crash loop — pausing restarts"
   b. Log full diagnostics for manual review
```

---

## 4. Files

| File | Purpose | Location |
|------|---------|----------|
| `hermes-monitor.py` | Active monitoring daemon | `~/.openclaw/scripts/hermes-monitor.py` |
| `telegram-bridge.py` | Telegram alert sender | `~/.openclaw/scripts/telegram-bridge.py` |
| `service-registry.json` | Monitored service definitions | `~/.openclaw/config/service-registry.json` |
| `diagnostic-rules.json` | Rule-based fix mappings | `~/.openclaw/config/diagnostic-rules.json` |
| `hermes-watchdog.plist` | launchd plist for Hermes | `~/Library/LaunchAgents/ai.openclaw.hermes-watchdog.plist` |
| `agent-watchdog.plist` | launchd plist for agent watchdog | `~/Library/LaunchAgents/ai.openclaw.agent-watchdog.plist` |
| `~/.shared/system-health.jsonl` | Heartbeat log | `~/.shared/system-health.jsonl` |

---

## 5. Acceptance Criteria

- [ ] Hermes monitor restarts any dead service within 90 seconds
- [ ] Telegram message sent within 10 seconds of any restart event
- [ ] Crash loop detection triggers at 3 failures in 10 minutes, sends Telegram alert
- [ ] LLM diagnostic fallback fires automatically when rule-based fails twice
- [ ] Watchdog plist auto-restarts Hermes itself if it dies
- [ ] No human intervention required for any recoverable failure
- [ ] All service states written to `system-health.jsonl` for audit