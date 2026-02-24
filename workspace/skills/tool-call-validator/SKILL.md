# Skill: tool-call-validator

**Use this skill before every tool call that sends a message, writes a file, or executes a command.**

## Purpose

Prevent silent failures caused by schema drift. Every tool call must pass preflight validation before execution. This skill makes the system self-healing by catching errors before they happen.

---

## Preflight Rules (MANDATORY — check before every tool call)

### Rule 1: `message` tool — send action
Before calling `message(action="send", ...)`:
- `channel` MUST be present and explicit (`"slack"` or `"telegram"`)
- `target` MUST be present:
  - Slack: `"channel:<id>"` (e.g. `"channel:C0AEV3MDEDD"`)
  - Telegram: numeric user ID as string (e.g. `"1012034994"`)
- `message` MUST be non-empty
- If `channel` is missing → **auto-fix**: infer from context (Slack session → `"slack"`, Telegram session → `"telegram"`)
- If `target` is missing → **hard-fail**: log error, open ticket, do NOT send

### Rule 2: `write` / `edit` tool
- `content` MUST be non-empty
- `path` MUST be relative to agent workspace root (no `../../` traversal outside workspace)
- If `content` is empty → **hard-fail**: log error, do NOT write

### Rule 3: `exec` tool
- Command MUST NOT contain destructive ops (`rm -rf`, `DROP TABLE`, `format`, `mkfs`) without prior approval gate
- If destructive op detected → **hard-fail**: open approval request, do NOT execute

### Rule 4: `sessions_send` / `sessions_spawn`
- `sessionKey` or `agentId` MUST be a known agent: `main`, `allrounder`, `eng`, `ops`, `research`, `infosec`, `finance`, `hatake`
- MUST log to `../workspace/logs/a2a-delegations.jsonl` BEFORE calling
- If unknown agentId → **hard-fail**: log error, notify RED

---

## Auto-fix Map (legacy → current schema)

| Legacy param | Current param | Action |
|---|---|---|
| `to` | `target` | Auto-rename |
| `action:"send"+"Message"` | `action:"send"` | Auto-fix action value |
| `channel_id` | `target` | Auto-rename, prepend `channel:` if missing |
| `userId` | `target` | Auto-rename |
| `content` | `message` | Auto-rename |
| Missing `channel` in Slack session | `channel: "slack"` | Auto-inject |

---

## On Validation Failure

1. Log the failure: append to `../workspace/logs/tool-validation-errors.jsonl`:
```json
{"ts":"<ISO>","agent":"<agentId>","tool":"<toolName>","error":"<reason>","params":<params>}
```
2. Open a ticket in `../workspace/ops/TICKET-TRACKER.md` if this is the 2nd+ occurrence of the same error
3. Notify RED via `sessions_send` if the failure blocks a critical task
4. Do NOT retry with the same invalid params — fix the params first

---

## Usage

Every agent reads this skill at session start (it is listed in SOUL.md under key skills).
Apply these rules mentally before every tool call — no extra overhead, just a quick preflight check.
