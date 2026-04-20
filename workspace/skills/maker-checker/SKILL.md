# Skill: maker-checker

**L0–L5 ri[REDACTED] approval system — agents govern each other. Anurag only approves L4/L5 actions via Telegram.**

## Overview

Every action in RedOS is classified into a risk tier before execution. Lower tiers execute automatically; higher tiers require INFOSEC A2A review or Anurag's Telegram approval.

```
Agent prepares action
  → Classify risk tier (L0–L5)
    → L0/L1/L2: execute immediately, log to audit.jsonl
    → L3: INFOSEC A2A review (120s timeout → auto-deny)
    → L4/L5: Telegram approval (10/30min timeout → hold/cancel)
```

This is the backbone of 80–95% autonomous operation. Agents never idle — if approval is needed, they queue it, do other work, and resume when approved.

---

## Risk Tier Matrix

| Tier | Name | Examples | Approval | Timeout |
|------|------|----------|----------|---------|
| L0 | Read / Observe | file read, status, search, list, heartbeat, health checks | Auto | — |
| L1 | Internal Write | workspace file write, memory update, ticket create, Telegram/Slack message | Auto | — |
| L2 | Sandbox Exec | test run, lint, build in sandbox, git read-only (log/diff/status/show) | Auto | — |
| L3 | Infra-Limited Exec | gateway restart, cron add/remove, log rotate, service control (openclaw services only) | INFOSEC A2A | 120s → auto-deny |
| L4 | Staging / External | git push, npm publish, new outbound domain, secrets rotate, brew install | Telegram Approve | 10min → hold at canary |
| L5 | Prod / Destructive | rm -rf, sudo, prod deploy, DB write, API key change, force push | Telegram Approve + 2min confirm wait | 30min → auto-cancel |

---

## Classification Rules

Before any tool call, classify the action using this decision tree:

```
1. Is it a read, status check, list, search, or heartbeat?
   → L0 (auto-proceed)

2. Is it writing to workspace/ or sending a message to Telegram/Slack?
   → L1 (auto-proceed)

3. Is it running a command in sandbox that is read-only or pre-approved test/lint/build?
   → L2 (auto-proceed). Check command-catalog skill first.

4. Is it a gateway/node/dashboard service restart, cron modification, or log rotation?
   → L3 (INFOSEC A2A review)

5. Is it a git push, npm publish, new domain access, brew install, or secret rotation?
   → L4 (Telegram approval)

6. Is it rm -rf, sudo, production deploy, DB write, API key change, or anything destructive?
   → L5 (Telegram approval + 2-minute confirmation delay)
```

**When in doubt, classify UP (more restrictive tier).**

---

## L0 — Auto-Execute (Read/Observe)

No approval needed. Execute immediately.

**Includes:**
- `read`, `search`, `list`, `status`, `health check`
- `git log`, `git status`, `git diff`, `git show`
- Workspace file reads
- Heartbeat pings
- `openclaw status`, `openclaw gateway probe`

**Log:** Append to `workspace/logs/audit.jsonl` with `{ "tier": "L0", "action": "...", "ts": "ISO" }`

---

## L1 — Auto-Execute (Internal Write)

No approval needed. Execute immediately.

**Includes:**
- Writing files to `~/.openclaw/workspace/` subtrees
- Updating `workspace/MEMORY.md`, tickets, task state
- Sending Telegram or Slack messages (informational)
- Creating approval request files in `workspace/approvals/pending/`

**Log:** Append to `workspace/logs/audit.jsonl` with tier L1.

---

## L2 — Auto-Execute (Sandbox Exec)

No approval needed. Verify against command-catalog first.

**Includes:**
- `npm test`, `npm run lint`, `npm run build`, `npm run typecheck`
- `pytest`, `tsc --noEmit`
- `git add`, `git commit` (local only)
- `node --version`, `node index.js` (in sandbox)
- Any binary in `workspace/config/exec-approvals.json`
- Pre-approved self-healing scripts in `workspace/scripts/`

**Before exec:** Check command-catalog/SKILL.md for deny patterns and rate limits.
**Log:** Append to `workspace/logs/audit.jsonl` + `workspace/logs/episodes.jsonl` with tier L2.

---

## L3 — INFOSEC A2A Review (Infra-Limited Exec)

**Required for:**
- `launchctl (stop|start) ai.openclaw.*` — openclaw service control
- `launchctl (stop|start) homebrew.mxcl.ollama` — Ollama restart
- Cron modifications (`crontab`, jobs.json changes)
- Log rotation or cleanup scripts
- `npm install`, `pip install` (new dependencies)
- Config file changes outside workspace/ (e.g., system-level)
- New outbound domains being accessed for the first time

**How to request L3 approval:**

```
sessions_send(
  sessionKey="agent:infosec:main",
  message="MAKER-CHECKER L3 REVIEW\nAction: <describe exactly>\nFiles/services: <list>\nRisk: <why this is L3>\nRollback: <how to undo>\nApprove? (yes/no)",
  timeoutSeconds=120
)
```

**Timeout behavior:** If INFOSEC does not respond within 120 seconds:
1. Auto-deny the action
2. Log `{ "tier": "L3", "result": "L3_TIMEOUT", "action": "..." }` to audit.jsonl
3. Send `sessions_send` to RED: "L3 TIMEOUT — [action] auto-denied. INFOSEC unreachable."
4. Escalate to L4 (Telegram) if the action is business-critical

**On approval:** Proceed, log result.
**On denial:** Open ticket in TICKET-TRACKER.md, stop, notify RED.

---

## L4 — Telegram Approval (Staging / External)

**Required for:**
- `git push` to any remote
- `npm publish`
- New outbound domain (first access to an API not in approved list)
- Rotating secrets or API keys
- `brew install` (system package)
- Deploying to staging environments

**Process:**
1. Write approval request to `workspace/approvals/pending/TICKET-{ID}.json`
2. Format and send Telegram message (see telegram-approvals/SKILL.md for exact format)
3. **Do NOT block** — continue other work
4. Poll `workspace/approvals/` every 30s or wait for RED's approval monitor cron (runs every 2min)
5. On approval: execute within 10 minutes, log outcome
6. On 10-minute timeout: `hold_at_canary` — deploy to staging only, wait 24h, then auto-cancel if still no response

**Log:** `workspace/logs/audit.jsonl` + `workspace/approvals/approved/` or `denied/`

---

## L5 — Telegram Approval + 2min Wait (Prod / Destructive)

**Required for:**
- `rm -rf` or any bulk/irreversible file deletion
- `sudo` commands
- Production deploys
- Database writes
- API key changes (production)
- `git push --force`
- Any action touching external billing or financial systems

**Process:**
1. Write approval request to `workspace/approvals/pending/TICKET-{ID}.json`
2. Format and send Telegram message with L5 marker (see telegram-approvals/SKILL.md)
3. **Do NOT block** — continue other work
4. Wait for explicit Telegram approval
5. On approval: **wait an additional 2 minutes** before executing (grace period for reconsideration)
6. On 30-minute timeout: `auto_cancel` — log `{ "tier": "L5", "result": "CANCELLED_TIMEOUT" }`, open ticket, notify RED
7. On "Emergency Stop": send `openclaw session reset` to ALL agents + alert RED immediately

---

## Approval Request File Format

```json
// workspace/approvals/pending/TICKET-{ID}.json
{
  "id": "TICKET-{ID}",
  "requestedBy": "{agentId}",
  "requestedAt": "{ISO timestamp}",
  "tier": "L4",
  "action": "exact command or action description",
  "why": "one sentence reason",
  "risk": "what could go wrong",
  "rollback": "how to undo",
  "status": "pending"
}
```

---

## Approval Monitor (RED runs every 2 min)

RED's `Telegram Approval Monitor` cron reads Telegram DMs, looks for:
- `"approve TICKET-XXXXXXXX"` → move pending → approved, notify requesting agent via sessions_send
- `"deny TICKET-XXXXXXXX"` → move pending → denied, notify requesting agent
- Inline button responses from telegram-approvals messages (✅ Approve / ❌ Deny / ⏸ Hold 1h / 🛑 Emergency Stop)
- Check `workspace/approvals/pending/` for L4 requests older than 10min → hold at canary
- Check `workspace/approvals/pending/` for L5 requests older than 30min → auto-cancel
- Requests older than 30 min (L4) with no action → send reminder DM

---

## OPS Pre-Approved L3 Actions (No INFOSEC Review Needed)

The following are pre-approved for OPS and execute at L2 (auto):
- Gateway restart: `launchctl stop ai.openclaw.gateway && launchctl start ai.openclaw.gateway`
- Dashboard restart: `launchctl stop ai.openclaw.dashboard && launchctl start ai.openclaw.dashboard`
- Ollama health check and restart: `launchctl stop homebrew.mxcl.ollama && launchctl start homebrew.mxcl.ollama`
- Node service restart: `launchctl stop ai.openclaw.node && launchctl start ai.openclaw.node`

OPS MUST log these to `workspace/logs/self-healing-ops.jsonl` before executing.

---

## CEO Task Scheduling

RED (CEO) schedules tasks via:
- `sessions_spawn(agentId="eng", task="...")` — delegate coding to ENG
- `sessions_spawn(agentId="ops", task="...")` — delegate infra to OPS
- `sessions_spawn(agentId="infosec", task="...")` — trigger security review
- `sessions_spawn(agentId="research", task="...")` — trigger research

RED does NOT implement directly — only delegates, reviews, and handles L4/L5 Telegram approvals.

## INFOSEC Checker Responsibilities

INFOSEC is the autonomous checker for all L3 actions. When reviewing:
1. Check if the action is in scope (deny out-of-scope requests)
2. Verify no credentials/secrets are exposed
3. Check for injection risks (exec commands, user-supplied paths)
4. Verify the agent has the correct permissions
5. Check against command-catalog deny_patterns
6. Reply "APPROVED — proceed" or "DENIED — reason: ..."

INFOSEC can also proactively:
- Run `sessions_send` to notify RED of any detected risk
- Open tickets for recurring patterns
- Add new domains to the outbound URL allowlist after review

---

## Non-Negotiables

- NEVER proceed with L4/L5 actions without the approval file in `workspace/approvals/approved/`
- NEVER fake an approval or infer from silence
- NEVER skip tier classification — every tool call must be classified
- ALWAYS log the final outcome (approved/denied + action taken) to the approval file and audit.jsonl
- If INFOSEC is unreachable for L3: escalate to L4 (Telegram) for business-critical actions; otherwise auto-deny
- RED can override any L3 denial in emergencies — state reason in ticket
- L5 actions always require the 2-minute wait after approval before execution
- On "Emergency Stop": halt ALL pending actions across ALL agents immediately
