# OpenClaw RedOS

Multi-agent AI orchestration system with intelligent routing, self-healing resilience, and Telegram integration.

| | |
|---|---|
| **Version** | 3.6.0 |
| **Runtime** | Node.js 22+ (ESM) |
| **Host** | Mac Mini (macOS, ARM64) |
| **Models** | Ollama (local) + Anthropic (cloud fallback) |
| **Interface** | Telegram (7 bots), REST API, WebSocket, Mission Control UI |

---

## Flow Diagrams

### 1. Main Request Flow

Every message — whether from Telegram or the REST API — follows this path:

```
                        ┌──────────────┐
                        │   Telegram   │  7 bots (DM / Group)
                        │   Bridge     │  telegram/telegram-bridge.js
                        └──────┬───────┘
                               │ HTTP POST /api/chat
                               v
┌──────────────────────────────────────────────────────────────┐
│                  GATEWAY  (port 19000)                        │
│                  gateway/server.js                            │
│                                                              │
│  Express + CORS + WebSocket (/ws for Mission Control)        │
│  Static files: dashboard/ (index.html, mission-control.html) │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       v
              ┌────────────────┐
              │  Track Router  │  gateway/track-router.js
              └────────┬───────┘
                       │
                       v
              ┌────────────────┐
              │ HATAKE Parser  │  agents/hatake-parser.js
              │                │
              │ 1. Detect intent (regex patterns)
              │ 2. Extract entities
              │ 3. Score complexity (1-10)
              │ 4. Choose track: fast | orchestrated
              │ 5. Suggest agents
              │ 6. Build structured brief
              └────────┬───────┘
                       │
            ┌──────────┴──────────┐
            │                     │
      brief.track              brief.track
      == "fast"                == "orchestrated"
            │                     │
            v                     v
  ┌──────────────────┐  ┌──────────────────────┐
  │ Resilient Handler│  │  Ed/RED Orchestrator  │
  │ (Fast Track)     │  │  (Orchestrated Track) │
  │                  │  │                       │
  │ resilient-       │  │ ed-red-               │
  │ handler.js       │  │ orchestrator.js       │
  └────────┬─────────┘  └──────────┬────────────┘
           │                       │
           v                       v
  ┌──────────────────┐  ┌──────────────────────┐
  │ Smart Router V2  │  │ Multi-Agent Plan      │
  │                  │  │                       │
  │ 1. Analyze task  │  │ 1. Create plan        │
  │ 2. Score models  │  │ 2. Delegate to ENG,   │
  │ 3. Check budget  │  │    RESEARCH, OPS,     │
  │ 4. Select best   │  │    FINANCE agents     │
  │                  │  │ 3. Execute steps      │
  │ selector-v2.js   │  │ 4. Validate (OPS)     │
  └────────┬─────────┘  │ 5. Assemble response  │
           │             └──────────┬────────────┘
           │                        │
           v                        │ (each step calls
  ┌──────────────────┐              │  Resilient Handler)
  │ Model Provider   │◄─────────────┘
  │                  │
  │ Ollama (local)   │  http://localhost:11434/api/generate
  │ Anthropic (cloud)│  https://api.anthropic.com/v1/messages
  └──────────────────┘
```

### 2. Fast Track (Simple Queries)

```
User: "What is 2+2?"
  │
  v
HATAKE: intent=simple_question, complexity=1, track=fast
  │
  v
Resilient Handler
  │
  v
Smart Router V2: taskType=simple, needsSpeed=true
  │ Score: llama3.1:8b = 134.5 (free + fast + chat capable)
  │ Score: claude-sonnet = -37.1 (expensive, not urgent)
  v
ollama/llama3.1:8b  -->  Response in 2-3s, cost $0
  │
  v
Cost Monitor: record request, update state.json
  │
  v
Response to user
```

### 3. Orchestrated Track (Complex Tasks)

```
User: "Build a REST API with authentication and database"
  │
  v
HATAKE: intent=complex_development, complexity=8, track=orchestrated
  │     suggested_agents=[ENG, OPS]
  v
Ed/RED Orchestrator
  │
  ├─ Step 1: ENG agent  -->  "Design the API architecture"
  │  (qwen2.5-coder:7b, 3-4 min)
  │
  ├─ Step 2: ENG agent  -->  "Implement auth + DB code"
  │  (qwen2.5-coder:7b, 3-4 min)
  │
  ├─ Step 3: OPS agent  -->  "Validate and review"
  │  (llama3.1:8b, 2-3s)
  │
  v
Assemble final response from all steps
  │
  v
Response to user (total: 7-10 min, cost $0)
```

### 4. Resilience & Retry Flow

```
Request
  │
  v
Attempt 1  ──failed──>  Error Handler
  │                      │
  │                      v
  │                    Recovery strategy:
  │                    - retry (same model)
  │                    - fast-model (fallback to llama3.1:8b)
  │                    - alternative-model (random local)
  │                    - force-ollama (budget issue)
  │                      │
  │                      v
Attempt 2  ──failed──>  Wait 4s, try again
  │                      │
  │                      v
Attempt 3  ──failed──>  Return fallback response
  │                      (never crashes, always responds)
  v
Success  -->  Track cost  -->  Return to user
```

### 5. Telegram Bot Routing

```
Telegram User
  │
  ├─ DM to @RedinsideBot      -->  agentId: main
  ├─ DM to @ZenRedBot         -->  agentId: allrounder
  ├─ DM to @ENGRED_BOT        -->  agentId: eng
  ├─ DM to @RESEARCHRED_BOT   -->  agentId: research
  ├─ DM to @FINANCERED_BOT    -->  agentId: finance
  ├─ DM to @OPSRED_BOT        -->  agentId: ops
  └─ DM to @INFOSECRED_BOT    -->  agentId: infosec
        │
        v
  Telegram Bridge  -->  POST http://localhost:19000/api/chat
        │                { agentId, message }
        v
  Gateway processes (same flow as above)
        │
        v
  Bridge sends response back to Telegram chat
```

### 6. Model Selection Logic (Smart Router V2)

```
                    ┌─────────────────────────┐
                    │   Analyze Requirements   │
                    │                         │
                    │ - taskType: simple |     │
                    │   code | complex |       │
                    │   general                │
                    │ - urgent: true/false     │
                    │ - needsSpeed / Quality   │
                    │ - hasCode: true/false    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────v────────────┐
                    │   Score Each Model      │
                    │                         │
                    │ +100  free (local)       │
                    │ +50   fast + urgent      │
                    │ +40   code + code-model  │
                    │ +35   complex + reasoning │
                    │ +30   high quality       │
                    │ -50   paid + not urgent  │
                    │ -100  expensive + casual │
                    │ +100  urgent + instant   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────v────────────┐
                    │   Available Models      │
                    │                         │
                    │ llama3.1:8b       $0    │
                    │   fast, chat, simple    │
                    │                         │
                    │ qwen2.5-coder:7b  $0    │
                    │   slow, code, technical │
                    │                         │
                    │ glm-4.7-flash     $0    │
                    │   v.slow, complex,      │
                    │   analysis, reasoning   │
                    │                         │
                    │ claude-sonnet-4.5 $0.003│
                    │   instant, all tasks    │
                    │                         │
                    │ claude-haiku-4.5  $0.0005│
                    │   instant, chat, simple │
                    └────────────┬────────────┘
                                 │
                    ┌────────────v────────────┐
                    │   Budget Gate           │
                    │                         │
                    │ if cost > 0 AND         │
                    │   remaining < cost:     │
                    │   force llama3.1:8b     │
                    └─────────────────────────┘
```

---

## Use Cases

### UC1: Simple Chat via Telegram

**Actor:** User via @RedinsideBot
**Flow:** User sends "What's the weather like?" → Bridge → Gateway → HATAKE (simple_question, fast track) → llama3.1:8b → Response in 2-3s

```bash
# Equivalent API call:
curl -X POST http://localhost:19000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"main","message":"What is the weather like?"}'
```

### UC2: Code Generation

**Actor:** User via @ENGRED_BOT or API
**Flow:** User sends "Write a Python binary search" → HATAKE (code_generation, fast track) → qwen2.5-coder:7b → Response in 3-4 min

```bash
curl -X POST http://localhost:19000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"eng","message":"Write a Python binary search tree with AVL balancing"}'
```

### UC3: Complex Multi-Agent Task

**Actor:** User via API
**Flow:** User sends "Build a REST API with auth and database" → HATAKE (complex_development, orchestrated track) → Ed/RED creates plan → ENG designs → ENG implements → OPS validates → assembled response

```bash
curl -X POST http://localhost:19000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"eng","message":"Build a REST API with JWT authentication and PostgreSQL database"}'
```

### UC4: Project Management via Kanban

**Actor:** Project manager via API
**Flow:** Create cards, assign to agents, track progress, add comments

```bash
# Create a card
curl -X POST http://localhost:19000/api/kanban/cards \
  -H 'Content-Type: application/json' \
  -d '{"title":"Implement auth","description":"Add JWT auth to API","config":{"priority":"high","assignee":"eng"}}'

# Move to In Progress
curl -X POST http://localhost:19000/api/kanban/cards/CARD_ID/move \
  -H 'Content-Type: application/json' \
  -d '{"column":"inProgress"}'

# View board
curl http://localhost:19000/api/kanban/board
```

### UC5: CEO Delegation

**Actor:** CEO agent via API
**Flow:** Create task → Assign to agent → Spawn secretary to monitor progress

```bash
# Create task
curl -X POST http://localhost:19000/api/ceo/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Deploy v2.0","description":"Complete deployment checklist","config":{"priority":"urgent"}}'

# Spawn secretary to monitor
curl -X POST http://localhost:19000/api/ceo/secretaries \
  -H 'Content-Type: application/json' \
  -d '{"task":{"title":"Monitor deploy","description":"Track deployment","assignee":"eng"},"config":{"role":"monitor","maxRounds":10}}'
```

### UC6: Cost Monitoring

**Actor:** Admin via API or Dashboard
**Flow:** Check spending, view per-model/per-agent breakdown, monitor budget

```bash
# Total cost summary
curl http://localhost:19000/api/cost

# By model
curl http://localhost:19000/api/cost/by-model

# By agent
curl http://localhost:19000/api/cost/by-agent
```

### UC7: System Health & Resilience

**Actor:** DevOps / Admin
**Flow:** Check health, view error stats, inspect tickets

```bash
# Health check
curl http://localhost:19000/health

# Error statistics
curl http://localhost:19000/api/resilience/errors

# DevOps health summary
curl http://localhost:19000/api/resilience/health

# Handler performance stats
curl http://localhost:19000/api/resilience/stats

# Open tickets (auto-created by error handler)
curl http://localhost:19000/api/tickets/open
```

### UC8: Background Task Scheduling

**Actor:** System or Admin
**Flow:** Schedule a task for background processing

```bash
# Schedule a task
curl -X POST http://localhost:19000/api/scheduler/schedule \
  -H 'Content-Type: application/json' \
  -d '{"description":"Nightly report","message":"Generate daily summary","agentId":"main","priority":"normal"}'

# Check queue
curl http://localhost:19000/api/scheduler/queue
```

---

## Agents

| Agent | Telegram Bot | Role | Default Model |
|-------|-------------|------|---------------|
| `main` | @RedinsideBot | General-purpose assistant, CEO coordinator | llama3.1:8b |
| `allrounder` | @ZenRedBot | Balanced multi-task, research & drafts | llama3.1:8b |
| `eng` | @ENGRED_BOT | Code generation, debugging, architecture | qwen2.5-coder:7b |
| `research` | @RESEARCHRED_BOT | Information gathering, analysis | llama3.1:8b |
| `finance` | @FINANCERED_BOT | Financial analysis, portfolio tracking | llama3.1:8b |
| `ops` | @OPSRED_BOT | QA, validation, security checks | llama3.1:8b |
| `infosec` | @INFOSECRED_BOT | Security & compliance | llama3.1:8b |

---

## API Reference

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send message to agent (body: `{agentId, message}`) |
| `GET` | `/health` | Health check + uptime + cost state |
| `GET` | `/api/status` | System status, available models, features |
| `GET` | `/api/cost` | Cost summary (today's total, by model, remaining budget) |
| `GET` | `/api/cost/by-model` | Cost breakdown by model |
| `GET` | `/api/cost/by-agent` | Cost breakdown by agent |

### Kanban Board

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/kanban/board` | Full board with all columns |
| `GET` | `/api/kanban/stats` | Board statistics |
| `POST` | `/api/kanban/cards` | Create card (body: `{title, description, config}`) |
| `GET` | `/api/kanban/cards/:id` | Get single card |
| `POST` | `/api/kanban/cards/:id/move` | Move card (body: `{column}`) |
| `PATCH` | `/api/kanban/cards/:id` | Update card fields |
| `POST` | `/api/kanban/cards/:id/comments` | Add comment (body: `{author, text}`) |
| `GET` | `/api/kanban/search?q=` | Search cards by text |
| `GET` | `/api/kanban/blocked` | List blocked cards |
| `GET` | `/api/kanban/overdue` | List overdue cards |

### CEO Agent

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ceo/dashboard` | CEO dashboard overview |
| `POST` | `/api/ceo/tasks` | Create task (body: `{title, description, config}`) |
| `GET` | `/api/ceo/tasks` | List all tasks |
| `POST` | `/api/ceo/tasks/:id/assign` | Assign task (body: `{agentId}`) |
| `POST` | `/api/ceo/secretaries` | Spawn secretary (body: `{task, config}`) |
| `GET` | `/api/ceo/secretaries` | List active secretaries |

### Autonomous Learning

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/learning/experience` | Record experience (body: `{agentId, task, result, metadata}`) |
| `GET` | `/api/learning/:agent/summary` | Agent learning summary |
| `GET` | `/api/learning/summaries` | All agent summaries |
| `POST` | `/api/learning/:agent/cycle` | Trigger learning cycle |
| `GET` | `/api/learning/knowledge/:topic` | Query knowledge base |

### Resilience & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/resilience/errors` | Error handler statistics |
| `GET` | `/api/resilience/health` | DevOps agent health summary |
| `GET` | `/api/resilience/stats` | Handler performance stats |

### Ticket System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tickets` | All tickets + stats |
| `GET` | `/api/tickets/open` | Open tickets |
| `GET` | `/api/tickets/assignee/:assignee` | Tickets by assignee |
| `GET` | `/api/tickets/priority/:priority` | Tickets by priority |
| `GET` | `/api/tickets/stats` | Ticket statistics |
| `PATCH` | `/api/tickets/:id` | Update ticket |
| `POST` | `/api/tickets/:id/close` | Close ticket (body: `{resolution}`) |

### Task Scheduler

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scheduler/schedule` | Schedule task (body: `{description, message, agentId, priority}`) |
| `GET` | `/api/scheduler/status` | Scheduler status |
| `GET` | `/api/scheduler/queue` | View queue, processing, completed, failed |

### WebSocket

| Path | Description |
|------|-------------|
| `ws://localhost:19000/ws` | Mission Control real-time feed (metrics every 5s) |

---

## Project Structure

```
openclaw-redos/
│
├── gateway/
│   ├── server.js                  # Express + WebSocket server (port 19000)
│   ├── track-router.js            # Routes to fast or orchestrated track
│   ├── resilient-handler.js       # Fast track: retry, fallback, model calls
│   └── enhanced-handler.js        # Legacy handler (v1, uses CLI)
│
├── agents/
│   ├── hatake-parser.js           # Intent detection, complexity scoring, brief creation
│   ├── ed-red-orchestrator.js     # Multi-agent plan/delegate/validate/assemble
│   ├── ceo-agent.js               # CEO tasks + secretary sub-agents
│   └── hatake/sessions/           # HATAKE session state
│
├── smart-router/
│   ├── analyzer.js                # Task complexity analysis (v1)
│   ├── selector.js                # Model selection (v1)
│   └── selector-v2.js             # Model scoring, budget gate, perf tracking
│
├── telegram/
│   ├── telegram-bridge.js         # 7-bot Telegram integration
│   └── update-offset-*.json       # Per-bot polling offsets
│
├── resilience/
│   ├── error-handler.js           # Recovery strategies (retry, fallback, force-ollama)
│   ├── devops-agent.js            # Continuous health monitoring
│   └── ticket-system.js           # Auto-created issue tracking
│
├── cost-monitor/
│   ├── monitor.js                 # Real-time cost tracking
│   └── state.json                 # Persisted cost state
│
├── kanban/
│   ├── board.js                   # Kanban board logic (columns, cards, comments)
│   └── board-state.json           # Persisted board state
│
├── learning/
│   ├── autonomous-learner.js      # Experience → Reflect → Evaluate → Learn → Adapt
│   └── learning-state.json        # Persisted learning state
│
├── scheduler/
│   └── task-scheduler.js          # Background task queue processing
│
├── dashboard/
│   ├── index.html                 # Cost dashboard UI
│   ├── mission-control.html       # Mission Control UI (full system view)
│   └── mission-control.js         # Mission Control logic + WebSocket client
│
├── backup/
│   ├── gdrive-backup.sh           # Google Drive backup script
│   └── gdrive-restore.sh          # Google Drive restore script
│
├── cron/
│   ├── jobs.json                  # Scheduled cron job definitions
│   └── runs/                      # Cron execution logs (.jsonl)
│
├── memory/
│   ├── main.sqlite                # Main agent conversation memory
│   └── allrounder.sqlite          # Allrounder agent conversation memory
│
├── workspace/                     # Shared workspace (docs, skills, config)
│   ├── config/
│   │   ├── budget-guardrails.json # Budget limits and guardrails
│   │   ├── model-registry.json    # Full model registry
│   │   ├── routing-profiles.json  # Routing configuration
│   │   └── mcporter.json          # MCP server configs (exa, reddit, github)
│   ├── skills/                    # 20 agent skills (hatake-parser, smart-router, etc.)
│   ├── ORG_STRUCTURE.md           # RED/ZEN org roles & change control policy
│   ├── ARCHITECTURE.md            # Full system architecture reference
│   ├── start_all.sh               # Start all AgentOS services
│   └── stop_all.sh                # Stop all services
│
├── workspace-main/                # Main agent workspace
├── workspace-allrounder/          # Allrounder agent workspace
├── workspace-eng/                 # Engineering agent workspace
├── workspace-research/            # Research agent workspace
├── workspace-finance/             # Finance agent workspace
├── workspace-ops/                 # Ops agent workspace
├── workspace-infosec/             # Infosec agent workspace
│
├── subagents/runs.json            # Sub-agent execution log
├── credentials/                   # Telegram auth (allowFrom, pairing)
├── devices/                       # Device pairing state
├── identity/                      # Device identity + auth
├── sandbox/containers.json        # Sandbox container registry
├── sandboxes/                     # Per-agent sandbox directories
├── canvas/index.html              # Canvas UI
├── completions/                   # Shell completions (bash, zsh, fish, ps1)
│
├── upgrade.sh                     # Safe upgrade manager (CLI + RedOS)
├── start-resilient.sh             # Start gateway + telegram bridge
├── QUICK_START.sh                 # First-time setup script
├── .env.example                   # Environment variable template
├── openclaw.json                  # Runtime config (gitignored)
└── package.json                   # Node.js dependencies & scripts
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start gateway on port 19000 |
| `npm run telegram` | Start Telegram bridge (7 bots) |
| `npm run backup` | Backup to Google Drive |
| `npm run restore` | Restore from Google Drive |
| `bash start-resilient.sh` | Start gateway + bridge together (background) |
| `bash QUICK_START.sh` | First-time setup (deps, Ollama check, backups) |
| `npm run upgrade:check` | Check for updates (CLI + RedOS) |
| `npm run upgrade:cli` | Upgrade official OpenClaw CLI only |
| `npm run upgrade` | Upgrade RedOS code (git pull + restart) |
| `npm run upgrade:all` | Upgrade everything safely |

---

## Upgrading

Two independent systems to keep up-to-date:

### 1. Official OpenClaw CLI (safe, no impact on RedOS)

```bash
npm run upgrade:cli
# or directly: npm update -g openclaw
```

Only updates `/opt/homebrew/lib/node_modules/openclaw/`. Your RedOS code, configs, secrets, and running services are **not touched**.

### 2. RedOS Code (git pull + auto-restart)

```bash
npm run upgrade
```

This will: backup → stop services → `git pull` → `npm install` → restart → verify health. Auto-rolls back if gateway fails to start.

### 3. Check for Updates (no changes)

```bash
npm run upgrade:check
```

Shows current versions, available updates, and system health.

### 4. Upgrade Everything

```bash
npm run upgrade:all
```

Runs backup → CLI upgrade → RedOS upgrade in sequence.

---

## Configuration

All secrets are stored in `.env` (never committed). See `.env.example` for the full list:

- **Telegram bot tokens** (7 bots)
- **API keys** (ZAI, Perplexity, GitHub PAT)
- **Gateway auth token**
- **Ollama host URL**
- **Budget limits**

Runtime configuration lives in `openclaw.json` (also gitignored). It defines:
- Gateway settings (port, auth)
- Ollama model configuration
- Agent definitions (7 agents with system prompts)
- Third-party service configs
- Budget and feature flags

Workspace-level config in `workspace/config/`:
- `budget-guardrails.json` — spending limits
- `model-registry.json` — full model catalog
- `routing-profiles.json` — routing rules
- `mcporter.json` — MCP server connections (Exa, Reddit, GitHub)

---

## Key Systems

### HATAKE Parser
Converts raw user messages into structured briefs. Uses regex pattern matching to detect intent across 4 categories (simple, code, research, complex). Scores complexity 1-10, selects track (fast vs orchestrated), and suggests which specialist agents to involve.

### Track Router
Entry point for all `/api/chat` requests. Receives HATAKE's brief and dispatches to either:
- **Fast Track** → Resilient Handler → Smart Router V2 → single model call
- **Orchestrated Track** → Ed/RED Orchestrator → multi-step plan with multiple agents

Falls back to fast track if orchestration fails.

### Ed/RED Orchestrator
Front controller for complex tasks. Creates execution plans, delegates steps to specialist agents (ENG, RESEARCH, OPS, FINANCE), validates results through an OPS gate, and assembles the final response. Each step internally uses the Resilient Handler.

### Smart Router V2
Scores all available models against task requirements. Heavily favors free local models (+100 score) and penalizes paid models when not urgent (-50 to -100). Includes a budget gate that forces `llama3.1:8b` when budget is exhausted.

### Resilience Layer
- **Resilient Handler** — 3-retry loop with exponential backoff. Never crashes; returns a helpful fallback response if all attempts fail.
- **Error Handler** — Classifies errors and selects recovery strategy (retry, switch model, force free model).
- **DevOps Agent** — Continuous health monitoring, auto-creates tickets for issues. Checks for CLI and RedOS upgrades every 6 hours and auto-creates tickets when updates are available.
- **Ticket System** — Internal issue tracking with priority, assignee, and resolution workflow.

### Autonomous Learning
```
Experience --> Reflect --> Evaluate --> Learn --> Adapt
```
Records every interaction. After every 5 experiences, triggers a learning cycle: reflects on patterns, evaluates performance (0-100 score), generates adaptations, and updates the knowledge base. State persisted in `learning/learning-state.json`.

### Cost Monitor
Tracks every request: agent, model, tokens, cost, latency. Persists state to `cost-monitor/state.json`. Provides budget remaining calculation. Broadcasts metrics to Mission Control via WebSocket every 5 seconds.

---

## Troubleshooting

```bash
# Health check
curl http://localhost:19000/health

# Check port conflicts
lsof -i :19000

# Restart gateway
pkill -f "node gateway/server.js" && npm start

# Check Ollama is running
curl http://localhost:11434/api/tags

# View gateway logs
tail -f /tmp/openclaw-gateway.log

# View telegram bridge logs
tail -f /tmp/telegram-bridge.log

# View error logs
tail -f ~/.openclaw/logs/errors.jsonl

# Check system status via API
curl http://localhost:19000/api/status

# Check resilience health
curl http://localhost:19000/api/resilience/health
```

---

## Documentation

| File | Description |
|------|-------------|
| [ARCHITECTURE_ANALYSIS.md](./ARCHITECTURE_ANALYSIS.md) | Detailed architecture analysis & evolution plan |
| [RESILIENT_SYSTEM.md](./RESILIENT_SYSTEM.md) | Resilience layer documentation |
| [HATAKE_PROMPT_ENGINEERING.md](./HATAKE_PROMPT_ENGINEERING.md) | HATAKE prompt engineering details |
| [TELEGRAM_DEMO_GUIDE.md](./TELEGRAM_DEMO_GUIDE.md) | Telegram demo walkthrough |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Full setup instructions |
| [workspace/ARCHITECTURE.md](./workspace/ARCHITECTURE.md) | Full AgentOS architecture reference |
| [workspace/ORG_STRUCTURE.md](./workspace/ORG_STRUCTURE.md) | RED/ZEN org roles & change control policy |

---

## License

Private project. All rights reserved.
