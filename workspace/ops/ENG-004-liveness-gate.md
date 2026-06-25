# ENG-004: Agent Session Liveness Gate Before Spawn/Retry

**Ticket:** TICKET-20260324-ENG-004
**Owner:** ENG + OPS
**Priority:** P1
**Date:** 2026-03-24
**Status:** Design Complete — Ready for Implementation

---

## Problem Statement

Repeated `Failed to reach OPS agent` loops indicate spawns are attempted without liveness gating, causing noisy cycles and no recovery. Observed on 2026-03-24:

1. **Infinite retry churn** — automation loops (crons, A2A delegation, subagent spawns) retry unreachable agents indefinitely
2. **No backoff** — each retry is immediate, burning tokens and context window on identical failing attempts
3. **Incident flood** — every failed spawn/send generates a separate incident with no dedup
4. **No remediation path** — the system never concludes "this agent is down, stop trying and escalate"

This is the agent-level equivalent of ENG-001 (provider circuit breaker) — but for inter-agent communication.

## Proposed Implementation

### 1. Session Liveness Check

Before any `sessions_spawn` or `sessions_send`, verify the target agent is reachable:

```typescript
interface LivenessResult {
  agentId: string;
  alive: boolean;
  lastSeen: number;          // epoch ms — last known activity
  sessionAge: string;        // e.g., "5m ago"
  contextUsage: number;      // 0.0-1.0 — how full is their context
  reason?: string;           // if not alive: "no_session" | "session_expired" | "context_full" | "rate_limited" | "unresponsive"
}

async function checkAgentLiveness(agentId: string): Promise<LivenessResult> {
  // 1. Check if agent has an active session
  const sessions = await listSessions({ agent: agentId, active: true });
  if (sessions.length === 0) {
    return { agentId, alive: false, reason: "no_session", lastSeen: 0, sessionAge: "never", contextUsage: 0 };
  }
  
  // 2. Check session freshness (last activity)
  const mainSession = sessions.find(s => s.kind === "main") || sessions[0];
  const lastActivity = mainSession.lastActivityMs;
  const staleThreshold = 300000; // 5min — configurable
  
  if (Date.now() - lastActivity > staleThreshold) {
    return { agentId, alive: false, reason: "unresponsive", lastSeen: lastActivity, sessionAge: mainSession.age, contextUsage: mainSession.contextUsage };
  }
  
  // 3. Check context capacity (>95% = effectively dead)
  if (mainSession.contextUsage > 0.95) {
    return { agentId, alive: false, reason: "context_full", lastSeen: lastActivity, sessionAge: mainSession.age, contextUsage: mainSession.contextUsage };
  }
  
  return { agentId, alive: true, lastSeen: lastActivity, sessionAge: mainSession.age, contextUsage: mainSession.contextUsage };
}
```

### 2. Spawn/Send Wrapper with Backoff

```typescript
interface RetryPolicy {
  maxAttempts: number;         // default: 3
  initialBackoffMs: number;    // default: 5000 (5s)
  maxBackoffMs: number;        // default: 60000 (1min)
  backoffMultiplier: number;   // default: 2.0
  livenessCheckFirst: boolean; // default: true
}

async function sendWithLivenessGate(
  targetAgent: string,
  message: string,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Promise<SendResult> {
  
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    // Pre-flight liveness check
    if (policy.livenessCheckFirst) {
      const liveness = await checkAgentLiveness(targetAgent);
      if (!liveness.alive) {
        if (attempt === policy.maxAttempts) {
          return escalate(targetAgent, liveness, message);
        }
        const backoff = Math.min(
          policy.initialBackoffMs * Math.pow(policy.backoffMultiplier, attempt - 1),
          policy.maxBackoffMs
        );
        await sleep(backoff);
        continue;
      }
    }
    
    // Attempt send
    try {
      const result = await sessions_send(targetAgent, message);
      return { success: true, result, attempts: attempt };
    } catch (err) {
      if (attempt === policy.maxAttempts) {
        return escalate(targetAgent, { reason: err.message }, message);
      }
      const backoff = Math.min(
        policy.initialBackoffMs * Math.pow(policy.backoffMultiplier, attempt - 1),
        policy.maxBackoffMs
      );
      await sleep(backoff);
    }
  }
}
```

### 3. Escalation on Max Attempts

When all attempts exhausted, emit a **single deduplicated incident** with remediation:

```typescript
function escalate(targetAgent: string, liveness: any, originalMessage: string): SendResult {
  const incident = {
    type: "agent_unreachable",
    target: targetAgent,
    reason: liveness.reason,
    attempts: policy.maxAttempts,
    originalMessage: originalMessage.substring(0, 200), // truncate for log
    remediation: getRemediation(liveness.reason),
    ts: new Date().toISOString(),
  };
  
  // Dedup: key = agent_unreachable:${targetAgent}, window = 15min
  emitDedupedIncident(`agent_unreachable:${targetAgent}`, incident);
  
  return { success: false, escalated: true, incident };
}

function getRemediation(reason: string): string {
  switch (reason) {
    case "no_session": return "Agent has no active session. Send a direct message to wake it, or check agent bootstrap config.";
    case "unresponsive": return "Agent session exists but is not responding. May be rate-limited or deadlocked. Try: openclaw session reset <agent>";
    case "context_full": return "Agent context window is >95% full. Reset session: openclaw session reset <agent>";
    case "rate_limited": return "Agent is rate-limited by its model provider. Wait for cooldown or switch to a different model.";
    default: return "Unknown failure. Check gateway logs for the target agent.";
  }
}
```

### 4. Integration Points

**Where to add liveness gates:**

| Caller | Current Behavior | New Behavior |
|--------|-----------------|-------------|
| `sessions_send()` in A2A flows | Fire and timeout (300s) | Liveness check → send with backoff → escalate |
| `sessions_spawn()` in cron jobs | Spawn and hope | Liveness check on parent agent → spawn with retry policy |
| AUTONOMOUS.md dispatcher | Blindly assigns tasks | Check assignee liveness before dispatch |
| Subagent orchestration | Spawn N subagents, poll for results | Spawn with liveness pre-check, backoff on failure |
| Watchdog/health monitors | Send alerts to agents that may be down | Liveness check → if target down, escalate to human (Telegram) |

### 5. Observability

**New telemetry entries:**
```jsonl
{"ts":"...","event":"liveness_check","agent":"ops","alive":true,"lastSeen":"2m ago","contextUsage":0.09}
{"ts":"...","event":"liveness_check","agent":"eng","alive":false,"reason":"unresponsive","lastSeen":"45m ago","contextUsage":0.0}
{"ts":"...","event":"send_retry","agent":"ops","attempt":2,"backoffMs":10000,"reason":"timeout"}
{"ts":"...","event":"agent_unreachable","agent":"eng","attempts":3,"reason":"unresponsive","escalated":true}
```

### 6. Configuration

```json
{
  "agentLiveness": {
    "enabled": true,
    "staleThresholdMs": 300000,
    "contextFullThreshold": 0.95,
    "retryPolicy": {
      "maxAttempts": 3,
      "initialBackoffMs": 5000,
      "maxBackoffMs": 60000,
      "backoffMultiplier": 2.0
    },
    "incidentDedupWindowMs": 900000,
    "escalateToHuman": true,
    "humanEscalationChannel": "telegram"
  }
}
```

### 7. Interaction with ENG-001 (Circuit Breaker)

The agent liveness gate and provider circuit breaker are complementary:

- **ENG-001** protects against bad *model providers* (external APIs)
- **ENG-004** protects against bad *agent sessions* (internal system)
- Both use the same incident dedup pattern (ENG-001 §4)
- Both emit to `routing-decisions.jsonl` (ENG-003 dependency)
- Both are additive/feature-flagged — safe to deploy independently

## Next Steps

1. **Implement `checkAgentLiveness()`** — uses existing `sessions_list` API under the hood
2. **Implement `sendWithLivenessGate()` wrapper** — wraps `sessions_send` with retry/backoff
3. **Implement `spawnWithLivenessGate()` wrapper** — wraps `sessions_spawn` with pre-check
4. **Add escalation handler** — deduped incident + human escalation via Telegram
5. **Patch AUTONOMOUS.md dispatcher** — add liveness check before task assignment
6. **Patch cron job A2A calls** — replace direct `sessions_send` with gated wrapper
7. **Add config section** — `agentLiveness` in gateway config with defaults above
8. **Wire telemetry** — emit liveness events to `routing-decisions.jsonl` (or dedicated `agent-liveness.jsonl`)
9. **Test scenarios:** agent alive, agent stale, agent context-full, agent not started, successful retry after transient failure, max-attempts escalation

**Estimated effort:** 3-4h implementation, 1h testing
**Dependencies:** ENG-001 for shared incident dedup module. ENG-003 for telemetry output.
**Risk:** Low — wrapper pattern, existing send/spawn behavior unchanged when gate is disabled. Feature-flagged via `agentLiveness.enabled`.
