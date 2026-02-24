# Skill: autonomy-scorecard

**Used by OPS agent in the daily autonomy scorecard cron.**

## Purpose

Make autonomy measurable. Compute a daily score from real runtime data so the team knows exactly where they stand on the path to 100% AI autonomy — without Anurag having to ask.

---

## Scorecard Computation (run daily at 9:05am ET)

### Input files to read:
1. `../cron/jobs.json` — cron job states
2. `../workspace/logs/a2a-delegations.jsonl` — A2A activity (today's entries)
3. `../workspace/ops/TICKET-TRACKER.md` — open tickets
4. `../workspace/tmp/provider-quota.json` — cost data (if available)
5. `../workspace/logs/tool-validation-errors.jsonl` — tool call failures (if exists)

### Metrics to compute:

**1. Cron success rate (last 24h)**
- Count jobs where `state.lastStatus == "ok"` AND `state.lastRunAtMs > (now - 86400000)`
- Count jobs where `state.lastStatus == "error"` in same window
- Score: `ok / (ok + error) * 100`%

**2. A2A activity (today)**
- Count lines in `a2a-delegations.jsonl` where `ts` is today's date
- Target: ≥10 interactions/day = healthy

**3. Open ticket count by priority**
- Count lines matching `OPEN` or `IN_PROGRESS` in TICKET-TRACKER.md
- Count P0/P1 separately (critical)

**4. Delivery success rate**
- From cron states: count `lastDelivered: true` vs `lastDelivered: false`
- Score: `delivered / total * 100`%

**5. Tool validation errors (today)**
- Count lines in `tool-validation-errors.jsonl` where `ts` is today
- Target: 0

### Overall autonomy score (1-10):
```
base = 5
+ 1 if cron_success_rate >= 95%
+ 1 if a2a_count >= 10
+ 1 if open_p0_p1_tickets == 0
+ 1 if delivery_success_rate >= 95%
+ 1 if tool_validation_errors == 0
```

---

## Output

Post to Slack `channel:C0AEV3MDEDD` (`#redos-mission-control`):

```
AUTONOMY SCORECARD — YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score: X/10

✅ Cron success: XX% (N ok, N error)
✅ A2A activity: N interactions today
✅ Open P0/P1 tickets: N
✅ Delivery success: XX%
✅ Tool errors: N

Status: [HEALTHY / NEEDS ATTENTION / CRITICAL]
Next action: [one line — what OPS will do about the lowest score]
```

Also write the scorecard to `../workspace/ops/AUTONOMY-SCORE-YYYY-MM-DD.json`:
```json
{
  "date": "YYYY-MM-DD",
  "score": 8,
  "cron_success_rate": 97,
  "a2a_count": 14,
  "open_p0_p1": 0,
  "delivery_success_rate": 100,
  "tool_errors": 0
}
```

---

## Self-healing trigger

If score drops below 6:
1. Open a P1 ticket: "Autonomy score dropped to X/10 — investigate"
2. `sessions_send` RED immediately with the scorecard
3. Identify the lowest-scoring metric and take one corrective action autonomously
