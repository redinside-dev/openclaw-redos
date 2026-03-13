# Nightly Eval Report — 2026-03-12

## Summary

- **Total episodes analyzed:** 42
- **Success rate:** 80.95% (34/42)
- **Failure rate:** 19.05% (8/42)
- **Data time range:** March 11, 2026 (most recent episode: 2026-03-11T05:46Z)

## Failure Clustering

| Count | Error Type | Tool | Agent |
|-------|------------|------|-------|
| 4 | unknown | None | ops |
| 3 | unknown | None | main |
| 1 | None | None | main |

## Top 3 Recurring Failure Patterns & Proposed Fixes

### Pattern 1: 4 occurrences
- **Error:** unknown
- **Tool:** None
- **Agent:** ops
- **Proposed fix:** Add better error classification. Capture full exceptions and improve logging. Many cron jobs timing out - consider increasing timeout or optimizing job execution.

### Pattern 2: 3 occurrences
- **Error:** unknown
- **Tool:** None
- **Agent:** main
- **Proposed fix:** Add better error classification. Capture full exceptions and improve logging.

### Pattern 3: 1 occurrences
- **Error:** None (successful task recorded as failure)
- **Tool:** None
- **Agent:** main
- **Proposed fix:** Investigate outcome classification logic in episode seeding.


## Autonomy Scorecard

**Date:** 2026-03-11
**Score:** 8/10 ✅

| Metric | Value | Target |
|--------|-------|--------|
| Cron success rate | 83.3% | ≥95% |
| A2A activity | 115 interactions | ≥10 |
| Open P0/P1 tickets | 0 | 0 |
| Delivery success rate | 86.7% | ≥95% |
| Tool errors | 0 | 0 |

**Status:** HEALTHY

**Next action:** Investigate failing cron jobs and improve error handling.

## Alerts Triggered

- ⚠️ **FAILURE RATE ALERT**: 19.05% failure rate is above 15% threshold — Telegram DM sent to user

## Deny Pattern Recommendations

No new deny_pattern recommendations identified. The main issues are:
1. Cron job timeouts (unknown errors) — consider increasing timeout values
2. Need better error classification in episode seeding
