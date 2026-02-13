# ENG Coding Skill — Claude Code CLI with Cursor Fallback

## Purpose
Enable ENG agent to use Claude Code CLI for coding tasks, with automatic fallback to Cursor Agent when Claude is rate-limited.

## Tools Available

### claude-code
Primary coding tool. Usage:
```bash
claude -p --allowed-tools "Bash,Edit" "your coding task"
```

### cursor-fallback
When Claude returns "out of extra usage" or fails:
```bash
cursor-agent --model sonnet-4.5 "your coding task"
```

## Workflow

1. **Receive coding task** → Try Claude Code CLI first
2. **Check for rate limit error** → If "out of extra usage" or timeout
3. **Fallback to Cursor** → Use cursor-agent with Sonnet 4.5
4. **Log which tool succeeded** → Feed into PoC quality data

## System Prompt Addition for ENG

When given a coding task:
1. First try: `claude -p --allowed-tools "Bash,Edit" "<task>"`
2. If Claude returns rate limit error → Fallback: `cursor-agent --model sonnet-4.5 "<task>"`
3. Report which tool was used and success/failure

## Rollback

If this approach fails, revert ENG agent model to `openai-codex/gpt-5.2` in config.
