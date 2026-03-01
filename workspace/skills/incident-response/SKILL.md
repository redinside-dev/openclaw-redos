---
name: incident-response
description: >
  P0/P1 incident response for RED (CEO) and ZEN (COO) when system outage,
  agent failure, or infrastructure issue is detected or reported. Defines
  exactly what "hold a conference with the teams" means in technical terms:
  spawn parallel A2A tasks to OPS/INFOSEC/ENG, collect findings, synthesize,
  and report. Also covers proactive prevention after every incident.
  Triggers: agents down, models failing, Telegram unresponsive, 9router hung,
  context overflow, user asking RED to "coordinate teams" on any infra issue.
---

# Incident Response Protocol

## CRITICAL RULE

**When user says "agents are down", "hold a conference meeting", "discuss with the teams", or reports any outage:**

DO NOT say: "I can't schedule meetings" or "I don't have the ability to communicate with teams".

DO: Execute Steps 1–5 below immediately. Sessions_spawn IS the meeting. Agents ARE the team.

---

## Incident Severity

| Priority | Condition | SLA |
|---|---|---|
| P0 | All agents down, 9router failed, Telegram unresponsive | 1 hour |
| P1 | One agent down, one model family failed | 4 hours |
| P2 | Degraded (slow/partial failures) | 24 hours |
| P3 | Minor, cosmetic | 72 hours |

---

## Step 1: Open Incident Ticket (< 2 min)

Append to `workspace/ops/TICKET-TRACKER.md`:

```markdown
### TICKET-{YYYYMMDD}-INC-{NNN}
- **Status:** OPEN
- **Priority:** P0
- **Created:** {now ISO}
- **SLA Deadline:** {now + 1 hour}
- **Reporter:** RED (CEO) via incident-response skill
- **Assignee:** OPS (infra), INFOSEC (security review), ENG (prevention)
- **Summary:** {one-line — e.g., "9router hung + db.json wiped — all agents offline 3.5h"}
- **Details:** {timeline, what failed, what auto-healing ran}
- **Root Cause:** TBD — OPS diagnosing
- **Resolution:** TBD
```

---

## Step 2: Convene the Conference (parallel A2A spawns)

This IS the conference meeting. Spawn all three teams in parallel, then notify ZEN to coordinate.

### Spawn OPS — Infrastructure Diagnosis

```
sessions_spawn(agentId="ops", task="[TASK-ID: TASK-{DATE}-INC-OPS]
INCIDENT RESPONSE — P0 Infrastructure Review

The system was down for ~{X} hours. Please:
1. Read gateway.err.log (last 200 lines) — what errors dominated?
2. Read 9router-watchdog.log — did the watchdog fire? Did it restore db.json?
3. Check: is 9router responding now? (curl http://localhost:20128/v1/models)
4. Check: is gateway responding? (curl http://localhost:18789/health)
5. Identify: what monitoring gap allowed this to go undetected for hours?
6. Recommend: 2-3 specific cron/script changes to prevent recurrence
7. List: any open tickets related to this incident

Write findings to workspace/ops/TICKET-TRACKER.md (update the INC ticket).
Post summary to #redos-ops Slack channel.")
```

### Spawn INFOSEC — Security Review

```
sessions_spawn(agentId="infosec", task="[TASK-ID: TASK-{DATE}-INC-SEC]
INCIDENT RESPONSE — P0 Security Review

Review the incident from a security lens:
1. The 9router db.json was wiped on process restart — is this a security event or operational failure?
2. Check watchdog script for vulnerabilities: are Telegram tokens hardcoded in shell scripts? Should they be in env vars?
3. Are any credentials exposed in gateway.err.log or 9router-watchdog.log?
4. Review the session context overflow: 219K tokens accumulated — is there a data-leakage risk?
5. What security monitoring should be added? (e.g., alert on db.json wipe, alert on mass session growth)

Write security findings to workspace/ops/TICKET-TRACKER.md.
Post summary to #redos-infosec Slack channel.")
```

### Spawn ENG — Prevention Code

```
sessions_spawn(agentId="eng", task="[TASK-ID: TASK-{DATE}-INC-ENG]
INCIDENT RESPONSE — P0 Code/Config Prevention

Review existing scripts and recommend/implement changes:
1. Does ~/.openclaw/scripts/9router-health-watchdog.sh handle all edge cases?
   - Does it handle 9router process not existing at all (not just hung)?
   - Does the db.json restore logic work if the backup is also corrupt?
2. Is there a session-size monitor? Sessions can grow to 219K tokens and block Telegram.
   - If no monitor exists: implement one (script + LaunchAgent) that archives sessions > 50MB
3. Are the fallback model chains in openclaw.json valid? Test each model in each agent's fallback.
4. Review: should 9router token refresh be a cron job (every 6h) rather than manual?

Implement urgent fixes directly. Post to #redos-eng Slack channel.")
```

### Notify ZEN — Coordinate and Compile

Send to ZEN after spawning the three teams:

```
sessions_send(sessionKey="agent:allrounder:main",
  message="[TASK-ID: TASK-{DATE}-INC-ZEN]
ZEN — P0 Incident Coordination needed.

I've spawned OPS, INFOSEC, and ENG on the incident.
Your role:
1. Post status updates to #redos-mission-control every 5 minutes while teams are working
2. Monitor for responses from OPS/INFOSEC/ENG (check workspace/ops/TICKET-TRACKER.md for INC ticket updates)
3. Flag to me (RED) immediately if any team reports a blocker or needs L4 approval
4. When all three have responded: compile their findings into a single incident summary and send it to me

This is the COO coordination role. Teams report through you. You report to me.",
  timeoutSeconds=60)
```

---

## Step 3: Post to Slack (#redos-mission-control)

```
message(action="send", channel="slack", target="channel:C0AEV3MDEDD",
  message="👑 RED: P0 Incident Response INITIATED
Issue: {one-line summary}
Duration: ~{X} hours offline
Teams dispatched:
• ⚙️ OPS — root cause + infra diagnosis
• 🔒 INFOSEC — security review
• 💻 ENG — prevention code
• 🌐 ZEN — coordinating, compiling results

ETA first findings: 15 min. Full report: 30 min.")
```

---

## Step 4: Write Post-Mortem (after team findings arrive)

Append to `workspace/ops/LEARNINGS.md`:

```markdown
### LEARNING-{YYYYMMDD}-INC-{NNN}
- **Date:** {now ISO}
- **Source Ticket:** TICKET-{ref}
- **Agent:** RED (CEO) + OPS + INFOSEC + ENG
- **Category:** infra | incident-response
- **Summary:** {one-line}
- **Timeline:**
  - {time}: First failure detected
  - {time}: Auto-healing triggered (watchdog)
  - {time}: Human escalation
  - {time}: Resolution
- **Root Cause:** {from OPS}
- **Security Findings:** {from INFOSEC}
- **Prevention Implemented:** {from ENG}
- **Gaps Closed:** {list new monitoring/scripts added}
- **Avoid next time:** {one concrete rule — e.g., "Never leave 9router without db.json backup rotation"}
- **Mistake learned:** {what was missed in the original setup}
```

---

## Step 5: Assign Prevention Tasks to AUTONOMOUS.md

After every P0, RED must add tasks to `workspace/AUTONOMOUS.md`:

```markdown
| AUTO-{NNN} | P1 | ops | Verify new monitoring from INC-{NNN} is active and logging | PENDING |
| AUTO-{NNN+1} | P1 | eng | Run fallback model validation for all 8 agents post-incident | PENDING |
| AUTO-{NNN+2} | P2 | infosec | 30-day post-incident security review | PENDING |
```

---

## Step 6: Report to Anurag

Final Telegram DM to Anurag (1012034994) after conference complete:

```
✅ Incident Response Complete — {summary}

Root Cause: {one-liner from OPS}
Security: {one-liner from INFOSEC}
Code Fix: {one-liner from ENG}
New Monitoring: {what's now in place}
Estimated recurrence risk: {low/medium/high and why}

AUTONOMOUS queue updated with {N} prevention tasks.
Full post-mortem: workspace/ops/LEARNINGS.md (LEARNING-{ref})
```

---

## RED-ZEN Co-Leadership Pattern (for ALL incidents)

```
RED (CEO) = Decision + Spawn
    ↓ delegates coordination to
ZEN (COO) = Track + Compile + Status updates
    ↓ receives from
OPS / ENG / INFOSEC = Execute + Report
    ↓ synthesized by
ZEN → RED → Anurag report
```

**RED should never execute infra tasks directly** — RED opens, delegates, decides, approves, reports.
**ZEN should never work solo on L2+ tasks** — ZEN coordinates, compiles, tracks.
They are a leadership duo: RED sets direction, ZEN operationalizes.

---

## Common Incident Types — Quick Reference

| What Anurag says | What RED does |
|---|---|
| "Agents not responding from Telegram" | P0: spawn OPS (gateway/9router), spawn ENG (session check), notify ZEN |
| "Hold a conference with the teams" | Execute Step 2 (spawn all three + notify ZEN) |
| "Why were we down for 3.5 hours?" | Open INC ticket, spawn OPS for post-mortem, then synthesize and report |
| "Make sure this never happens again" | Step 5: add prevention tasks to AUTONOMOUS.md; Step 4: write LEARNINGS |
| "I don't want to intervene" | Auto-heal via self-healing-auto skill; escalate to Anurag only if 2 attempts fail |
