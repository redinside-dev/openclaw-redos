# Nightly Eval — Episode Analysis + Autonomy Scorecard
**Date:** 2026-03-10  
**Generated:** 2026-03-10 01:39 UTC (OPS nightly eval cron)  
**Period:** Last 24 hours (2026-03-09 01:37 – 2026-03-10 01:37 UTC)

---

## 📊 Summary

- **Total episodes analyzed:** 16
- **Success rate:** 87.50% (14 success / 2 failed)
- **Failure rate:** 12.50%
- **Autonomy score:** 100% (1/1 tasks verified)

---

## 🏆 Autonomy Scorecard

| Metric | Value |
|--------|-------|
| Real Autonomy Score | **100%** |
| Dispatched tasks (24h) | 1 |
| Verified completions (24h) | 1 |
| Per‑agent breakdown | ops: 1/1 |

*Source: `scripts/calculate-autonomy-score.js` (updated STATE.yaml)*

---

## 🧠 Episode Analysis

### Failure Clusters (top 5)

| Count | Error Type | Tool | Agent |
|-------|------------|------|-------|
| 2 | unknown | None | None |

*All failures shared the same pattern: missing error metadata.*

---

## 🔝 Top 3 Recurring Failure Patterns

1. **2 occurrences** – `unknown` (tool: None, agent: None)  
   *Likely cause: Episodes with missing or unparseable error information. Recommend improving error capture in cron seeds and ensuring all failure pathways set explicit error_type, tool, and agent fields.*

2. *No other patterns (remaining 0 failures)*

---

## 🛠️ Recommended Fixes

### 1. Enhance Error Metadata in Cron Seeds
- Add structured error capturing in cron job wrappers to always populate `error_type`, `tool`, and `agent` even on unexpected exceptions.
- Suggested deny_pattern additions: Reject episodes where any of `error_type`, `tool`, `agent` are null or "None".

### 2. Investigate Unknown Failures
- Query `episodes.jsonl` for entries with `error_type = "unknown"` and inspect `context_chain` to trace root cause.
- Potential culprits: unhandled exceptions in cron jobs that don't map to known error categories.

---

## 🚨 Alerts (Thresholds)

- **Failure rate > 15%?** No (12.50%) – No Telegram alert sent.
- **Autonomy score < 70%?** No (100%) – No RED escalation required.

---

## 📝 Notes

- The episodes.jsonl file contained a mix of historical and recent entries; filter successfully isolated 16 episodes from the last 24h.
- The autonomy score remains at 100%, indicating all dispatched tasks were completed successfully today.
- No new deny_pattern recommendations beyond improving error metadata completeness.
