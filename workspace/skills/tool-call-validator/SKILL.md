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

### Rule 3: `exec` tool — NATIVE TIER CLASSIFICATION (OpenClaw-native enforcement)

**Enforcement is via OpenClaw sandbox and tools.deny — not custom scripts.**

The gateway enforces hard limits via `openclaw.json`:
- `infosec` agent: exec is in `tools.deny` — gateway blocks it unconditionally
- `ops`, `eng`: run in `sandbox.mode: "all"` (Docker) — blast radius is container-limited
- `main`, `allrounder`: no sandbox but exec is intentional (orchestrators need it)

**Before every exec, classify behaviorally using command-catalog:**
1. Look up your agent's YAML in `workspace/skills/command-catalog/commands-<agentId>.yaml`
2. If command matches `deny_patterns`: **STOP** — do not execute, log to audit.jsonl, notify RED
3. Determine tier from `tier_overrides`:
   - **L0–L2** (read-only, sandbox exec, health checks): execute immediately
   - **L3** (infra-limited exec, npm install, crontab): `sessions_send` to INFOSEC (120s timeout → auto-deny)
   - **L4** (git push, external deploy): write to `workspace/approvals/pending/`, send Telegram to 1012034994, wait
   - **L5** (sudo, rm -rf, prod DB): same as L4 + 2-minute grace period after approval
4. After exec: on non-zero exit, trigger rollback per `commands-<agentId>.yaml` rollback field

Log every exec decision to `workspace/logs/audit.jsonl`:
```json
{"ts":"<ISO>","agent":"<id>","tool":"exec","command":"<cmd>","tier":"L<n>","decision":"ALLOW|DENY|PENDING"}
```

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
