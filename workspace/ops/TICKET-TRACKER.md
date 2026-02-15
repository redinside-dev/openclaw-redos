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

_No active tickets._

## Resolved Tickets (Last 7 Days)

### TICKET-20260215-002
- **Status:** RESOLVED
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
- **Root Cause:** Three compounding issues: (1) Invalid model `zai/glm-4.7-flashx` in OPS and HATAKE fallback chains caused immediate failures. (2) OPS primary was `ollama/llama3.1:8b` (local, too slow for complex cron tasks). (3) All cron jobs had 120s timeout, insufficient for multi-step agent tasks.
- **Resolution:** Removed `zai/glm-4.7-flashx` from all agents. Changed OPS primary to `zai/glm-4.7`. Increased all cron job timeouts to 300s. Simplified Health Monitor prompt to avoid exec calls.
- **Learnings:** LEARNING-004 (cron timeout sizing), LEARNING-005 (model validation)
- **Resolved At:** 2026-02-15T23:30:00Z

### TICKET-20260215-001
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-15T22:51:00Z
- **SLA Deadline:** 2026-02-16T06:51:00Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** ENG
- **Summary:** Health monitoring stopped - no health.jsonl entries for ~17 hours
- **Details:** Health check logs stopped at 2026-02-15T05:37:46.108Z (12:37 AM ET). Gateway itself is healthy and running. The system is operational but health monitoring had stopped recording to health.jsonl.
- **Root Cause:** The old "System Health Watch" cron job (main agent) was disabled. New OPS Health Monitor cron job was added but initially failed due to bad model fallback chain and insufficient timeout.
- **Resolution:** New OPS Health Monitor cron job enabled with zai/glm-4.7 model, 300s timeout, running every 15 minutes. Health monitoring is now active via cron system.
- **Learnings:** LEARNING-003 (health monitoring requires dedicated cron, not ad-hoc)
- **Resolved At:** 2026-02-15T23:30:00Z
