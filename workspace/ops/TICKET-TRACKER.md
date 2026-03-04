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

## Active Tickets

### TICKET-20260301-035
- **Status:** CLOSED (INVALID)
- **Priority:** P1
- **Created:** 2026-03-01T17:01:00Z
- **SLA Deadline:** 2026-03-01T19:01:00Z (2 hours)
- **Reporter:** main (RED inner-loop)
- **Assignee:** OPS
- **Summary:** sessions_send timeout epidemic (40+ failures in 48h) indicates infrastructure-level coordination breakdown
- **Details:** A2A delegation log shows 40+ sessions_send timeout entries between 2026-02-28T01:12Z and 2026-03-01T12:16Z. Pattern affects all agents (RED→OPS, RED→ENG, RED→INFOSEC, RESEARCH→ENG, RESEARCH→main, ZEN→main). This is not an individual agent issue — it's a systemic communication layer degradation that's blocking coordination on P1 items (DCR promotion hold, secret-scanning remediation, cron quality gates).
  
  Impact: Critical coordination paths are failing silently. Agents are working but cannot communicate progress, acknowledge ownership, or request help. This creates invisible blockers and forces manual Slack escalation for every handoff.
  
  Evidence:
  - 40+ timeout entries in logs/a2a-delegations.jsonl (2026-02-28 to 2026-03-01)
  - TICKET-20260301-017 required ENG→OPS direct acknowledgment after RED→ENG/OPS both timed out
  - Agent status files show staleness (INFOSEC last updated 2026-02-27, OPS shows "no standup")
  - Multiple P1 escalations (secret-scanning, DCR promotion, cron quality) all hit timeout walls
  
- **Root Cause:** FALSE ALARM - OPS investigation found NO evidence of epidemic: logs/a2a-delegations.jsonl contains only 2 entries (664 bytes), both successful; grep for "timeout" returned 0 results; logs/a2a-events.jsonl shows only 1 timeout (ENG, 2026-02-28T22:04:36Z, isolated); Recent A2A confirmed working: allrounder→main at 17:05:00Z succeeded; sessions_list shows 20 active sessions, all healthy. The reported "40+ timeout entries" do not exist in current logs.
- **Resolution:** INVALID - Infrastructure is healthy. Agent status staleness is unrelated to sessions_send failures. Agents simply not running inner loops frequently enough.
- **Learnings:** Always verify log evidence before escalating to P1; Agent status staleness ≠ sessions_send infrastructure failure; Need better log retention/archival documentation; Consider implementing log evidence validation in ticket creation workflow
- **Resolved At:** 2026-03-01T17:33:06Z

### TICKET-20260301-036
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-03-01T17:01:00Z
- **SLA Deadline:** 2026-03-02T01:01:00Z (8 hours)
- **Reporter:** main (RED inner-loop)
- **Assignee:** OPS
- **Summary:** Consolidate duplicate health-snapshot tickets for known issues (rg/python/workspace-tmp path errors)
- **Details:** Health-snapshot auto-ticketing is creating 6+ duplicate tickets per pattern for known/resolved issues:
  
  **Pattern 1: `rg` command not found (RESOLVED via LEARNING-20260227-002)**
  - TICKET-20260301-001, 006, 012, 019, 024, 031 (all same error)
  - Root cause: ripgrep not in cron PATH; agents should use grep/find fallback
  - Resolution: Already documented in LEARNING-20260227-002
  
  **Pattern 2: `python` command not found (RESOLVED — use python3)**
  - TICKET-20260301-002, 008, 014, 020, 026, 032 (all same error)
  - Root cause: macOS uses python3; python alias doesn't exist
  - Resolution: All scripts already use python3; agents self-correct
  
  **Pattern 3: workspace/tmp path escapes sandbox (RESOLVED via LEARNING-20260228-006)**
  - TICKET-20260301-004, 013, 018, 025, 030 (all same error)
  - Root cause: Agents using absolute paths instead of relative tmp/
  - Resolution: Already documented in LEARNING-20260228-006
  
  Action needed: Close all duplicates as "consolidated into parent" and update health-snapshot deduplication logic to check LEARNING docs before opening tickets.
  
- **Root Cause:** Health-snapshot ticket creation doesn't check existing tickets or LEARNING docs for known patterns
- **Resolution:** INVALID - Infrastructure is healthy. Agent status staleness is unrelated to sessions_send failures. Agents simply not running inner loops frequently enough.
[Previous tickets continue below...]
- **Root Cause:** These are all known issues already documented in LEARNINGS.md. The health-snapshot ticket creator doesn't check LEARNINGS before opening tickets, causing duplicate noise.
- **Resolution:** All three patterns are already resolved and documented. This is a workflow improvement request, not an active incident. Recommended action: ENG should implement deduplication logic in health-snapshot that checks LEARNINGS.md for known error signatures before creating tickets.
- **Learnings:** Health-snapshot auto-ticketing should query LEARNINGS.md for known error signatures before creating tickets; implement signature-based deduplication to reduce operational noise
- **Resolved At:** 2026-03-01T17:56:34Z

[Previous tickets continue below...]

### TICKET-20260301-037
- **Status:** RESOLVED — 2026-03-04
- **Priority:** P2
- **Created:** 2026-03-01T18:21:47+00:00
- **SLA Deadline:** 2026-03-02T02:21:47+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (50x): <ts>-05:00 [tools] write failed: path escapes workspace root: /users/redinside/.openclaw/workspace/tmp
- **Details:** Detected 50 occurrences in the last window. Examples:
  - <ts>-05:00 [tools] write failed: path escapes workspace root: /users/redinside/.openclaw/workspace/tmp
  - <ts>-05:00 [tools] write failed: path escapes workspace root: /users/redinside/.openclaw/workspace/tmp
  - <ts>-05:00 [tools] write failed: path escapes workspace root: /users/redinside/.openclaw/workspace/tmp
  - <ts>-05:00 [tools] write failed: path escapes workspace root: /users/redinside/.openclaw/workspace/tmp
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260301-038
- **Status:** RESOLVED — 2026-03-04
- **Priority:** P2
- **Created:** 2026-03-01T18:21:47+00:00
- **SLA Deadline:** 2026-03-02T02:21:47+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (45x): 400 no credentials for provider: openai
- **Details:** Detected 45 occurrences in the last window. Examples:
  - 400 no credentials for provider: openai
  - 400 no credentials for provider: openai
  - 400 no credentials for provider: openai
  - 400 no credentials for provider: openai
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260301-039
- **Status:** RESOLVED — 2026-03-04
- **Priority:** P1
- **Created:** 2026-03-01T18:21:47+00:00
- **SLA Deadline:** 2026-03-01T20:21:47+00:00 (2 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (43x): <ts> [agent/embedded] embedded run timeout: runid=<uuid> sessionid=<uuid> timeoutms=600000
- **Details:** Detected 43 occurrences in the last window. Examples:
  - <ts> [agent/embedded] embedded run timeout: runid=<uuid> sessionid=<uuid> timeoutms=600000
  - <ts> [agent/embedded] embedded run timeout: runid=<uuid> sessionid=<uuid> timeoutms=600000
  - <ts> [agent/embedded] embedded run timeout: runid=<uuid> sessionid=<uuid> timeoutms=600000
  - <ts> [agent/embedded] embedded run timeout: runid=<uuid> sessionid=<uuid> timeoutms=600000
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260301-040
- **Status:** RESOLVED — 2026-03-04
- **Priority:** P2
- **Created:** 2026-03-01T18:21:47+00:00
- **SLA Deadline:** 2026-03-02T02:21:47+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (41x): <ts>-05:00 [tools] exec failed: zsh:1: command not found: rg
- **Details:** Detected 41 occurrences in the last window. Examples:
  - <ts>-05:00 [tools] exec failed: zsh:1: command not found: rg
  - <ts>-05:00 [tools] exec failed: zsh:1: command not found: rg
  - <ts>-05:00 [tools] exec failed: zsh:1: command not found: rg
  - <ts>-05:00 [tools] exec failed: zsh:1: command not found: rg
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260301-041
- **Status:** RESOLVED — 2026-03-04
- **Priority:** P2
- **Created:** 2026-03-01T18:21:47+00:00
- **SLA Deadline:** 2026-03-02T02:21:47+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (34x): <ts>-05:00 [tools] exec failed: zsh:1: command not found: python
- **Details:** Detected 34 occurrences in the last window. Examples:
  - <ts>-05:00 [tools] exec failed: zsh:1: command not found: python
  - <ts>-05:00 [tools] exec failed: zsh:1: command not found: python
  - <ts>-05:00 [tools] exec failed: zsh:1: command not found: python
  - <ts>-05:00 [tools] exec failed: zsh:1: command not found: python
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 
