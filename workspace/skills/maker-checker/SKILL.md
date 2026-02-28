# Skill: maker-checker

**Autonomous maker-checker workflow — agents approve each other. Anurag only approves admin-level actions.**

## Overview

Every significant action in RedOS follows a maker-checker chain:

```
CEO (RED) schedules task
  → INFOSEC reviews (checker)
    → OPS/ENG implements (maker)
      → if admin-level: Anurag approves via Telegram
```

This is the backbone of 95%+ autonomous operation. Agents never wait idle — if approval is needed, they queue it, do other work, and pick up when approved.

---

## Approval Levels

### Level 0 — No approval needed (auto-proceed)
- Reading files, writing to workspace/, status checks
- Sending Slack/Telegram messages
- Running pre-approved scripts in `workspace/scripts/`
- `git status`, `git log`, `git diff` (read-only git)
- Health checks, cron management (non-destructive)
- Any binary in exec-approvals.json allowlist

### Level 1 — INFOSEC approval (A2A, fast, no human needed)
Required for:
- Any code changes committed to a repo (`git commit`, `git push`)
- New dependencies added (npm install, pip install)
- Config file changes (openclaw.json, cron/jobs.json)
- New skill creation or modification
- Any outbound API call to a new/unlisted domain
- New exec binaries being invoked for the first time

How to get Level 1 approval:
```
sessions_send(
  sessionKey="agent:infosec:main",
  message="MAKER-CHECKER REVIEW REQUEST\nAction: <describe>\nFiles: <list>\nRisk: <low|medium|high>\nApprove? (yes/no)",
  timeoutSeconds=120
)
```
INFOSEC replies in-session. If approved, proceed. If denied, open ticket and stop.

### Level 2 — Anurag approval via Telegram (async queue)
Required for:
- `sudo` commands or anything requiring root/admin
- `launchctl` changes (adding/removing/changing LaunchAgents) EXCEPT gateway restart which OPS can do
- Destructive file ops (`rm -rf`, bulk delete, overwriting backups)
- External deploys (git push to remote, npm publish)
- Production secrets rotation
- Any financial action (charges, API spend beyond daily limit)
- Force-installing new system software (brew install --cask, etc.)

How to request Level 2 approval (async — do NOT block):

1. **Write approval request:**
```json
// workspace/approvals/pending/TICKET-{ID}.json
{
  "id": "TICKET-{ID}",
  "requestedBy": "{agentId}",
  "requestedAt": "{ISO timestamp}",
  "action": "exact command or action description",
  "why": "one sentence reason",
  "risk": "what could go wrong",
  "rollback": "how to undo",
  "status": "pending"
}
```

2. **Send Telegram DM to Anurag (user 1012034994):**
```
APPROVAL REQUIRED — {short title}
Requested by: {agent} | Ticket: {TICKET-ID}
Action: {exact command}
Why: {one sentence}
Risk: {what could go wrong}
Rollback: {how to undo}
Reply: "approve {TICKET-ID}" or "deny {TICKET-ID}"
```

3. **Do NOT block.** Continue other tasks. The approval monitor (RED cron, every 2 min) will:
   - Watch Telegram for Anurag's reply
   - Move the file to `workspace/approvals/approved/` or `denied/`
   - Notify you via `sessions_spawn` when approved

4. **On notification:** Check `workspace/approvals/approved/TICKET-{ID}.json` exists, then execute the approved action within 10 minutes. Log result to the approval file.

---

## CEO Task Scheduling

RED (CEO) schedules tasks via:
- `sessions_spawn(agentId="eng", task="...")` — delegate coding to ENG
- `sessions_spawn(agentId="ops", task="...")` — delegate infra to OPS
- `sessions_spawn(agentId="infosec", task="...")` — trigger security review
- `sessions_spawn(agentId="research", task="...")` — trigger research

RED does NOT implement directly — only delegates and reviews.

## INFOSEC Checker Responsibilities

INFOSEC is the autonomous checker for all Level 1 actions. When reviewing:
1. Check if the action is in scope (deny out-of-scope requests)
2. Verify no credentials/secrets are exposed
3. Check for injection risks (exec commands, user-supplied paths)
4. Verify the agent has the correct permissions
5. Reply "APPROVED — proceed" or "DENIED — reason: ..."

INFOSEC can also proactively:
- Run `sessions_send` to notify RED of any detected risk
- Open tickets for recurring patterns
- Add new domains to the outbound URL allowlist after review

## OPS Self-Healing — Pre-Approved Admin Actions

The following admin actions are pre-approved for OPS (no Level 2 needed):
- Gateway restart: `launchctl stop ai.openclaw.gateway && launchctl start ai.openclaw.gateway`
- Dashboard restart: `launchctl stop ai.openclaw.dashboard && launchctl start ai.openclaw.dashboard`
- Ollama health check and restart: `launchctl stop homebrew.mxcl.ollama && launchctl start homebrew.mxcl.ollama`

OPS MUST log these to `workspace/logs/self-healing-ops.jsonl` before executing.

## Approval Monitor (RED runs every 2 min)

RED's `Telegram Approval Monitor` cron reads Telegram DMs, looks for:
- `"approve TICKET-XXXXXXXX"` → move pending → approved, notify requesting agent
- `"deny TICKET-XXXXXXXX"` → move pending → denied, notify requesting agent
- Check `workspace/approvals/pending/` for requests older than 30 min → send reminder DM

---

## Non-Negotiables

- NEVER proceed with Level 2 actions without the approval file in `workspace/approvals/approved/`
- NEVER fake an approval or infer from silence
- ALWAYS log the final outcome (approved/denied + action taken) back to the approval file
- If INFOSEC is unreachable (session timeout) for Level 1: escalate directly to Level 2 (Anurag)
- RED can override any Level 1 denial in emergencies — state reason in ticket
