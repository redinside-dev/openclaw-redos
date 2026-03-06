# OpenClaw RedOS

Personal AI assistant running locally with Claude, GPT, Codex, and Minimax as fallbacks.

## Quick Start

```bash
# Check status
~/.openclaw/scripts/redos-restart.sh --status

# Restart
~/.openclaw/scripts/redos-restart.sh
```

## Model Routing

Smart fallback chain:
- Primary: Claude Opus 4.6 (via 9router)
- Fallback 1: Codex GPT-5.3
- Fallback 2: Minimax M2.5 (direct, outside 9router)
- Fallback 3: 9router free

## Website Agency

Ontario Website Agency automation in `workspace-website-agency/`

## Docs

- `CLAUDE.md` - Main documentation
- `workspace/SOUL.md` - Agent system prompt
- `workspace/GOALS.md` - Active goals
