# TICKET TRACKER

Active issue tracking board. Agents create tickets here when issues are found.
OPS (Scrum Master) monitors this file and enforces SLAs.

## SLA Policy

| Priority | Response Time | Resolution Time | Escalation |
|----------|--------------|-----------------|------------|
| P0-Critical | 5 min | 30 min | Telegram alert to Anurag immediately |
| P1-High | 15 min | 2 hours | Telegram alert if breached |
| P2-Medium | 1 hour | 8 hours | Daily standup report |
| P3-Low | 4 hours | 48 hours | Weekly summary |

## Ticket Format

```
### TICKET-{YYYYMMDD}-{NNN}
- **Status:** OPEN | IN_PROGRESS | BLOCKED | RESOLVED | CLOSED
- **Priority:** P0 | P1 | P2 | P3
- **Created:** {ISO timestamp}
- **SLA Deadline:** {ISO timestamp}
- **Reporter:** {agent ID or "telegram"}
- **Assignee:** {agent ID}
- **Summary:** {one-line description}
- **Details:** {full description}
- **Root Cause:** {filled after diagnosis}
- **Resolution:** {filled after fix}
- **Learnings:** {what was learned — feeds into self-improvement}
- **Resolved At:** {ISO timestamp}
```

## Active Tickets

### TICKET-20260215-002
- **Status:** IN_PROGRESS
- **Priority:** P1
- **Created:** 2026-02-15T23:21:00Z
- **SLA Deadline:** 2026-02-16T01:21:00Z (2 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** LLM timeout errors affecting cron jobs and agent operations
- **Details:** Multiple timeout errors at 23:08:35Z (6:08 PM ET):
  - Embedded agent run timeout (120s exceeded)
  - Cron lane task timeout: "FailoverError: LLM request timed out."
  - Session timeout for health monitor cron job itself
- **Root Cause:** Likely provider/auth + routing issues (not pure latency). gateway.err.log shows repeated FailoverError: "authentication token has been invalidated" + rate limit events. Cron lane hit 120s embedded-run timeout and also attempted to use unknown model zai/glm-4.7-flashx, causing immediate failures.
- **Resolution:** Pending
- **Learnings:** TBD
- **Resolved At:** TBD

### TICKET-20260215-001
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-02-15T22:51:00Z
- **SLA Deadline:** 2026-02-16T06:51:00Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Health monitoring stopped - no health.jsonl entries for ~17 hours
- **Details:** Health check logs stopped at 2026-02-15T05:37:46.108Z (12:37 AM ET). Gateway itself is healthy and running (confirmed via `openclaw gateway status` - pid 82921, active state, RPC probe ok). Recent suppressed AbortErrors in gateway.err.log from 12:24 PM ET. Memory truncation warning from 5:33 PM ET. The system is operational but health monitoring has stopped recording to health.jsonl.
- **Root Cause:** Investigating
- **Resolution:** Pending
- **Learnings:** TBD
- **Resolved At:** TBD

## Resolved Tickets (Last 7 Days)

_None yet._
