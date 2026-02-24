# Runbook — Continuous Improvement + Self-Healing (MVP)

## What this adds

1) **Continuous Improvement logging**
- Every cron run completion is ingested from `cron/runs/*.jsonl`.
- Each finished run becomes a structured entry in: `workspace/ops/ci/ci-log.jsonl`.

2) **Weekly summarizer**
- Rolls the last 7 days of `ci-log.jsonl` into:
  - `workspace/ops/ci/WEEKLY-SUMMARY.md`
  - A new `LEARNING-...` entry appended to `workspace/ops/LEARNINGS.md`

3) **Self-healing guardrail (health snapshot → tickets)**
- Scans recent `logs/errors.jsonl`, `logs/gateway.err.log`, `logs/health.jsonl`, and CI failures.
- Detects **recurring patterns** and automatically opens tickets in `workspace/ops/TICKET-TRACKER.md` (only if the pattern isn’t already present).

## Dry-run verification (no external posting)

Run these from any agent that has `exec`:

### 1) CI ingestion dry-run
```bash
python3 /Users/redinside/.openclaw/workspace/scripts/ci_event_logger.py --dry-run --since-minutes 10080
```
Expected:
- Prints `DRY_RUN: would append N CI events` and shows a sample JSON.

### 2) Weekly summarizer dry-run
```bash
python3 /Users/redinside/.openclaw/workspace/scripts/weekly_ci_summarizer.py --dry-run
```
Expected:
- Prints a markdown summary preview.

### 3) Health snapshot ticketing dry-run
```bash
python3 /Users/redinside/.openclaw/workspace/scripts/health_snapshot_ticket.py --dry-run --window-hours 24 --threshold 3
```
Expected:
- Prints either `DRY_RUN: would open tickets: ...` or `DRY_RUN: no new recurring patterns`.

## Live mode (cron)

These jobs are intended to be run by OpenClaw cron and **should not send messages**.
They print `NO_REPLY` on no-op, and a short status string when they write files.

## Operational notes

- If `ci-log.jsonl` grows too large, rotate it monthly (keep last 90 days) and start a new file.
- If ticket spam occurs, raise the `--threshold` or add a denylist of signatures.
