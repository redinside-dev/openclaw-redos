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
**Status:** PENDING
**Priority:** P0

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