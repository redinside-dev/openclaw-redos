# ENG-003: Telemetry Pipeline Restoration

**Ticket:** TICKET-20260324-ENG-003
**Owner:** ENG
**Priority:** P0 (highest)
**Date:** 2026-03-24
**Status:** Restoration Plan Complete — Ready for Execution

---

## Problem Statement

Three critical telemetry streams are dark/stale, leaving optimization and reliability decisions blind:

| Stream | File | Last Fresh Entry | Impact |
|--------|------|-----------------|--------|
| **Routing decisions** | `routing-decisions.jsonl` | Unknown (stale) | Cannot evaluate model fallback patterns, circuit breaker effectiveness (ENG-001), or routing profile tuning |
| **Health** | `health.jsonl` | Unknown (stale) | OPS watchdog/self-healing has no data to act on; silent failures go undetected (GOAL-002) |
| **Cost telemetry** | Cost logs (endpoint-based) | Unknown (stale) | FINANCE cannot track spend, budget guardrails are unenforced, GOAL-004 KPI unmeasurable |

**Root cause hypothesis:** Gateway restart on 2026-03-24 16:30 UTC may have cleared in-memory writer state. But the staleness predates the restart — likely a regression in the telemetry writer pipeline during a prior config change or gateway update.

## Diagnostic Plan

### Step 1: Verify File State

```bash
# Check if files exist and have recent content
ls -la ~/.openclaw/logs/routing-decisions.jsonl ~/.openclaw/logs/health.jsonl
tail -5 ~/.openclaw/logs/routing-decisions.jsonl
tail -5 ~/.openclaw/logs/health.jsonl

# Check cost telemetry endpoint
curl -s http://127.0.0.1:18789/api/mission-control/costs | head -20

# Check file permissions (writer may be blocked)
stat -f '%Sp %Su %Sg' ~/.openclaw/logs/*.jsonl
```

### Step 2: Verify Writer Configuration

```bash
# Check if telemetry is enabled in config
openclaw config get telemetry
openclaw config get logging

# Check gateway logs for telemetry-related errors
grep -i "telemetry\|routing-decisions\|health.jsonl\|cost" ~/.openclaw/logs/gateway.err.log | tail -20
```

### Step 3: Check Writer Process

```bash
# Is the gateway actually invoking telemetry writers?
grep -i "emit\|write\|telemetry\|jsonl" ~/.openclaw/logs/gateway.out.log | tail -20

# Check if disk is full (common silent failure)
df -h ~/.openclaw/logs/
```

## Restoration Plan

### Phase 1: Immediate — Get Streams Flowing (30min)

#### 1a. Routing Decisions (`routing-decisions.jsonl`)

**Where it should be written:** In `resilient-handler.js` (or equivalent), after each model routing decision.

**Expected entry format:**
```jsonl
{"ts":"2026-03-24T16:35:00Z","event":"routing_decision","model_requested":"claude-sonnet","model_used":"claude-sonnet","provider":"anthropic","latency_ms":1234,"tokens_in":500,"tokens_out":200,"cache_hit":false,"fallback":false,"fallback_reason":null}
{"ts":"2026-03-24T16:35:01Z","event":"routing_decision","model_requested":"gpt-4o","model_used":"claude-sonnet","provider":"anthropic","latency_ms":890,"tokens_in":300,"tokens_out":150,"cache_hit":true,"fallback":true,"fallback_reason":"rate_limit"}
```

**Fix checklist:**
- [ ] Verify `resilient-handler.js` has telemetry emit call after routing completion
- [ ] Verify the emit function writes to `~/.openclaw/logs/routing-decisions.jsonl`
- [ ] Verify no try/catch is silently swallowing write errors
- [ ] Add missing fields if schema has drifted: `cache_hit`, `fallback`, `fallback_reason`, `circuit_breaker_state` (for ENG-001)
- [ ] Test: make one model request, verify new entry appears in file

#### 1b. Health (`health.jsonl`)

**Where it should be written:** Health check loop (likely a setInterval in the gateway main process).

**Expected entry format:**
```jsonl
{"ts":"2026-03-24T16:35:00Z","event":"health_check","gateway":"ok","websocket":"ok","agents_active":5,"sessions_active":376,"memory_mb":245,"cron_jobs_enabled":30,"errors_last_5m":0}
```

**Fix checklist:**
- [ ] Verify health check interval is configured and running (check for `setInterval` or equivalent)
- [ ] Verify the interval survived the gateway restart (intervals lost on restart if not re-registered)
- [ ] Verify write path is correct (`~/.openclaw/logs/health.jsonl`)
- [ ] If interval is missing: add it — 60s interval, write health snapshot
- [ ] Test: wait 60s after fix, verify new entry appears

#### 1c. Cost Telemetry

**Where it should be written:** After each model response, extract token counts and compute cost.

**Expected data flow:**
```
Model response → extract usage (tokens_in, tokens_out, cache_read, cache_write)
  → look up per-model pricing from routing-profiles.json
  → write to cost log / update in-memory accumulator
  → serve via /api/mission-control/costs endpoint
```

**Fix checklist:**
- [ ] Verify cost accumulator is initialized on gateway start (not just on first request)
- [ ] Verify per-model pricing table is populated in `routing-profiles.json`
- [ ] Verify `/api/mission-control/costs` endpoint is registered and returns data
- [ ] Verify cost data persists across gateway restarts (file-backed, not just in-memory)
- [ ] Test: make one model request, check `/api/mission-control/costs` reflects it

### Phase 2: Freshness Guardrail (1h)

Add a **staleness detector** that alerts when any telemetry stream goes dark.

```typescript
interface TelemetryFreshnessCheck {
  stream: string;
  filePath: string;
  maxStalenessMs: number;   // alert if no new entry in this window
  checkIntervalMs: number;  // how often to check
}

const FRESHNESS_CHECKS: TelemetryFreshnessCheck[] = [
  { stream: "routing-decisions", filePath: "~/.openclaw/logs/routing-decisions.jsonl", maxStalenessMs: 300000, checkIntervalMs: 60000 },  // 5min max staleness
  { stream: "health", filePath: "~/.openclaw/logs/health.jsonl", maxStalenessMs: 120000, checkIntervalMs: 60000 },                        // 2min max staleness
  { stream: "cost", filePath: null, maxStalenessMs: 600000, checkIntervalMs: 300000 },                                                     // 10min max staleness (via API)
];
```

**Staleness check logic:**
```typescript
function checkFreshness(check: TelemetryFreshnessCheck): void {
  const lastEntry = getLastEntryTimestamp(check.filePath);
  const staleness = Date.now() - lastEntry;
  
  if (staleness > check.maxStalenessMs) {
    emitIncident({
      type: "telemetry_stale",
      stream: check.stream,
      stalenessMs: staleness,
      maxAllowedMs: check.maxStalenessMs,
      remediation: `Check ${check.filePath} writer. Gateway restart may be needed.`,
    });
  }
}
```

**Dedup:** Use incident dedup from ENG-001 — key = `telemetry_stale:${stream}`, window = 30min.

### Phase 3: Downstream Verification (30min)

Verify consumers of telemetry data are working:

| Consumer | What it reads | Verification |
|----------|---------------|-------------|
| Dashboard cost tab | `/api/mission-control/costs` | Load dashboard, check cost chart updates |
| OPS health monitors | `health.jsonl` | Verify OPS watchdog processes new entries |
| FINANCE cost reports | Cost API + `routing-decisions.jsonl` | Verify `finance-weekly-cost-report` cron can read data |
| Routing optimizer | `routing-decisions.jsonl` | Verify routing profile auto-tuning (if implemented) reads fresh data |
| ENG-001 circuit breaker | `routing-decisions.jsonl` | Verify circuit breaker events will appear in stream (after ENG-001 implementation) |

### Phase 4: Log Rotation (maintenance)

STATE.yaml notes `gateway.err.log` is 2.5M+ lines since 2026-03-12. Apply rotation to all log files:

```bash
# Add to launchd or cron — daily rotation
# Rotate files > 50MB, keep 7 days
find ~/.openclaw/logs/ -name "*.jsonl" -size +50M -exec sh -c 'mv "$1" "$1.$(date +%Y%m%d)" && touch "$1"' _ {} \;
find ~/.openclaw/logs/ -name "*.jsonl.*" -mtime +7 -delete
```

## Next Steps

1. **Diagnose** — run diagnostic commands (Step 1-3 above) to identify exact failure point
2. **Fix routing-decisions writer** — most likely a missing emit call or broken file path post-restart
3. **Fix health writer** — re-register health check interval if lost on restart
4. **Fix cost accumulator** — ensure initialization on startup, not lazy
5. **Deploy freshness guardrail** — staleness detector with incident emission
6. **Verify downstream consumers** — dashboard, FINANCE, OPS all reading fresh data
7. **Set up log rotation** — prevent disk fill from blocking writes
8. **Add telemetry writer tests** — verify each stream emits on expected events

**Estimated effort:** 2-3h diagnosis + fix, 1h freshness guardrail, 1h verification
**Dependencies:** Gateway access (unblocked after restart). ENG-001 will add circuit breaker events to routing-decisions stream.
**Risk:** Medium — if writers are fundamentally broken (not just stale), may need gateway code changes requiring a restart. Freshness guardrail ensures we catch future regressions early.
