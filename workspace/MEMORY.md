# MEMORY.md — OpenClaw RedOS Workspace

> Curated long-term memory. **Full reference:** `KNOWLEDGEBASE.md`. **History:** `MEMORY-ARCHIVE-2026-02-15.md`.

---

## Current State (as of 2026-02-17)

| Component | Status |
|-----------|--------|
| OpenClaw CLI | v2026.2.15 |
| Native gateway | Running — launchd `ai.openclaw.gateway`, port 18789 |
| Dashboard | Port 19000, basic auth (red / redos2026) |
| Dashboard tunnel | Cloudflare quick tunnel — URL in `workspace/DASHBOARD_URL.txt` |
| Telegram | 7/7 accounts OK |
| WhatsApp | Linked +16476092313, DM isolation `per-channel-peer` |
| Agents | 8 active: main / allrounder / hatake / eng / research / finance / ops / infosec |
| Sessions | Cleared 2026-02-17 — fresh start, 0 stale sessions |
| Skills | 22 registered, all enabled |
| Cron jobs | Enabled — all use agent default model (no PAYG hard-coding) |
| Sandbox | mode: off — tools.deny active: `group:web`, `browser` |

---

## Routing Policy (CANONICAL — DO NOT CHANGE WITHOUT EXPLICIT REQUEST)

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
- **ZAI/GLM-4.7:** PAYG — never hard-code in cron or fallback chains
- **openrouter:** NOT authorized — remove immediately if found in config
- **Web search:** Perplexity (sonar-pro) via `tools.web.search` — NOT as agent primary model
- **Coding:** cursor-agent with Claude Sonnet 4.5
- **Git identity:** `anuragg-saxenaa` / `anuragg.saxenaa@gmail.com`
- **Pairing reply:** patched to "Anurag's virtual assistant" — re-run `scripts/patch-pairing-reply.sh` after upgrades

---

## Open Issues

| Priority | Description |
|----------|-------------|
| P3 | TICKET-20260216-002 — undici AbortErrors during Telegram polling, awaiting ENG fix |
| Low | Cloudflare quick tunnel URL changes on restart — consider named tunnel |
| Low | Codex 3rd account (`anurawg.saxena@gmail.com`) needs OAuth tokens |
| Low | Phase 2: nested sub-agent depth — schema doesn't support yet |

---

## Branch Strategy (set 2026-02-17)

- **`main`** — stable, reverted to `3d6f6a2` (last confirmed working state)
- **`feature/cost-routing-fixes`** — all session fixes: ZAI drain, negative costs, live cost estimator, repo cleanup

Work incrementally from feature branch back into main. Never merge wholesale — cherry-pick fixes one at a time.

---

## Critical Rules

### Config safety (LEARNING-007)
**NEVER add unvalidated keys to `openclaw.json`.** Always run `openclaw doctor` first.

### Cost rule
**Never hard-code a PAYG model (ZAI, openrouter) in cron jobs or fallback chains.** Use agent default — Ollama is primary and free.

### Self-improvement cron warning
The RED Self-Improvement cron has been observed autonomously modifying `openclaw.json` — adding openrouter provider, changing model chains. Check config periodically. Recovery: remove unauthorized entries, run `openclaw gateway restart`.

### Canonical doc filenames
- `workspace/KNOWLEDGEBASE.md` — architecture + troubleshooting
- `workspace/MEMORY.md` — this file
- NO `KNOWLEDGE_BASE.md`, NO `knowledge.md` — delete if found

---

*Last updated: 2026-02-17 — clean restart, sessions cleared, research agent model fixed, docs synced*
