# MEMORY.md — Persistent Knowledge Base

**Purpose:** Long-term memory for all agents. Read this at session start. Update when you learn something important.

**Rules:**
- Keep entries concise and actionable
- Date all entries
- Remove outdated information
- Focus on patterns, not one-off events

---

## Critical Operational Rules

### Data Verification Protocol (Added 2026-03-02)
**ALWAYS VERIFY LIVE STATE BEFORE ANSWERING INFRASTRUCTURE QUESTIONS**

When asked about system state (workflow counts, service status, running processes, file contents):
1. **Query the actual system first** - Use API calls, shell commands, direct file reads
2. **Documentation is reference, not truth** - Docs can be stale within hours
3. **"Check again" means query live** - Not "find a different cached file"
4. **Stale data presented confidently damages trust** - Better to say "checking live system now"

**Example failure (2026-03-01):**
- User asked: "how many workflows on n8n"
- RED answered: "3 workflows" (from stale subagent report)
- User: "check again" 
- RED answered: "3 workflows" (from stale documentation file)
- Actual: 9 workflows (6 added since documentation was written)
- Result: Trust damaged, user had to correct twice

**Correct approach:**
```bash
# Query live n8n API
curl -H "X-N8N-API-KEY: ..." http://localhost:5678/api/v1/workflows | jq '.data | length'
```

**For all agents:** In autonomous systems running 24/7, documentation written 6 hours ago can be completely outdated. Always verify live state for infrastructure questions. Trust is everything.

---

## System Architecture

### OpenClaw Gateway
- **Location:** `~/.openclaw/`
- **Config:** `openclaw.json`
- **Logs:** `logs/gateway.err.log`, `logs/errors.jsonl`
- **Status:** `openclaw status`
- **Restart:** `openclaw gateway restart`

### Agent Workspaces
- **Main workspace:** `~/.openclaw/workspace/`
- **Agent-specific:** `~/.openclaw/workspace-{agent}/`
- **Shared skills:** `~/.openclaw/workspace/skills/`

### Key Services
- **9router:** Model routing proxy (`http://127.0.0.1:20128`)
- **n8n:** Workflow automation (`http://127.0.0.1:5678`) — **13 active workflows as of 2026-03-05**
- **Qdrant:** Vector search (`http://127.0.0.1:6333`)
- **Dashboard:** Mission control (`http://127.0.0.1:19000`) · auth: `red/redos2026`

### Gateway Auto-Recovery (deployed 2026-03-04)
Gateway has a 4-layer resilience system — **do not manually restart unless all layers have failed and you receive a CRITICAL alert.**
- n8n "🛡️ OpenClaw Guardian" checks every 2min (external, workflow ID: ZD7ljvVjdj9OvosQ)
- `ai.openclaw.gateway-watchdog` launchd runs every 60s
- `ai.openclaw.telegram-deadman` runs every 5min (silent-bot detection)
- `ai.openclaw.boot-guard` runs at boot (post-upgrade entrypoint check)
- Alerts sent via @OPSRED_BOT to admin
- **After any `npm update -g openclaw`: run `openclaw gateway install` immediately**

---

## Agent Coordination

### A2A Communication
- **Tool:** `sessions_send` (sends message to another agent session)
- **Log:** `logs/a2a-delegations.jsonl`
- **Known issue:** Timeout epidemic (40+ failures in 48h, TICKET-20260301-044)
- **Workaround:** Use Slack #redos-mission-control for critical coordination

### Task Queue
- **File:** `AUTONOMOUS.md` (max 50 lines, active tasks only)
- **Log:** `workspace/tasks-log.md` (append-only completion log)
- **Dispatcher:** Autonomous Task Dispatcher cron (every 15min)
- **Rules:** Only RED adds tasks, workers claim ONE at a time, mark TODO, append completion

### Inner Loop Pattern
All agents run periodic inner loops (every 2-4h):
1. Read GOALS.md + AUTONOMOUS.md
2. Check for assigned tasks
3. Take one high-value action
4. Log reflection with rating + learning
5. Update status files

---

## Production Agent Patterns (Varick Agents, 2026-03-02)

**Source:** [Vas @ $3M ARR](https://x.com/vasuman/status/2010473638110363839)

### Core Principles
1. **Context is the whole game** - Agents without context are expensive random number generators
2. **Design for multiplication, not replacement** - Let 3 people do what used to require 15
3. **Catch and resolve, don't report and review** - Dashboards are where problems go to die
4. **Architecture matters more than model selection** - Solo/parallel/collaborative is bigger than which LLM
5. **Ship fast, improve constantly** - 3 months max to production, not 12-month timelines

### Context Management
- **What the agent remembers:** History of what led here, not just current task
- **How information flows:** Structured handoffs between agents without data loss
- **Domain knowledge:** Agent needs to understand what matters in its domain

### Agent Architectures
1. **Solo agents:** One agent, one complete workflow (easiest, but state management challenge)
2. **Parallel agents:** Multiple agents on same problem simultaneously (faster, but coordination problem)
3. **Collaborative agents:** Sequential handoffs (works for staged workflows, but handoffs break easily)

**Our current architecture:** Mix of collaborative (dispatcher → specialists) and parallel (multiple agents on different tasks)

### Force Resolution Pattern
- Don't create dashboards that surface problems
- Catch problems when they happen and route to whoever can fix them
- Include everything needed to fix the problem right then
- Block transactions/processes until resolved

**Implementation for us:**
- Watchdog scripts should auto-remediate before alerting
- SLA breaches should auto-escalate with context + suggested fixes
- Health monitors should trigger fixes, not just reports

---

## Cost Optimization

### Current Spend
- **Target:** ≤$1.00/day (50% reduction from ~$2.00 baseline)
- **Cache hit rate target:** >60%
- **Tracking:** `workspace/costs/*.json`

### Model Routing Strategy (updated 2026-03-15)
1. **Tier 1:** MiniMax M2.5 via 9router (unlimited $20/mo coding plan — Opus-level quality, zero per-token cost)
2. **Tier 2:** groq/llama-3.3-70b (free API key), openrouter free tier models
3. **Tier 3:** gc/gemini-*, kr/kiro OAuth models (free subscription)
4. **Tier 4:** if/iflow models (when authenticated)
- **⛔ `9router/openrouter/auto` is BANNED** — OpenRouter key exhausted (403). Do NOT set this as primary or fallback. Do NOT revert the model config. Current correct config was set 2026-03-15.

### OpenClaw → 9Router Failover Chain (DO NOT CHANGE)
```
Primary:    9router/free-unlimited         (Groq/llama + MiniMax via 9router)
Fallback 1: 9router/cc/claude-sonnet-4-6  (Claude via 9router)
Fallback 2: 9router/always-on-premium     (multi-provider combo)
```
**To change model config use:** `openclaw config set agents.defaults.model.primary "..."` — never edit openclaw.json directly as it may be overwritten.

### 9router COMBO Priority (all combos start with MiniMax)
free-unlimited, heartbeat-cheap, subagent-reliable, always-on-premium, coding-factory, research-deep
→ All start with `minimax/MiniMax-M2.5` then free providers as rotation.

---

## Security & Compliance

### Secrets Management
- **Never commit:** API keys, tokens, credentials — EVER. Not even temporarily.
- **Storage:** Gitignored files under `workspace/config/` or `openclaw.json` (gitignored)
- **Rotation:** Automated credential rotation (GOAL-006 sub-goal)

### Secret Locations (gitignored — never commit these paths)
| Secret | File |
|--------|------|
| Telegram bot token (OPS alerts) | `workspace/config/telegram-bot-token.txt` |
| n8n API key | `workspace/config/n8n-api-key.txt` |
| GitHub webhook PAT | `workspace/config/github-webhook-pat.txt` |
| All Telegram bot tokens (per-agent) | `openclaw.json` → `plugins.telegram.*.botToken` |

### Telegram Bot Token — INCIDENT RESOLVED (2026-03-02)
- **Incident:** OPS bot token hardcoded in 3 monitoring scripts, committed and pushed to GitHub. GitGuardian detected and alerted.
- **Affected files:** `scripts/9router-health-watchdog.sh`, `scripts/model-outage-monitor.sh`, `scripts/session-overflow-monitor.sh`
- **Resolution:** Old token revoked via BotFather. New token saved to `workspace/config/telegram-bot-token.txt` (gitignored). Scripts updated to read from that file. Full git history rewritten via `git-filter-repo`, force-pushed to GitHub.
- **OPS bot:** `@OPSRED_BOT` (ID: 8230099863) — token rotated, working
- **Rule:** All scripts that send Telegram alerts MUST read token from `workspace/config/telegram-bot-token.txt` — never hardcode.

### Sandbox Permissions
- Agents run in sandboxed environments
- Limited file system access
- No elevated permissions without approval

### Audit Trail
- All agent actions logged to `logs/errors.jsonl`
- A2A communication logged to `logs/a2a-delegations.jsonl`
- Task completions logged to `workspace/tasks-log.md`

---

## Known Issues & Workarounds

### P1 Issues
1. **TICKET-20260301-044:** 43 embedded run timeouts at 600s (10min budget exhaustion)
   - Impact: A2A communication failing, coordination breakdown
   - Workaround: Use Slack for critical coordination
   - Owner: ENG

2. **TICKET-20260301-049:** Perplexity API 401 auth failure (4+ days)
   - Impact: RESEARCH competitive intelligence blocked
   - Workaround: Use web_fetch for direct changelog scraping
   - Owner: OPS (credential rotation)

### Blocked Tasks
- **AUTO-003:** Weekly competitive intelligence (Perplexity API down)
- **AUTO-004:** openclaw.json review (file not accessible in sandbox)
- **AUTO-011:** Watchdog security audit (script paths not accessible)

---

## Skills & Tools

### X/Twitter Reading
- **Skill:** `x-mirror` (uses Jina AI)
- **Usage:** `bash ~/.openclaw/workspace/skills/x-mirror/scripts/x_mirror.sh --fetch "https://x.com/user/status/id"`
- **Alternative:** Rewrite URL to `https://r.jina.ai/https://x.com/...`

### Web Search
- **Primary:** Perplexity via `web_search` tool (currently down - 401 auth)
- **Fallback:** Exa MCP via mcporter (`exa.web_search_exa`)
- **Always disclose:** Which search provider was used

### Memory Search
- **Tool:** `memory_search` (semantic search across MEMORY.md + memory/*.md)
- **When to use:** Before answering questions about prior work, decisions, dates, people, preferences, todos
- **Provider:** Qdrant + fastembed

---

## Cron Jobs

### Status: ✅ GOAL-005 COMPLETE
- **Active:** 30 enabled / 76 total (as of 2026-03-15)
- **Strategy:** Polling jobs replaced by n8n event-driven workflows

### Critical Active Crons
- **Autonomous Task Dispatcher:** Every 15min
- **9router-token-refresh-0001:** Every 4min — auto-refreshes iflow (48h), kiro (1h), claude (8h), cursor sync. Zero human intervention needed.
- **⛔ 9router-auth-watchdog-0001:** PERMANENTLY DISABLED — was zeroing openclaw.json + writing banned openrouter/auto model (2026-03-16)
- **openclaw-backup-weekly-0001:** Sundays 3am — `openclaw backup create`
- **openclaw-sessions-cleanup-0001:** Sundays 4am — clears orphan transcripts
- **sessions-daily-cleanup-0001:** 3am daily — `openclaw sessions cleanup` (added 2026-03-17)
- **Telegram Approval Monitor:** Checks for approve/deny replies every 2min
- **health-monitor (launchd):** Every 15min — auto-clears bloated sessions, strips AUTONOMOUS.md spam, restores corrupt openclaw.json

---

## n8n Workflows (as of 2026-03-02)

**Total:** 12 active workflows (8 core + 4 social monitoring, verified 2026-03-04)
**Instance:** `http://127.0.0.1:5678`
**API Key:** `workspace/config/n8n-api-key.txt`

### Workflows
1. **echo-test** (`SWmkldgx4OypuhOn`) — API health check
2. **slack-post** (`zIoMz7Ug5oVeZz5T`) — Slack message posting
3. **github-repo-status** (`g7fy6gWny65rhStr`) — GitHub commit fetcher
4. **github-events** (`RS3wjcMCSrUeaRlR`) — GitHub webhook → agent dispatch ✅ verified
5. **slack-inbound-router** (`EInxQVFsBEAcNKS1`) — Routes incoming Slack events
6. **cost-alert-escalation** (`GyjnDmZn38ZJVpN7`) — Budget breach escalation
7. **error-escalation** (`NdKRqbHyxP7j9ihZ`) — Critical error escalation
8. **daily-standup** (`C0gFamBjnzPGH8Y3`) — Schedule 8am ET M–F → 6 agents

### GitHub Webhook
- **Repo:** `redinside-dev/openclaw-redos`
- **Webhook ID:** 598611413 (stored in `workspace/config/github-webhook-id.txt`)
- **URL:** Cloudflare tunnel, auto-synced on boot via launchd `ai.openclaw.tunnel-sync`
- **Current URL:** see `workspace/config/tunnel-url.txt`
- **Status:** ✅ Verified end-to-end 2026-03-02 (`git push → GitHub → n8n → gateway → agent dispatch`)

---

## Git Workflow

### Repository Cleanup (2026-02-28)
- Added `.gitignore` entries for runtime state files
- Runtime state files (`*.heartbeat.json`, `agent-status/*.json`, `goals*.json`)
- **Result:** `git status` now only shows meaningful changes — runtime state silenced permanently
- **Pushed:** All gitignore + doc changes pushed to `origin/main`; repo is clean

### Auto-Refresh Verification
- `9router-keepfresh-0001` cron (every 4min, OPS) → calls `scripts/9router-token-refresh.js`
- **Claude Pro** auto-refreshes via `/api/providers/{id}/test` in last 5min window — CONFIRMED working
- **Kiro** refreshes via AWS OIDC automatically — CONFIRMED working
- **iFlow** `testStatus: error` = known false positive (health endpoint broken, inference fine) — script explicitly skips iFlow + openr

---

## Lessons Learned

### 2026-03-01: Verify Live State, Not Documentation
- **Incident:** Gave wrong n8n workflow count twice (said 3, actual 9)
- **Root cause:** Relied on stale documentation instead of querying live API
- **Learning:** For infrastructure questions, always query the actual system first
- **Impact:** Trust damaged, required user correction twice
- **Fix:** Added "Data Verification Protocol" to this file

### 2026-03-01: Don't Escalate P1 Without Verifying Logs
- **Incident:** Escalated "40+ timeout epidemic" that didn't exist in actual logs
- **Root cause:** Based escalation on phantom data from own state file
- **Learning:** Before escalating as P1, verify evidence exists in actual system logs
- **Impact:** False alarm noise hid real infrastructure issue (embedded run timeouts)

### 2026-03-02: Telegram Token Exposed on GitHub — Root Cause & Fix
- **Incident:** GitGuardian alert — OPS bot token hardcoded in 3 bash scripts, committed to public GitHub repo
- **Root cause:** Scripts written with token inline instead of reading from gitignored config file
- **Fix:** Revoked old token, rotated via BotFather, saved new token to `workspace/config/telegram-bot-token.txt` (gitignored), rewrote git history with `git-filter-repo`, force-pushed
- **Learning:** Bash scripts that need secrets must ALWAYS read from a file or env var — never inline. Before committing any script, grep for token patterns: `grep -r "[0-9]\{8,10\}:[A-Za-z0-9_-]\{35\}" .`

### 2026-02-28: Context Quality Determines Agent Success
- **Pattern:** Agents with good context complete tasks, agents without context fail or timeout
- **Example:** RESEARCH briefs that include full context get implemented, vague requests get ignored
- **Learning:** Invest in structured context handoffs, domain knowledge bases, cross-task memory

---

## TODO / Backlog

### P1 (Blocking autonomous operation)
*None — all P1 items complete as of 2026-03-02.*

### P2
| # | Item |
|---|------|
| 2 | Fix undici AbortErrors (TICKET-20260216-002) |
| 3 | Set `SLACK_SIGNING_SECRET` in `.env` |
| 4 | Subscription audit: review ChatGPT Pro x2 ($400/mo) utilization. Potential $180-360 savings if downgraded. Due: 2026-04-01 |

### P3
| # | Item |
|---|------|
| 5 | Named Cloudflare tunnel (permanent URL, no manual updates after reboot) — requires domain in Cloudflare |
| ~~6~~ | ~~Tailscale daemon~~ — CLOSED: disabled in openclaw.json (not installed) |

---

## Changes Log

### 2026-03-17
- **Session bloat auto-guard added** — `health-monitor.sh` now clears any agent session >300KB every 15min (launchd, runs 24/7). Root cause of every breakdown since Mar 13: sessions grew to 600-741KB causing all LLM calls to timeout at 60s.
- **Consultant stall loop fixed (2 bugs)** — `consultant-daemon.py`: (1) `_find_error_crons` was silently failing due to wrong dict structure (`{"version":…,"jobs":[…]}` not handled); (2) `inject_task` had zero deduplication — injected identical tasks every 15min with no limit. Added 4-hour dedup window + 20KB circuit-breaker. AUTONOMOUS.md was 141KB of spam → reset to 4KB.
- **`redos-mission` skill created** — `workspace/skills/redos-mission/SKILL.md` permanently documents the company objective, business lines, failure patterns, memory architecture, and escalation rules. Registered as skill entry #1 in openclaw.json. Injected into every agent session automatically. Anurag will never need to re-explain the objective.
- **HEARTBEAT symlink fixed** — `workspace-ops/workspace/ops/HEARTBEAT.md` → symlink to `workspace-ops/HEARTBEAT.md`. OPS cron was looking in wrong nested path.
- **All 8 agent sessions cleared** — ops:741KB, main:666KB, finance:496KB, eng:384KB, research:288KB, infosec:194KB, hatake:172KB, allrounder:173KB. All transcripts deleted. Fresh sessions allow LLM calls to complete in <10s again.
- **AUTONOMOUS.md bloat guard added** — health-monitor.sh strips all CONSULTANT TASK blocks if file >50KB.
- **`9router-auth-watchdog-0001` cron permanently DISABLED** — was zeroing openclaw.json via race condition + writing banned `openrouter/auto` model back. Cause of 24h+ outage on 2026-03-16.
- **Correct model config (DO NOT CHANGE):** primary=`9router/free-unlimited`, fallbacks=[`9router/cc/claude-sonnet-4-6`, `9router/always-on-premium`]. Set in openclaw.json for all 8 agents + defaults.
- **Daily session cleanup confirmed** — `sessions-daily-cleanup-0001` runs 3am daily (already existed). `openclaw-sessions-cleanup-0001` runs Sundays 4am (weekly orphan cleanup). health-monitor.sh adds real-time guard.

### 2026-03-15
- **MiniMax M2.5 promoted to primary model** — unlimited $20/mo coding plan = Opus-level quality at zero per-token cost. All 6 9router COMBOs now start with MiniMax. All agents: primary=9router/free-unlimited, fallback1=minimax direct, fallback2=glm/ZAI direct.
- **iflow re-authenticated** — both accounts active. Token auto-refresh cron (`9router-token-refresh-0001`) added, runs every 4min. iflow/kiro/claude/cursor all auto-refresh with zero human intervention.
- **Codex accounts** — 9router handles internally. Script updated to skip codex to avoid `refresh_token_reused` conflict.
- **9 missing skills added** — `autonomous-a2a`, `context-window-policy`, `cost-optimization`, `policy-gate`, `website-auditor`, `website-builder`, `lead-gen-maps`, `outreach-automation`, `event-driven-patterns` now in skills.entries (57 total).
- **Telegram dmPolicy locked** — all 7 bots changed from `open` to `owner` with allowFrom=[1012034994]. Prompt injection surface eliminated.
- **ENG + OPS heartbeats added** — 60min heartbeat on both high-throughput agents.
- **Backup + cleanup crons added** — weekly `openclaw backup create` (Sun 3am) + `openclaw sessions cleanup` (Sun 4am).
- **memory-lancedb plugin enabled** — vector memory now active.
- **11/11 OSS repos shipped** — costwatch, redos-website, a2a-protocol, pr-auto-reviewer, agent-loop-detection, session-memory, llm-gateway-proxy, agent-eval-harness, context-window-optimizer, llm-observability-hub, codebase-onboarding-agent. All at anuragg-saxenaa on GitHub with CI.
- **OpenClaw audit complete** — audit report at `workspace/ops/openclaw-audit-2026-03-15.md`.

### 2026-03-04
- **Scrapling MCP installed**: `scrapling[ai]` v0.4.1 via pipx at `/Users/redinside/.local/bin/scrapling`. Browser deps installed. Wrapper script at `~/.openclaw/scripts/scrapling-fetch.sh`. SKILL at `workspace/skills/scrapling-mcp/SKILL.md`. All 8 agents can scrape via exec.
- **Social monitoring live**: 4 n8n workflows active (twitter-service, reddit-service, aggregator-service, shared-observability). SQLite DB at `workspace/data/social-monitoring.db`. Code nodes use `child_process.execSync + sqlite3 CLI` (n8n 2.9.4 has no native sqlite node; `executeCommand` node also not activatable — use Code node).
- **Ideas KB pipeline**: `workspace/ideas/twitter-feed.md` + `reddit-feed.md` auto-appended. `ideas-indexer-nightly-0001` cron (OPS, 23:00) rebuilds `ideas-index.json`. Webhook `POST http://localhost:19000/webhook/ingest-idea` with `{platform, title, url, summary, score}`.
- **Fake web-scraping skill deleted**: `workspace/skills/web-scraping/` (260KB, 24 files) and `workspace/scripts/reddit_mcp.sh` — all called invalid `openclaw browser` syntax and never ran.
- **OpenClaw MCP limitation**: `mcp` is not a valid top-level key in `openclaw.json`. OpenClaw's `mcporter` only works for QMD memory backend, not general MCP. Use `exec` + wrapper scripts instead.

### 2026-03-03
- **delivery.to fix**: 19 cron jobs used `delivery.target` (wrong field). OpenClaw requires `delivery.to`. All fixed.
- **HEARTBEAT.md rewrites**: main (was vague/dead refs), ops (was raw JSON — broken), infosec (was stale fake data). All 3 now have concrete tool-call cycles matching allrounder/eng/research/finance pattern.
- **Tailscale disabled**: `gateway.tailscale.mode: off` — was generating errors on every restart.
- **memory-core duplicate**: Deleted `extensions/memory-core/` — error log now clean on restart.
- **OPS bot token rotated**: @OPSRED_BOT live. All 8 agent Telegram bots confirmed active.
- **workspace-agent-*/ gitignored**: Per-agent nested git workspaces excluded from main repo.
- **HEARTBEAT.md unignored**: Removed `workspace-*/HEARTBEAT.md` from .gitignore — these are instruction files, not runtime state.
- **Production social monitoring built**: 4 n8n workflows (twitter-service, reddit-service, aggregator-service, shared-observability) + SQLite database + full documentation. Ready for deployment. See `ops/n8n-workflows/DEPLOYMENT-SUMMARY.md`.

---

## Contact & Escalation

### Slack Channels
- **#redos-mission-control:** Main coordination channel
- **#redos-ops:** OPS team updates
- **#redos-eng:** ENG team updates
- **#redos-infosec:** Security findings
- **#redos-finance:** Cost reports

### Human Escalation
- **When:** P1 SLA breach, blocked for >2h, trust/safety issues
- **How:** Telegram message to user, Slack #redos-mission-control
- **Include:** Full context, what you tried, why it's blocked, suggested next steps

---

---

## Enterprise Job Queue System (2026-03-06)

### Problem Solved
- **Old system:** Cron jobs directly executed agents → session locks → deadlocks → system breakdown
- **Root cause:** Multiple cron jobs hitting same agent simultaneously

### Solution: Per-Agent Queue Workers
Each agent has its own queue + worker - NO MORE DEADLOCKS.

### Components
| Component | Location | Purpose |
|-----------|----------|----------|
| job-queue.py | workspace/scripts/ | Core queue management |
| queue-worker.py | workspace/scripts/ | Worker that processes 1 job at a time |
| queue-cron.sh | scripts/ | Submits jobs to queues |
| LaunchAgents | ~/Library/LaunchAgents/ai.openclaw.queue-worker.*.plist | 8 workers (1 per agent) |

### How It Works
```
1. Cron triggers queue-cron.sh (every 5min)
2. Reads AUTONOMOUS.md for PENDING tasks
3. Submits to agent queue (eng.json, ops.json, etc.)
4. Queue worker picks up job (1 at a time)
5. Executes agent with task
6. Marks complete/failed with retry logic
```

### Queue Commands
```bash
# Check all queues
python3 ~/.openclaw/workspace/scripts/job-queue.py status

# Submit job manually
python3 ~/.openclaw/workspace/scripts/job-queue.py submit eng "your task here"

# View specific queue
cat ~/.openclaw/workspace/n8n/queues/eng.json
```

### Features
- **No deadlocks** - Each agent has dedicated worker
- **Auto retry** - Failed jobs retry 3x with backoff
- **Dead letter queue** - Jobs fail 3x go to DLQ for review
- **Persistent** - Queues saved to disk, survive restarts
- **Scales to 80+ agents** - Just add more workers

### Running Services
| Worker | Status | PID |
|--------|--------|-----|
| eng | Running | 38570 |
| ops | Running | 38845 |
| research | Running | 38961 |
| finance | Running | 39077 |
| main | Running | 39079 |
| infosec | Running | 39081 |
| allrounder | Running | 39083 |
| hatake | Running | 39085 |
| queue-cron | Running | - |

### For Agents
**When you complete a task:**
1. Update AUTONOMOUS.md: PENDING → COMPLETED
2. Job automatically goes to validation queue

**When you need work:**
1. Check your queue file: `cat ~/.openclaw/workspace/n8n/queues/<agent>.json`
2. Or submit new tasks to other agents using job-queue.py

**Last updated:** 2026-03-06T04:15Z — Enterprise queue system deployed, 8 workers running, deadlocks eliminated

---

## Session Update — 2026-03-07

### Infrastructure Fixes Applied
- **Root cause of repeated outages**: `update.auto.enabled: true` caused silent breaking schema upgrades every 6–18h. Fixed with n8n staged update pipeline (backup → install → validate → restart → verify → auto-rollback).
- **OpenClaw v2026.3.2 migration**: Agents moved from flat `agents.main` keys to `agents.list[]` array format. All 8 agents migrated.
- **Slack tokens fixed**: Real `xoxb-` and `xapp-` tokens set; bot invited to all 15 Slack channels with per-agent routing.
- **flock fix**: `telegram-deadman.sh` used Linux-only `flock`; replaced with `mkdir`-based atomic lock.
- **refresh_token_reused fix**: Removed `--all` flag from `9router-token-refresh.js` call in restart script.

### Model Providers (updated 2026-03-15)
- **Primary**: `9router/free-unlimited` (MiniMax M2.5 first inside 9router)
- **Fallback 1**: `minimax/MiniMax-M2.5` direct (unlimited $20/mo coding plan — same as Opus 4.6)
- **Fallback 2**: `glm/glm-4.7` direct (ZAI key — PAYG backup)
- **iflow**: Re-authenticated 2026-03-15, auto-refreshes every 4min via cron

### Slack Channel Routing
| Agent | Channel |
|---|---|
| RED | #redos-red (C0AFLUZ4P71) |
| ZEN | #redos-zen (C0AFZ09R9V3) |
| ENG | #redos-eng (C0AFW1B0QUB) |
| RESEARCH | #redos-research (C0AG615R5E0) |
| FINANCE | #redos-finance (C0AG6166CJ0) |
| OPS | #redos-ops (C0AGFA9417T) |
| INFOSEC | #redos-infosec (C0AG2CTU6AW) |
| HATAKE | #redos (C0AG3GPSS4A) |

### n8n Workflows (all 13 operational)
- `slack-post`: Fixed wrong Slack token (was old `txgY6M7` key)
- `cost-alert-escalation` + `error-escalation`: Fixed GET→POST method on Slack calls
- `github-repo-status`: Added GitHub PAT; corrected org to `redinside-dev`
- `twitter-service`: Increased n8n task runner timeout to 180s (`N8N_RUNNERS_TASK_TIMEOUT`)
- `🛡️ OpenClaw Guardian`: Upgraded with config drift + staged update pipeline nodes

### Watchdog Services
- `config-drift-watchdog.sh`: Runs every 10min via launchd, alerts Telegram on invalid config
- Staged update pipeline: n8n Guardian runs every 6h, validates + auto-rollbacks bad updates
