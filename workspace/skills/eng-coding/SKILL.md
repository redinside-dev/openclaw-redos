# ENG Coding Skill

## Purpose
Enable ENG agent to execute coding tasks using Claude Code as the sole coding agent, with automatic subscription backend fallback when the primary quota is exhausted.

## How It Works

**Claude Code is always the coding agent.** When ENG receives a complex coding task, it invokes Claude Code via `ccs-smart.sh`, which automatically selects the best available subscription backend:

1. **Anthropic Claude Pro** (direct) — preferred
2. **Cursor Pro backend** (via CCS) — if Anthropic quota exhausted
3. **9Router backends** (Gemini → Codex → iFlow/Qwen) — if both exhausted

No manual provider selection needed. Everything is automatic based on `workspace/tmp/provider-quota.json` (refreshed every 30min by OPS cron).

## Invocation

**Always use `ccs-smart.sh` for coding tasks:**

```bash
bash /Users/redinside/.openclaw/scripts/ccs-smart.sh -p "<coding task description>"
```

Examples:
```bash
# Simple coding task
bash /Users/redinside/.openclaw/scripts/ccs-smart.sh \
  -p "Add input validation to the user registration endpoint in src/auth/register.ts"

# With project context
bash /Users/redinside/.openclaw/scripts/ccs-smart.sh \
  --project my-api \
  -p "Refactor the database layer to use the repository pattern"

# Check which backend would be selected (dry run)
bash /Users/redinside/.openclaw/scripts/ccs-smart.sh \
  --dry-run -p "any task"
```

## Allowed Tools for Coding Tasks

Pass these to Claude Code as needed:
```bash
# Full tool access (multi-file work)
bash /Users/redinside/.openclaw/scripts/ccs-smart.sh \
  -p "claude -p --allowed-tools 'Bash,Edit,Write,Read,Glob,Grep' '<task>'"
```

Or let Claude Code use its defaults (no `--allowed-tools` restriction needed for most tasks).

## On Rate Limit / Quota Exhaustion

`ccs-smart.sh` handles this automatically. If a backend returns a rate limit error, it is recorded in `workspace/tmp/provider-quota.json` and the next backend is tried.

**Do not manually switch providers.** If you see a rate limit message, simply re-run `ccs-smart.sh` — it will select the next available backend automatically.

## Logging

`ccs-smart.sh` logs the selected backend to stderr:
```
[ccs-smart] Backend: Cursor Pro (via CCS)
```

This is also recorded in `workspace/logs/routing-decisions.jsonl` by the smart router.

## Rollback

If `ccs-smart.sh` itself fails (CCS not installed, script error), fall back to:
```bash
claude -p "<task>"
```
And report the failure to OPS for ticket creation.
