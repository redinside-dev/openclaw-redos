# MEMORY.md

Curated long-term memory for this OpenClaw workspace.

## Tooling / Workflow

- **Source of truth discipline:** After every significant change (config, cron, skills, routing, policies), update:
  - `/Users/redinside/.openclaw/KNOWLEDGEBASE.md` (full architecture + ops)
  - `/Users/redinside/.openclaw/workspace/MEMORY.md` (short “what changed”)

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

### P0/P1/P2 Implementation (2026-02-15 17:17–17:45 ET) — see KNOWLEDGEBASE.md §22

**Built:**
- `workspace/ops/TICKET-TRACKER.md` — issue tracking with SLA policy (P0=30min, P1=2h, P2=8h, P3=48h)
- `workspace/ops/STANDUP-LOG.md` — daily standup records
- `workspace/ops/LEARNINGS.md` — institutional knowledge (2 seed entries from audit)
- `workspace/skills/self-healing-protocol/SKILL.md` — 6-step self-healing protocol (registered + live)
- SOUL.md updated (both workspaces) with self-healing, scrum, self-improvement protocols
- `agents.defaults.model.fallbacks` fixed (kimi was still first in defaults)

**7 Cron Jobs (all enabled):**
1. OPS Morning Standup — 9 AM ET weekdays (uses `sessions_send` to poll agents)
2. OPS SLA Enforcement — every 30 min (escalates breaches)
3. OPS Health Monitor — every 15 min (auto-creates tickets for new errors)
4. RED Self-Improvement — every 6 hours (reviews patterns, applies permanent fixes)
5. OPS Ticket Auto-Diagnose — every hour (reads open tickets, attempts fix)
6. RESEARCH Proactive Update — every 4 hours (web scans for tool/model updates)
7. RED Daily Summary — 6 PM ET weekdays (Telegram DM to Anurag)

**Live issue detected:** Auth token failures on eng/research/finance — OPS health monitor should auto-detect this.

### Daily Brief (Telegram) — 2026-02-15

- Created customizable agenda files:
  - `workspace/briefs/daily-brief-topics.md`
  - `workspace/briefs/daily-brief-instructions.md`
- Created project collaboration template: `workspace/projects/_template/STATE.yaml`
- Added cron job **(disabled pending time confirmation)**:
  - `RED Daily Brief (Telegram)` id=`14c3b159-749f-4855-8a36-39964a865aaf`
  - schedule: 08:30 America/Toronto (draft)
  - delivery: Telegram → `telegram:1012034994`

### Phase 5: Mission Control Dashboard (2026-02-15 17:38–17:50 ET) — see KNOWLEDGEBASE.md §23

**Built:**
- `dashboard/server.js` — Node.js server on port 19000, reads local state files, serves API + static
- `dashboard/index.html` — New single-page dashboard (7 pages: Overview, Agents, Cron, Tickets, Learnings, Errors, Skills)
- Old `index.html` renamed to `cost-monitor.html` (preserved)
- Auto-refreshes every 15s, dark theme, no external dependencies

**Run:** `/opt/homebrew/bin/node ~/.openclaw/dashboard/server.js` → http://localhost:19000

**Verified:** API returns real data — 8 agents, 20 skills, 7 enabled cron jobs (1 already succeeded: OPS Health Monitor), 3 learnings, 129 vector memories.

### Model Fix (2026-02-15 17:55 ET)

- Removed invalid `zai/glm-4.7-flashx` from all agents (defaults overrides, hatake, ops)
- Upgraded OPS primary from `ollama/llama3.1:8b` → `zai/glm-4.7` (local model too slow for cron, caused 120s timeout)
- Gateway restarted, Health Monitor error state reset
- SLA Enforcement ran OK (20.1s) before fix; Health Monitor timed out (120s) due to slow local model + bad fallback

### Cron Status After Fix

| Job | Status | Notes |
|---|---|---|
| OPS Health Monitor | error→reset | Timed out on ollama, now using zai/glm-4.7 |
| OPS SLA Enforcement | ok (20.1s) | Ran successfully |
| Others | pending | Waiting for next cron cycle (~18:06 ET) |

### Self-Healing Verified (2026-02-15 18:21–18:30 ET)

**OPS agent autonomously:**
1. Ran Health Monitor cron job, read gateway.err.log + errors.jsonl
2. Created TICKET-20260215-001 (P2: health monitoring stopped for 17h)
3. Created TICKET-20260215-002 (P1: LLM timeout errors from bad model + low timeout)
4. Wrote memory log at `workspace-ops/memory/2026-02-15.md`

**We then resolved both tickets:**
- Removed `zai/glm-4.7-flashx` from all agents
- Upgraded OPS primary to `zai/glm-4.7`
- Increased all cron timeouts to 300s
- Added LEARNING-003, 004, 005 to LEARNINGS.md

**This is the first real end-to-end self-healing cycle:** detect → ticket → diagnose → fix → learn.

### Session 3 — 2026-02-15 19:00 ET

**Dashboard SSR Fix (root cause resolved):**
- Browser preview proxy was blocking `/api/` fetch calls → all tabs showed empty
- Fix: Server now injects ALL data as `window.__INIT_DATA__` JSON blob directly into HTML at serve time
- Zero fetch dependency for initial render; fetch kept only for 15s auto-refresh
- Each renderer wrapped in try/catch so one failure doesn't break all tabs
- Commit: `7fbf1d6`

**MCP Context7 Skill Added:**
- Created `workspace/skills/mcp-context7/SKILL.md`
- Tools: `resolve-library-id`, `get-library-docs` — live library documentation lookup
- API key stored in `.env` as `CONTEXT7_API_KEY` (not hardcoded)
- Added to `.env.example` template
- Registered and enabled in `openclaw.json`

**Telegram Mission Control Integration:**
- Added commands to Telegram bridge: `/dashboard`, `/status`, `/tickets`, `/cron`
- `/dashboard` sends public URL + Telegram Web App button (opens dashboard inline)
- `/status` shows agents, cron, tickets, costs summary
- Updated `/start` and `/help` to list new commands
- Commit: `c887cf7`

**Cloudflare Tunnel:**
- Installed cloudflared, created quick tunnel exposing port 19000
- Public URL: `https://mls-investment-replied-cigarette.trycloudflare.com`
- URL stored in `.env` as `MISSION_CONTROL_URL`
- Note: URL changes on restart; for permanent URL, set up named Cloudflare tunnel
- No authentication currently — dashboard is read-only (except model override endpoint)

### Session 4 — 2026-02-15 19:44 ET

**Phase 4: CEO Dynamic Hiring/Firing (COMPLETE):**
- `ceo-worker.js`: Full FIRE capability with performance tracking
  - Monitors failure rate (>60%), avg latency (>3min), inactive timeout (>5min)
  - Auto-fires underperforming workers, reassigns their tasks to pending queue
  - Hire/fire audit log persisted to `workspace/ops/ceo-hire-fire-log.json`
  - `getWorkerStatus()` exposes worker health to dashboard/API
- Dashboard server: New endpoints `GET /api/ceo/status`, `POST /api/ceo/hire`, `POST /api/ceo/fire`
- Dashboard UI: New "CEO Controls" tab with agent roster, hire/fire buttons, audit log, threshold display
- Commit: `e284602`

**Dashboard Basic Auth (COMPLETE):**
- `DASHBOARD_USER` and `DASHBOARD_PASS` in `.env`
- Auth skipped for localhost (direct access), enforced when `X-Forwarded-For` present (tunnel)
- Credentials: user=`red`, pass=`redos2026`
- Added to `.env.example` template

**Dashboard Verification:**
- SSR confirmed: 17 data keys injected including `_ceoStatus`
- Auth confirmed: localhost → 200, external (X-Forwarded-For) → 401
- Browser preview opened on port 19000

### Remaining

- Monitor cron jobs over next few days to confirm stability
- Cost-tracker + smart-router still not writing to log files (lower priority)
- Cloudflare tunnel URL changes on restart — consider named tunnel for permanence

*Last updated: 2026-02-15 19:44 ET by Windsurf Cascade — Phase 4 CEO hire/fire complete, dashboard basic auth added, all verified.*
