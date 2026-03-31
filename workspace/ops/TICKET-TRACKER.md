---
title: "Exec blocked - Telegram Approval Monitor cannot run"
status: IN_PROGRESS
priority: P1
agent: RED
created: 2025-06-18T17:36:00Z
updated: 2026-03-31T04:30:00Z
---

## Problem
Telegram Approval Monitor cron job (c858a544-569e-44fd-94c2-5425c75da8ed) failed at step 1 because `exec` tool is blocked by allowlist deadlock.

## Steps attempted
- Tried to list files: `ls -la /Users/redinside/.openclaw/workspace-main/workspace/approvals/pending/`
- Error: "exec denied: allowlist miss"

## Impact
- Pending approval files are not being processed
- No notifications sent to requesting agents
- No reminder DMs sent for stale approvals (>30min)
- Manual intervention required

## Required fix
Restart the Mac mini or reload OpenClaw gateway to refresh allowlist state (per IDENTITY.md: "exec is currently BLOCKED (allowlist deadlock) — waiting on Mac mini human restart").

## Temporary workaround
None available without exec access.

## Recent occurrence
**Date:** 2026-03-31 04:30 UTC
**Cron ID:** c858a544-569e-44fd-94c2-5425c75da8ed
**Status:** Still unresolved - allowlist deadlock persists.

## Escalation
Human (Anurag) must restart the host or gateway to restore exec functionality.

---

## TICKET-OPS-20260331-EXEC-DEADLOCK | OPEN | P0 | ops | 2026-03-31T04:30:00Z

### Title
`exec` tool globally blocked by allowlist deadlock — ALL cron jobs failing

### Status
🔴 OPEN — Requires human (Anurag) intervention. Cannot be resolved by agents.

### Priority
**P0** — System-wide outage. All cron jobs are non-functional.

### Root Cause
The `exec` tool is denied system-wide due to an allowlist deadlock in the OpenClaw gateway configuration. Every command attempted (including `openclaw cron list`, `ls`, shell commands) returns:
```
{ "status": "error", "tool": "exec", "error": "exec denied: allowlist miss" }
```
This has been confirmed across multiple security modes (allowlist, full) and multiple subagent sessions.

### Impact: 18 Cron Jobs with Consecutive Errors
The following cron jobs are stuck and failing with consecutive errors due to exec being blocked:

**Named jobs:**
- `system-pulse-always-on-0001` — System health pulse
- `heartbeat-task-router-0001` — Task router heartbeat
- `inner-loop-research-0001` — Research agent inner loop
- `inner-loop-eng-0001` — Eng agent inner loop
- `9router-auth-watchdog-0001` — Auth watchdog
- `9router-token-refresh-0001` — Token refresh
- `9router-quota-sync-0001` — Quota sync
- `health-jsonl-writer-0001` — Health JSONL writer

**UUID jobs (8-10 additional):**
- `199a722c-5a9f-4df0-a7d6-71f8039ee187`
- `58248a42-7459-4341-9065-be5acc73f61e`
- `7d1f3378-1f52-48ee-a2d9-9c4aaf8f5c88`
- `2ef34ad2-e703-415d-8ad9-08a5acdfa1ca`
- `173f38b8-9f45-4236-b468-d6b8826c0ff0`
- `c8481b2a-45c9-47bf-9161-8e72fa387098`
- `76777b7a-c553-4669-9673-2bcdb5640481`
- `72729a38-d841-4eb4-a645-0a74289ab90a`
- `c858a544-569e-44fd-94c2-5425c75da8ed`
- `c66709c1-965b-4f5a-9469-e87c096f730b`
- `62138c65-7524-42db-838a-a1c018558e87`

**Total: ~18-19 jobs confirmed stuck**

### Secondary Issue: No cron tool access
Cannot check individual cron run histories, restart jobs, or diagnose per-job failures because all exec paths are blocked. The gateway itself needs to be restarted first.

### Required Fix
1. **Anurag must restart the OpenClaw gateway** on Mac mini:
   - Via CLI: `openclaw gateway restart`
   - Or: restart the machine
   - This clears the allowlist deadlock state
2. After gateway restart, agents can restart stuck cron jobs
3. All 18 jobs should auto-attempt on next run cycle

### History
- First detected: ~2026-03-30 (prior session)
- Confirmed: 2026-03-30 09:42 UTC (state-ops.json)
- Reconfirmed: 2026-03-31 04:30 UTC (this session)
- Duration: ~19+ hours of total system cron outage
- Multiple OPS subagents have confirmed same blockage
- Escalated to Anurag via Slack #redos-mission-control (2026-03-31 04:30 UTC)

### SLA Status
⚠️ **P0 BREACH** — System has been down >19 hours. P0 SLA = 30 minutes.
Immediate human intervention required.

---

## TICKET-OPS-20260331-CRON-RECOVERY | PENDING | P1 | ops | 2026-03-31T04:30:00Z

### Title
Post-gateway-restart: Restart and verify all 18 stuck cron jobs

### Status
🟡 PENDING — Blocked by TICKET-OPS-20260331-EXEC-DEADLOCK. Activate after gateway restart.

### Actions Required (after gateway restart)
1. Run `openclaw cron list --json` to see all job statuses
2. For each job with consecutive errors: check run history, identify failure reason
3. Restart all stuck jobs
4. Verify they complete at least one successful run
5. Update this ticket to CLOSED once all jobs green

### Jobs to verify:
- All 18 listed in TICKET-OPS-20260331-EXEC-DEADLOCK above

---

## TICKET-OPS-20260331-TELEGRAM-SECURITY | OPEN | P2 | infosec | 2026-03-31T04:30:00Z

### Title
Telegram DMs open to 7 unauthenticated accounts

### Status
🟠 OPEN — Security hardening needed. Not blocking operations.

### Details
7 Telegram accounts have open DM access. Fix options:
- Use pairing/allowlist approach
- Or add: `channels.telegram.accounts.*.allowFrom="*"` if open DMs are intentional

### Owner
INFOSEC agent to review and implement fix.
