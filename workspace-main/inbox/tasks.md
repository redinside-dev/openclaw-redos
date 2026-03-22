# CEO Inbox — Async Task Queue

Agents write here when sessions_send to RED times out. RED processes this on every heartbeat.

**Format:**
```
## [PENDING] <agent> → RED — <one-line task>
**From:** <agentId>
**Time:** <ISO timestamp>
**Priority:** P0/P1/P2
**Task:** <full task description>
**Expected action:** <what CEO should do>
---
```

## Status
Last processed: never
