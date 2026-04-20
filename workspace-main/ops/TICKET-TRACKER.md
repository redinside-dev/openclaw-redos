# TICKET-TRACKER.md - Active Tickets

## P0 (30 min SLA)

- **TICKET-20260418-EXEC-001** (2026-04-18 17:50 UTC): exec-approvals.json P0 RECURRING — gateway regenerates from internal config, wiping fix
  - Status: IN_PROGRESS
  - Impact:** CRITICAL — exec security (ask mode) silently disabled. All exec commands approve without user confirmation.
  - Root cause:** Gateway daemon regenerates exec-approvals.json from INTERNAL SOURCE CONFIG on restart/cycle. We keep patching the GENERATED output, not the source.
  - Fix:** ENG dispatched (subagent ae558d2a) to find and patch the gateway's source config file. Until fixed, INFOSEC will re-apply defaults.ask=on each time it goes missing.
  - Owner: ENG

## P1 (2 hour SLA)

## P2 (8 hour SLA)

- **TICKET-059** (2026-04-02 15:08): Gmail Unread Digest cron failing — exec allowlist deadlock
  - Status: RESOLVED (2026-04-02 23:08) — Gateway restarted, allowlist reset
  - Impact: Cannot run `gog gmail search` to fetch unread emails
  - Fix Needed: Restart gateway to reset exec allowlist, or add gog to allowlist

- **TICKET-20260417-001** (2026-04-17 23:39 UTC): Slack #redos-mission-control post failing — bot removed from channel after token rotation
  - Status: OPEN
  - Impact: RED cannot post to #redos-mission-control (C0AEV3MDEDD) — returns "Unknown channel"
  - Root cause: Slack tokens rotated on 2026-03-03 (per slack_activation_evidence.json). Bot may need re-invitation to channel.
  - Fix: RED or OPS to manually re-invite OpenClaw bot to #redos-mission-control in Slack workspace, or regenerate tokens
  - Owner: OPS
  - Priority: P2 — blocks all Slack mission-control posts from RED/other agents

- **TICKET-20260416-008** (2026-04-16 17:11): Budget telemetry broken — codexbar cost returns empty data
  - Status: OPEN
  - Impact: Cannot track spend vs $2/day $30/month limits
  - Symptom: `codexbar cost --provider codex/claude` returns `daily: []`, provider-quota.json is placeholder
  - Fix Needed: Investigate codexbar telemetry restoration or fix cost logging
  - Owner: OPS

- **TICKET-20260416-009** (2026-04-16 17:12): RESEARCH failed GOAL-009 status check — GOAL-009 files not found in RESEARCH workspace
  - Status: OPEN
  - Impact: Competitive positioning drafts (HN/Reddit versions A/B/C) may not have been created
  - Fix: RESEARCH needs to check HATAKE's earlier dispatch and deliver the drafts, OR RED needs to re-dispatch
  - Owner: RESEARCH

## COMPLETED

- **TICKET-060** (2026-04-12 22:00): Missing logging files and agent status files – system lacks logs for errors and routing decisions, and agent-status files for non‑RED agents are absent.
  - **Status:** RESOLVED (2026-04-16 04:15 UTC) — OPS created stub status files for all agent IDs (main, allrounder, eng, finance, ops, infosec, research, hatake, zen, codemod)
  - **Impact:** No visibility into errors or routing quality; cannot assess other agents' health.
  - **Fix Needed:** None — agent-status files created
  - **Owner:** OPS