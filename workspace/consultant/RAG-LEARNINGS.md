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

## [2026-03-10 23:00] Fix: 8 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** RES-TRENDS-20260310
ENG-GITHUB-20260310
OPS-HEALTH-20260310
OPS-WEBSITE-20260310
RES-TRENDS-20260310
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 8 stale tasks to PENDING: RES-TRENDS-20260310, ENG-GITHUB-20260310, OPS-HEALTH-20260310, OPS-WEBSITE-20260310, RES-TRENDS-20260310, ENG-GITHUB-20260310, OPS-HEALTH-20260310, OPS-WEBSITE-20260310
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 8 stale TODO tasks (>2h)"`.
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


## [2026-03-11 06:38] Fix: 2 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** CONSULTANT-OPS-20260311042152
CONSULTANT-RESEARCH-20260311042152
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 2 stale tasks to PENDING: CONSULTANT-OPS-20260311042152, CONSULTANT-RESEARCH-20260311042152
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 2 stale TODO tasks (>2h)"`.
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


## [2026-03-11 18:23] Fix: 3 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** RES-TRENDS-20260311
PRJ-ENG-20260311
CONSULTANT-OPS-20260311160444
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 3 stale tasks to PENDING: RES-TRENDS-20260311, PRJ-ENG-20260311, CONSULTANT-OPS-20260311160444
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 3 stale TODO tasks (>2h)"`.
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


## [2026-03-11 19:40] Fix: 2 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** ENG-GITHUB-20260311
OPS-HEALTH-20260311
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 2 stale tasks to PENDING: ENG-GITHUB-20260311, OPS-HEALTH-20260311
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 2 stale TODO tasks (>2h)"`.
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


## [2026-03-11 20:11] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 20:26] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 20:41] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 20:57] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 21:12] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 21:28] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 21:43] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 21:59] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 22:14] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 22:29] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 22:45] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 23:00] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 23:16] Fix: 3 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** OPS-CRITICAL-HEAL-20260312
CONSULTANT-OPS-20260311205720
CONSULTANT-OPS-20260311205720
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 3 stale tasks to PENDING: OPS-CRITICAL-HEAL-20260312, CONSULTANT-OPS-20260311205720, CONSULTANT-OPS-20260311205720
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 3 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-11 23:16] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 23:31] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-11 23:47] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 00:02] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 00:18] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 00:33] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 00:49] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 01:04] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 01:20] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 01:35] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 01:51] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 02:06] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 02:22] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 02:37] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 02:53] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 03:08] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 03:23] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 03:39] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 03:55] Fix: OpenClaw gateway not responding on :18789
**Severity:** L2
**Symptom:** HTTP health check failed
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Gateway restarted successfully
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='gateway_down'. Run `openclaw agent --agent ops --message "SELF-HEAL: OpenClaw gateway not responding on :18789"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=gateway_down to detect recurrence.


## [2026-03-12 03:55] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 04:10] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 04:26] Fix: 2 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** CONSULTANT-OPS-20260312022201
CONSULTANT-OPS-20260312022201
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 2 stale tasks to PENDING: CONSULTANT-OPS-20260312022201, CONSULTANT-OPS-20260312022201
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 2 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 04:26] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 04:41] Fix: 3 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** RES-TRENDS-20260312
CONSULTANT-OPS-20260312023731
CONSULTANT-OPS-20260312023731
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 3 stale tasks to PENDING: RES-TRENDS-20260312, CONSULTANT-OPS-20260312023731, CONSULTANT-OPS-20260312023731
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 3 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 04:41] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 04:57] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 05:12] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 05:28] Fix: 2 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** RES-TRENDS-20260313
PRJ-ENG-20260313
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 2 stale tasks to PENDING: RES-TRENDS-20260313, PRJ-ENG-20260313
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 2 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 05:28] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 05:43] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 05:59] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 06:15] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 06:30] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 06:46] Fix: 2 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** OPS-HEALTH-20260313
PRJ-ENG-20260313-B
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 2 stale tasks to PENDING: OPS-HEALTH-20260313, PRJ-ENG-20260313-B
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 2 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 06:46] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 07:01] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 07:17] Fix: 1 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** CONSULTANT-OPS-20260312022201
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 1 stale tasks to PENDING: CONSULTANT-OPS-20260312022201
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 1 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 07:17] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 07:32] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 07:48] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 08:04] Fix: 1 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** RES-TRENDS-20260312
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 1 stale tasks to PENDING: RES-TRENDS-20260312
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 1 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 08:04] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 08:19] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 08:35] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 08:50] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 09:06] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 09:22] Fix: 1 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** PRJ-ENG-20260313
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 1 stale tasks to PENDING: PRJ-ENG-20260313
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 1 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 09:22] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 09:37] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 09:53] Fix: 6 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** RES-TRENDS-20260313
OPS-HEALTH-20260313
PRJ-ENG-20260313-B
RES-TRENDS-20260314
PRJ-ENG-20260314
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 6 stale tasks to PENDING: RES-TRENDS-20260313, OPS-HEALTH-20260313, PRJ-ENG-20260313-B, RES-TRENDS-20260314, PRJ-ENG-20260314, OPS-HEALTH-20260314
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 6 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 09:53] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 10:09] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 10:24] Fix: 2 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** CONSULTANT-OPS-20260312080403
CONSULTANT-OPS-20260312080403
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 2 stale tasks to PENDING: CONSULTANT-OPS-20260312080403, CONSULTANT-OPS-20260312080403
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 2 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 10:24] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 10:40] Fix: 6 stale TODO tasks (>2h)
**Severity:** L1
**Symptom:** CONSULTANT-OPS-20260312022201
CONSULTANT-OPS-20260312022201
CONSULTANT-OPS-20260312023731
CONSULTANT-OPS-20260312023731
CONSULTANT-OPS-20260312025300
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Reset 6 stale tasks to PENDING: CONSULTANT-OPS-20260312022201, CONSULTANT-OPS-20260312022201, CONSULTANT-OPS-20260312023731, CONSULTANT-OPS-20260312023731, CONSULTANT-OPS-20260312025300, CONSULTANT-OPS-20260312025300
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='stale_tasks'. Run `openclaw agent --agent ops --message "SELF-HEAL: 6 stale TODO tasks (>2h)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=stale_tasks to detect recurrence.


## [2026-03-12 10:40] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 10:56] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 11:11] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 11:27] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 11:42] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 11:58] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 12:14] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 12:29] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 12:45] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 13:01] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 13:16] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 13:32] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 13:48] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 14:03] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 14:19] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 14:35] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 14:51] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 15:07] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 15:22] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 15:38] Fix: Channel errors in gateway log (4 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (4 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 15:38] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 15:54] Fix: Channel errors in gateway log (4 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (4 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 15:54] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 16:10] Fix: Channel errors in gateway log (6 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (6 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 16:10] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 16:26] Fix: Channel errors in gateway log (6 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (6 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 16:26] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 16:41] Fix: Channel errors in gateway log (6 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (6 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 16:41] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 16:57] Fix: Channel errors in gateway log (7 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (7 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 16:57] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 17:13] Fix: Channel errors in gateway log (7 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (7 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 17:13] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 17:29] Fix: Channel errors in gateway log (7 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (7 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 17:29] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 17:45] Fix: Channel errors in gateway log (7 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (7 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 17:45] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 18:01] Fix: Channel errors in gateway log (6 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (6 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 18:01] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 18:17] Fix: Channel errors in gateway log (7 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (7 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 18:17] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 18:33] Fix: Channel errors in gateway log (7 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Patched 2 cron jobs with missing delivery.channel
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (7 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 18:33] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 18:48] Fix: Channel errors in gateway log (7 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (7 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 18:48] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 19:04] Fix: Channel errors in gateway log (6 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (6 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 19:04] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 19:20] Fix: Channel errors in gateway log (6 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (6 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 19:20] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 19:36] Fix: Channel errors in gateway log (6 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (6 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 19:36] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 19:51] Fix: Channel errors in gateway log (5 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (5 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 19:51] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 20:07] Fix: Channel errors in gateway log (7 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (7 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 20:07] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 20:23] Fix: Channel errors in gateway log (6 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (6 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 20:23] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 20:39] Fix: Channel errors in gateway log (6 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (6 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 20:39] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 20:55] Fix: Channel errors in gateway log (10 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Could not read cron/jobs.json
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (10 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 20:55] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 21:11] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Patched 2 cron jobs with missing delivery.channel
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 21:11] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 21:27] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Patched 2 cron jobs with missing delivery.channel
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 21:27] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 21:42] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 21:42] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 21:58] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 21:58] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 22:14] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 22:14] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 22:31] Fix: Channel errors in gateway log (10 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (10 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 22:31] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 22:47] Fix: Channel errors in gateway log (8 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Patched 2 cron jobs with missing delivery.channel
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (8 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 22:47] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 23:03] Fix: Channel errors in gateway log (8 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (8 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 23:03] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 23:19] Fix: Channel errors in gateway log (8 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (8 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 23:19] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 23:36] Fix: Channel errors in gateway log (8 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (8 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 23:36] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-12 23:52] Fix: Channel errors in gateway log (8 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (8 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-12 23:52] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 00:08] Fix: Channel errors in gateway log (7 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (7 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 00:08] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 00:24] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 00:24] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 00:40] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 00:40] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 00:56] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 00:56] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 01:12] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 01:12] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 01:28] Fix: Channel errors in gateway log (9 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** Patched 2 cron jobs with missing delivery.channel
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (9 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 01:28] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 01:44] Fix: Channel errors in gateway log (8 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (8 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 01:44] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 02:00] Fix: Channel errors in gateway log (12 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (12 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 02:00] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 02:16] Fix: Channel errors in gateway log (12 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (12 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 02:16] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 02:32] Fix: Channel errors in gateway log (12 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (12 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 02:32] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 02:48] Fix: Channel errors in gateway log (11 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (11 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 02:48] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.


## [2026-03-13 02:58] Fix: Channel errors in gateway log (12 occurrences)
**Severity:** L1
**Symptom:** Cron jobs missing delivery.channel field
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** No channel-less cron jobs found (may be log noise)
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='channel_errors'. Run `openclaw agent --agent ops --message "SELF-HEAL: Channel errors in gateway log (12 occurrences)"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=channel_errors to detect recurrence.


## [2026-03-13 02:58] Fix: No task completions in last 24h
**Severity:** L3
**Symptom:** Agents may be stuck — no entries added to tasks-log.md
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** OPS agent tasked to investigate and inject new work
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='no_completions'. Run `openclaw agent --agent ops --message "SELF-HEAL: No task completions in last 24h"`.
**Pattern to watch:** Re-run diagnostic check for issue_id=no_completions to detect recurrence.

