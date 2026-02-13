# OpenClaw RedOS

Multi-agent AI orchestration system with intelligent routing, self-healing resilience, and Telegram integration.

| | |
|---|---|
| **Version** | 3.5.0 |
| **Runtime** | Node.js 22+ (ESM) |
| **Models** | Ollama (local) + Anthropic (cloud fallback) |
| **Interface** | Telegram bots, REST API, WebSocket dashboard |

---

## Architecture

```
Telegram (7 bots)
       |
       v
+--------------------------+
|    Telegram Bridge       |  telegram/telegram-bridge.js
+-----------+--------------+
            |
            v
+--------------------------+
|   Resilient Gateway      |  gateway/server.js  (port 19000)
|   + WebSocket + CORS     |  gateway/resilient-handler.js
+-----------+--------------+
            |
     +------+------+
     |             |
     v             v
+----------+  +----------+
| HATAKE   |  | Ed/RED   |  agents/hatake-parser.js
| Parser   |  | Orchestr.|  agents/ed-red-orchestrator.js
+----+-----+  +----------+
     |
     v
+------------------+
| Smart Router v2  |  smart-router/analyzer.js
| Task Analysis    |  smart-router/selector-v2.js
| Model Selection  |
+--------+---------+
         |
    +----+----+----+----+
    |    |    |    |    |
    v    v    v    v    v
  llama qwen  glm  ...  claude
  3.1   2.5  4.7       (fallback)
  :8b  coder flash
```

### Agents

| Agent | Bot | Role |
|-------|-----|------|
| `main` | @RedinsideBot | General-purpose assistant |
| `allrounder` | @ZenRedBot | Balanced multi-task agent |
| `eng` | @ENGRED_BOT | Code generation & engineering |
| `research` | @RESEARCHRED_BOT | Information gathering |
| `finance` | @FINANCERED_BOT | Financial analysis |
| `ops` | @OPSRED_BOT | Quality assurance & validation |
| `infosec` | @INFOSECRED_BOT | Security & compliance |

### Model Selection

| Condition | Model | Latency | Cost |
|-----------|-------|---------|------|
| Complexity <= 5 | `llama3.1:8b` | 2-3s | $0 |
| Complexity >= 6 | `glm-4.7-flash` | 5-6min | $0 |
| Code tasks | `qwen2.5-coder:7b` | 3-4min | $0 |
| Urgent + budget | `claude-sonnet-4.5` | 1-2s | ~$0.003 |

---

## Quick Start

### Prerequisites

- **Node.js** 22+
- **Ollama** running at `http://localhost:11434`
- Ollama models pulled: `llama3.1:8b`, `qwen2.5-coder:7b`, `glm-4.7-flash`

### Setup

```bash
# 1. Clone
git clone https://github.com/redinside-dev/openclaw-redos.git
cd openclaw-redos

# 2. Install dependencies
npm install

# 3. Configure secrets
cp .env.example .env
# Edit .env with your Telegram bot tokens, API keys, etc.

# 4. Start gateway
npm start

# 5. Start Telegram bridge (separate terminal)
npm run telegram
```

Dashboard: [http://localhost:19000](http://localhost:19000)

---

## API Reference

### Chat

```bash
curl -X POST http://localhost:19000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"main","message":"What is 2+2?"}'
```

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send message to agent |
| `GET` | `/health` | Health check |
| `GET` | `/api/status` | System status |
| `GET` | `/api/cost` | Cost summary |
| `GET` | `/api/cost/by-model` | Cost breakdown by model |
| `GET` | `/api/cost/by-agent` | Cost breakdown by agent |

### Kanban Board

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/kanban/board` | Full board |
| `GET` | `/api/kanban/stats` | Board statistics |
| `POST` | `/api/kanban/cards` | Create card |
| `GET` | `/api/kanban/cards/:id` | Get card |
| `POST` | `/api/kanban/cards/:id/move` | Move card |
| `PATCH` | `/api/kanban/cards/:id` | Update card |
| `POST` | `/api/kanban/cards/:id/comments` | Add comment |
| `GET` | `/api/kanban/search?q=` | Search cards |

### CEO Agent

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ceo/dashboard` | CEO dashboard |
| `POST` | `/api/ceo/tasks` | Create task |
| `GET` | `/api/ceo/tasks` | List tasks |
| `POST` | `/api/ceo/tasks/:id/assign` | Assign task |
| `POST` | `/api/ceo/secretaries` | Spawn secretary sub-agent |
| `GET` | `/api/ceo/secretaries` | List active secretaries |

### Learning

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/learning/experience` | Record experience |
| `GET` | `/api/learning/:agent/summary` | Agent learning summary |
| `GET` | `/api/learning/summaries` | All summaries |
| `POST` | `/api/learning/:agent/cycle` | Trigger learning cycle |
| `GET` | `/api/learning/knowledge/:topic` | Query knowledge base |

---

## Project Structure

```
openclaw-redos/
|
|-- gateway/
|   |-- server.js                # Express + WebSocket server
|   |-- resilient-handler.js     # Request handler with retry/fallback
|   +-- track-router.js          # HATAKE-integrated routing
|
|-- agents/
|   |-- hatake-parser.js         # Intent detection & prompt engineering
|   |-- ed-red-orchestrator.js   # Multi-agent task orchestration
|   +-- ceo-agent.js             # CEO + secretary sub-agents
|
|-- smart-router/
|   |-- analyzer.js              # Task complexity analysis
|   |-- selector.js              # Model selection engine
|   +-- selector-v2.js           # V2 with cost optimization
|
|-- telegram/
|   +-- telegram-bridge.js       # 7-bot Telegram integration
|
|-- resilience/
|   |-- error-handler.js         # Error recovery strategies
|   |-- devops-agent.js          # System health monitoring
|   +-- ticket-system.js         # Internal issue tracking
|
|-- cost-monitor/
|   +-- monitor.js               # Real-time cost tracking
|
|-- kanban/
|   +-- board.js                 # Kanban board logic
|
|-- learning/
|   +-- autonomous-learner.js    # Self-improving learning system
|
|-- scheduler/
|   +-- task-scheduler.js        # Background task processing
|
|-- dashboard/
|   +-- mission-control.js       # Mission Control web UI
|
|-- backup/
|   |-- gdrive-backup.sh         # Google Drive backup
|   +-- gdrive-restore.sh        # Google Drive restore
|
|-- workspace*/                  # Per-agent workspace directories
|-- .env.example                 # Configuration template
+-- package.json
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start gateway on port 19000 |
| `npm run telegram` | Start Telegram bridge (7 bots) |
| `npm run backup` | Backup to Google Drive |
| `npm run restore` | Restore from Google Drive |

---

## Configuration

All secrets are stored in `.env` (never committed). See `.env.example` for the full list:

- **Telegram bot tokens** (7 bots)
- **API keys** (ZAI, Perplexity, GitHub)
- **Gateway auth token**
- **Budget limits**

Runtime configuration lives in `openclaw.json` (also gitignored). See `.env.example` for all required environment variables.

---

## Key Systems

### HATAKE Parser
Analyzes incoming messages for intent, complexity, and type. Engineers optimized prompts for each specialist agent and selects the best model.

### Ed/RED Orchestrator
Front controller that creates execution plans, delegates to specialist agents, handles retries, and assembles final responses.

### Resilience Layer
- **Error Handler** - Recovery strategies with exponential backoff
- **DevOps Agent** - Continuous health monitoring
- **Ticket System** - Internal issue tracking and resolution

### Autonomous Learning
```
Experience --> Reflect --> Evaluate --> Learn --> Adapt
```
Triggers automatically after every 5 interactions. Agents self-improve by analyzing patterns and updating their knowledge base.

---

## Troubleshooting

```bash
# Check if gateway is running
curl http://localhost:19000/health

# Check port conflicts
lsof -i :19000

# Restart gateway
pkill -f "node gateway/server.js" && npm start

# Check Ollama
curl http://localhost:11434/api/tags

# View logs
tail -f /tmp/openclaw-gateway.log
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

---

## License

Private project. All rights reserved.
