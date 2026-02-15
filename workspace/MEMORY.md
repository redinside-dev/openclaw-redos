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
| **main** | @RedinsideBot (account: default) | RED | `openai-codex/gpt-5.2` | `zai/glm-4.7` → `ollama/llama3.1:8b` |
| **allrounder** | @ZenRedBot (account: allrounder) | ZEN | `openai-codex/gpt-5.2` | `zai/glm-4.7` → `zai/glm-4.7-flashx` |

### Key Points (Never Modify Without Explicit Request)

- **RED (main):** Principal architect/strategist agent; uses OpenAI Codex gpt-5.2 primary with ZAI/GLM fallback
- **ZEN (allrounder):** Daily-driver assistant; uses **OpenAI Codex gpt-5.2** primary, ZAI GLM-4.7 secondary
- **Kimi 2.5 (moonshot/kimi-k2.5):** NO ACTIVE SUBSCRIPTION — marked `status: unavailable` in model-registry.json. Do NOT use as fallback until subscription is activated.
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

---

## Session State — 2026-02-15

### Claude Code Session (completed)

- Gateway token mismatch fixed: `openclaw status` now shows reachable
- KNOWLEDGEBASE.md created at `~/.openclaw/KNOWLEDGEBASE.md` (§1–§19)
- Pre-commit cleanup: removed stubs, untracked runtime files (completions, audit logs, update-check)
- README completely rewritten to reflect OpenClaw-native architecture (not the old Express server)
- Architecture clarified: RedOS = Skills + MCP + Agent Config on top of OpenClaw. No custom server.
- Model tier fixed: ZAI/GLM first, Kimi disabled (no subscription)
- Mission Control UI fixed: WebSocket was pointing to dead port 19000 → now 18789
- All committed and pushed to `github.com/redinside-dev/openclaw-redos`

### Windsurf Cascade Session (2026-02-15 16:54–17:30 ET)

**Phase 1 — COMPLETE (with fix):**
- §20 written to KNOWLEDGEBASE.md with full enhancement roadmap (5 phases)
- Fixed stale `workspace-allrounder/MEMORY.md` (kimi-k2.5 → zai/glm-4.7)
- All 8 agent fallback chains fixed — `kimi-k2.5` removed, `zai/glm-4.7` first
- 19 skills registered in `openclaw.json` — **initially wrong schema** (`path`/`description` rejected by gateway), **fixed to `{enabled: true}` only**
- Gateway confirmed: `[reload] config change applied` — 19 skills LIVE

**Honest Evidence Audit (§21) — key findings:**
- Self-healing: PARTIAL — detects + retries, but no auto-diagnose or auto-fix
- Self-improvement: NOT WORKING — reflect-learn never ran, empty state
- Agent-to-agent comms: NOT WORKING — a2a enabled but agents never used it
- Vector memory: WORKING — 129 entries with embeddings, 27MB SQLite
- Knowledge base sharing: NOT WORKING — only updated by external LLMs, not agents
- Cost/routing logs: EMPTY — skills registered but not writing data yet

### Skills: LIVE IN GATEWAY (schema fixed)

19 skills registered with correct schema `{enabled: true}`. Gateway accepted at 2026-02-15 22:08 UTC. Skills are auto-discovered from `workspace/skills/` directory.

### Revised Next Steps (see KNOWLEDGEBASE.md §21)

| Priority | What |
|---|---|
| **P0** | Wire a2a so agents actually message each other (not roleplay) |
| **P0** | Create cron to trigger reflect-learn automatically |
| **P1** | Cron for RESEARCH agent to proactively scan web for updates |
| **P1** | Wire DevOps to read tickets → diagnose → fix → update KB |
| **P1** | Wire cost-tracker + smart-router to write to their log files |
| **P2** | Morning standup cron (RED asks each agent for status) |
| **P2** | CEO delegation via task-runner + a2a |
| **P3** | Agents update knowledge base after issue resolution |

*Last updated: 2026-02-15 17:30 ET by Windsurf Cascade — Skills LIVE. Honest audit complete (§21).*
