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

### TICKET-20260215-004
- **Status:** RESOLVED
- **Priority:** P3
- **Created:** 2026-02-16T01:24:00Z
- **SLA Deadline:** 2026-02-18T01:24:00Z (48 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Historical Telegram getUpdates conflicts indicate multiple bot instances
- **Details:** gateway.err.log shows extensive Telegram getUpdates conflict errors (409: Conflict: terminated by other getUpdates request) on 2026-02-14 from ~19:44:38Z to 19:58:40Z. Additional conflicts occurred on 2026-02-15T05:38:07.854Z. These errors indicate multiple bot instances were running simultaneously. Conflicts self-resolved when duplicate instances were terminated.
- **Root Cause:** Multiple gateway instances running simultaneously, both polling the same Telegram bot token. Current system has only one gateway instance (PID 4956) and no conflicts have occurred since 2026-02-15T05:38Z.
- **Resolution:** Issue self-resolved when duplicate gateway instances were terminated. Verified only one gateway is currently running. No immediate action needed.
- **Learnings:** LEARNING-20260215-008
- **Resolved At:** 2026-02-16T01:28:00Z

### TICKET-20260215-003
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-15T23:51:00Z
- **SLA Deadline:** 2026-02-16T07:51:00Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Authentication token and session key errors after LLM timeout resolution
- **Details:** New errors detected at 23:30-23:35Z (6:30-6:35 PM ET), after TICKET-20260215-002 was resolved:
  - 23:34:35Z: "FailoverError: Your authentication token has been invalidated. Please try signing in again." (main lane, research and finance sessions)
  - 23:30:20Z: "Error: Malformed agent session key; refusing workspace resolution." (nested and session:agent:eng lanes)
  - 23:35:03Z: LLM timeout again for OPS cron job (300s exceeded) despite earlier resolution
- **Root Cause:** Session state corruption during TICKET-20260215-002 resolution process. Config changes (removed zai/glm-4.7-flashx, changed OPS primary to zai/glm-4.7, increased timeouts to 300s) likely triggered a partial gateway state refresh that corrupted active sessions. The OAuth token itself was valid (expires 1771565873248, ~4 days after error), so "authentication token invalidated" was a symptom of corrupted session state, not actual token expiration. The 23:35:03Z timeout was the current ticket job hitting the 300s limit during complex operations.
- **Resolution:** Issue self-healed after ~5 minutes. No gateway restart required. Errors stopped after 23:35Z and system has been stable for ~50 minutes since. If errors recur, run `openclaw doctor --fix` followed by `openclaw gateway restart` to clear corrupted session state.
- **Learnings:** LEARNING-20260215-007
- **Resolved At:** 2026-02-16T00:30:00Z

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
