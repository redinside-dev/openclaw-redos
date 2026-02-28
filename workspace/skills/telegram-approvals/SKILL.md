# Skill: telegram-approvals

**Structured Telegram approval UX for L4/L5 actions. Use this skill whenever maker-checker requires Telegram approval.**

## Message Format

Every L4/L5 approval request MUST use this exact format when sending via `message(channel="telegram", target="1012034994")`:

```
🔐 APPROVAL REQUIRED — [Tier L4/L5]
━━━━━━━━━━━━━━━━━━━━━
Agent:     {AGENT_ID}
Action:    {exact command or action}
Risk:      {tier} — {one-line risk description}
Branch:    {git branch or N/A}
Diff:      {+N -M lines (K files) or N/A}
Rollback:  {rollback command or description}
Cost est:  {USD or $0.00}
Impact:    {one-line business impact description}
Ticket:    {TICKET-ID}
━━━━━━━━━━━━━━━━━━━━━
Reply: "approve {TICKET-ID}" or "deny {TICKET-ID}"
Or use buttons: ✅ Approve | ❌ Deny | ⏸ Hold 1h | 🛑 Emergency Stop
```

## Implementation Steps

1. **Write approval file** to `workspace/approvals/pending/TICKET-{ID}.json`
   (see maker-checker/SKILL.md for exact JSON format)

2. **Send Telegram message** using:
   ```
   message(
     channel="telegram",
     target="1012034994",
     text="🔐 APPROVAL REQUIRED — [Tier L4]\n━━━━━━━━━━━━━━━━━━━━━\nAgent: OPS\n..."
   )
   ```

3. **Signal pending state** via sessions_send to self:
   ```
   sessions_send(
     sessionKey="agent:{agentId}:main",
     message="APPROVAL_PENDING ticket={TICKET-ID} tier=L4",
     timeoutSeconds=30
   )
   ```

4. **Do NOT block.** Switch to other queued tasks. RED's approval monitor cron (every 2min) will pick up the response.

5. **When notified** by RED that approval file moved to `approved/`:
   - Verify `workspace/approvals/approved/TICKET-{ID}.json` exists
   - For L5: wait 2 additional minutes before executing (grace period)
   - Execute the approved action
   - Write result back to the approval file:
     ```json
     { "status": "executed", "executedAt": "ISO", "result": "success|failure", "output": "..." }
     ```

6. **On failure after approval:** trigger rollback from command-catalog, log to audit.jsonl

## Polling Fallback (if RED monitor is unavailable)

If RED's approval monitor cron is not running, agents may poll directly:
- Every 30 seconds, check `workspace/approvals/pending/TICKET-{ID}.json` → still "pending"?
- Every 30 seconds, call `message(channel="telegram", target="1012034994")` to check for reply
- Do NOT poll more than once per 30s (loop detection will trigger)
- Maximum poll duration: 10 minutes (L4) or 30 minutes (L5)

## Timeout Behavior

### L4 Timeout (10 minutes with no response):
1. Move ticket to `workspace/approvals/held/TICKET-{ID}.json`
2. Set status: `{ "status": "held_at_canary", "heldAt": "ISO" }`
3. If the action is a git push: deploy to staging branch only
4. Send Telegram: "⏸ L4 action {TICKET-ID} held at canary — staging deploy only. Auto-cancels in 24h."
5. After 24h with no approval: `auto_cancel`

### L5 Timeout (30 minutes with no response):
1. Move ticket to `workspace/approvals/cancelled/TICKET-{ID}.json`
2. Set status: `{ "status": "auto_cancelled", "cancelledAt": "ISO", "reason": "L5_TIMEOUT_30MIN" }`
3. Open a new ticket in TICKET-TRACKER.md: "L5 approval timed out — action cancelled"
4. Send Telegram: "🚫 L5 action {TICKET-ID} auto-cancelled (30min timeout). Ticket created."
5. Notify RED via sessions_send

## Emergency Stop Handler

If Anurag replies "🛑 Emergency Stop" or sends the text "EMERGENCY STOP":
1. **Immediately** cancel all pending L4/L5 approvals (move all to cancelled/)
2. Send `sessions_send` to RED: "EMERGENCY_STOP received — halting all pending L4/L5 actions"
3. RED broadcasts halt to all agents via sessions_send
4. Log `{ "event": "EMERGENCY_STOP", "ts": "ISO", "triggeredBy": "telegram:1012034994" }` to audit.jsonl
5. Send Telegram confirmation: "🛑 Emergency stop executed. {N} actions cancelled. All agents halted."

## Hold 1h Handler

If Anurag replies "⏸ Hold 1h":
1. Update ticket: `{ "status": "held", "heldUntil": "ISO+1h" }`
2. Set a reminder: RED cron will re-notify at heldUntil time
3. Send Telegram: "⏸ Action held. Will re-notify at {time}."

## Examples

### L4 Example — git push to main:
```
🔐 APPROVAL REQUIRED — [Tier L4]
━━━━━━━━━━━━━━━━━━━━━
Agent:     ENG
Action:    git push origin main
Risk:      L4 — remote push to main branch
Branch:    feat/cost-tracker-v2
Diff:      +47 -12 lines (3 files)
Rollback:  git revert HEAD (30s)
Cost est:  $0.00
Impact:    Updates cost-tracker module; adds per-agent spend breakdown
Ticket:    TICKET-00000042
━━━━━━━━━━━━━━━━━━━━━
Reply: "approve TICKET-00000042" or "deny TICKET-00000042"
Or use buttons: ✅ Approve | ❌ Deny | ⏸ Hold 1h | 🛑 Emergency Stop
```

### L5 Example — destructive operation:
```
🔐 APPROVAL REQUIRED — [Tier L5] ⚠️ DESTRUCTIVE
━━━━━━━━━━━━━━━━━━━━━
Agent:     OPS
Action:    rm -rf ~/.openclaw/workspace/tmp/old-cache
Risk:      L5 — irreversible file deletion (250MB)
Branch:    N/A
Diff:      N/A
Rollback:  git -C workspace restore tmp/old-cache (if committed)
Cost est:  $0.00
Impact:    Clears stale cache; no service impact expected
Ticket:    TICKET-00000043
━━━━━━━━━━━━━━━━━━━━━
⚠️ 2-minute grace period will apply after approval before execution.
Reply: "approve TICKET-00000043" or "deny TICKET-00000043"
Or use buttons: ✅ Approve | ❌ Deny | ⏸ Hold 1h | 🛑 Emergency Stop
```

## Directory Structure

```
workspace/approvals/
  pending/     — awaiting Anurag response
  approved/    — approved, ready to execute (or executed)
  denied/      — denied by Anurag or INFOSEC
  held/        — held at canary (L4 timeout)
  cancelled/   — auto-cancelled (L5 timeout or Emergency Stop)
```

Ensure these directories exist before writing tickets:
```bash
mkdir -p ~/.openclaw/workspace/approvals/{pending,approved,denied,held,cancelled}
```
