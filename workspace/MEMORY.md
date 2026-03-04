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
- **n8n:** Workflow automation (`http://127.0.0.1:5678`) — **12 active workflows as of 2026-03-04**
- **Qdrant:** Vector search (`http://127.0.0.1:6333`)
- **Dashboard:** Mission control (`http://127.0.0.1:19000`) · auth: `red/redos2026`

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
- **Rules:** Only RED adds tasks, workers claim ONE at a time, mark IN_PROGRESS, append completion

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

### Model Routing Strategy
1. **Tier 1:** Local Ollama (free)
2. **Tier 2:** 9router hosted models (Claude Haiku, GPT-4o-mini)
3. **Tier 3:** Premium models (Claude Opus, GPT-5.2) - only for complex tasks
4. **Last resort:** PAYG models (removed from most fallback chains)

### Cost Reduction Tactics
- Prompt caching enabled (`cache_control: ephemeral`)
- Batch API for nightly/weekly jobs
- PAYG models removed from fallback chains
- Agent-specific model routing (FINANCE uses cheaper models)

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
- **Active:** 30 enabled / 85 disabled / 115 total
- **Reduction:** 110 → 30 (73% reduction), achieved 2026-03-02
- **Strategy:** Polling jobs replaced by n8n event-driven workflows

### Critical Active Crons
- **Autonomous Task Dispatcher:** Every 15min, dispatches tasks from AUTONOMOUS.md
- **Session Warmup:** Keeps specialist agents warm for A2A
- **Context Health Check:** 30min memory flush heartbeat
- **Telegram Approval Monitor:** Checks for approve/deny replies
- **9router Token Refresh:** Every 6h, refreshes Kiro/Claude tokens

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
- `9router-keepfresh-0001` cron (every 4min, OPS, ollama) → calls `scripts/9router-token-refresh.js`
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

### 2026-03-04
- **Scrapling MCP installed**: `scrapling[ai]` v0.4.1 via pipx at `/Users/redinside/.local/bin/scrapling`. Browser deps installed. Wrapper script at `~/.openclaw/scripts/scrapling-fetch.sh`. SKILL at `workspace/skills/scrapling-mcp/SKILL.md`. All 8 agents can scrape via exec.
- **Social monitoring live**: 4 n8n workflows active (twitter-service, reddit-service, aggregator-service, shared-observability). SQLite DB at `workspace/data/social-monitoring.db`. Code nodes use `child_process.execSync + sqlite3 CLI` (n8n 2.9.4 has no native sqlite node; `executeCommand` node also not activatable — use Code node).
- **Ideas KB pipeline**: `workspace/ideas/twitter-feed.md` + `reddit-feed.md` auto-appended. `ideas-indexer-nightly-0001` cron (OPS, 23:00) rebuilds `ideas-index.json`. Webhook `POST http://localhost:19000/webhook/ingest-idea` with `{platform, title, url, summary, score}`.
- **Fake web-scraping skill deleted**: `workspace/skills/web-scraping/` (260KB, 24 files) and `workspace/scripts/reddit_mcp.sh` — all called invalid `openclaw browser` syntax and never ran.
- **OpenClaw MCP limitation**: `mcp` is not a valid top-level key in `openclaw.json`. OpenClaw's `mcporter` only works for QMD memory backend, not general MCP. Use `exec` + wrapper scripts instead.

### 2026-03-03
- **delivery.to fix**: 19 cron jobs used `delivery.target` (wrong field). OpenClaw requires `delivery.to`. All fixed.
- **HEARTBEAT.md rewrites**: main (was vague/dead refs), ops (was raw JSON — broken), infosec (was stale fake data). All 3 now have concrete tool-call cycles matching allrounder/eng/research/finance pattern.
- **Heartbeat model**: `ollama/qwen3.5:4b` → `ollama/qwen3.5:4b` for all agents (newer, better reasoning).
- **Tailscale disabled**: `gateway.tailscale.mode: off` — was generating errors on every restart.
- **memory-core duplicate**: Deleted `extensions/memory-core/` — error log now clean on restart.
- **llama3.1:8b removed**: 4GB freed from Ollama. Active models: qwen3.5:4b, qwen3.5:4b, gpt-oss:20b, kimi-k2.5:cloud.
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

**Last updated:** 2026-03-04T01:40Z — Scrapling installed, 4 social monitoring workflows active, ideas KB pipeline live, fake web-scraping skill deleted
