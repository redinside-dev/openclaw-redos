# Continuous Improvement (CI) Loop

This folder contains lightweight, file-based automation that makes RedOS **self-improving** and **self-healing**.

## Files

- `ci-log.jsonl` — structured run outcomes (success/failure + root cause + next improvements)
- `ci-event-logger.state.json` — ingestion state (last processed timestamps)
- `WEEKLY-SUMMARY.md` — weekly rollup generated from `ci-log.jsonl`

## Scripts

- `workspace/scripts/ci_event_logger.py`
- `workspace/scripts/weekly_ci_summarizer.py`
- `workspace/scripts/health_snapshot_ticket.py`

All scripts support `--dry-run`.
