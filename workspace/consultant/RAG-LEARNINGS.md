# Consultant RAG Learnings

Append-only structured knowledge base. Each entry is indexed into Qdrant by the
`semantic-memory-reindex-0001` cron so agents can find and self-apply these fixes.

---

## [2026-03-10] Fix: Initial consultant baseline established
**Symptom:** No autonomous consultant running; agents only respond when prompted.
**Root cause:** Missing persistent observation layer to detect and fix issues proactively.
**Fix applied:** Deployed consultant-daemon.py as launchd service ai.openclaw.consultant.
**How agents can self-fix:** Agents should periodically read this file via RAG query for known fix patterns.
**Pattern to watch:** If no entries added for >48h, consultant may be down — check `launchctl list ai.openclaw.consultant`.

## [2026-03-10 23:00] Fix: 8 stale IN_PROGRESS tasks (>2h)
**Severity:** L1
**Symptom:** RES-TRENDS-20260310
ENG-GITHUB-20260310
OPS-HEALTH-20260310
OPS-WEBSITE-20260310
RES-TRENDS-20260310
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 8 stale tasks to PENDING: RES-TRENDS-20260310, ENG-GITHUB-20260310, OPS-HEALTH-20260310, OPS-WEBSITE-20260310, RES-TRENDS-20260310, ENG-GITHUB-20260310, OPS-HEALTH-20260310, OPS-WEBSITE-20260310
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 8 stale IN_PROGRESS tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-10 23:01] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Failed to reach OPS agent
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-10 23:03] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Failed to reach OPS agent
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-10 23:04] Fix: Coding factory stalled — last SPEC.md is 64h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Failed to reach RESEARCH agent
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 64h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-10 23:04] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-10 23:04] Fix: Coding factory stalled — last SPEC.md is 64h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 64h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-10 23:19] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-10 23:19] Fix: Coding factory stalled — last SPEC.md is 64h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 64h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-10 23:34] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-10 23:34] Fix: Coding factory stalled — last SPEC.md is 64h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 64h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-10 23:49] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-10 23:49] Fix: Coding factory stalled — last SPEC.md is 65h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 65h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 00:04] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 00:04] Fix: Coding factory stalled — last SPEC.md is 65h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 65h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 00:19] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 00:19] Fix: Coding factory stalled — last SPEC.md is 65h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 65h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 00:34] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 00:34] Fix: Coding factory stalled — last SPEC.md is 65h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 65h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 00:49] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 00:49] Fix: Coding factory stalled — last SPEC.md is 66h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 66h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 01:05] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 01:05] Fix: Coding factory stalled — last SPEC.md is 66h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 66h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 01:20] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 01:20] Fix: Coding factory stalled — last SPEC.md is 66h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 66h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 01:35] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 01:35] Fix: Coding factory stalled — last SPEC.md is 66h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 66h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 01:50] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 01:50] Fix: Coding factory stalled — last SPEC.md is 67h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 67h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 02:05] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 02:05] Fix: Coding factory stalled — last SPEC.md is 67h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 67h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 02:20] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 02:20] Fix: Coding factory stalled — last SPEC.md is 67h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 67h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 02:35] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 02:35] Fix: Coding factory stalled — last SPEC.md is 67h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 67h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 02:50] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 02:50] Fix: Coding factory stalled — last SPEC.md is 68h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 68h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 03:06] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 03:06] Fix: Coding factory stalled — last SPEC.md is 68h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 68h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 03:21] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 03:21] Fix: Coding factory stalled — last SPEC.md is 68h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 68h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 03:36] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 03:36] Fix: Coding factory stalled — last SPEC.md is 68h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 68h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 03:51] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 03:51] Fix: Coding factory stalled — last SPEC.md is 69h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 69h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 04:06] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 04:06] Fix: Coding factory stalled — last SPEC.md is 69h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 69h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 04:21] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 04:21] Fix: Coding factory stalled — last SPEC.md is 69h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 69h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 04:37] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 04:37] Fix: Coding factory stalled — last SPEC.md is 70h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 70h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 04:52] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 04:52] Fix: Coding factory stalled — last SPEC.md is 70h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 70h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 05:07] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 05:07] Fix: Coding factory stalled — last SPEC.md is 70h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 70h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 05:22] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 05:22] Fix: Coding factory stalled — last SPEC.md is 70h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 70h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 05:37] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 05:37] Fix: Coding factory stalled — last SPEC.md is 71h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 71h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 05:53] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 05:53] Fix: Coding factory stalled — last SPEC.md is 71h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 71h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 06:08] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 06:08] Fix: Coding factory stalled — last SPEC.md is 71h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 71h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 06:23] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 06:23] Fix: Coding factory stalled — last SPEC.md is 71h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 71h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 06:38] Fix: 2 stale IN_PROGRESS tasks (>2h)
**Severity:** L1
**Symptom:** CONSULTANT-OPS-20260311042152
CONSULTANT-RESEARCH-20260311042152
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 2 stale tasks to PENDING: CONSULTANT-OPS-20260311042152, CONSULTANT-RESEARCH-20260311042152
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 2 stale IN_PROGRESS tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-11 06:38] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 06:38] Fix: Coding factory stalled — last SPEC.md is 72h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 72h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 06:54] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 06:54] Fix: Coding factory stalled — last SPEC.md is 72h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 72h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 07:09] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 07:09] Fix: Coding factory stalled — last SPEC.md is 72h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 72h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 07:24] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 07:24] Fix: Coding factory stalled — last SPEC.md is 72h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 72h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 07:39] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 07:39] Fix: Coding factory stalled — last SPEC.md is 73h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 73h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 07:54] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 07:54] Fix: Coding factory stalled — last SPEC.md is 73h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 73h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 08:10] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 08:10] Fix: Coding factory stalled — last SPEC.md is 73h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 73h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 08:25] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 08:25] Fix: Coding factory stalled — last SPEC.md is 73h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 73h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 08:40] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 08:40] Fix: Coding factory stalled — last SPEC.md is 74h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 74h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 08:55] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 08:55] Fix: Coding factory stalled — last SPEC.md is 74h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 74h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 09:11] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 09:11] Fix: Coding factory stalled — last SPEC.md is 74h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 74h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 09:26] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 09:26] Fix: Coding factory stalled — last SPEC.md is 74h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 74h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 09:41] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 09:41] Fix: Coding factory stalled — last SPEC.md is 75h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 75h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 09:57] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 09:57] Fix: Coding factory stalled — last SPEC.md is 75h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 75h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 10:12] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 10:12] Fix: Coding factory stalled — last SPEC.md is 75h old
**Severity:** L3
**Symptom:** RESEARCH → ENG pipeline needs a trigger
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** RESEARCH agent tasked to restart coding factory
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='factory_stalled'. Run `openclaw agent --agent ops --message "SELF-HEAL: Coding factory stalled — last SPEC.md is 75h old"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=factory_stalled to detect recurrence.


## [2026-03-11 10:27] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 10:42] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 10:58] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 11:13] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 11:28] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 11:44] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 11:59] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 12:14] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 12:30] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 12:45] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 13:00] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 13:15] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 13:31] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 13:46] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 14:02] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 14:17] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 14:32] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 14:47] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 15:03] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 15:18] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 15:34] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 15:49] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 16:04] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 16:20] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 16:35] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 16:50] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 17:06] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 17:21] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 17:37] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 17:52] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 18:07] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 18:23] Fix: 3 stale IN_PROGRESS tasks (>2h)
**Severity:** L1
**Symptom:** RES-TRENDS-20260311
PRJ-ENG-20260311
CONSULTANT-OPS-20260311160444
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 3 stale tasks to PENDING: RES-TRENDS-20260311, PRJ-ENG-20260311, CONSULTANT-OPS-20260311160444
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 3 stale IN_PROGRESS tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-11 18:23] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 18:38] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 18:53] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 19:09] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 19:24] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 19:40] Fix: 2 stale IN_PROGRESS tasks (>2h)
**Severity:** L1
**Symptom:** ENG-GITHUB-20260311
OPS-HEALTH-20260311
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 2 stale tasks to PENDING: ENG-GITHUB-20260311, OPS-HEALTH-20260311
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 2 stale IN_PROGRESS tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-11 19:40] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 19:55] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.

