---
title: Phase B — Autonomous Recovery Meta-Loop
date: 2026-06-08
status: APPROVED (user green-lit via /goal 2026-06-08)
author: claude (autonomous push)
---

# Phase B — Autonomous Recovery Meta-Loop

## Problem

User has 8 agents, 70+ crons, 41 launchd plists, 4 self-healer scripts. The infrastructure
is right. The **meta-loop is missing**. Watchdogs page on Telegram and stop. If the
self-healer is down, nothing restarts it. If a fix prevents a class of failures, the
prevention is never captured, so the same crash burns human time again.

**User signal:** "I am only stepping in now to fix the current state. By 'issues,' I mean
that problems will certainly arise, but the agents should be self-sufficient enough, with
self-healing and self-improvement capabilities, to resolve them on their own."

**Success metric:** zero-human-intervention days. Target: 7 consecutive days. Every
escalation to user recorded with a prevention rule.

## What already exists (do NOT rebuild)

- `alert-lib.sh` — Telegram/Slack/notification paging with cooldown. Good.
- `gateway-watchdog.sh` — Restarts gateway on port-down. Good.
- `cron-pipeline-watchdog.sh` — Pages on cron errors. Good.
- `autonomous-healer.sh` — 5-min cron: 9router, gateway, codex, stale tasks, factory. **Most
  of Phase B is already here.** Good.
- `agent-self-healer.sh` — 15-min cron: workspace files, consultant loop, etc. Good.
- TICKET-TRACKER.md and LEARNINGS.md — Markdown format agents already read. Good.
- 8 launchd agent plists. Good.
- 70 cron jobs. Good.

## What's missing

1. **No meta-owner.** No script asks "is `autonomous-healer.sh` itself still running?"
2. **No tickets created automatically.** OPS runs health-snapshot. Crons fire on fixed
   schedules. Nothing opens a TICKET when something breaks. The agents have no work in
   front of them — they sit idle.
3. **No agent dispatch.** Even if a ticket is opened, no path puts it in front of the right
   agent (ENG, INFOSEC, etc.). Agents only react to Telegram messages.
4. **No learning capture on close.** When a fix is applied, nothing appends to LEARNINGS.md
   in a structured way the next incident can grep.
5. **No trust metric.** No way to answer "how many days since the user last intervened?"
6. **Cascade is racy.** `autonomous-healer.sh` and `gateway-watchdog.sh` both restart the
   gateway. They have a 90s cascade guard but it's per-flag, not per-target.
7. **No L0 ground floor.** If the user's crontab is wiped (recovery scenario), nothing
   notices for 5–15 min. We need a launchd plist that itself watches crontab and the
   healer scripts.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ L0: launchd ground floor (crontab-watcher, autonomous-healer-watcher)│
│      ↓ if crontab empty OR healer died → repair + alert             │
├──────────────────────────────────────────────────────────────────────┤
│ L1: autonomous-healer.sh (5 min)  ──── already exists, extend        │
│      detect: 9router, gateway, codex, disk, factory                  │
│      auto-fix what it can                                            │
│      ↓ on unfixable: open ticket → alert (cooldown)                 │
├──────────────────────────────────────────────────────────────────────┤
│ L2: ops-ticket-router.sh (1 min) ──── NEW                            │
│      scan: $OPENCLAW/tickets/OPEN/                                   │
│      for each ticket: route to agent workspace inbox                │
│      track: tickets opened / closed / escalated                      │
│      ↓                                                               │
│ L3: agent works the ticket (already in scope of their work)         │
│      on close: append LEARNINGS.md + emit fixed-event               │
├──────────────────────────────────────────────────────────────────────┤
│ L4: trust-metric updater (15 min) ──── NEW                           │
│      compute: hours since last user intervention                     │
│      log: $OPENCLAW/state/autonomy-metrics.jsonl                    │
└──────────────────────────────────────────────────────────────────────┘
```

## Component design

### 1. `bin/l0-ground-floor.sh` (NEW)

Launchd plist, runs every 60s. Stateless, no dependencies, no jq/python.

- `crontab -l | grep -q autonomous-healer` → if empty, re-add the four crontab lines and page.
- `test -x $HOME/.openclaw/scripts/autonomous-healer.sh` → if missing, log (cannot recover; would need a backup).
- `pgrep -f autonomous-healer.sh` → if absent and `find /tmp/autonomous-healer.heartbeat -mmin +10`, page.
- `pgrep -f l0-ground-floor` → guard against own absence (launchd handles this).

### 2. Extend `autonomous-healer.sh` with ticket emission

For each check that fails AND cannot auto-fix within 2 minutes, append to
`$OPENCLAW/tickets/OPEN/TICKET-$(date +%Y%m%d-%H%M%S)-<tag>.md` using the existing
TICKET-TRACKER.md format. Then call `send_alert page` (cooldowned). Idempotent:
re-emit only if the same ticket ID isn't already open.

The new function `open_ticket()` lives in a new `bin/ops-ticket-lib.sh`.

### 3. `bin/ops-ticket-router.sh` (NEW)

Launchd plist, every 60s. Single responsibility: move OPEN tickets to the right
agent's workspace inbox. Does NOT do agent work — that's the agent's job.

- Read OPEN tickets.
- Match `Assignee:` field (default: ops).
- If assignee is an agent with a workspace, copy/link the ticket to
  `$OPENCLAW/workspace-<agent>/inbox/`.
- Once the agent posts a `Status: CLOSED` line, move the file to
  `$OPENCLAW/tickets/CLOSED/`.
- If ticket open > 8h SLA → escalate: post to `workspace-main/inbox/` (RED), and
  page critical.

### 4. `bin/ops-learning-capture.sh` (NEW)

Launchd plist, every 5 min. Scans CLOSED tickets, appends a structured entry to
`$OPENCLAW/workspace/ops/LEARNINGS.md` with:

```
## [TS] <Symptom>
**Cause:** <root cause>
**Fix:** <what worked>
**Prevention:** <what to check next time>
**Ticket:** <link>
```

Idempotent: skip if the ticket ID is already in LEARNINGS.md.

### 5. `bin/ops-trust-metric.sh` (NEW)

Launchd plist, every 15 min. Appends to
`$OPENCLAW/state/autonomy-metrics.jsonl`:

```json
{"ts":"...","hours_since_user_intervention":N,"open_tickets":M,
 "closed_last_24h":K,"escalated_last_24h":E}
```

User intervention = the script watches for a sentinel file
`$OPENCLAW/state/USER_INTERVENED` which a small wrapper around the user's first
post in a session writes. (Initial implementation: detect by absence of
`autonomy-metrics.jsonl` updates for >24h OR by manual sentinel.)

### 6. Test plan

- **Unit (offline):** `tests/test-ticket-format.sh`, `tests/test-route-ticket.sh`,
  `tests/test-learning-capture.sh`. Each creates a stub ticket, runs the
  component, asserts the file lands in the right place.
- **Chaos (live):** `tests/chaos-recovery.sh`:
  1. Kill gateway plist via `launchctl bootout`.
  2. Wait 90s.
  3. Assert: gateway plist re-loaded, port 18789 listening, a ticket was
     opened and closed by OPS, LEARNINGS.md gained an entry.
- **Trust score:** after 24h unattended, the metric should be > 24h.

### 7. Production readiness

- **Idempotency:** every state mutation is a file move/copy. Restart-safe.
- **Locking:** each script uses `flock` on a per-script lock file.
- **Backoff:** alert-lib.sh cooldowns prevent storms. Tickets are also
  deduped by tag.
- **Cascade guard:** extend the existing 90s flag pattern. Centralize in
  `bin/cascade-guard.sh` (NEW) — every restartable service has a flag in
  `/tmp/cascade-<service>.recent`.
- **Failure of the loop itself:** L0 ground floor alerts the user via
  Telegram if the rest of the loop has been dead > 10 min. (User explicitly
  asked: even with self-healing, *some* user-visible signal is needed for
  transparency. This is the one acceptable paged signal.)

## Out of scope (deferred)

- Replacing alert-lib.sh.
- Migrating cron jobs to launchd.
- Agent-side autonomy (each agent's work loop). Phase B is the meta-loop
  only.
- Replacing TICKET/LEARNINGS markdown format. They work; agents read them.

## Exit criteria

- [ ] All 7 components installed as launchd plists.
- [ ] All unit tests pass.
- [ ] Chaos test passes (gateway auto-recovery, end-to-end, with ticket + learning).
- [ ] 24h unattended run: `autonomy-metrics.jsonl` shows 24h+ since user intervention.
- [ ] User reports "I can stop watching."  ← this is the actual delivery.

## Risks and mitigations

- **L0 flood:** L0 itself could page every 60s if cascade guard fails. Mitigation: separate cooldown file, 1h cooldown on "L0 alert".
- **Disk full from tickets/logs:** Mitigation: logrotate on autonomy-metrics.jsonl (10MB), CLOSED tickets older than 30d moved to archive.
- **Stuck agent:** OPS or ENG stops responding. Mitigation: ops-ticket-router SLA escalation; main is the final backstop.
- **User intervenes in middle of a fix:** sentinel updates `autonomy-metrics.jsonl` to 0. No conflict with autonomous work — both can run.
