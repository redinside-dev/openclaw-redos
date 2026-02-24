# 9Router Setup & Operations Skill

## Purpose
Install, configure, health-check, and troubleshoot 9Router — the local proxy that routes coding tasks to free/subscription providers (Gemini, Codex, iFlow, Qwen) when Claude Code and Cursor Pro are exhausted.

## What is 9Router

9Router is a local OpenAI-compatible API proxy (port 20128) that:
- Accepts `/v1/chat/completions` requests
- Routes to the best available free/subscription provider
- Returns OpenAI-compatible responses
- Exposes `/api/quota` for live provider quota status
- Exposes `/health` for health checks

Provider fallback order within 9Router:
1. **cx/** — Codex (ChatGPT Plus subscription): gpt-5.3-codex, gpt-5.2-codex, gpt-5.2, gpt-5.1-codex-max, gpt-5.1-codex-mini
2. **cu/** — Cursor Pro subscription: claude-4.5-opus, claude-4.5-sonnet, claude-4.5-haiku
3. **gc/** — Google OAuth (FREE ~1000/day): gemini-3-pro-preview, gemini-3-flash-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite
4. **kr/** — Kiro (FREE, no account): claude-sonnet-4.5, claude-haiku-4.5
5. **if/** — iFlow (FREE, no account): qwen3-coder-plus, kimi-k2, kimi-k2-thinking, kimi-k2.5, deepseek-r1, deepseek-v3.2-chat, minimax-m2.1, minimax-m2.5, glm-5, glm-4.7
6. **openrouter/** — OpenRouter (best-available routing): auto

## Start / Stop / Status

```bash
# Start 9Router (default port 20128)
9router start
# OR
npx 9router start --port 20128

# Stop 9Router
9router stop

# Health check
curl http://localhost:20128/health

# Check quota for all providers
curl http://localhost:20128/api/quota | python3 -m json.tool

# Tail logs
9router logs --tail 50
```

## Installation

```bash
# Run setup-eng-tools.sh for full one-shot install
bash scripts/setup-eng-tools.sh

# Manual install
npm install -g 9router
# OR
npx 9router@latest setup
```

## Adding / Configuring Providers

### Gemini (Google OAuth — free ~1000/day)
```bash
9router auth add gemini
# Opens browser for Google OAuth — sign in with your Google account
# No billing required; free tier is per-account per-day
```

### Codex (ChatGPT Plus subscription)
```bash
9router auth add codex
# Requires active ChatGPT Plus subscription
# Sign in with OpenAI account
```

### iFlow (FREE — no account required)
```bash
9router auth add iflow
# No authentication required — always available
# Models: qwen3-coder-plus, kimi-k2, kimi-k2-thinking, kimi-k2.5, deepseek-r1, deepseek-v3.2-chat, minimax-m2.1, minimax-m2.5, glm-5, glm-4.7
# Use aliases: qwen-coder, kimi, kimi-think, deepseek, deepseek-chat, glm5
```

### Kiro (FREE — no account required)
```bash
9router auth add kiro
# Models: claude-sonnet-4.5, claude-haiku-4.5
# Use aliases: kiro-sonnet, kiro-haiku
```

### OpenRouter (routes to best available model)
```bash
9router auth add openrouter
# Requires OpenRouter account (free tier available)
# Use alias: openrouter
# Model ID: openrouter/auto
```

## Adding a New CCS Profile

When a new subscription service is available, add it as a CCS profile:
```bash
# Create a new CCS profile
ccs auth create <profile-name>
# Example: ccs auth create gemini-pro

# List available profiles
ccs profiles list

# Test a profile
ccs <profile-name> -p "Say hello"
```

## Quota File Sync

The `9router-quota-sync` cron (every 30min, OPS agent) updates `workspace/tmp/provider-quota.json`.

To manually refresh:
```bash
curl -sf http://localhost:20128/api/quota | python3 -c "
import json, sys, datetime
data = json.load(sys.stdin)
data['updated'] = datetime.datetime.utcnow().isoformat() + 'Z'
data['9router_running'] = True
print(json.dumps(data, indent=2))
" > workspace/tmp/provider-quota.json
```

If 9Router is not running, write a stub:
```bash
echo '{"updated":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","9router_running":false,"claude-code":{"available":true},"cursor":{"available":true}}' > workspace/tmp/provider-quota.json
```

## Troubleshooting

### 9Router not starting
```bash
# Check if port is in use
lsof -i :20128

# Kill conflicting process
kill $(lsof -t -i :20128)

# Restart
9router start
```

### Gemini quota exhausted (~1000/day)
```bash
# Check quota
curl http://localhost:20128/api/quota | python3 -c "import json,sys; q=json.load(sys.stdin); print(q.get('gemini', {}))"

# Switch default provider to codex temporarily
9router config set default-provider codex

# Or wait for Gemini quota reset (resets daily at midnight PST)
```

### Provider returning empty responses
```bash
# Test provider directly
9router test --provider gemini -p "Say hello"
9router test --provider codex -p "Say hello"

# Check provider status
curl http://localhost:20128/api/quota
```

### CCS profile not working
```bash
# Re-authenticate
ccs <profile-name> --reauth

# Check profile config
ccs profiles list

# Test profile
ccs <profile-name> -p "Say hello"
```

## Health Check Script (for OPS monitoring)

```bash
#!/bin/bash
# Quick health check — returns 0 if healthy, 1 if not
curl -sf http://localhost:20128/health > /dev/null 2>&1 && echo "9Router: UP" || echo "9Router: DOWN"
```

## Quota Monitoring Dashboard

9Router exposes a web UI at: `http://localhost:20128/dashboard`
- Shows per-provider quota usage
- Real-time request routing visualization
- Error log

## Integration with Smart Router

The smart-router skill reads `workspace/tmp/provider-quota.json` to apply Rule 0 (quota gate).
The `9router-quota-sync` cron keeps this file fresh every 30 minutes.

If the quota file is stale (>1h), smart-router fails open (treats all quotaSource models as available).
