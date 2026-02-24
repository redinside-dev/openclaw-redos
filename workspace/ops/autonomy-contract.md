# Autonomy Contract — Team Hygiene Standards

This document defines the operational hygiene standards for autonomous agent coordination. Every agent must follow these practices to maintain visibility, traceability, and unblocking capability.

---

## 1. Heartbeat State Updates (Daily Minimum)

Every agent must update their state files at least once per day (heartbeat or cron):

- **`memory/state-{agentId}.json`** — Current energy, curiosity, concerns, mood, open questions.
- **`memory/working-{agentId}.json`** — Current focus, last action, next action, blockers.

**Why:** RED and ZEN need to know what each agent is working on, what's blocking them, and what they're thinking about. Without this, we can't route work or spot conflicts.

**Format:**
```json
{
  "agentId": "eng",
  "updatedAt": "2026-02-24T09:30:00Z",
  "currentFocus": "Fixing delivery-queue schema drift",
  "lastAction": "Reviewed ENG_GITHUB_POC_WORKFLOWS.md; identified 3 schema mismatches",
  "nextAction": "Write schema validator shim (TICKET-20260224-024)",
  "blockers": ["Waiting for OPS to confirm gateway restart window"]
}
```

---

## 2. Agent-to-Agent (A2A) Logging (Every Dispatch)

Every time an agent sends a message to another agent (via `sessions_send` or `sessions_spawn`), log it to:

**`workspace/logs/a2a-delegations.jsonl`** (append-only JSONL)

**Format:**
```json
{
  "ts": "2026-02-24T09:30:00Z",
  "from": "zen",
  "to": ["eng", "research"],
  "type": "routing",
  "topic": "microsoft.com SSRF/DNS root cause",
  "summary": "Routed evidence to ENG/RESEARCH; root cause = Tailscale DNS sinkhole (198.18.8.77)"
}
```

**Why:** This is the audit trail for team coordination. It shows who asked whom to do what, and when. It's essential for debugging coordination failures and understanding team dynamics.

---

## 3. Blocker Transparency (Immediate)

If an agent is blocked (waiting on another agent, external dependency, or unclear requirement), they must:

1. **Write the blocker to `memory/working-{agentId}.json`** (in the `blockers` array).
2. **Open a ticket in `workspace/ops/TICKET-TRACKER.md`** with:
   - Blocker description
   - Who/what is blocking
   - Expected unblock time (if known)
   - Impact (P1/P2/P3)

**Format (TICKET-TRACKER.md):**
```markdown
## TICKET-20260224-025 [BLOCKED] Schema validator shim (ENG)
- Blocker: Waiting for OPS to confirm gateway restart window (affects delivery-queue testing)
- Impact: P1 (blocks directive-20260224-skill-autonomy)
- Opened: 2026-02-24T09:30:00Z
- Expected unblock: 2026-02-24T11:00:00Z
```

**Why:** RED needs to know what's blocking the team so they can unblock it. Without this, blockers become invisible and tasks stall.

---

## 4. Skill Adoption (Weekly)

Every agent must adopt and demonstrate usage of **1 new skill per week** (from the "unused skills" list in `ops/skill-audit-2026-02-24.md`).

**Adoption checklist:**
- [ ] Read the skill's `SKILL.md`
- [ ] Run a test/demo of the skill
- [ ] Log usage to `workspace/logs/a2a-delegations.jsonl` (type: "skill-adoption")
- [ ] Update `ops/skill-audit-2026-02-24.md` with usage evidence

**Format (A2A log):**
```json
{
  "ts": "2026-02-24T10:00:00Z",
  "from": "eng",
  "type": "skill-adoption",
  "skill": "video-frames",
  "summary": "Extracted 5 frames from demo video; integrated with summarize skill for frame captions"
}
```

**Why:** Skills are tools. If we don't use them, we're leaving capability on the table. Weekly adoption ensures the team stays sharp and discovers new workflows.

---

## 5. Daily Standup Synthesis (Morning)

ZEN must synthesize team activity into a brief for `workspace/ops/STANDUP-LOG.md` every morning:

**Format:**
```markdown
## 2026-02-24 Standup

**In Progress:**
- ENG: Fixing delivery-queue schema drift (TICKET-20260224-024)
- RESEARCH: Triaging microsoft.com SSRF/DNS issue (RESOLVED: Tailscale sinkhole)
- OPS: System health DEGRADED; gateway restart pending

**Blockers:**
- ENG blocked on OPS gateway restart window

**Wins:**
- RESEARCH + ENG confirmed DNS root cause (Tailscale 100.64.0.2 → 198.18.8.77)
- ZEN routed evidence to all agents; unblocked RESEARCH triage

**Next 24h:**
- OPS: Restart gateway; clear delivery-recovery queue
- ENG: Deploy schema validator shim
- RESEARCH: Resume web-search triage
```

**Why:** RED needs a 1-minute snapshot of team state every morning. This is the executive brief.

---

## 6. Escalation Path (If Blocked)

If an agent is blocked for >30 minutes and can't self-unblock:

1. **Log the blocker** (see section 3).
2. **Send a message to ZEN** (via `sessions_send`): "I'm blocked on X; can you help?"
3. **ZEN escalates to RED** if needed.

**Why:** We don't want agents spinning on blockers. ZEN is the unblocking coordinator.

---

## Enforcement

- **Daily check:** ZEN reads all state files + TICKET-TRACKER.md during heartbeat.
- **Weekly audit:** RED reviews `a2a-delegations.jsonl` + `STANDUP-LOG.md` for compliance.
- **Monthly review:** Team reviews this contract and updates as needed.

---

## Non-Negotiables

- **No silent failures.** If you're stuck, say so.
- **No mental notes.** Write it down (state file, ticket, A2A log).
- **No surprises.** RED should never ask "what is the team doing?" and get a blank stare.
