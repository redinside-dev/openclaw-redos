# Cloud Code Bridge Skill

## Purpose
Route ENG coding tasks through the quota-aware Tier 5 backend pool. Claude Code is always the coding agent — CCS (Claude Code Subscription) transparently switches which subscription backend powers it when the primary quota is exhausted.

## Core Principle

**There is one coding agent: Claude Code.**

CCS changes which *subscription backend* Claude Code uses:
- **Anthropic Claude Pro** (default, direct) — `claude -p`
- **Cursor Pro backend** (via CCS) — `ccs cursor -p` — Cursor Pro subscription powers the session
- **9Router backends** (via CCS + 9Router) — `ccs 9router -p` — Gemini/Codex/iFlow/Qwen subscription

The ENG agent always invokes Claude Code. The backend is selected automatically by ccs-smart.sh based on live quota data.

## When to Apply
- Agent: `eng`
- Task type: `needs_code == true AND complexity >= complex`
- Smart Router has applied Rule 0 and selected a Tier 5 backend

## Automated Backend Selection

**Use `scripts/ccs-smart.sh` — do not hardcode backends.**

```bash
# Automatic (quota-aware, recommended)
bash scripts/ccs-smart.sh -p "<coding task prompt>"
bash scripts/ccs-smart.sh -p "<prompt>" --project <project_id>
```

`ccs-smart.sh` reads `workspace/tmp/provider-quota.json` (refreshed every 30min by cron) and selects:
1. Anthropic Claude Pro direct (`claude -p`) — if available
2. Cursor Pro backend via CCS (`ccs cursor -p`) — if Anthropic quota exhausted
3. 9Router auto (`ccs 9router -p`) — Gemini → Codex → iFlow/Qwen, if both exhausted

## Manual Backend Override (troubleshooting only)

```bash
# Force Anthropic direct
claude -p "<prompt>"

# Force Cursor Pro backend via CCS
ccs cursor -p "<prompt>"

# Force 9Router (auto-selects provider internally)
ccs 9router -p "<prompt>"

# Force specific 9Router provider
ccs 9router --provider gemini -p "<prompt>"
ccs 9router --provider codex -p "<prompt>"
ccs 9router --provider iflow -p "<prompt>"
```

## DevContext Protocol — Prevent Context Loss

DevContext MCP automatically saves/restores session context when backends switch.

### Auto-save (no action needed)
DevContext MCP, registered in `~/.claude/mcp_settings.json`, auto-saves checkpoints on:
- File writes
- Test runs
- Significant tool calls

### On backend switch (automatic via ccs-smart.sh)
1. Previous session context auto-saved by DevContext
2. New session started with context restored
3. Claude Code picks up exactly where it left off — zero re-explanation tokens

### Manual context operations (if needed)
```bash
devctx list                      # list saved contexts
devctx restore <context-id>      # restore a specific context
devctx save --tag "step-3-done"  # manual checkpoint
devctx log                       # view context history
```

## Quota Status Check

```bash
# Current quota state (refreshed every 30min by 9router-quota-sync cron)
cat workspace/tmp/provider-quota.json
```

## Routing Decision Log

All backend selections are logged to `workspace/logs/routing-decisions.jsonl`:
```json
{
  "ts": "2026-02-20T14:30:00Z",
  "agent": "eng",
  "selected_model": "9router/auto",
  "9router_actual_provider": "gemini",
  "reason": "Anthropic Claude Pro quota exhausted, Cursor Pro unavailable, 9router/gemini selected",
  "quota_gate_applied": true,
  "cost_usd": 0.00
}
```
