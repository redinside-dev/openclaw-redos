# Crash Loop Investigation Findings
**Generated:** 2026-05-24T06:35 UTC
**Session:** agent:ops:subagent:8ec59124-80aa-48b8-b1b5-d70abea14200

## 1. heal.log Analysis (Gateway Main Process)

The healer log shows recurring 5-minute crash cycles. However, the **healer itself is recovering the gateway** via `config fixed + stack restarted` at most cycles. Gateway is currently LIVE.

**Recent healer pattern (last 3 hours):**
- 05:30 → ALERT DOWN (restart failed)
- 05:40 → SKIPPED (recent heal)
- 05:45 → ALERT DOWN (restart failed)
- 05:50 → SKIPPED
- 05:55 → SKIPPED
- 06:00 → FIXED (config + restart)
- 06:05 → ALERT DOWN (restart failed)
- 06:10 → FIXED
- 06:15 → FIXED

The healer cycles suggest gateway main process IS recovering, but workers are repeatedly failing and triggering the "gateway down" signal.

## 2. worker-*.err.log Analysis — CRITICAL FINDING

Both `worker-ops.err.log` and `worker-eng.err.log` show the **same stack trace**:

```
Error: Cannot find module '/Users/redinside/.openclaw/agents/autonomous-worker-v2.js'
```

**The file does NOT exist at `/Users/redinside/.openclaw/agents/autonomous-worker-v2.js`**

Search confirmed the file exists at:
- `/Users/redinside/.openclaw/workspace/ops/autonomous-worker-v2.js`
- `/Users/redinside/.openclaw/workspace/ops/worker/autonomous-worker-v2.js`
- `/Users/redinside/.openclaw/workspace-main/autonomous-worker-v2.js`
- `/Users/redinside/.openclaw/agents/archive/workers/autonomous-worker-v2.js`

But the `agents/ops/` directory only contains: `CLAUDE.md`, `agent/`, `sessions/` — NO worker script.

## 3. watchdog.log Analysis

Watchdog shows repeated worker restarts every ~30 minutes for agents: `eng`, `ops`, `research`.
Every watchdog cycle that detects workers not running triggers a restart — creating the crash-loop pattern.

**NOT a main process crash** — gateway.log shows clean startup at 02:30:52 UTC and stable operation since.

## 4. Root Cause Determination

**ISOLATED TO WORKER PROCESSES — NOT MAIN GATEWAY**

Root cause: Worker launch config references `/Users/redinside/.openclaw/agents/autonomous-worker-v2.js` which doesn't exist. Workers fail on start, watchdog restarts them, repeat.

The healer's "gateway down" detection is likely triggered by the worker failure cascade causing temporary unavailability.

## 5. Recommendation

**→ OPTION A: No downgrade needed — crashes are isolated to workers and self-recover**

Gateway main process is stable. Workers crash because the worker script path is wrong in config. Fix the config path → workers start successfully → crash loop ends.

**Immediate action required:**
1. Identify where the worker launch config specifies `agents/autonomous-worker-v2.js`
2. Update to correct path (likely `workspace/ops/autonomous-worker-v2.js` or `agents/archive/workers/autonomous-worker-v2.js`)
3. Restart workers via watchdog (or gateway restart if config is hot-reloadable)

## Evidence Summary

| Indicator | Finding |
|-----------|---------|
| Main gateway uptime | STABLE (clean startup, sustained operation) |
| Worker crashes | MODULE_NOT_FOUND for autonomous-worker-v2.js |
| File location | File exists but NOT at path workers reference |
| Crash frequency | ~5 min (worker cycle) |
| Recovery | Self-recovering via watchdog + healer |
| Launchd involvement | Yes (watchdog triggers via launchd) |
| Downgrade needed? | NO |