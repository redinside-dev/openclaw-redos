# RESEARCH → OPS triage handoff (2026-03-13)

## Priority ranking (current)
1. **P0 — web_search quota/auth outage** (external dependency, blocks research operations)
2. **P0 — consultant recursive stall containment** (local blast-radius control; stop loop while quota is restored)
3. **P1 — A2A timeout cluster** (coordination degradation)
4. **P1 — provider/model config faults** (unknown agent ids, auth/config mismatches)
5. **P2 — memory pressure cleanup** (94% usage; amplifies latency/timeouts)

> Recommendation: run **quota escalation + consultant circuit-breaker in parallel**. Don’t wait on one to start the other.

---

## A2A timeout patterns (scope)
Primary evidence: `../workspace/logs/audit.jsonl`

- **76** entries with `timeout>120s`
- **64** entries with `Unknown agent id` (large burst on 2026-03-07)
- **15** entries with `dmPolicy: Invalid option` config validation failures

### Pattern classes
1. **Hard timeout pattern**
   - Repeated `attempt 3/3: timeout>120s` in warmup/delegation flows
   - Indicates queueing/latency + retries exhausting max attempts

2. **Routing/identity pattern**
   - `Unknown agent id "eng"|"ops"|"research"|"infosec"`
   - Suggests agent registry mismatch during that period

3. **Config schema pattern**
   - Invalid `telegram.accounts.*.dmPolicy` values
   - Causes immediate failure before delegation succeeds

4. **Partial degradation pattern**
   - Some runs show one agent timing out while others succeed
   - Indicates non-uniform lane/provider contention, not total outage

---

## Cron failure analysis (quick pass)
Evidence sources:
- `../workspace/research/morning-failure-cluster-brief.md` (30+ cron failures reported)
- `../workspace/logs/error-digest.md` (high timeout/auth/fs-error background)
- `../workspace/logs/health.jsonl` (cron consecutive error states)

Observed likely contributors:
- Timeout saturation (`timeout` class present in digest)
- Upstream auth failures (web_search 401)
- FS/sandbox-path errors in scheduled tasks
- Lane wait amplification during degraded windows

---

## Consultant loop pattern
From prior cluster brief and tracker notes:

`consultant detects no completions` → `injects assignment` → `A2A/cron execution fails` → `no completion recorded` → `re-inject`

Containment needed:
- Add recursion/cooldown guard (max retries per task per window)
- Require successful state transition before reinjection
- Backoff with jitter and dead-letter after N failures

---

## Immediate coordinated recovery order (ops-friendly)
1. **Contain loop now** (circuit-breaker + cooldown)
2. **Open/track human quota restore now** (external)
3. **Fix agent-id registry + dmPolicy schema**
4. **Tune timeout/retry policy for A2A + cron overlap windows**
5. **Memory pressure cleanup + process pruning**
6. **Re-enable normal consultant injection after 2 green cycles**

---

## Notes on A2A delegation logs
- `workspace-research/logs/a2a-delegations.jsonl` currently has historical entries (18 lines), many timeouts.
- `../workspace/logs/a2a-delegations.jsonl` is sparse currently; most recent line is a failed label-based send.
- For full scope, `audit.jsonl` is currently the best canonical timeout source.
