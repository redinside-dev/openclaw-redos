# MEMORY.md

Curated long-term memory for this OpenClaw workspace.

## Tooling / Workflow

- **Cursor CLI:** Use `cursor-agent` as the canonical command (installed at `~/.local/bin/cursor-agent`). Prefer **login-based auth** (`cursor-agent login/status`) over `CURSOR_API_KEY`.
- **Cursor coding model:** default to **Claude Sonnet 4.5** via `cursor-agent --model sonnet-4.5` for coding tasks.
- **X/Twitter reading (no-login):** Use **Option 1** Jina mirror first: rewrite `https://x.com/...` → `https://r.jina.ai/https://x.com/...`. If blocked, try `pbs.twimg.com/media/...` direct image. If still blocked, use Browser Relay attached logged-in tab. Helper skill: `skills/x-mirror`.

## Preferences / Policies (CANONICAL - DO NOT CHANGE UNLESS EXPLICITLY ASKED)

⚠️ **CRITICAL:** The following agent/model routing configuration is locked in as the canonical setup. **Never change unless Anurag explicitly asks.**

### Agent Configuration (Locked)

| Agent | Telegram Bot | Identity | Primary Model | Fallback Chain |
|-------|-------------|----------|---------------|----------------|
| **main** | @RedinsideBot (account: default) | RED | `openai-codex/gpt-5.2` | `moonshot/kimi-k2.5` |
| **allrounder** | @ZenRedBot (account: allrounder) | ZEN | `openai-codex/gpt-5.2` | `zai/glm-4.7` → `moonshot/kimi-k2.5` |

### Key Points (Never Modify Without Explicit Request)

- **RED (main):** Principal architect/strategist agent; uses OpenAI Codex gpt-5.2 primary with Kimi 2.5 fallback
- **ZEN (allrounder):** Daily-driver assistant; uses **OpenAI Codex gpt-5.2** primary, GLM 4.7 secondary, Kimi 2.5 final fallback
- **Channel preference:** Telegram-only (unless Anurag explicitly changes)
- **Portfolio scope:** Ignore crypto entirely (stocks only)
- **Ticker note:** EMR = Emerson Electric
- **ZEN Codex OAuth account:** `io.anuragsaxena@gmail.com` (stored under `~/.openclaw/agents/allrounder/agent/auth-profiles.json`)
- **RED Codex OAuth account:** unchanged (stored under `~/.openclaw/agents/main/agent/auth-profiles.json`)
- **Coding tasks:** Always use `cursor-agent` with `--model sonnet-4.5` (Claude Sonnet 4.5)
- **Web search tool default:** Perplexity (**model id:** `sonar`)
- **Web search fallback:** if Perplexity fails, fall back to Exa MCP (`exa.web_search_exa` via mcporter)
- **ZAI_API_KEY** stored in OpenClaw config for GLM fallback
- **Perplexity API key** stored for **web search tool** (not ZEN primary model)
- **XAI_API_KEY** stored for Grok/xAI features

### Bindings (Locked)

- `channel=telegram, accountId=default` → `agentId=main` (RED)
- `channel=telegram, accountId=allrounder` → `agentId=allrounder` (ZEN)

---

*Last updated: 2026-02-08 — ZEN primary switched to Codex gpt-5.2; Perplexity reserved for web search (model id `sonar`).*
