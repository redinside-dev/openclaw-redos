# ENG-002: Preflight Secrets Check at Startup

**Ticket:** TICKET-20260324-ENG-002
**Owner:** ENG + OPS
**Priority:** P1
**Date:** 2026-03-24
**Status:** Design Complete — UNBLOCKED (gateway restarted 16:30 UTC)

---

## Problem Statement

Missing `tools.web.search.apikey` (and other required secrets) causes restart/failure loops and noisy degraded state. When a secret is absent:

1. **First request** using the tool fails with a cryptic error
2. **Every subsequent request** fails the same way, generating duplicate incidents
3. **No clear remediation** — the error doesn't tell the operator *which* secret is missing or *how* to fix it
4. **Cascade risk** — cron jobs that depend on web search (e.g., Telegram approval monitor, GitHub repo updates) all fail independently, each generating their own error chain

The root issue: secrets are validated **lazily at use-time** instead of **eagerly at startup**.

## Proposed Implementation

### 1. Secrets Registry

Define a typed registry of all secrets the gateway consumes, with metadata:

```typescript
interface SecretSpec {
  key: string;               // config path, e.g. "tools.web.search.apikey"
  description: string;       // human-readable purpose
  required: boolean;         // true = gateway cannot fully function without it
  degradedMode: string;      // what happens if missing: "tool_disabled" | "feature_limited" | "fatal"
  validationFn?: (val: string) => boolean;  // optional format check (e.g., starts with "sk-")
  remediationHint: string;   // shown to operator on failure
}
```

**Initial registry entries:**

| Key | Required | Degraded Mode | Remediation |
|-----|----------|---------------|-------------|
| `tools.web.search.apikey` | Yes | `tool_disabled` — web search returns "service unavailable" | Set Brave Search API key in config |
| `channels.telegram.accounts.*.token` | Per-account | `tool_disabled` — that Telegram bot offline | Add bot token from @BotFather |
| `channels.slack.botToken` | If Slack enabled | `tool_disabled` — Slack channel offline | Add xoxb- token from Slack app |
| `channels.slack.appToken` | If Slack enabled | `tool_disabled` — Slack socket mode offline | Add xapp- token from Slack app |
| `models.providers.openai.apiKey` | If OpenAI models used | `feature_limited` — OpenAI models unavailable | Set OpenAI API key |
| `models.providers.anthropic.apiKey` | If Anthropic models used | `feature_limited` — Anthropic models unavailable | Set Anthropic API key |

### 2. Preflight Check at Startup

**Timing:** Runs after config load, before WebSocket server bind, before cron scheduling.

```typescript
function runPreflightChecks(config: GatewayConfig): PreflightResult {
  const results: SecretCheckResult[] = [];
  
  for (const spec of SECRETS_REGISTRY) {
    const value = getConfigValue(config, spec.key);
    const present = value !== undefined && value !== null && value !== "";
    const valid = present && (!spec.validationFn || spec.validationFn(value));
    
    results.push({
      key: spec.key,
      present,
      valid,
      degradedMode: spec.degradedMode,
      remediationHint: spec.remediationHint,
    });
  }
  
  return {
    allClear: results.every(r => r.valid || !r.spec.required),
    missing: results.filter(r => !r.present && r.spec.required),
    invalid: results.filter(r => r.present && !r.valid),
    degraded: results.filter(r => !r.valid && r.spec.degradedMode !== "fatal"),
  };
}
```

### 3. Startup Output

**On clean boot (all secrets present):**
```
[preflight] ✅ All 6 secrets verified
[preflight] Gateway starting in FULL mode
```

**On degraded boot (non-fatal secrets missing):**
```
[preflight] ⚠️  2 secrets missing — entering DEGRADED mode
[preflight]   ✗ tools.web.search.apikey — web search disabled
[preflight]     → Set Brave Search API key: openclaw config set tools.web.search.apikey YOUR_KEY
[preflight]   ✗ models.providers.openai.apiKey — OpenAI models unavailable
[preflight]     → Set OpenAI API key: openclaw config set models.providers.openai.apiKey YOUR_KEY
[preflight] Gateway starting in DEGRADED mode (2 features limited)
[preflight] Next reminder in 6h (set preflight.reminderInterval to change)
```

**On fatal missing (if any `degradedMode: "fatal"` secret is absent):**
```
[preflight] ❌ FATAL: 1 required secret missing — cannot start
[preflight]   ✗ gateway.authToken — gateway authentication impossible
[preflight]     → Run: openclaw config set gateway.authToken $(openssl rand -hex 32)
[preflight] Exiting. Fix the above and restart.
```

### 4. Degraded Mode Runtime Behavior

When operating in degraded mode:

1. **Disabled tools return structured error** instead of crashing:
   ```json
   { "error": "tool_unavailable", "tool": "web_search", "reason": "missing_secret", "remediation": "Set Brave Search API key" }
   ```

2. **Single periodic warning** — not per-request:
   - First warning at startup (see above)
   - Reminder every `preflight.reminderInterval` (default: 6h)
   - Warning suppressed if secret is added at runtime (config watch)

3. **Health endpoint reflects degraded state:**
   ```json
   { "status": "degraded", "missing_secrets": ["tools.web.search.apikey"], "since": "2026-03-24T16:30:00Z" }
   ```

4. **Cron jobs that depend on disabled tools** — skip execution with single log line instead of failing:
   ```
   [cron:telegram-approval-monitor] Skipped: depends on tools.exec (currently unavailable)
   ```

### 5. Config Hot-Reload

If `openclaw config set` is called while gateway is running:
- Re-run preflight for the changed key
- If a previously-missing secret is now present → log recovery, exit degraded mode for that feature
- If a previously-present secret is removed → log degradation, enter degraded mode
- No restart required for secret changes

### 6. Configuration

```json
{
  "preflight": {
    "enabled": true,
    "failOnFatal": true,
    "reminderIntervalMs": 21600000,
    "customSecrets": []
  }
}
```

`customSecrets` allows users to register their own secrets (e.g., for custom skills/tools).

## Next Steps

1. **Create `lib/preflight.ts`** — secrets registry + `runPreflightChecks()` function
2. **Populate initial registry** — audit all config keys that are secrets (API keys, tokens, credentials)
3. **Hook into gateway startup** — call preflight after config load, before server bind
4. **Implement degraded-mode tool wrapper** — tools check availability before execution
5. **Add periodic reminder timer** — single consolidated warning, not per-request
6. **Add `/api/health` degraded state** — surface missing secrets in health endpoint
7. **Wire config hot-reload** — re-run preflight on `config set` events
8. **OPS: update runbooks** — document remediation steps for each secret
9. **Test scenarios:** clean boot, degraded boot, fatal boot, runtime recovery, runtime degradation

**Estimated effort:** 3-4h implementation, 1h testing
**Dependencies:** None — unblocked after gateway restart (completed 16:30 UTC)
**Risk:** Low — additive feature. `preflight.enabled: false` disables entirely. No behavior change for existing setups with all secrets present.
