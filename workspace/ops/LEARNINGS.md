# LEARNINGS.md — Agent Learning & Mistake Tracking

**Purpose:** Track mistakes, patterns, and lessons learned. Agents read this to avoid repeating errors.

---

## Recent Learnings (2026-03-05)

### Learning: A2A Delegation Deadlock Prevention
- **Issue:** A2A tasks can get stuck waiting for response
- **Fix:** Added timeout (120s) and retry (2x) to all A2A calls
- **Script:** `workspace/scripts/a2a-delegate-safe.sh`

### Learning: Session Cold Start
- **Issue:** Sessions timeout, A2A fails with "no session found"
- **Fix:** Session warmup cron every 10 minutes
- **Script:** `workspace/scripts/session-warmup.sh`

### Learning: Slack Token Expiration
- **Issue:** Slack bots stopped working, "account_inactive" errors
- **Fix:** Regenerated token, disabled broken accounts
- **Status:** Working now

### Learning: Task Generator Syntax Error
- **Issue:** autonomous_task_generator.py had syntax error
- **Fix:** Rewrote with simpler code
- **Status:** Working now

---

## Mistake Patterns to Avoid

1. ❌ Don't answer infrastructure questions from memory — check live first
2. ❌ Don't use cold sessions for A2A — warm up first
3. ❌ Don't let tasks stuck in "in_progress" forever — deadlock monitor recovers
4. ❌ Don't duplicate work — check LEARNINGS.md first

---

## Agent Memory Locations

| Agent | Memory File |
|-------|-------------|
| OPS | workspace/ops/memory/state-ops.json |
| ENG | workspace/eng/memory/state-eng.json |
| FINANCE | workspace/finance/memory/state-finance.json |
| RESEARCH | workspace/research/memory/state-research.json |


---

## 2026-03-07 — Infrastructure Hardening Learnings

### OpenClaw Auto-Update Root Cause
`update.auto.enabled: true` silently upgrades OpenClaw every 6–18h with no rollback. Schema breaking changes (e.g. v2026.3.2 agents flat→list migration) crash-loop the gateway. **Fix**: n8n staged update pipeline with automatic rollback.

### MiniMax API Endpoints
- `/anthropic/v1/messages` — returns `insufficient balance` even with valid key unless PAYG credits added
- `/v1/text/chatcompletion_v2` — non-standard path, OpenClaw `openai-completions` won't find it  
- **Only working path for OpenClaw**: Use `api: openai-completions` with baseUrl `https://api.minimax.io/v1` — but this hits 404 because path is non-standard
- **Solution**: MiniMax Coding Plan (`sk-cp-`) works via OpenAI-compat but needs PAYG credits for Anthropic endpoint. Keep as fallback until confirmed working.

### n8n HTTP Request Node Gotchas
- Default method is GET — always explicitly set `method: POST` for webhook calls
- `specifyBody: json` with `jsonBody` field conflicts with `body` field — use one or the other
- `specifyBody: string` with `body` as template expression is most reliable
- PUT `/api/v1/workflows/:id` only accepts: `name`, `nodes`, `connections`, `settings` — strip all other fields

### 9Router OAuth Race Condition
Running `9router-token-refresh.js --all` simultaneously with launchd-scheduled refresh causes `refresh_token_reused` error (OAuth single-use tokens). Fix: remove `--all` from restart script, let launchd handle scheduled refresh independently.

### flock Not Available on macOS
Use `mkdir`-based atomic lock instead: `if ! mkdir "${LOCK}.d" 2>/dev/null; then exit 0; fi`
