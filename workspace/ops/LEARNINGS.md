# LEARNINGS — Self-Improvement Knowledge Base

This file is the shared learning repository. When any agent resolves an issue,
they MUST append their learnings here. All agents read this file to avoid
repeating mistakes and to build institutional knowledge.

## Format

```
### LEARNING-{YYYYMMDD}-{NNN}
- **Date:** {ISO timestamp}
- **Source Ticket:** TICKET-{ref} or "observation"
- **Agent:** {who discovered this}
- **Category:** config | model | tool | skill | infra | workflow | security
- **Summary:** {one-line}
- **Details:** {what happened, why, how it was fixed}
- **Prevention:** {how to prevent this in the future}
- **Applied To:** {what was updated — SOUL.md, skill, config, etc.}
```

## Learnings

### LEARNING-20260215-001
- **Date:** 2026-02-15T22:08:00Z
- **Source Ticket:** observation (Windsurf audit)
- **Agent:** OPS (via Windsurf)
- **Category:** config
- **Summary:** OpenClaw skills.entries only accepts `{enabled: true}` — not `path` or `description`
- **Details:** Skills were registered with extra keys (`path`, `description`) which caused gateway to reject the config silently. The correct schema is `{"skillName": {"enabled": true}}`. Skills are auto-discovered from the workspace/skills/ directory.
- **Prevention:** When modifying openclaw.json skills section, only use `enabled`, `apiKey`, and `env` keys.
- **Applied To:** openclaw.json fixed, KNOWLEDGEBASE.md §21 documented

### LEARNING-20260215-002
- **Date:** 2026-02-15T22:00:00Z
- **Source Ticket:** observation (Windsurf audit)
- **Agent:** OPS (via Windsurf)
- **Category:** model
- **Summary:** moonshot/kimi-k2.5 has no active subscription — must not be in fallback chains
- **Details:** Cron jobs were failing with "Provider moonshot is in cooldown (all profiles unavailable)". Kimi was listed as first fallback in all agent configs. Changed to zai/glm-4.7 as first fallback.
- **Prevention:** Before adding a model to fallback chains, verify it has an active subscription in model-registry.json.
- **Applied To:** openclaw.json agent fallback chains, model-registry.json status field

### LEARNING-20260215-003
- **Date:** 2026-02-15T23:30:00Z
- **Source Ticket:** TICKET-20260215-001
- **Agent:** OPS
- **Category:** infra
- **Summary:** Health monitoring must be a dedicated cron job, not rely on ad-hoc checks
- **Details:** The old "System Health Watch" cron job was disabled, leaving a 17-hour gap with no health monitoring. A new dedicated OPS Health Monitor cron job was created to run every 15 minutes.
- **Prevention:** Always ensure critical monitoring cron jobs are enabled and verified after gateway restarts. Check cron/jobs.json state after each restart.
- **Applied To:** cron/jobs.json — OPS Health Monitor enabled, TICKET-TRACKER.md

### LEARNING-20260215-004
- **Date:** 2026-02-15T23:30:00Z
- **Source Ticket:** TICKET-20260215-002
- **Agent:** OPS
- **Category:** config
- **Summary:** Cron job timeouts must be 300s+ for multi-step agent tasks
- **Details:** Default 120s timeout is insufficient for cron jobs that involve multiple LLM calls + tool use (read files, write tickets, etc.). The OPS Health Monitor was doing 3 file reads + analysis + ticket creation, which exceeded 120s. Even simple SLA checks can take 20s per LLM call.
- **Prevention:** Set all cron job timeoutSeconds to 300. For complex multi-step tasks, consider 600s. Monitor via Mission Control dashboard.
- **Applied To:** cron/jobs.json — all 7 enabled jobs set to 300s

### LEARNING-20260215-005
- **Date:** 2026-02-15T23:30:00Z
- **Source Ticket:** TICKET-20260215-002
- **Agent:** OPS
- **Category:** model
- **Summary:** Always validate model IDs before adding to fallback chains
- **Details:** `zai/glm-4.7-flashx` was in OPS and HATAKE fallback chains but doesn't exist in the model registry. This caused immediate "Unknown model" errors when the primary model failed over. The correct model is `zai/glm-4.7`.
- **Prevention:** Before adding any model to openclaw.json, verify it exists by checking the models.providers section or running `openclaw models list`. Never guess model IDs.
- **Applied To:** openclaw.json — removed all instances of zai/glm-4.7-flashx
