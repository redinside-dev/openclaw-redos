# Gateway Flapping Detection

**Implemented:** 2026-03-23  
**Ticket:** TICKET-20260323-GATEWAY-FLAP  
**Cron ID:** `gateway-flap-detector-0001`  
**Schedule:** Every 5 minutes (`*/5 * * * *`)

## What It Does

Monitors `~/.openclaw/logs/gateway.log` for `[gateway] listening on` startup markers within a rolling 1-hour window. If the count exceeds 3 restarts/hour:

1. **Writes** `workspace/ops/flap-state.json` with current status, restart count, and history
2. **Appends** a RED-severity alert to `workspace/logs/health.jsonl`
3. **Disables** launchd auto-restart (`launchctl unload`) to break the restart loop
4. **Creates** an incident file in `workspace/ops/incidents/` for the alerting pipeline

## Files

| File | Purpose |
|------|---------|
| `cron/gateway-flap-detector.js` | The detection script |
| `ops/flap-state.json` | Current flap state (status, history, restart disabled flag) |
| `ops/incidents/gateway-flap-*.json` | Individual incident records |
| `ops/incidents/auto-restart-disabled.txt` | Breadcrumb when auto-restart is killed |
| `logs/health.jsonl` | Health events (type: `gateway-flap-check`, `gateway-flap-alert`, `gateway-flap-recovered`) |
| `logs/gateway-flap-detector-errors.log` | Error log for the detector itself |

## Recovery

When auto-restart is disabled, the gateway stays down. To recover:

```bash
# Re-enable and start the gateway
openclaw gateway start
# or manually:
launchctl load -w ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

The detector will automatically detect recovery (restart count drops below threshold) and log a `gateway-flap-recovered` event. **It does NOT automatically re-enable auto-restart** — that's a human decision.

## Configuration

All config is at the top of `gateway-flap-detector.js`:

| Param | Default | Description |
|-------|---------|-------------|
| `restartThreshold` | 3 | Max restarts per window before alerting |
| `windowMs` | 3600000 (1hr) | Rolling window for counting restarts |
| `alertCooldownMs` | 1800000 (30min) | Min interval between RED alerts |
| `disableAutoRestart` | true | Whether to unload launchd on flap |
| `gatewayPort` | 18789 | Port to probe for gateway liveness |

## Health.jsonl Event Types

```jsonl
{"type":"gateway-flap-check","status":"OK","restartCount":0,...}
{"type":"gateway-flap-alert","severity":"RED","restartCount":5,...}
{"type":"gateway-flap-recovered","severity":"INFO","restartCount":1,...}
```

## Why This Exists

On 2026-03-16, an `allowExec` key in `openclaw.json` (from L3-001 security hardening) caused a config validation loop. With `KeepAlive=true` and `ThrottleInterval=1`, launchd restarted the gateway 1000+ times. This detector prevents that from happening again by:

- Detecting the flap pattern early (within 5 minutes)
- Killing the restart loop at the launchd level
- Alerting immediately so the root cause can be investigated
