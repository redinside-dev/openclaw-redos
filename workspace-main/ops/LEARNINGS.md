# LEARNINGS.md - Institutional Knowledge

## Critical Issues Resolved

## Patterns Learned
- Missing logs (errors.jsonl, routing-decisions.jsonl) indicate logging configuration failure
- Empty agent status files for non-RED agents
- Persistent ticket (TICKET-060) unresolved, impacting visibility
- Exec allowlist deadlock previously caused Gmail cron failure

## Known Limitations
- No historical logging
- Single-agent system (only RED status available)

## Best Practices
### Logging Resolution
- Add log rotation cron task for errors.jsonl and routing-decisions.jsonl
- Configure log retention policy
- Ensure agent status files are written on startup
- Verify exec allowlist includes necessary commands (e.g., gog)

### System Initialization Context
- Current state: Barebones deployment
- No agent diversity
- Risk of orphaned tasks without logs