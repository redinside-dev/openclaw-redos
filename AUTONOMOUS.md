# AUTONOMOUS.md - PENDING Tasks

This file tracks tasks assigned to autonomous agents. Agents check here for work.

## P1 - PENDING

### OPS-026: Extend autonomous-healer.sh to auto-fix cron job failures
**Agent:** ops
**Created:** 2026-03-24T20:30:00Z
**Assigned to:** ops
**Description:** Add checks to autonomous-healer.sh for cron jobs with consecutiveErrors >= 2. Auto-disable flaky jobs, check if openclaw cron runner is healthy, rotate gateway.err.log when it exceeds 100MB, alert via telegram if unresolvable.
**Status:** PENDING
**Priority:** P0

### OPS-027: Wire n8n into autonomous healing loop
**Agent:** ops
**Created:** 2026-03-24T20:30:00Z
**Assigned to:** ops
**Description:** Create n8n workflow that triggers on webhook from autonomous-healer.sh on P0/P1 events. Workflow should route alerts to appropriate agent based on error type and send telegram notification.
**Status:** PENDING

### MAIN-002: Investigate 7 cron jobs with consecutive error counts >= 2
**Agent:** main
**Created:** 2026-03-24T20:30:00Z
**Assigned to:** main
**Description:** Check why these cron jobs are failing: a2a-health-monitor (5 errors), inner-loop-main (3 errors), telegram-approval-monitor (3 errors), red-daily-summary (2 errors + 403), plus agent-healer, config-drift-watchdog, and watchdog. Fix root cause or disable if deprecated.
**Status:** PENDING
**Priority:** P1

## NEW - PENDING

### OPS-028: Critical system recovery - web_search quota exhausted
**Agent:** ops
**Created:** 2026-03-29T12:54:00Z
**Assigned to:** ops
**Description:** Fix web_search Perplexity quota exhaustion (401 errors). Requires billing check at perplexity.ai/settings/api. Escalate to Anurag if needed.
**Status:** RESOLVED
**Priority:** P0
**Note:** FALSE POSITIVE alert from CONSULTANT

### OPS-029: Recursive stall investigation
**Agent:** ops
**Created:** 2026-03-29T12:54:00Z
**Assigned to:** ops
**Description:** Investigate consultant recursive stall preventing self-healing. Check gateway configuration and model dependencies.
**Status:** PENDING
**Priority:** P0

### OPS-030: Ollama model pull
**Agent:** ops
**Created:** 2026-03-29T12:54:00Z
**Assigned to:** ops
**Description:** Pull ollama/llama3.1:8b model: `ollama pull llama3.1:8b`. Verify Ollama service is running.
**Status:** PENDING
**Priority:** P1

### OPS-031: Minimax authentication fix
**Agent:** ops
**Created:** 2026-03-29T12:54:00Z
**Assigned to:** ops
**Description:** Verify Minimax AI credentials in gateway config. Check if service is operational or needs re-authentication.
**Status:** PENDING
**Priority:** P1

### OPS-032: Gateway UI access fix
**Agent:** ops
**Created:** 2026-03-29T12:54:00Z
**Assigned to:** ops
**Description:** Fix gateway control UI blocked by missing allowedOrigins config. Add proper CORS configuration.
**Status:** PENDING
**Priority:** P2

---

### OPS-034: CONSULTANT false positive - no task completions alert
**Agent:** ops
**Created:** 2026-04-03T02:44:37Z
**Assigned to:** ops
**Description:** Investigate "no task completions" alert from CONSULTANT. System check shows: 177 active sessions, 1271 running tasks, 8 agents operational. Gateway healthy at 127.0.0.1:18789.
**Status:** RESOLVED
**Priority:** P3
**Resolution:** FALSE POSITIVE - 20th+ duplicate. CONSULTANT incorrectly treats model_not_found (HTTP 404) as "no completions". 26 active sessions verified. System operational. Logged to TICKET-TRACKER.md.

### OPS-035: CONSULTANT false positive recurrence - no task completions
**Agent:** ops
**Created:** 2026-04-03T13:49:00Z
**Assigned to:** ops
**Description:** Another "no task completions" alert at 13:49 EDT. Verified: 26 active sessions in last 60 min, multiple cron jobs completed (finance:cron:199a722c, finance:cron:58248a42, infosec, research, eng, main:cron:7d1f3378). False positive confirmed. Root cause: CONSULTANT logic treats HTTP 404 model_not_found as "no completions". Fix needed in CONSULTANT code.
**Status:** RESOLVED
**Priority:** P3
**Resolution:** FALSE POSITIVE. 26 active sessions verified. System operational.
**Agent:** ops
**Created:** 2026-04-02T13:45:00Z
**Assigned to:** ops
**Description:** Document repeated false positive "no task completions" alerts from CONSULTANT. Root cause: CONSULTANT logic treats model_not_found (HTTP 404) as "no completions". System is operational with active sessions. No action needed beyond logging.
**Status:** RESOLVED
**Priority:** P3
**Resolution:** Confirmed again - 5 active sessions running (ops main, IssueWatcher, AUTONOMOUS sync, hatake, allrounder). False positive alert closes.