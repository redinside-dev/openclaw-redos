# RedOS

**RedOS** is a customization layer on top of the [OpenClaw](https://openclaw.ai) AI assistant platform.

OpenClaw provides the entire base runtime — gateway, agent runtime, channel integrations (Telegram, WhatsApp, Gmail), skill system, MCP support, memory, browser control, and WebSocket API. RedOS adds the business logic, agent identities, routing intelligence, and domain-specific skills that make this system work for this use case.

> **RedOS does not run its own server.** There is no custom Express gateway, no custom Telegram bridge, no second process. Everything runs inside the OpenClaw runtime.

| | |
|---|---|
| **Base platform** | OpenClaw CLI 2026.2.14 |
| **Host** | Mac Mini (macOS, ARM64) |
| **Gateway** | `ws://127.0.0.1:18789` — launchd `ai.openclaw.gateway` |
| **Models** | Ollama (local, free) · openai-codex/gpt-5.2 · moonshot/kimi-k2.5 · zai/glm-4.7 |
| **Channels** | Telegram (8 bots) · WhatsApp · Gmail |
| **Skills** | 20 custom skills in `workspace/skills/` |
| **MCP servers** | Exa search · Reddit · GitHub |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER CHANNELS                             │
│                                                                  │
│  Telegram (8 bots)   WhatsApp   Gmail   CLI   WebSocket client   │
└───────────────────────────┬──────────────────────────────────────┘
                            │  (OpenClaw manages all channel I/O)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              OPENCLAW GATEWAY  (port 18789)                      │
│              OpenClaw CLI 2026.2.14 — launchd managed            │
│                                                                  │
│  WebSocket + agent runtime + plugin system + skill executor      │
│  Memory (SQLite) · Browser control · Cron · Heartbeat            │
└───────────────────────────┬──────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌─────────────┐ ┌─────────────┐ ┌───────────────┐
     │   SKILLS    │ │  MCP TOOLS  │ │  AGENT CONFIG  │
     │             │ │             │ │  (RedOS layer) │
     │ hatake-     │ │ exa (web    │ │                │
     │  parser     │ │  search)    │ │  8 agents:     │
     │ smart-      │ │ reddit      │ │  main (RED)    │
     │  router     │ │ github      │ │  allrounder    │
     │ cost-tracker│ │             │ │  hatake        │
     │ retry-      │ └─────────────┘ │  eng           │
     │  cascade    │                 │  research      │
     │ reflect-    │                 │  finance       │
     │  learn      │                 │  ops           │
     │ + 15 more   │                 │  infosec       │
     └─────────────┘                 └───────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                         MODEL TIER                               │
│                                                                  │
│  Tier 1 — Free local (Ollama):                                   │
│    llama3.1:8b · qwen2.5-coder:7b · gpt-oss:20b                 │
│                                                                  │
│  Tier 2 — PAYG (primary cloud fallback):                         │
│    zai/glm-4.7 · zai/glm-4.7-flashx                             │
│    moonshot/kimi-k2.5 (inactive — no subscription yet)           │
│                                                                  │
│  Tier 3 — Subscription (zero marginal cost):                     │
│    perplexity/sonar · sonar-pro · sonar-reasoning                │
│                                                                  │
│  Tier 4–5 — Subscription (primary agents):                       │
│    openai-codex/gpt-5.2 · claude-code/sonnet-4.5                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## How RedOS Extends OpenClaw

RedOS customizes OpenClaw through three mechanisms — all native to OpenClaw:

### 1. Skills (`workspace/skills/`)

Skills are declarative instructions that tell agents **how to think and act**. Each skill is a `SKILL.md` file — no custom server or code needed. OpenClaw's runtime reads skills and applies them during agent execution.

| Skill | Purpose |
|-------|---------|
| `hatake-parser` | Parse raw commands into structured JSON briefs (intent, type, complexity, departments) |
| `smart-router` | Select optimal model per task (quality/speed/cost scoring against model registry) |
| `cost-tracker` | Track API costs, enforce budget limits, log every model call |
| `retry-cascade` | Retry failed calls with model fallback chain |
| `reflect-learn` | After each session, reflect on what worked, adapt future routing |
| `eng-coding` | Engineering agent: code generation, debugging, architecture |
| `holdings-analyzer` | Finance agent: portfolio analysis, P&L, position sizing |
| `task-runner` | Run background tasks, schedule work, manage queues |
| `status-reporter` | Report system health, active agents, cost summary |
| `exa-mcp` | Web search via Exa MCP integration |
| `mission-control-telegram` | Telegram admin commands for agents |
| `proactive-agent-1-2-4` | Proactive 1-2-4 escalation framework |
| `ai-humanizer` | Make agent responses more natural |
| `summarize` | Summarize long documents or threads |
| `x-mirror` | Mirror content to X/Twitter |
| `agent-autonomy-kit` | Framework for autonomous multi-step task execution |
| `model-usage` | Track per-model usage and performance stats |
| `anurag-briefs` | Brief generation for business communications |
| `clawdhub` | ClawDhub integration |

### 2. MCP Servers (`workspace/config/mcporter.json`)

External tools injected directly into agent context — no custom integration code:

| MCP | Provides |
|-----|---------|
| **Exa** (`mcp.exa.ai`) | Web search, company research, people search, deep research, code context |
| **Reddit** (local script) | Reddit post/comment browsing |
| **GitHub** (`api.githubcopilot.com/mcp/`) | Repo management, PR reviews, issue tracking |

### 3. Agent Configuration (`openclaw.json`)

Agents are defined in `openclaw.json` — this is where RedOS personality, model assignments, and Telegram bindings live:

| Agent | Identity | Telegram Bot | Primary Model | Role |
|-------|---------|-------------|--------------|------|
| `main` | RED (CEO) | @RedinsideBot | openai-codex/gpt-5.2 | General-purpose, delegation, decision-making |
| `allrounder` | ZEN (CSO) | @ZenRedBot | openai-codex/gpt-5.2 | Fast research, finance, drafts |
| `hatake` | HATAKE (Parser) | _(local-only)_ | ollama/qwen2.5-coder:7b | Intent parsing, brief creation |
| `eng` | ENG | @ENGRED_BOT | ollama/qwen2.5-coder:7b | Code generation, debugging, architecture |
| `research` | RESEARCH | @RESEARCHRED_BOT | openai-codex/gpt-5.2 | Information gathering, web analysis |
| `finance` | FINANCE | @FINANCERED_BOT | openai-codex/gpt-5.2 | Financial analysis, portfolio tracking |
| `ops` | OPS | @OPSRED_BOT | openai-codex/gpt-5.2 | QA, validation, health checks |
| `infosec` | INFOSEC | @INFOSECRED_BOT | openai-codex/gpt-5.2 | Security, compliance, threat analysis |

---

## Request Flow

Every message — from Telegram, WhatsApp, CLI, or cron — follows this path:

```
User sends message to any channel
        │
        ▼
OpenClaw Gateway receives (port 18789)
        │
        ▼
Channel binding → Agent selected (e.g. Telegram @ENGRED_BOT → agent: eng)
        │
        ▼
hatake-parser SKILL activates
  → Classifies: type, complexity, departments_needed, needs_web, needs_code
  → Outputs structured JSON brief
        │
        ▼
smart-router SKILL activates
  → Reads brief + routing-profiles.json + model-registry.json + today's cost
  → Selects model: cheapest tier that meets capability requirements
  → Applies budget gate: if spend > 90% of limit → force ollama (local_only profile)
        │
        ├── needs_web=true → Exa MCP / Reddit MCP activated
        ├── needs_code=true + complexity=complex → qwen2.5-coder:7b or Claude Code
        └── complexity=epic → orchestrate across multiple agents
        │
        ▼
Model call (Ollama / OpenAI Codex / Moonshot / ZAI)
        │
        ▼
retry-cascade SKILL: if failure → fallback chain → next model
cost-tracker SKILL: log tokens, cost, latency
reflect-learn SKILL: after session → adapt routing decisions
        │
        ▼
Response back to originating channel
```

---

## Model Selection Logic

Controlled by `workspace/skills/smart-router/SKILL.md` + `workspace/config/routing-profiles.json` + `workspace/config/model-registry.json`.

**Active profile:** `balanced` (quality 40% / speed 30% / cost 30%)

| Scenario | Selected Model |
|---------|--------------|
| Simple question, no code, no web | ollama/llama3.1:8b (free, fast) |
| Code task, moderate complexity | ollama/qwen2.5-coder:7b (free, capable) |
| Research task needing web search | perplexity/sonar via Exa MCP |
| Complex reasoning, no code | openai-codex/gpt-5.2 (subscription) |
| Agentic multi-file code task | openai-codex/gpt-5.2 or claude-code/sonnet-4.5 |
| Ollama fails, subscription unavailable | zai/glm-4.7 (primary PAYG fallback) |
| Very cheap fallback needed | zai/glm-4.7-flashx |
| Long context (>131K tokens, future) | moonshot/kimi-k2.5 _(inactive — no subscription)_ |
| Budget >90% exhausted | ollama/llama3.1:8b (forced) |

Switch routing profile via Telegram: `@RedinsideBot routing mode cost_saver`

---

## Routing Profiles

| Profile | Quality | Speed | Cost | Use When |
|---------|---------|-------|------|---------|
| `balanced` _(default)_ | 40% | 30% | 30% | Day-to-day use |
| `performance` | 70% | 20% | 10% | Critical deliverables |
| `cost_saver` | 20% | 30% | 50% | Budget tight |
| `local_only` | 30% | 50% | 20% | Offline / privacy |

---

## Project Structure

```
~/.openclaw/   ← this repo (RedOS customization layer)
│
├── workspace/
│   ├── skills/               ← RedOS custom skills (20 skills, all SKILL.md)
│   │   ├── hatake-parser/    ← Intent classification + brief generation
│   │   ├── smart-router/     ← Model selection algorithm
│   │   ├── cost-tracker/     ← Cost monitoring + budget enforcement
│   │   ├── retry-cascade/    ← Failure recovery + fallback chains
│   │   ├── reflect-learn/    ← Post-session reflection + adaptation
│   │   ├── eng-coding/       ← Engineering agent behavior
│   │   ├── holdings-analyzer/← Finance agent behavior
│   │   ├── task-runner/      ← Background task execution
│   │   ├── exa-mcp/          ← Web search via Exa
│   │   └── ...15 more skills
│   │
│   ├── config/
│   │   ├── mcporter.json       ← MCP server connections (Exa, Reddit, GitHub)
│   │   ├── model-registry.json ← All available models, capabilities, costs
│   │   ├── routing-profiles.json ← Routing profiles (balanced, cost_saver, etc.)
│   │   └── budget-guardrails.json ← Daily/monthly spend limits
│   │
│   ├── ORG_STRUCTURE.md      ← RED/ZEN org roles & change control policy
│   └── ARCHITECTURE.md       ← Full system architecture reference
│
├── workspace-main/           ← RED agent workspace (docs, context, tasks)
├── workspace-allrounder/     ← ZEN agent workspace
├── workspace-eng/            ← Engineering agent workspace
├── workspace-research/       ← Research agent workspace
├── workspace-finance/        ← Finance agent workspace
├── workspace-ops/            ← Ops agent workspace
├── workspace-infosec/        ← InfoSec agent workspace
│
├── agents/                   ← Legacy JS agent modules (pre-OpenClaw era)
│   ├── hatake-parser.js      ← Now replaced by workspace/skills/hatake-parser/
│   ├── ed-red-orchestrator.js← Now replaced by OpenClaw's native orchestration
│   └── ...                   ← Kept for reference; not actively invoked
│
├── gateway/                  ← Legacy custom Express server (pre-OpenClaw era)
│   └── server.js             ← Was port 19000; replaced by OpenClaw gateway 18789
│
├── smart-router/             ← Legacy model selector (pre-OpenClaw era)
│   └── selector-v2.js        ← Now replaced by workspace/skills/smart-router/
│
├── resilience/               ← Legacy error handling (pre-OpenClaw era)
│   └── ...                   ← Now handled by retry-cascade skill + OpenClaw native
│
├── openclaw.json             ← Agent config, model assignments, channel bindings (gitignored)
├── .env.example              ← Environment variable template
├── ai.openclaw.gateway.plist.example ← LaunchAgent template
├── KNOWLEDGEBASE.md          ← Full project context for LLMs/collaborators
└── upgrade.sh                ← Safe upgrade manager
```

**Note on legacy directories:** `gateway/`, `agents/`, `smart-router/`, and `resilience/` contain code from the pre-OpenClaw architecture (custom Express server on port 19000). They are kept for reference but are **not actively run**. Their logic has been replaced by OpenClaw's native runtime + RedOS skills.

---

## Operations

### Check gateway status
```bash
openclaw status          # Should show: reachable Xms · auth token
openclaw tui             # Full TUI dashboard
```

### Restart gateway
```bash
launchctl stop ai.openclaw.gateway
launchctl start ai.openclaw.gateway
sleep 3 && openclaw status
```

### View logs
```bash
tail -f ~/.openclaw/logs/gateway.log
tail -f ~/.openclaw/logs/gateway.err.log
```

### Upgrade OpenClaw CLI
```bash
npm install -g openclaw@latest
launchctl stop ai.openclaw.gateway && launchctl start ai.openclaw.gateway
openclaw status
```

### Change routing mode (via Telegram)
```
@RedinsideBot routing mode cost_saver
@RedinsideBot routing mode balanced
@RedinsideBot routing mode performance
```

---

## Configuration Files

| File | Purpose | In git? |
|------|---------|---------|
| `openclaw.json` | Agent definitions, model assignments, Telegram tokens, gateway config | No (secrets) |
| `~/Library/LaunchAgents/ai.openclaw.gateway.plist` | macOS service definition with env vars | No (secrets) |
| `ai.openclaw.gateway.plist.example` | Template (no secrets) | Yes |
| `.env.example` | Environment variable template | Yes |
| `workspace/config/model-registry.json` | Available models, capabilities, costs | Yes |
| `workspace/config/routing-profiles.json` | Routing profiles and weights | Yes |
| `workspace/config/mcporter.json` | MCP server connections | Yes |
| `workspace/config/budget-guardrails.json` | Spend limits | Yes |

### Three-Token Rule
`OPENCLAW_GATEWAY_TOKEN` must be **identical** in all three places:
1. Shell: `export OPENCLAW_GATEWAY_TOKEN=...` in `~/.zshrc`
2. Plist: `OPENCLAW_GATEWAY_TOKEN` in `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
3. Config: `gateway.auth.token` in `~/.openclaw/openclaw.json`

---

## Documentation

| File | Description |
|------|-------------|
| [KNOWLEDGEBASE.md](./KNOWLEDGEBASE.md) | **Start here** — Full project context, auth flow, known fixes, standard practices |
| [workspace/ARCHITECTURE.md](./workspace/ARCHITECTURE.md) | OpenClaw system architecture reference |
| [workspace/ORG_STRUCTURE.md](./workspace/ORG_STRUCTURE.md) | RED/ZEN org roles, change control, agent responsibilities |

---

## License

Private project. All rights reserved.
