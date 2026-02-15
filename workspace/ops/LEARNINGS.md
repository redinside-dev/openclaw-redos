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
