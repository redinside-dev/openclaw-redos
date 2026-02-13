---
name: status-reporter
description: Generate an operational status report (Full mode=C) from OpenClaw workspace trackers + cron jobs. Use when Anurag asks for status, progress, what’s next, weekly rollup, or combined task tracker summary.
---

# status-reporter

## What it reads
- `DAILY_TASKS.md`
- `ZEN_DAILY_TASKS.md`
- `COMBINED_TASK_TRACKER.md`
- `WEEKLY_SUMMARY.md`
- Cron jobs: `~/.openclaw/cron/jobs.json`

## Run

```bash
python3 /Users/redinside/.openclaw/workspace/skills/status-reporter/scripts/status_reporter.py --mode full
```

## Output
- Markdown report (written to workspace)
- Also prints a concise console summary suitable to paste into Telegram

## Notes
- Does not message anyone; just generates reports.
- “Full” = Today + This Week + Next/Blocked + Cron snapshot.
