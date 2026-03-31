---
title: "Exec blocked - Telegram Approval Monitor cannot run"
status: IN_PROGRESS
priority: P1
agent: RED
created: 2025-06-18T17:36:00Z
updated: 2025-06-18T17:36:00Z
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
**Date:** 2026-03-31 02:33 UTC
**Cron ID:** c858a544-569e-44fd-94c2-5425c75da8ed
**Status:** Still unresolved - allowlist deadlock persists.

## Escalation
Human (Anurag) must restart the host or gateway to restore exec functionality.
