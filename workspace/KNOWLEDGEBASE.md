# KNOWLEDGEBASE.md

Operational knowledgebase for this OpenClaw deployment.

Use this when something feels off (routing, auth, web search, channels). It’s meant to be a clean reference separate from daily logs.

## Baseline (Canonical)

### User preferences
- Channel: Telegram-only
- Portfolio scope: Ignore crypto entirely (stocks only)
- Ticker note: EMR = Emerson Electric

### Agents / Bots

| Agent | Bot | Identity | Primary | Fallback |
|-------|-----|----------|---------|---------|
| main | @RedinsideBot | RED | openai-codex/gpt-5.2 | ollama/llama3.1:8b |
| allrounder | @ZenRedBot | ZEN | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| hatake | — | HATAKE | ollama/qwen2.5-coder:7b | ollama/llama3.1:8b → gpt-5.2 |
| eng | @ENGRED_BOT | ENG | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| research | @RESEARCHRED_BOT | RESEARCH | openai-codex/gpt-5.2 | ollama/llama3.1:8b |
| finance | @FINANCERED_BOT | FINANCE | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| ops | @OPSRED_BOT | OPS | ollama/llama3.1:8b | openai-codex/gpt-5.2 |
| infosec | @INFOSECRED_BOT | INFOSEC | ollama/llama3.1:8b | openai-codex/gpt-5.2 |

- **Codex account:** `io.anuragsaxena@gmail.com` — Team plan, 1-year subscription
- **Kimi (moonshot/kimi-k2.5):** NO subscription — do NOT use
- **ZAI/GLM-4.7:** PAYG — never in fallback chains or cron jobs
- **openrouter:** NOT authorized — remove immediately if found in config
- Codex OAuth creds: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

### Web Search
- Tool: `tools.web.search`
- Provider: `perplexity`, Model id: `sonar-pro` (configured in `openclaw.json`)
- **Do NOT set `perplexity/sonar-pro` as an agent's primary LLM model** — it is a web search tool only
- Fallback: Exa MCP (`mcporter call exa.web_search_exa ...`)

### GLM/ZAI model guardrail
- Use **`zai/glm-4.7`** as the supported GLM model id in OpenClaw.
- Treat undocumented variants like **`zai/glm-4.7-flashx`** as unsupported/invalid unless OpenClaw docs explicitly add them.

### Briefing workflows (on-demand + scheduled)

**On-demand topic brief (A):**
- Send: `Brief: <topic>`
- Output format: 5–10 bullets (what happened) + 3 bullets (implications) + 3 bullets (what to watch) + links.
- Search: Perplexity first; if fails, Exa MCP fallback.

**On-demand X link read (B):**
- Send: `X: <url>` or paste an X URL.
- Fetch method: Jina mirror (`https://r.jina.ai/https://x.com/...`) then summarize + advice.

**Scheduled brief:**
- Daily “AI + OpenClaw trends” brief can be delivered via cron to Telegram DM.

### Report attachments (Email)
- Preferred attachment format: **PDF**
- PDF toolchain installed: `pandoc` + `tectonic`
- Convert Markdown → PDF:
  - `pandoc report.md -o report.pdf --pdf-engine=tectonic`

### Telegram Group Safety
- `requireMention: true`
- `groupPolicy: allowlist`
- `groupAllowFrom: ["1012034994"]`

## X/Twitter reading playbook (preferred order)

When asked to read an X post:
1) **Option 1 (default): Jina mirror**
   - Rewrite: `https://x.com/...` → `https://r.jina.ai/https://x.com/...`
   - If content is still blocked, look for a `pbs.twimg.com/media/...` image URL and open it directly.
2) **Option 2: Fetch media directly**
   - If the post contains a screenshot/template, open the `pbs.twimg.com/media/...` URL and OCR/summarize.
3) **Option 3: Browser Relay (logged-in X tab)**
   - If Options 1–2 fail, ask Anurag to attach the X tab via OpenClaw Browser Relay; then read from the attached tab.

(We keep this order because X blocks logged-out scraping and direct crawling often fails.)

## Troubleshooting quick checks

### “Perplexity invalid model”
- Check `openclaw.json` → `tools.web.search.perplexity.model` is `sonar`.

### “ZEN is still on old model”
- Sessions can be sticky; use `/reset` in the @ZenRedBot chat to start a fresh session.

### “Which creds is the agent using?”
- Inspect per-agent auth store:
  - `cat ~/.openclaw/agents/main/agent/auth-profiles.json`
  - `cat ~/.openclaw/agents/allrounder/agent/auth-profiles.json`

### “Confirm live models”
- `openclaw status --deep`

## Organization / Operating Model

- Org structure + roles + change control + rollback: `ORG_STRUCTURE.md`

## Organization Policy — Codebase Structure & Change Boundaries

### Canonical project root (MANDATORY)
All new projects (internal utilities, OSS, PoCs) MUST live under:

- `/Users/redinside/Development/Codebase/projects/`

### Department folders (recommended)
Within `.../projects/`, create department-scoped folders so work stays organized and budgeted:

- `superboss/` (Anurag / coordination meta)
- `engineering/` (apps, APIs, infra code)
- `research/` (benchmarks, eval harnesses, routing PoCs)
- `ops/` (automation scripts for cron/reporting/monitoring)
- `finance/` (trade/holdings analytics utilities)

Rule: If a PoC is “research”, it goes in `research/`. If it’s a build, it goes in `engineering/`, etc.

### Git hygiene
Anything created under `.../projects/` should be:
- committed
- pushed to the agreed remote

### OpenClaw workspace boundary (DO NOT PUSH)
Do NOT push OpenClaw workspace/config/docs to GitHub/shared repos until Anurag explicitly approves a backup/recovery strategy.

### Secrets policy (NON-NEGOTIABLE)
- Never commit or paste **any keys/tokens/private keys** into GitHub (public or private), chat, or docs.
- Keys live only in: OpenClaw config (`~/.openclaw/openclaw.json` via env vars), OS keychain/secret manager, or `.env` files that are **gitignored**.
- Before pushing any repo, run a quick secret scan (at minimum: `git grep -n "(API_KEY|SECRET|TOKEN|PRIVATE KEY|BEGIN)"`).

---
Last updated: 2026-02-09
