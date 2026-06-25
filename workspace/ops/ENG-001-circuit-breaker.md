# ENG-001: Circuit Breaker for Model/Tool Routing

**Ticket:** TICKET-20260324-ENG-001
**Owner:** ENG
**Priority:** P1
**Date:** 2026-03-24
**Status:** Design Complete — Ready for Implementation

---

## Problem Statement

Repeated fallback attempts on known-bad providers (`model_not_found`, auth errors, timeouts) amplify incident noise and mask root causes. When a provider is down or misconfigured, the routing layer hammers it on every request, generating:

1. **Cascading latency** — each request pays the full timeout penalty before fallback
2. **Incident flood** — every failed attempt emits a separate incident/alert, burying the root cause
3. **Fallback chain thrash** — rapid cycling through broken providers wastes tokens and time

This was directly observed on 2026-03-24 when 429 rate limits on the primary model caused the ENG agent session to become non-responsive, with the routing layer continuing to attempt the rate-limited provider.

## Proposed Implementation

### 1. Provider Health Tracker (In-Memory State)

```typescript
interface ProviderHealth {
  providerId: string;           // e.g. "openai/gpt-4o", "anthropic/claude-sonnet"
  consecutiveFailures: number;
  lastFailureTime: number;      // epoch ms
  lastFailureReason: string;    // "model_not_found" | "auth_error" | "timeout" | "rate_limit" | "5xx"
  state: "closed" | "open" | "half-open";
  cooldownUntil: number;        // epoch ms — when to try again
  totalFailures24h: number;
  lastSuccessTime: number;
}
```

### 2. Circuit Breaker State Machine

```
CLOSED (healthy) ──[N consecutive failures]──► OPEN (suppressed)
     ▲                                              │
     │                                              │ [cooldown expires]
     │                                              ▼
     └───────[success]───── HALF-OPEN (probe) ──[failure]──► OPEN (extended cooldown)
```

**Thresholds (configurable via `routing-profiles.json`):**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `failureThreshold` | 3 | Consecutive failures before OPEN |
| `cooldownMs` | 60000 (1min) | Initial cooldown in OPEN state |
| `maxCooldownMs` | 300000 (5min) | Maximum cooldown (exponential backoff cap) |
| `cooldownMultiplier` | 2.0 | Backoff multiplier on repeated OPEN transitions |
| `halfOpenProbeLimit` | 1 | Max concurrent requests in HALF-OPEN |
| `resetAfterMs` | 600000 (10min) | Reset failure counter after sustained success |

**Error classification for circuit trip:**

| Error Type | Trips Circuit? | Notes |
|------------|---------------|-------|
| `model_not_found` | Yes (immediate) | Single failure → OPEN, 5min cooldown |
| `auth_error` (401/403) | Yes (immediate) | Config issue — won't self-heal |
| `rate_limit` (429) | Yes (threshold=2) | Use `Retry-After` header as cooldown if present |
| `timeout` | Yes (threshold=3) | Transient — standard backoff |
| `5xx` | Yes (threshold=3) | Server-side — standard backoff |
| `network_error` | Yes (threshold=3) | DNS/TCP failures |
| `4xx` (other) | No | Likely client-side / prompt issue |

### 3. Routing Integration

**Pre-request check (hot path):**

```typescript
function isProviderAvailable(providerId: string): boolean {
  const health = providerHealthMap.get(providerId);
  if (!health) return true; // unknown = assume healthy
  
  if (health.state === "open") {
    if (Date.now() >= health.cooldownUntil) {
      health.state = "half-open";
      return true; // allow probe
    }
    return false; // still cooling down
  }
  return true;
}
```

**Fallback chain modification:**
- Before attempting a provider, check `isProviderAvailable()`
- Skip OPEN providers entirely — don't pay the timeout cost
- If ALL providers in a chain are OPEN, allow the one with the oldest `cooldownUntil` (least-recently-failed) as emergency fallback
- Log when a provider is skipped: `{ event: "circuit_breaker_skip", provider, state, cooldownRemaining }`

### 4. Incident Deduplication

**Root-cause keying:**

```typescript
function incidentKey(provider: string, errorType: string): string {
  return `${provider}:${errorType}`;
}
```

**Dedup rules:**
- First occurrence: emit full incident with context
- Subsequent occurrences within `dedup_window` (default: 15min): suppress, increment counter
- On window expiry or circuit state change: emit summary: `"Provider X: 47 failures suppressed (rate_limit) over 15min, circuit OPEN"`
- On recovery (HALF-OPEN → CLOSED): emit recovery incident: `"Provider X recovered after Nmin outage"`

**Dedup state:**

```typescript
interface IncidentDedup {
  key: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
  emitted: boolean;        // first incident emitted?
  windowMs: number;         // default 900000 (15min)
}
```

### 5. Observability

**New telemetry entries in `routing-decisions.jsonl`:**

```jsonl
{"ts":"...","event":"circuit_state_change","provider":"openai/gpt-4o","from":"closed","to":"open","reason":"rate_limit","consecutiveFailures":3,"cooldownMs":60000}
{"ts":"...","event":"circuit_breaker_skip","provider":"openai/gpt-4o","state":"open","cooldownRemainingMs":45000,"fallbackTo":"anthropic/claude-sonnet"}
{"ts":"...","event":"incident_suppressed","key":"openai/gpt-4o:rate_limit","count":12,"windowMs":900000}
{"ts":"...","event":"circuit_state_change","provider":"openai/gpt-4o","from":"half-open","to":"closed","reason":"probe_success"}
```

### 6. Regression Test: Fallback Chain Thrash Scenario

**Test case:** `test/circuit-breaker-thrash.test.ts`

```
Scenario: 3-provider chain, provider A returns 429, provider B returns model_not_found
  Given providers [A, B, C] in fallback chain
  When A returns 429 on 3 consecutive requests
  Then A circuit state = OPEN
  And subsequent requests skip A, try B first
  When B returns model_not_found on 1 request
  Then B circuit state = OPEN (immediate for model_not_found)
  And subsequent requests go directly to C
  And only 2 incidents emitted (one per provider, not per request)
  When A cooldown expires
  Then A circuit state = HALF-OPEN
  And exactly 1 probe request sent to A
  When A probe succeeds
  Then A circuit state = CLOSED
  And recovery incident emitted
```

## Configuration

Add to `routing-profiles.json`:

```json
{
  "circuitBreaker": {
    "enabled": true,
    "failureThreshold": 3,
    "cooldownMs": 60000,
    "maxCooldownMs": 300000,
    "cooldownMultiplier": 2.0,
    "halfOpenProbeLimit": 1,
    "resetAfterMs": 600000,
    "incidentDedupWindowMs": 900000,
    "immediateOpenErrors": ["model_not_found", "auth_error"]
  }
}
```

## Next Steps

1. **Implement `ProviderHealthTracker` class** — in-memory Map, no persistence needed (resets on gateway restart, which is correct behavior)
2. **Patch `resilient-handler.js`** — add `isProviderAvailable()` check before each provider attempt in the fallback loop
3. **Implement `IncidentDeduplicator`** — timer-based window flush with summary emission
4. **Add circuit breaker config to `routing-profiles.json`** — with sane defaults above
5. **Write regression test** — thrash scenario as specified above
6. **Wire telemetry** — emit circuit events to `routing-decisions.jsonl` (depends on ENG-003 restoration)
7. **OPS review** — verify alerting integrates with existing watchdog/health monitors
8. **Deploy** — gateway restart to activate (no migration needed, all in-memory)

**Estimated effort:** 4-6h implementation, 2h testing
**Dependencies:** ENG-003 (telemetry restoration) for full observability; can ship without it using console.log fallback
**Risk:** None — circuit breaker is additive, doesn't change success-path behavior. Feature-flagged via `circuitBreaker.enabled`.
