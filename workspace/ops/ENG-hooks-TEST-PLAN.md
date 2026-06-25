# ENG Hooks Post-Restart Test Plan

_Created: 2026-03-24 ~17:00 ET by ENG_
_Prerequisite: Human runs `openclaw gateway stop && openclaw gateway start` (OPS-002 resolution)_

---

## Dependency Map

| Hook | Event | State Files | Log Files |
|------|-------|-------------|-----------|
| ENG-001 | errorOccurred | `routing/circuit-breaker-state.json`, `routing/provider-health-scores.json` | `logs/routing-incidents.jsonl` |
| ENG-002 | sessionStart | `routing/preflight-state.json` | `logs/preflight-warnings.jsonl` |
| ENG-003 | postToolUse (all) | `logs/telemetry-freshness.json` | `logs/routing-decisions.jsonl`, `logs/health.jsonl`, `logs/cost-telemetry.jsonl` |
| ENG-004 | preToolUse (sessions_spawn/send) + postToolUse | `routing/liveness-gate-state.json` | `logs/liveness-incidents.jsonl` |

All paths relative to `~/.openclaw/workspace/`.
Config: `config/routing-profiles.json`.
Hook registry: `~/.openclaw/hooks.json`.

---

## Pre-Restart Baseline (can be done NOW — file reads only)

These checks confirm deploy state is correct before the gateway restart.

### B-1: hooks.json registration
- [ ] Read `~/.openclaw/hooks.json` — confirm all 4 hooks registered with correct event + tool + script path + `enabled: true`
- [ ] Verify ticket annotations: `_ticket` field matches each ENG ticket ID
- [ ] Count: should be 13 total hook entries (9 pre-existing + 4 new: 1×ENG-001, 1×ENG-002, 4×ENG-004, 1×ENG-003 = 7 new entries; minus overlap = confirm exact count)

**Current status:** ✅ Verified. hooks.json has:
- ENG-001: 1 entry (errorOccurred, tool:*)
- ENG-002: 1 entry (sessionStart, tool:*)
- ENG-003: 1 entry (postToolUse, tool:*)
- ENG-004: 4 entries (preToolUse × sessions_spawn + sessions_send, postToolUse × sessions_spawn + sessions_send)

### B-2: Script files exist and are syntactically valid
- [ ] All 6 scripts exist in `~/.openclaw/hook-scripts/`:
  - `circuit-breaker-gate.js` (6957 bytes)
  - `startup-preflight.js` (4807 bytes)
  - `routing-telemetry.js` (4394 bytes)
  - `telemetry-freshness-check.js` (2276 bytes)
  - `session-liveness-gate.js` (5330 bytes)
  - `session-liveness-outcome.js` (2411 bytes)
- [ ] Each has `#!/usr/bin/env node` shebang and `'use strict'`
- [ ] Each reads stdin JSON and writes stdout JSON (hook protocol compliance)

**Current status:** ✅ Verified via file reads.

### B-3: State files initialized
- [ ] `routing/circuit-breaker-state.json` → `{}` (empty, no providers tripped)
- [ ] `routing/provider-health-scores.json` → `{}` (empty, no scores recorded)
- [ ] `routing/preflight-state.json` → `{"lastWarnings": {}}` (empty dedup map)
- [ ] `routing/liveness-gate-state.json` → `{"targets": {}, "lastIncidents": {}}` (empty)
- [ ] `logs/telemetry-freshness.json` → exists with `_note` field only (no stream timestamps yet)

**Current status:** ✅ All verified. All state files are initialized and empty.

### B-4: Config file loads correctly
- [ ] `config/routing-profiles.json` contains `circuit_breaker` section with: `failure_threshold: 5`, `window_seconds: 600`, `half_open_after_seconds: 300`, `dedup_window_seconds: 300`
- [ ] `config/routing-profiles.json` contains `health_scoring` section with: `initial_score: 100`, `failure_penalty: 20`, `timeout_penalty: 15`, `recovery_rate_per_minute: 2`, `min_score: 30`

**Current status:** ✅ Verified.

---

## ENG-001: Circuit Breaker Gate

### Acceptance Criteria
| # | AC | Ticket Status |
|---|-----|---------------|
| 1 | Suppress repeatedly failing providers for a cooldown window (5 failures/10min → circuit OPEN, half-open probe after 5min) | ✅ Code |
| 2 | De-duplicate incident emission by root-cause key/time window (5min dedup per `provider:failure_type`) | ✅ Code |
| 3 | Add regression test | ⬜ Blocked by OPS-002 |

### Test Steps (require exec — post OPS-002)

#### T-001-1: Hook fires on error event
1. Trigger any model error (e.g., use a nonexistent model, or wait for a natural timeout)
2. Check `routing/circuit-breaker-state.json`:
   - Should now contain a key for the failing provider (e.g., `9router`)
   - `status` should be `CLOSED` (first failure, threshold is 5)
   - `consecutive_failures` should be ≥ 1
   - `failures_in_window` array should have ≥ 1 timestamp
   - `last_failure_type` should be one of: `timeout`, `ECONNREFUSED`, `ECONNRESET`, `503`, `502`, `429`, `model_not_found`
   - `last_failure_at` should be a recent ISO timestamp
3. Check `routing/provider-health-scores.json`:
   - Provider entry exists with `score < 100`
   - `failure_count_24h ≥ 1`
4. Check `logs/routing-incidents.jsonl`:
   - At least one line with `"type":"routing-incident"` for the provider
   - Fields: `ts`, `provider`, `failure_type`, `circuit_state`, `health_score`, `dedup_key`

#### T-001-2: Circuit opens after threshold
1. Force 5+ errors in under 10min for the same provider
2. Read `routing/circuit-breaker-state.json`:
   - Provider's `status` should be `OPEN`
   - `opened_at` should be populated (unix timestamp)
   - `failures_in_window.length >= 5`
3. stderr should contain: `[circuit-breaker] 🔴 Circuit OPENED for <provider>`

#### T-001-3: Dedup suppresses duplicate incidents
1. After first error logged to `routing-incidents.jsonl`, trigger same provider + same failure_type within 5min
2. Count lines in `routing-incidents.jsonl` for that `dedup_key`
3. Should see only 1 entry (second was suppressed by in-memory dedup map)
4. **Note:** The dedup is in-memory (`recentIncidents` object) — it resets on gateway restart. This is a known limitation.

#### T-001-4: Health score penalty math
1. After a `timeout` error: score should drop by 15 (timeout_penalty)
2. After a non-timeout error (e.g., 503): score should drop by 20 (failure_penalty)
3. After N minutes with no errors: score should recover at 2 points/min
4. Read `routing/provider-health-scores.json` and verify calculations

#### T-001-5: Config override works
1. Confirm `circuit-breaker-gate.js` reads from `config/routing-profiles.json`
2. Temporarily change `failure_threshold` to 2
3. Verify circuit opens after 2 failures instead of 5
4. Restore original config

### Validations possible NOW (file reads only)
- [x] Script reads correct config paths
- [x] State file schemas are correct (empty initial state)
- [x] Error classification covers all tracked types: `timeout`, `ECONNREFUSED`, `ECONNRESET`, `503`, `502`, `429`, `model_not_found`
- [x] Hook outputs `{ ok: true }` on stdout (never blocks)
- [x] Config file has `dedup_window_seconds: 300` (5 min)

### Gaps / Observations
- **GAP-001-A:** Dedup is in-memory only (process-scoped `recentIncidents` object). Gateway restart resets dedup, causing a brief burst of duplicate incidents. Consider persisting dedup timestamps to state file.
- **GAP-001-B:** Script hardcodes `ROUTING_DIR` path. If workspace moves, all paths break. Consider reading from env or relative resolution.
- **GAP-001-C:** The hook classifies errors via substring match on `ctx.error`. If the gateway sends structured error objects (not strings), classification may fail. Verify what `ctx.error` looks like in real gateway errorOccurred payloads.
- **GAP-001-D:** `model_not_found` is in `classifyError()` but not in `routing-profiles.json`'s `tracked_failure_types` array. Minor inconsistency (code uses its own list, not config).
- **GAP-001-E:** No half-open probe logic in the JS hook. The `half_open_after_seconds: 300` config is defined but not implemented in `circuit-breaker-gate.js` — the Python `circuit-breaker.py` may handle it. Verify which component does half-open transitions.

---

## ENG-002: Startup Preflight

### Acceptance Criteria
| # | AC | Ticket Status |
|---|-----|---------------|
| 1 | Preflight checks required secrets before startup | ✅ Code |
| 2 | Missing secrets trigger single periodic warning (no flood) — 30min dedup | ✅ Code |
| 3 | Gateway/tooling remains up in degraded mode with clear remediation | ✅ Code |

### Test Steps (require exec — post OPS-002)

#### T-002-1: Hook fires on session start
1. After gateway restart, start any new agent session
2. Check `routing/preflight-state.json`:
   - If all secrets present: `lastWarnings` should remain empty
   - If secrets missing: `lastWarnings` should have entries with ISO timestamps
3. Check gateway stderr for `[preflight]` messages

#### T-002-2: Required secrets validation
1. Verify `~/.openclaw/credentials/secrets.json` contains keys at paths:
   - `/providers/9router` (resolved as `providers.9router`)
   - `/providers/perplexity` (resolved as `providers.perplexity`)
2. Verify `~/.openclaw/openclaw.json` contains:
   - `models.providers.9router.baseUrl`
3. If any missing: stderr should show `[preflight] ⚠️ Missing secret: ...` or `Missing config: ...`

#### T-002-3: 30-minute dedup
1. Trigger sessionStart twice within 30min with the same missing secret
2. Check `logs/preflight-warnings.jsonl`:
   - Only 1 warning line for that key within the 30min window
3. Wait >30min (or manipulate `preflight-state.json` timestamps), trigger again
4. Should see a second warning line

#### T-002-4: Degraded mode passthrough
1. Temporarily rename `secrets.json` to break a required secret
2. Start a new session
3. Verify:
   - Hook outputs `{ "sessionState": { "degradedMode": true, "missingSecrets": [...] } }`
   - Session starts successfully (hook exits 0, never blocks)
4. Restore `secrets.json`

#### T-002-5: Clean run (no missing secrets)
1. Ensure all required secrets and config are present
2. Start a new session
3. Verify output: `{ "sessionState": { "degradedMode": false, "missingSecrets": [] } }`
4. No warnings in `preflight-warnings.jsonl` for this run

### Validations possible NOW (file reads only)
- [x] Required secrets list is reasonable (`/providers/9router`, `/providers/perplexity`)
- [x] Required config list is reasonable (`models.providers.9router.baseUrl`)
- [x] State file initialized: `{"lastWarnings": {}}`
- [x] Script never exits non-zero (always allows startup)
- [x] Dedup window hardcoded to 30min (`DEDUP_WINDOW_MS = 30 * 60 * 1000`)

### Gaps / Observations
- **GAP-002-A:** Only 2 secrets and 1 config key are checked. Consider adding: Slack token, Telegram token, GitHub token (all used by various agents). Low priority — can be expanded incrementally.
- **GAP-002-B:** The `getNestedValue` function splits on `.` — if any secret path contains dots in key names (unlikely but possible), resolution will break.
- **GAP-002-C:** Script sets `sessionState` in output, but it's unclear if the gateway actually reads and propagates `sessionState` from sessionStart hook output. Needs gateway-side verification.

---

## ENG-003: Routing Telemetry

### Acceptance Criteria
| # | AC | Ticket Status |
|---|-----|---------------|
| 1 | Telemetry writers emitting fresh entries for all 3 streams (routing-decisions, health, cost) | ✅ Code |
| 2 | Freshness guardrail/check with clear alerting when stale (>60min) | ✅ Code |
| 3 | Verify downstream dashboards consume new entries | ⬜ Blocked by OPS-002 |

### Test Steps (require exec — post OPS-002)

#### T-003-1: Telemetry writes on every tool use
1. After gateway restart, perform any tool call (e.g., `read` a file)
2. Check `logs/routing-decisions.jsonl`:
   - New line with fields: `ts`, `agent`, `session_key`, `selected_model`, `provider`, `tool`, `duration_ms`, `success`, `error`, `tokens`
3. Check `logs/telemetry-freshness.json`:
   - `routing-decisions` key should have a recent ISO timestamp
   - `_lastAny` should be updated

#### T-003-2: Health log writes (conditional)
1. Perform a tool call where `durationMs` is available in context
2. Check `logs/health.jsonl`:
   - New line with `type: "tool-execution"`, `provider`, `model`, `tool`, `duration_ms`, `success`
3. If no `durationMs` in context: health.jsonl should NOT get a new entry (conditional write)
4. Check `telemetry-freshness.json` — `health` key updated

#### T-003-3: Cost telemetry writes (conditional)
1. Perform a tool call where `tokensUsed` data is available in context
2. Check `logs/cost-telemetry.jsonl`:
   - New line with: `ts`, `agent`, `provider`, `model`, `tokens_in`, `tokens_out`, `tokens_cache_read`, `tokens_cache_write`
3. Check `telemetry-freshness.json` — `cost` key updated
4. If no token data in context: `cost-telemetry.jsonl` should NOT get a new entry

#### T-003-4: Freshness check — fresh state
1. Run: `node ~/.openclaw/hook-scripts/telemetry-freshness-check.js`
2. If all 3 streams written within 60min: exit code 0, stdout JSON with `status: "ok"`
3. Verify each stream listed in output with `age_minutes` values

#### T-003-5: Freshness check — stale detection
1. Wait >60min without tool activity, OR manually edit `telemetry-freshness.json` to set a stream timestamp >60min ago
2. Run: `node ~/.openclaw/hook-scripts/telemetry-freshness-check.js`
3. Exit code should be 1
4. stderr should contain: `[telemetry-freshness] STALE STREAMS:` with `❌` for stale and `✅` for fresh

#### T-003-6: Freshness check — missing file
1. Rename `telemetry-freshness.json` temporarily
2. Run freshness check
3. Should exit 1 with: `Freshness file missing`
4. Restore file

#### T-003-7: Custom stale threshold
1. Run: `node ~/.openclaw/hook-scripts/telemetry-freshness-check.js --max-stale-minutes=5`
2. Verify it uses 5min threshold instead of default 60min

### Validations possible NOW (file reads only)
- [x] Three JSONL output paths are correct and exist in script
- [x] Freshness file path matches between writer and checker
- [x] Default stale threshold is 60min (`DEFAULT_MAX_STALE_MINUTES = 60`)
- [x] Streams checked: `routing-decisions`, `health`, `cost`
- [x] Current freshness file has no stream timestamps (only `_note` and `_created`) — confirms no telemetry written yet (hooks not active)
- [x] Script always exits 0 and outputs `{ ok: true }` (postToolUse hooks don't block)

### Gaps / Observations
- **GAP-003-A:** `health.jsonl` and `cost-telemetry.jsonl` writes are conditional on `durationMs` and `tokensUsed` being in the hook context. If the gateway doesn't pass these fields in postToolUse payloads, those streams will remain empty. **Critical to verify:** what fields does the gateway actually include in postToolUse context?
- **GAP-003-B:** The `routing-decisions.jsonl` writer defaults unknown fields to `'unknown'`. This could pollute telemetry if the gateway context shape doesn't match expected keys (`agentId`, `sessionKey`, `model`, `toolName`, `durationMs`, `tokensUsed`).
- **GAP-003-C:** Cost telemetry doesn't calculate actual dollar cost — it only logs token counts. The `cost_per_1k_*` values in `routing-profiles.json` aren't used. This is fine for now but noted.
- **GAP-003-D:** No log rotation for JSONL files. Over time these will grow unbounded. OPS should add rotation.
- **GAP-003-E:** The freshness checker is standalone (not registered as a hook). It needs to be scheduled via cron or run manually. Confirm cron registration plan.
- **GAP-003-F:** `telemetry-freshness-check.js` argument parsing uses simple string matching (`process.argv.find(a => a.startsWith('--max-stale-minutes='))`). A typo like `--max-stale-minutes 5` (space instead of `=`) would silently use the default.

---

## ENG-004: Session Liveness Gate

### Acceptance Criteria
| # | AC | Ticket Status |
|---|-----|---------------|
| 1 | Session liveness check before spawn/retry — tracks consecutive failures per target | ✅ Code |
| 2 | Backoff + max-attempt policy — 30s base exponential, max 5 attempts | ✅ Code |
| 3 | Deduplicated incident per window with remediation hint — 5min dedup | ✅ Code |

### Test Steps (require exec — post OPS-002)

#### T-004-1: Gate fires on sessions_spawn
1. After gateway restart, spawn a sub-agent: `sessions_spawn(agentId: "ops", task: "ping")`
2. Check `routing/liveness-gate-state.json`:
   - `targets.ops` should exist with `lastAttempt` populated
   - `consecutiveFailures` should be 0 (if spawn succeeded)

#### T-004-2: Gate fires on sessions_send
1. Send to an agent: `sessions_send(sessionKey: "agent:ops:main", message: "test")`
2. Check state file: target key created/updated

#### T-004-3: Outcome tracking — success resets failures
1. Spawn/send to a working agent
2. Verify `session-liveness-outcome.js` sets:
   - `consecutiveFailures: 0`
   - `lastSuccess: <timestamp>`
   - `backoffUntil: null`

#### T-004-4: Outcome tracking — failure increments + sets backoff
1. Spawn/send to a non-existent or dead agent (e.g., `agentId: "nonexistent"`)
2. Check state file:
   - `consecutiveFailures: 1`
   - `backoffUntil` = now + 30000ms (30s base × 2^0)
3. Fail again:
   - `consecutiveFailures: 2`
   - `backoffUntil` = now + 60000ms (30s × 2^1)
4. Continue pattern: 120s, 240s, 480s for attempts 3-5

#### T-004-5: Backoff warning emitted
1. While a target is in backoff (backoffUntil > now), attempt another spawn/send to same target
2. stderr should contain: `[liveness-gate] ⚠️ <target>: backoff active (<N>s remaining, <M> failures)`
3. Hook still exits 0 (warning only, not blocking)
4. Output includes: `{ ok: true, warning: "backoff_active:<target>" }`

#### T-004-6: Max attempts reached
1. Force 5 consecutive failures for a target
2. On 6th attempt, stderr should contain: `[liveness-gate] ❌ <target>: max attempts (5) reached. Manual reset needed.`
3. Check `logs/liveness-incidents.jsonl`:
   - Entry with `incident_type: "max_attempts_reached"`
   - `details.remediation` field contains reset instructions

#### T-004-7: Incident dedup (5min window)
1. Trigger backoff warning twice within 5min for same target
2. Check `liveness-incidents.jsonl`:
   - Only 1 incident entry within the window
3. After 5min: second incident should be logged

#### T-004-8: Manual state reset
1. When a target hits max attempts, manually edit `liveness-gate-state.json`:
   - Delete the target key from `targets`
2. Retry spawn/send to that target
3. Should work again (clean slate)

### Validations possible NOW (file reads only)
- [x] State file schema: `{ targets: {}, lastIncidents: {} }`
- [x] Constants verified: `MAX_ATTEMPTS = 5`, `BACKOFF_BASE_MS = 30000`, `DEDUP_WINDOW_MS = 5 * 60 * 1000`
- [x] Backoff formula: `30000 * 2^(min(consecutiveFailures-1, 4))` → 30s, 60s, 120s, 240s, 480s
- [x] Both gate (pre) and outcome (post) hooks registered for both `sessions_spawn` and `sessions_send`
- [x] Gate extracts target from `args.agentId || args.sessionKey`
- [x] Hook always exits 0 — warns but never blocks (soft gate)

### Gaps / Observations
- **GAP-004-A:** The gate is a **soft gate** — it warns but never blocks (`exit(0)` always). The comment says "A future version could exit(1) to hard-block spawns to dead agents." Currently, agents will still attempt spawns to dead targets, just with a warning. Consider whether hard-blocking is desired for v1.
- **GAP-004-B:** The `liveness-gate-state.json` dedup uses `state.lastIncidents` (persisted to disk), but the `circuit-breaker-gate.js` dedup uses an in-memory map. Inconsistent approach — the liveness gate is more robust across restarts.
- **GAP-004-C:** Target extraction uses `args.agentId || args.sessionKey`. If the tool call uses a different parameter name (e.g., `target`, `id`), it falls back to `'unknown'`, which would lump all unknown targets together.
- **GAP-004-D:** No liveness *check* is actually performed — the hook tracks failures reactively (via outcome) rather than proactively pinging the target. The AC says "liveness check before spawn/retry" but the implementation is "failure tracking with backoff." This may be intentional (no mechanism to ping an agent session), but should be noted.

---

## Execution Dependency Summary

| Validation | Method | Blocked by OPS-002? |
|------------|--------|---------------------|
| B-1 through B-4 (pre-restart baseline) | File reads | ❌ No — **can do now** |
| T-001-* (circuit breaker) | Requires gateway restart + error trigger | ✅ Yes |
| T-002-* (preflight) | Requires gateway restart + new session | ✅ Yes |
| T-003-1 through T-003-3 (telemetry writes) | Requires gateway restart + tool use | ✅ Yes |
| T-003-4 through T-003-7 (freshness check) | Requires `node` exec | ✅ Yes |
| T-004-* (liveness gate) | Requires gateway restart + spawn/send | ✅ Yes |
| Gap analysis | Code review | ❌ No — **done** |

**Bottom line:** All pre-restart baseline checks (B-1 through B-4) are ✅ PASS. All runtime tests require OPS-002 resolution (human gateway restart). Gap analysis complete — 15 items identified across all 4 hooks.

---

## Post-Restart Execution Order

Recommended test sequence after `openclaw gateway stop && start`:

1. **ENG-002 first** — sessionStart fires automatically on first session. Read `preflight-state.json` and stderr.
2. **ENG-003 second** — any tool call triggers postToolUse telemetry. Read JSONL files + freshness JSON.
3. **ENG-004 third** — spawn/send to another agent. Verify gate + outcome state files.
4. **ENG-001 last** — requires an actual error event. May need to wait for natural failure or simulate one.
5. **Run freshness check** — `node telemetry-freshness-check.js` to confirm alerting works.

---

_ENG — 2026-03-24_
