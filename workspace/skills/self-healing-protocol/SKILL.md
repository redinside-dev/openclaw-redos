---
name: self-healing-protocol
description: >
  Self-healing and self-improvement protocol for all agents. When any agent
  encounters an error, receives a fix request from Telegram, or detects an
  anomaly, this protocol activates. The agent must: (1) log a ticket in
  TICKET-TRACKER.md, (2) diagnose the root cause, (3) attempt a fix using
  available tools, (4) update LEARNINGS.md with what was learned, (5) notify
  OPS (Scrum Master) of the resolution. Use when: an error occurs, a user
  reports an issue via Telegram, a health check fails, or an SLA is breached.
---

# Self-Healing Protocol

## Trigger Conditions

This protocol activates when ANY of these occur:
1. An API call fails after retries
2. A user reports an issue via Telegram (e.g., "fix X", "something is broken")
3. A health check detects an anomaly
4. A cron job fails
5. An SLA deadline is approaching or breached
6. Another agent reports a problem via `sessions_send`

## Step 1: Log the Ticket

Create a ticket in `/Users/redinside/.openclaw/workspace/ops/TICKET-TRACKER.md`:

```markdown
### TICKET-{YYYYMMDD}-{NNN}
- **Status:** OPEN
- **Priority:** {P0|P1|P2|P3 based on impact}
- **Created:** {now ISO}
- **SLA Deadline:** {based on priority — see SLA Policy in TICKET-TRACKER.md}
- **Reporter:** {your agent ID or "telegram"}
- **Assignee:** {yourself or delegate to specialist}
- **Summary:** {one-line}
- **Details:** {full description including error messages, stack traces}
```

Priority guide:
- **P0:** System down, all agents affected, data loss risk
- **P1:** One agent down, user-facing feature broken
- **P2:** Degraded performance, non-critical feature broken
- **P3:** Cosmetic, documentation, minor improvement

## Step 2: Diagnose

1. **Read recent errors:** Check `/Users/redinside/.openclaw/logs/errors.jsonl` (last 10 entries)
2. **Read recent health:** Check `/Users/redinside/.openclaw/logs/health.jsonl` (last 5 entries)
3. **Check gateway log:** Read `/Users/redinside/.openclaw/logs/gateway.err.log` (last 20 lines)
4. **Check LEARNINGS.md:** Has this issue been seen before? Read `/Users/redinside/.openclaw/workspace/ops/LEARNINGS.md`
5. **Search web if needed:** Use `web_search` to find solutions for unfamiliar errors
6. **Ask other agents:** Use `sessions_send` to consult specialists:
   - Config issues → send to `ops`
   - Code issues → send to `eng`
   - Security issues → send to `infosec`
   - Model/API issues → send to `research`

## Step 3: Attempt Fix

Based on diagnosis, attempt the fix:

### Config fixes (safe to auto-apply):
- Model fallback chain adjustments
- Cron job enable/disable
- Skill enable/disable

### Code fixes (require ENG agent):
- Delegate to ENG via `sessions_send(agentId="eng", message="Fix: {description}")`
- ENG uses `claude -p` or `cursor-agent` to implement

### Infrastructure fixes (require OPS):
- Gateway restart: `exec` tool to run restart command
- Service health: Check launchd plist status

### Escalation (when auto-fix fails):
- Send Telegram message to Anurag (user ID: 1012034994) explaining the issue and what was tried
- Update ticket status to BLOCKED

## Step 4: Verify Fix

After applying a fix:
1. Re-run the failing operation
2. Check that the error no longer appears in logs
3. Confirm the health check passes

## Step 5: Update Knowledge Base

MANDATORY after every resolution:

1. **Update ticket** in TICKET-TRACKER.md:
   - Set Status: RESOLVED
   - Fill in Root Cause, Resolution, Learnings, Resolved At

2. **Append to LEARNINGS.md** at `/Users/redinside/.openclaw/workspace/ops/LEARNINGS.md`:
   ```markdown
   ### LEARNING-{YYYYMMDD}-{NNN}
   - **Date:** {now}
   - **Source Ticket:** TICKET-{ref}
   - **Agent:** {your ID}
   - **Category:** {config|model|tool|skill|infra|workflow|security}
   - **Summary:** {one-line}
   - **Details:** {what happened and how it was fixed}
   - **Prevention:** {how to prevent recurrence}
   - **Applied To:** {what was changed}
   - **Avoid next time:** {one line: mistake learned / what to avoid next time}
   ```
   The "Avoid next time" line is MANDATORY: one concrete thing to avoid or do differently so we learn from mistakes.

3. **Notify OPS** via `sessions_send(agentId="ops", message="Resolved TICKET-{ref}: {summary}")` so the Scrum Master can update tracking.

## Step 6: Self-Improvement

After resolving an issue, check if the fix should be permanent:
- Should a skill be updated? → Edit the SKILL.md
- Should SOUL.md be updated? → Propose the change (tell user first)
- Should a cron job be created to prevent recurrence? → Create it
- Should the model fallback chain change? → Update openclaw.json
- Should KNOWLEDGEBASE.md be updated? → Append to relevant section

## SLA Enforcement (OPS Scrum Master)

OPS agent checks TICKET-TRACKER.md every 30 minutes:
- Tickets approaching SLA deadline → ping assignee via `sessions_send`
- Tickets past SLA deadline → escalate to RED (CEO) via `sessions_send`
- P0 tickets past 30 min → Telegram alert to Anurag
