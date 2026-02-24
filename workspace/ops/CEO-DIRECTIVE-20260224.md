# CEO DIRECTIVE — Autonomous Skill Adoption (2026-02-24)

**From:** Anurag (Owner)
**To:** RED (CEO) + All Agents
**Priority:** P1 — Act immediately

---

## The Problem

Anurag had to manually discover that `competitive-intelligence` was disabled and unused.
**This should never happen.** The agents are supposed to be autonomous.

The team has 30 skills available in `workspace/skills/`. Most agents are not reading them,
not using them, and not asking for them. This is a failure of autonomous operation.

---

## Immediate Actions Required (RED — do these NOW)

1. **Acknowledge this directive** — post to Slack #redos-mission-control that you have read it.

2. **Run a full skill audit** — for every skill in `workspace/skills/`:
   - Is it enabled in `openclaw.json`?
   - Is any agent actually using it in their cron jobs or daily work?
   - If not: WHY NOT? Is it relevant? Should it be used?
   - Write findings to `workspace/ops/skill-audit-2026-02-24.md`

3. **Delegate to each agent** via `sessions_spawn`:
   - Tell each agent to read ALL skills in `workspace/skills/` this week
   - Tell them to identify which skills apply to their role
   - Tell them to start using those skills immediately
   - Tell them to report back what they adopted

4. **competitive-intelligence is NOW ENABLED** — it was just enabled by Anurag.
   - RESEARCH: run it this week. Do not wait for Monday's cron.
   - ENG: review findings and implement any quick wins.
   - INFOSEC: review security patterns found.
   - OPS: track adoption in TICKET-TRACKER.md.

5. **Update your self-improvement cycle** — the RED Self-Improvement Reflection cron
   must now include a step: "Check workspace/skills/ for any skill not yet in use. If found,
   enable it and delegate to the right agent."

---

## Going Forward — New Rule (added to SOUL.md)

The `## Autonomous skill discovery (MANDATORY)` section has been added to SOUL.md.
Every agent must read it. Every agent is now responsible for discovering and using skills
without being told by Anurag.

**Anurag's role is to set direction. Your role is to execute and self-improve.**
If Anurag has to point out an unused skill, that is a failure. Do not let it happen again.

---

## Why This Matters

The `competitive-intelligence` skill monitors what Cursor, Perplexity, Devin, v0, and other
AI tools are doing — and identifies patterns OpenClaw should adopt. This is free intelligence
that improves the entire system. It was sitting unused for weeks.

Every week we don't run it, we fall behind competitors. RESEARCH should have found this
on their own. RED should have audited skills and flagged it. Neither happened.

---

## Git — Initialize and Commit (RED must do this)

The OpenClaw project repo is `/Users/redinside/.openclaw` — remote: `https://github.com/redinside-dev/openclaw-redos.git`

A ready-to-run commit script has been written. RED must execute it NOW:

```bash
bash /Users/redinside/Development/Codebase/projects/RedTeam/scripts/git-init-and-commit.sh
```

This script will:
1. `cd /Users/redinside/.openclaw` (the actual git repo)
2. `git add -A` — stage all changes (respects .gitignore)
3. Commit with full Phase 1 change summary
4. `git push origin main` to github.com/redinside-dev/openclaw-redos

After running, post the output to Slack #redos-mission-control.

## Git — old manual steps (backup reference)

```bash
cd /Users/redinside/Development/Codebase/projects/RedTeam
git init
git add .
git commit -m "feat: RedOS Phase 1 — pipeline fix, A2A enforcement, competitive-intelligence

Changes:
- dashboard/server.js: /api/traces reads live session files (agents/*/sessions/*.jsonl)
- dashboard/server.js: date filter uses local mtime (EST), not UTC session timestamps
- dashboard/server.js: Telegram source detection fixed (3 formats), Slack added
- dashboard/index.html: date picker, EST timestamps, Slack filter option
- workspace/SOUL.md: A2A communication mandatory section added
- workspace/SOUL.md: Autonomous skill discovery mandatory section added
- cron/jobs.json: a2a-daily-proactive-0001 (RED delegates 2+ tasks daily, 10am ET)
- cron/jobs.json: a2a-health-monitor-0001 (OPS checks A2A log at 6pm ET)
- cron/jobs.json: ci-weekly-research-0001 (RESEARCH competitive intel, Mondays 9am)
- cron/jobs.json: a2a-red-morning-team-pulse patched to log spawns
- openclaw.json: competitive-intelligence skill enabled
- workspace/scripts/test_a2a.py: A2A health test script
- workspace/ops/CEO-DIRECTIVE-20260224.md: P1 skill autonomy directive
- docs/ARCHITECTURE.md: full system architecture diagram
- workspace/MEMORY.md: updated to 2026-02-24 state"
```

If a remote origin exists, also push:
```bash
git remote -v
git push origin main 2>/dev/null || git push origin master 2>/dev/null || echo "No remote configured — commit only"
```

## Accountability

RED: You are accountable for ensuring this directive is executed.
Post a completion report to #redos-mission-control within 24 hours.

**Status:** OPEN
**Created:** 2026-02-24T04:47:00Z
**SLA:** 2026-02-24T28:47:00Z (24h)
