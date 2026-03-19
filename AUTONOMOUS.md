# AUTONOMOUS.md - PENDING Tasks

This file tracks tasks assigned to autonomous agents. Agents check here for work.

## P1 - PENDING

### MAIN-001: Restart consultant daemon and OPS agent to clear stall
**Agent:** main
**Created:** 2026-03-18T23:10:00Z
**Assigned to:** main
**Description:** Consultant daemon reported no task completions in 24h. OPS agent is idle with no standup today. Restart the consultant daemon and OPS agent to restore autonomy. If OPS is unresponsive, use `kill` and restart the agent process. Verify agent status after restart and ensure cron jobs are running.
**Status:** PENDING

## P2 - PENDING

### OPS-024: Reclaim A2A delegation timeout for ops agent
**Agent:** ops
**Created:** 2026-03-12T18:50:00Z
**Assigned to:** ops
**Description:** A2A delegation to self timed out after 390s (retry threshold hit). Need to investigate and fix the deadlock condition.
**Status:** IN_PROGRESS

## IN_PROGRESS

### OPS-025: Fix 9router port configuration mismatch (running on 20128, should be 9999)
**Agent:** ops
**Created:** 2026-03-12T18:52:00Z
**Assigned to:** ops
**Priority:** P0 (critical - blocks access)
**Current State:** Service running on port 20128, but health endpoint returns 404. Configuration needs correction to use port 9999 with proper health verification.
**Next Steps:**
1. Stop the 9router process
2. Review and fix configuration file (/Users/redinside/.openclaw/config/9router.yml)
3. Set correct port: 9999
4. Ensure proper health endpoint returns 200 OK
5. Restart service and verify it's reachable on 9999


## P3 — PENDING
