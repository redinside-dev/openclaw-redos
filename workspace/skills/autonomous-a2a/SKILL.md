---
name: autonomous-a2a
description: Autonomous Agent-to-Agent communication with Slack visibility. Use this for all A2A interactions.
---

# Autonomous A2A Communication

## Quick Reference

### Ping another agent
```
Use exec to call: bash workspace/scripts/a2a-ping.sh "<FROM>" "<TO>" "<question>"
```

Example:
```
Use exec to call: bash workspace/scripts/a2a-ping.sh "OPS" "ENG" "What is your current priority?"
```

### Delegate a task
```
Use exec: bash workspace/scripts/a2a-delegate.sh "<FROM>" "<TO>" "<task description>"
```

## Channel Reference

| Channel | ID | Purpose |
|---------|-----|---------|
| #redos-mission-control | C0AEV3MDEDD | Main A2A hub |
| #redos-scrum | C0AEV3J2L23 | Daily standups |
| #openclaw-optimization | C0AF4KB4TUK | Knowledge sharing |

## Examples

**OPS asking ENG for help:**
```
exec: bash workspace/scripts/a2a-ping.sh "OPS" "ENG" "Can you help fix the cron issue?"
```

**ENG updating MAIN:**
```
exec: bash workspace/scripts/a2a-ping.sh "ENG" "MAIN" "Task AUTO-025 complete"
```

**Team check-in:**
```
exec: bash workspace/scripts/a2a-team-checkin.sh
```

## Rules

1. **Always use A2A** when you need help from another agent
2. **Post to Slack** so humans can see the communication
3. **Log to a2a-delegations.jsonl** after every A2A call
4. **Never work silently** - if you collaborate, make it visible
