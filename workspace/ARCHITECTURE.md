# AgentOS — Complete Architecture & Implementation Guide

> **Platform:** OpenClaw v2026.2.12 | **Host:** Mac Mini (macOS 26.0.1, ARM64) | **Runtime:** Node 22.22.0
> **Last Updated:** 2026-02-13

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Telegram)                              │
│                    Telegram ID: 1012034994                          │
└──────────┬──────────────────────────────────────────────────────────┘
           │ DM / Group Message
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   TELEGRAM BOT LAYER (7 Bots)                       │
│                                                                     │
│  @RedinsideBot    → default account  → binds to agent: main        │
│  @ZenRedBot       → allrounder acct  → binds to agent: allrounder  │
│  @ENGRED_BOT      → eng account      → binds to agent: eng         │
│  @RESEARCHRED_BOT → research account → binds to agent: research    │
│  @FINANCERED_BOT  → finance account  → binds to agent: finance     │
│  @OPSRED_BOT      → ops account      → binds to agent: ops         │
│  @INFOSECRED_BOT  → infosec account  → binds to agent: infosec     │
│                                                                     │
│  DM Policy: open (allowFrom: ["*"]) for all non-default accounts   │
│  Group Policy: allowlist (user 1012034994), requireMention: true    │
│  Stream Mode: partial                                               │
└──────────┬──────────────────────────────────────────────────────────┘
           │ Telegram getUpdates polling
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OPENCLAW GATEWAY                                  │
│              ws://127.0.0.1:18789 (local loopback)                  │
│              LaunchAgent: ai.openclaw.gateway                       │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐              │
│  │  Routing &   │  │   Session    │  │   Tool        │              │
│  │  Bindings    │  │   Manager    │  │   Registry    │              │
│  │              │  │              │  │               │              │
│  │ channel +    │  │ sessions.json│  │ web_search    │              │
│  │ accountId →  │  │ per agent    │  │ web_fetch     │              │
│  │ agentId      │  │ .jsonl files │  │ sessions_send │              │
│  └─────────────┘  └──────────────┘  │ sessions_spawn│              │
│                                      │ read/write    │              │
│  ┌─────────────┐  ┌──────────────┐  │ exec          │              │
│  │  Heartbeat   │  │   Cron       │  │ browser       │              │
│  │  Manager     │  │   Scheduler  │  │ canvas        │              │
│  │  (30m each)  │  │  (25 jobs)   │  │ tts           │              │
│  └─────────────┘  └──────────────┘  │ cron          │              │
│                                      │ image         │              │
│  ┌─────────────┐  ┌──────────────┐  │ message       │              │
│  │  Memory      │  │   Browser    │  │ agents_list   │              │
│  │  System      │  │   Control    │  │ session_status│              │
│  │  (vector+fts)│  │  (2 profiles)│  └───────────────┘              │
│  └─────────────┘  └──────────────┘                                  │
│                                                                     │
│  Config: sandbox.mode = "off"                                       │
│  Config: sessionToolsVisibility = "all"                             │
│  Config: agentToAgent.enabled = true                                │
└──────────┬──────────────────────────────────────────────────────────┘
           │ Dispatches to agent based on binding
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AGENT LAYER (8 Agents)                         │
│                                                                     │
│  Each agent has:                                                    │
│  ├── ~/.openclaw/agents/{id}/sessions/sessions.json  (session index)│
│  ├── ~/.openclaw/agents/{id}/sessions/*.jsonl        (transcripts)  │
│  ├── ~/.openclaw/workspace-{id}/                     (agent workspace)│
│  │   ├── SOUL.md        ← Identity + delegation rules (auto-loaded)│
│  │   ├── AGENTS.md      ← Session startup guide (auto-loaded)      │
│  │   ├── TOOLS.md       ← Tool usage instructions (auto-loaded)    │
│  │   ├── IDENTITY.md    ← Agent identity (auto-loaded)             │
│  │   ├── USER.md        ← User context (auto-loaded)               │
│  │   ├── HEARTBEAT.md   ← Heartbeat tasks (auto-loaded)            │
│  │   ├── BOOTSTRAP.md   ← First-run instructions (auto-loaded)     │
│  │   ├── DELEGATION_RULES.md  ← (NOT auto-loaded, reference only)  │
│  │   ├── ORG_STRUCTURE.md     ← (NOT auto-loaded, reference only)  │
│  │   └── memory/YYYY-MM-DD.md ← Daily memory (auto-loaded)         │
│  │                                                                  │
│  │  Auto-loaded files go into the system prompt as "Project Context"│
│  │  Non-auto-loaded files can be read by the agent via read tool    │
│  └──────────────────────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Agent Organization

```
                    ┌──────────────────────┐
                    │    RED (CEO/main)     │
                    │   @RedinsideBot       │
                    │   gpt-5.2             │
                    │   Orchestrator        │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
    │  ZEN (CSO)     │ │  HATAKE      │ │  INFOSEC     │
    │  allrounder    │ │  Parser      │ │  Security    │
    │  @ZenRedBot    │ │  qwen2.5-7b  │ │  @INFOSECRED │
    │  gpt-5.2       │ │  (local)     │ │  gpt-5.2     │
    │  Web Research   │ │  No browser  │ │  Audits      │
    └───────┬────────┘ └──────────────┘ └──────────────┘
            │
   ┌────────┼────────┬──────────────┐
   │        │        │              │
┌──▼───┐ ┌──▼───┐ ┌──▼───┐  ┌──────▼──────┐
│ ENG  │ │RSRCH │ │ FIN  │  │    OPS      │
│ Eng  │ │ Deep │ │ Cost │  │  QA/DevOps  │
│ Code │ │ Anlys│ │ Anlys│  │  llama3.1-8b│
│gpt5.2│ │gpt5.2│ │gpt5.2│  │  (local)    │
└──────┘ └──────┘ └──────┘  └─────────────┘
```

### Agent Details

| Agent | ID | Telegram Bot | Primary Model | Fallbacks | Role |
|-------|-----|-------------|---------------|-----------|------|
| **RED** | `main` | @RedinsideBot | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | CEO, orchestrator, final decisions |
| **ZEN** | `allrounder` | @ZenRedBot | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | CSO, web research, current events |
| **ENG** | `eng` | @ENGRED_BOT | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | Code, architecture, implementation |
| **RESEARCH** | `research` | @RESEARCHRED_BOT | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | Deep analysis, reports |
| **FINANCE** | `finance` | @FINANCERED_BOT | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | Budget, costs, financial analysis |
| **OPS** | `ops` | @OPSRED_BOT | ollama/llama3.1:8b | (none) | QA, deployment, monitoring (local) |
| **HATAKE** | `hatake` | (no Telegram) | ollama/qwen2.5-coder:7b | llama3.1:8b, glm-4.7-flashx | Parser, local ops (no browser) |
| **INFOSEC** | `infosec` | @INFOSECRED_BOT | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | Security audits, compliance |

---

## 3. Model Providers

```
┌─────────────────────────────────────────────────────────┐
│                    MODEL PROVIDERS                       │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────┐              │
│  │  OpenAI Codex   │  │  Moonshot AI     │              │
│  │  (OAuth)        │  │  (Token)         │              │
│  │  gpt-5.2        │  │  kimi-k1.5       │              │
│  │  gpt-4.7        │  │  kimi-k2.5       │              │
│  │  400k context   │  │                  │              │
│  └─────────────────┘  └──────────────────┘              │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────┐              │
│  │  Z.AI (ZhipuAI) │  │  Ollama (Local)  │              │
│  │  API Key auth   │  │  127.0.0.1:11434 │              │
│  │  glm-4.7        │  │  qwen2.5-coder:7b│              │
│  │  glm-4.7-flashx │  │  llama3.1:8b     │              │
│  └─────────────────┘  │  32k-131k ctx    │              │
│                        │  Cost: $0        │              │
│  ┌─────────────────┐  └──────────────────┘              │
│  │  Perplexity     │                                    │
│  │  sonar-pro      │  ┌──────────────────┐              │
│  │  Web search API │  │  Google          │              │
│  │  Real-time data │  │  gemini-1.5-flash│              │
│  └─────────────────┘  └──────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Inter-Agent Communication Flow

```
User asks RED: "What's the latest crypto news?"

┌──────────┐     ┌──────────────────┐     ┌──────────────┐
│  User    │────▶│  RED (main)      │────▶│  web_search  │
│ Telegram │     │  Receives msg    │     │  (Perplexity)│
└──────────┘     │                  │     │  sonar-pro   │
                 │  Option A:       │     └──────┬───────┘
                 │  Use web_search  │            │
                 │  directly        │◀───────────┘
                 │                  │     Returns results
                 │  Option B:       │
                 │  Delegate to ZEN │
                 │                  │
                 │  sessions_send   │     ┌──────────────┐
                 │  agentId:"allrnd"│────▶│  ZEN         │
                 │  message:"Get    │     │  (allrounder) │
                 │  crypto news"    │     │  web_search  │
                 └──────────────────┘     └──────────────┘

Inter-agent tools:
  sessions_send  → Fire-and-forget message to another agent
  sessions_spawn → Spawn sub-agent, get result back
  sessions_list  → List all sessions across agents
  sessions_history → Read another session's transcript

Config requirements:
  tools.agentToAgent.enabled = true
  agents.defaults.sandbox.sessionToolsVisibility = "all"
  agents.defaults.sandbox.mode = "off"
```

### Delegation Matrix

```
┌──────────────────────────────────────────────────────────────────┐
│  When agent needs...          │  Delegate to...                  │
├───────────────────────────────┼──────────────────────────────────┤
│  Current news / web data      │  ZEN (allrounder) or web_search  │
│  Code / implementation        │  ENG (eng)                       │
│  Deep research / analysis     │  RESEARCH (research)             │
│  Budget / financial analysis  │  FINANCE (finance)               │
│  Testing / deployment / infra │  OPS (ops)                       │
│  Security audit / compliance  │  INFOSEC (infosec)               │
│  Quick parsing / local ops    │  HATAKE (hatake)                 │
│  Final decision / escalation  │  RED (main)                      │
└───────────────────────────────┴──────────────────────────────────┘

RULE: Agents NEVER tell the user to "message another bot."
      They delegate automatically using sessions_send/sessions_spawn.
```

---

## 5. Message Flow (End-to-End)

```
1. USER sends "What's the latest crypto news?" to @RedinsideBot on Telegram

2. TELEGRAM delivers update via getUpdates polling to OpenClaw gateway

3. GATEWAY routes message:
   ├── Channel: telegram
   ├── Account: default
   ├── Binding match → agentId: main
   └── DM policy: pairing (approved user)

4. GATEWAY loads agent session:
   ├── Check agents/main/sessions/sessions.json
   ├── If no session → create new session + load bootstrap files
   ├── Bootstrap files loaded into system prompt:
   │   ├── SOUL.md      (identity + delegation rules + tool access)
   │   ├── AGENTS.md    (session startup guide)
   │   ├── TOOLS.md     (tool usage: web_search, sessions_send, /mission_control)
   │   ├── IDENTITY.md  (agent identity)
   │   ├── USER.md      (user context)
   │   ├── HEARTBEAT.md (periodic tasks)
   │   └── memory/*.md  (daily memory files)
   └── System prompt assembled with Project Context

5. GATEWAY calls LLM:
   ├── Provider: openai-codex
   ├── Model: gpt-5.2 (400k context)
   ├── System prompt: ~10-20k tokens
   ├── Tools registered: web_search, web_fetch, sessions_send, sessions_spawn,
   │   read, write, edit, exec, browser, canvas, cron, tts, message, etc.
   └── Thinking mode: low

6. LLM decides to call web_search tool:
   ├── Tool: web_search
   ├── Args: { "query": "latest crypto news February 2026" }
   ├── Provider: Perplexity sonar-pro
   └── Returns: AI-synthesized answer with citations

7. LLM generates final response with crypto news

8. GATEWAY sends response back to Telegram via Bot API

9. USER sees formatted crypto news in Telegram chat
```

---

## 6. File System Layout

```
~/.openclaw/
├── openclaw.json                    # Master config (agents, models, channels, tools)
├── agents/
│   ├── main/sessions/
│   │   ├── sessions.json            # Session index
│   │   └── *.jsonl                  # Session transcripts
│   ├── allrounder/sessions/
│   ├── eng/sessions/
│   ├── research/sessions/
│   ├── finance/sessions/
│   ├── ops/sessions/
│   ├── infosec/sessions/
│   └── hatake/sessions/
├── workspace/                       # Default/shared workspace
│   ├── SOUL.md, AGENTS.md, TOOLS.md, etc.
│   ├── DELEGATION_RULES.md          # (reference, not auto-loaded)
│   ├── ORG_STRUCTURE.md             # (reference, not auto-loaded)
│   └── mission-control/
│       ├── index.html               # Web dashboard UI (React)
│       ├── gateway-bridge.py        # REST API bridge (Python)
│       └── start.sh                 # Startup script
├── workspace-main/                  # RED's workspace
│   ├── SOUL.md                      # Identity + delegation + tool access
│   ├── TOOLS.md                     # web_search, sessions_send, /mission_control
│   └── ...
├── workspace-allrounder/            # ZEN's workspace
├── workspace-eng/                   # ENG's workspace
├── workspace-finance/               # FINANCE's workspace
├── workspace-infosec/               # INFOSEC's workspace
├── workspace-ops/                   # OPS's workspace
├── workspace-research/              # RESEARCH's workspace
├── telegram/
│   └── update-offset-*.json         # Telegram polling offsets per bot
├── memory/                          # Shared memory (vector + FTS)
├── cron/jobs.json                   # 25 cron jobs
├── sandboxes/                       # Agent sandbox dirs (unused, mode=off)
└── logs/                            # Gateway logs
```

---

## 7. Mission Control Dashboard

```
┌─────────────────────────────────────────────────────────┐
│              MISSION CONTROL                             │
│                                                         │
│  Web UI:     http://127.0.0.1:8080/                     │
│  Bridge API: http://127.0.0.1:8081/api/status           │
│  OpenClaw:   http://127.0.0.1:18789/                    │
│                                                         │
│  Components:                                            │
│  ┌──────────────────┐    ┌──────────────────┐           │
│  │  index.html       │    │  gateway-bridge  │           │
│  │  React SPA        │───▶│  Python REST API │           │
│  │  Port 8080        │    │  Port 8081       │           │
│  │  Auto-refresh 3s  │    │  Polls openclaw  │           │
│  └──────────────────┘    │  status every 3s │           │
│                           └────────┬─────────┘           │
│                                    │                     │
│                           ┌────────▼─────────┐           │
│                           │  openclaw CLI     │           │
│                           │  openclaw status  │           │
│                           │  openclaw.json    │           │
│                           └──────────────────┘           │
│                                                         │
│  Telegram command: /mission_control                      │
│  → RED uses web_fetch to GET bridge API                  │
│  → Formats status report in Telegram                     │
│                                                         │
│  API Endpoints:                                         │
│  GET  /api/status   → Full system status                │
│  GET  /api/health   → Health check                      │
│  GET  /api/config   → Agent configurations              │
│  GET  /api/models   → Available models                  │
│  GET  /api/security → Security dashboard data           │
│  POST /api/agents/{id}/model → Update agent model       │
│  POST /api/config/reload     → Restart gateway          │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Key Configuration Decisions

| Setting | Value | Why |
|---------|-------|-----|
| `sandbox.mode` | `"off"` | Was `"all"` (Docker). Changed to `"off"` because sandbox blocked file reads and tool access, causing agents to say "I can't do that in this sandbox" |
| `sessionToolsVisibility` | `"all"` | Default was `"spawned"` (only see own spawned sessions). Changed to `"all"` so agents can use `sessions_send` across agent boundaries |
| `agentToAgent.enabled` | `true` | Enables cross-agent messaging via `sessions_send`/`sessions_spawn` |
| `dmPolicy` | `"open"` (non-default) | Changed from `"pairing"` to `"open"` with `allowFrom: ["*"]` for all non-default accounts to ensure DMs are accepted |
| `web.search.provider` | `"perplexity"` | Perplexity sonar-pro for real-time web search |
| `heartbeat.every` | `"30m"` | All agents (except HATAKE) heartbeat every 30 minutes |
| `compaction.mode` | `"safeguard"` | Prevents aggressive context pruning |
| `contextPruning.mode` | `"cache-ttl"` with 1h TTL | Cache-based context management |

---

## 9. Known Issues & Patches

### Patch: `resolvePathWithinSessionsDir` (paths-*.js)
**Files patched:** 4 compiled JS files in `/opt/homebrew/lib/node_modules/openclaw/dist/`
- `paths-B49s6UZQ.js`
- `paths-mF4iWwgm.js`
- `paths-C7j5gEli.js`
- `paths-CnE9bV4t.js`

**Bug:** When `sessionEntry.sessionFile` contains an absolute path to another agent's session (e.g., `/Users/redinside/.openclaw/agents/infosec/sessions/uuid.jsonl`), and the `sessionsDir` is the calling agent's directory (e.g., `.../agents/main/sessions/`), the relative path calculation produces `../../infosec/sessions/uuid.jsonl` which fails the `startsWith("..")` security check.

**Fix:** Added early return for absolute paths matching `/agents/[a-z0-9_-]+/sessions$/`:
```javascript
if (path.isAbsolute(candidate.trim())) {
    const resolvedCandidate = path.resolve(candidate.trim());
    const candidateDir = path.dirname(resolvedCandidate);
    if (candidateDir.match(/\/agents\/[a-z0-9_-]+\/sessions$/)) return resolvedCandidate;
}
```

**⚠️ WARNING:** This patch will be overwritten on the next `openclaw` update. Report upstream.

---

## 10. Startup Sequence

```bash
# 1. OpenClaw Gateway (auto-starts via LaunchAgent)
openclaw gateway start
# Runs as: gui/501/ai.openclaw.gateway
# PID file managed by launchd

# 2. Mission Control (manual start required)
bash ~/.openclaw/workspace/mission-control/start.sh
# Starts: gateway-bridge.py on port 8081
# Starts: python3 -m http.server 8080

# 3. Ollama (for local models - HATAKE, OPS)
ollama serve
# Runs on: http://127.0.0.1:11434
```

---

## 11. Enhancement Opportunities

### Immediate
- [ ] Auto-start Mission Control via LaunchAgent (like the gateway)
- [ ] Report `resolvePathWithinSessionsDir` bug upstream to OpenClaw
- [ ] Add real budget tracking (currently mock data in bridge)
- [ ] Tighten `dmPolicy` back to `"allowlist"` after confirming all bots work

### Medium-term
- [ ] Real-time event streaming from gateway to Mission Control (WebSocket)
- [ ] Agent performance metrics (response time, tool usage, delegation success rate)
- [ ] Shared knowledge base across agents (beyond memory files)
- [ ] Cost tracking per agent per model (integrate with provider billing APIs)
- [ ] Auto-scaling: spawn more agents for parallel tasks

### Long-term
- [ ] Self-learning: agents update their own SOUL.md based on feedback
- [ ] Evaluation framework: automated testing of agent responses
- [ ] Multi-user support: different Telegram users get different agent contexts
- [ ] Cross-platform channels: Slack, Discord, WhatsApp alongside Telegram
- [ ] Agent marketplace: plug-in new specialist agents dynamically

---

## 12. Security Considerations

| Area | Current State | Recommendation |
|------|--------------|----------------|
| Telegram DM | `open` for non-default bots | Tighten to `allowlist` with specific user IDs |
| Sandbox | `off` (agents have full host access) | Consider `workspace` mode for file isolation |
| API Keys | Stored in `openclaw.json` (plaintext) | Move to environment variables or secrets manager |
| Gateway Auth | Token-based (`1a43d7bd...`) | Adequate for local-only access |
| Agent-to-Agent | Fully open (`enabled: true`) | Consider adding `allow` rules per agent pair |
| Mission Control | No auth on ports 8080/8081 | Add basic auth if exposed beyond localhost |

---

*This document is designed to be shared with Claude Code or any AI assistant for architecture review, enhancement suggestions, and implementation guidance.*
