# Rollback Plan: Zen (Allrounder) Perplexity Migration

Created: 2026-02-07 20:58 EST

## Backup Files Created

- `~/.openclaw/agents/allrounder/agent/models.json.backup-20260207-205810`
- `~/.openclaw/openclaw.json.backup-20260207-205813`

## Current Working Configuration (Before Perplexity)

### Zen (Allrounder Agent)
- **Primary:** `zai/glm-4.7`
- **Fallback:** `moonshot/kimi-k2.5`
- **Telegram bot:** @ZenRedBot

### Config Files
- `~/.openclaw/agents/allrounder/agent/models.json` — contains ZAI + Moonshot providers
- `~/.openclaw/openclaw.json` — agent routing configuration

## What We're Changing

### New Configuration
- **Primary:** `perplexity/sonar-medium-online`
- **Fallback chain:** Perplexity → GLM → Kimi
- **Added provider:** Perplexity (OpenAI-compatible)

### Files Modified
1. `~/.openclaw/agents/allrounder/agent/models.json`
   - Added Perplexity provider with API key placeholder
   - Added GLM provider (was using env var)
2. `~/.openclaw/openclaw.json`
   - Changed Zen's primary model to `perplexity/sonar-medium-online`
   - Updated fallback chain

## Rollback Instructions (If Something Goes Wrong)

### Quick Rollback (Restore Original Files)

```bash
# Restore models.json
cp ~/.openclaw/agents/allrounder/agent/models.json.backup-20260207-205810 ~/.openclaw/agents/allrounder/agent/models.json

# Restore openclaw.json
cp ~/.openclaw/openclaw.json.backup-20260207-205813 ~/.openclaw/openclaw.json

# Restart gateway
openclaw gateway restart
```

### What to Rollback To

After running rollback commands:
- **Zen will use:** `zai/glm-4.7` (primary) → `moonshot/kimi-k2.5` (fallback)
- **No Perplexity** configuration will remain active
- **Everything returns to previous working state**

### When to Rollback

Rollback if:
- Zen stops responding after gateway restart
- You see "model not found" or "API key invalid" errors
- Gateway keeps crashing or failing to start
- Zen's behavior is degraded or broken

### Testing After Perplexity Setup

Before considering rollback, test:
1. Restart gateway: `openclaw gateway restart`
2. Wait 30 seconds for gateway to initialize
3. Message @ZenRedBot: "what model are you using?"
4. If Zen replies correctly with Perplexity → SUCCESS
5. If Zen errors or doesn't reply → ROLLBACK

## Success Criteria

Perplexity setup is successful when:
- Gateway restarts without errors
- @ZenRedBot responds to messages
- Zen reports using `perplexity/sonar-medium-online`
- Web search and chat work correctly

## Notes

- Backups preserve original ZAI and Moonshot API keys
- Rolling back requires only two `cp` commands + gateway restart
- No permanent changes occur until gateway restart completes
- API key must be manually added to models.json before restart
