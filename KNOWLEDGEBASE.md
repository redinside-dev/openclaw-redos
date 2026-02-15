# OpenClaw RedOS — Master Knowledgebase

---

## ⚠️ START HERE — READ THIS FIRST

**This is the single source of truth for the entire OpenClaw RedOS project.**

Whether you are Claude, GPT, Gemini, a human developer, or any collaborator — **before doing anything on this project, read this file in full.** It contains the complete context: architecture, configuration, authentication, all fixes applied, all decisions made, and everything that still needs to be done.

### Exact Paths

| What | Path |
|---|---|
| **This file (Knowledgebase)** | `/Users/redinside/.openclaw/KNOWLEDGEBASE.md` |
| **GitHub repository** | `https://github.com/redinside-dev/openclaw-redos.git` |
| **KNOWLEDGEBASE in GitHub** | `https://github.com/redinside-dev/openclaw-redos/blob/main/KNOWLEDGEBASE.md` |
| **State directory** | `/Users/redinside/.openclaw/` |
| **Live config** | `/Users/redinside/.openclaw/openclaw.json` |
| **launchd service** | `~/Library/LaunchAgents/ai.openclaw.gateway.plist` |
| **Gateway logs** | `/Users/redinside/.openclaw/logs/gateway.log` |
| **OpenClaw CLI** | `/opt/homebrew/lib/node_modules/openclaw/` |

### For LLMs / AI Assistants starting a new session

1. Read this file: `/Users/redinside/.openclaw/KNOWLEDGEBASE.md`
2. Run `openclaw status` to check the current state of the gateway
3. Check `git log --oneline -5` to see recent commits
4. Look at `git status` to see any uncommitted work
5. Then proceed — you now have full context

### For Human Developers / Collaborators

Clone the repo:
```bash
git clone https://github.com/redinside-dev/openclaw-redos.git ~/.openclaw
```
Then read this file. The `openclaw.json` (live secrets) and `identity/` (device keys) are not in git — you will need to be provided those separately for a live environment.

### Mandate: Keep This File Updated

> **After every significant change — whether you are an AI assistant or a human — update this KNOWLEDGEBASE.md and commit it.** No change should be made to this project without a corresponding entry here. This ensures zero context loss between sessions.

---

> **Single source of truth** for architecture, configuration, fixes, and operational procedures.
> Updated: 2026-02-15 | Version: OpenClaw 2026.2.14 + RedOS 3.6.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Layers](#2-architecture-layers)
3. [Full Architecture Diagram](#3-full-architecture-diagram)
4. [Component Reference](#4-component-reference)
5. [Agent Roster](#5-agent-roster)
6. [Model Providers](#6-model-providers)
7. [Configuration Files](#7-configuration-files)
8. [Authentication & Security](#8-authentication--security)
9. [Project File Structure](#9-project-file-structure)
10. [Telegram Bot Mapping](#10-telegram-bot-mapping)
11. [Request Flow Walkthrough](#11-request-flow-walkthrough)
12. [Operational Procedures](#12-operational-procedures)
13. [Known Issues & Fixes Applied](#13-known-issues--fixes-applied)
14. [What Still Needs To Be Done](#14-what-still-needs-to-be-done)
15. [Quick Reference Cheatsheet](#15-quick-reference-cheatsheet)

---

## 1. System Overview

| Property | Value |
|---|---|
| **Project name** | OpenClaw RedOS |
| **Host machine** | Mac Mini · macOS 26 Tahoe · ARM64 (Apple Silicon) |
| **Node.js** | v22.22.0 (ESM modules) |
| **OpenClaw CLI** | v2026.2.14 (official Anthropic CLI, installed via npm -g) |
| **RedOS layer** | Custom orchestration built ON TOP of OpenClaw |
| **Gateway port** | 18789 (OpenClaw native) |
| **Legacy gateway port** | 19000 (custom RedOS server.js, still referenced in old docs) |
| **Interface channels** | Telegram (8 bots), WebSocket, REST API, Control UI (http://127.0.0.1:18789/) |
| **Local AI** | Ollama on http://127.0.0.1:11434 |
| **Cloud AI fallback** | OpenAI Codex (gpt-5.2), Moonshot (kimi-k2.5), ZAI (glm-4.7) |
| **State directory** | `/Users/redinside/.openclaw/` |
| **CLI install path** | `/opt/homebrew/lib/node_modules/openclaw/` |
| **launchd service** | `ai.openclaw.gateway` (LaunchAgent) |

---

## 2. Architecture Layers

The system is composed of two independent but integrated layers:

```
┌─────────────────────────────────────────────────────────┐
│              LAYER 2 — RedOS (Custom)                   │
│                                                         │
│  HATAKE Parser → Track Router → Ed/RED Orchestrator     │
│  Smart Router V2 → Cost Monitor → Learning Engine       │
│  Kanban → Ticket System → DevOps Agent → Scheduler      │
│  Telegram Bridge (8 bots) → Mission Control UI          │
│                                                         │
│  Path: ~/.openclaw/agents/, gateway/, telegram/         │
└────────────────────┬────────────────────────────────────┘
                     │ uses
┌────────────────────▼────────────────────────────────────┐
│              LAYER 1 — OpenClaw CLI (Official)          │
│                                                         │
│  Gateway WebSocket server (port 18789)                  │
│  Agent session management                               │
│  Device authentication (Ed25519 + token)                │
│  Telegram plugin (native, runs 8 bots)                  │
│  Ollama + cloud model providers                         │
│  Memory / vector store / FTS                            │
│  Cron / heartbeat / compaction                          │
│                                                         │
│  Path: /opt/homebrew/lib/node_modules/openclaw/         │
└─────────────────────────────────────────────────────────┘
```

**Key distinction**: The official OpenClaw CLI is the runtime engine. RedOS is the business logic and orchestration layer that uses OpenClaw as its substrate. Upgrades to the CLI do not affect RedOS code and vice versa.

---

## 3. Full Architecture Diagram

### 3a. Top-Level System View

```
  Users / Admins
       │
  ┌────┴────────────────────────────────────────────────────┐
  │  TELEGRAM (8 bots)          │   REST API / WebSocket     │
  │                             │   http://127.0.0.1:18789   │
  │  @RedinsideBot   (main)     │                            │
  │  @ZenRedBot      (allrounder│   /api/chat                │
  │  @ENG_BOT        (eng)      │   /api/ceo/...             │
  │  @RESEARCH_BOT   (research) │   /api/kanban/...          │
  │  @FINANCE_BOT    (finance)  │   /api/cost                │
  │  @OPS_BOT        (ops)      │   /health                  │
  │  @INFOSEC_BOT    (infosec)  │   ws://.../ws              │
  └────────────────┬────────────┴────────────────────────────┘
                   │ WebSocket (authenticated)
  ┌────────────────▼────────────────────────────────────────┐
  │        OpenClaw GATEWAY  (port 18789)                   │
  │        Process: node /opt/homebrew/.../index.js         │
  │        Managed by: launchd (ai.openclaw.gateway)        │
  │                                                         │
  │  Auth layer:                                            │
  │  ┌──────────────────────────────────────────┐           │
  │  │  1. Shared secret check (gateway token)  │           │
  │  │  2. Device token check (Ed25519 paired)  │           │
  │  │  3. Challenge/nonce (v2 protocol)         │           │
  │  └──────────────────────────────────────────┘           │
  │                                                         │
  │  8 Agent sessions: main, allrounder, hatake, eng,       │
  │  research, finance, ops, infosec                        │
  └────────┬───────────────────────────────────────────────┘
           │
  ┌────────▼────────────────────────────────────────────────┐
  │              MODEL PROVIDERS                            │
  │                                                         │
  │  ┌─────────────────────────────────────────────────┐   │
  │  │  LOCAL (Ollama) — http://127.0.0.1:11434         │   │
  │  │  qwen2.5-coder:7b  · code · 32k ctx · $0        │   │
  │  │  llama3.1:8b        · chat · 128k ctx · $0       │   │
  │  │  glm-4.7-flash:latest (new, available)           │   │
  │  │  gpt-oss:20b        (new, available)             │   │
  │  │  minicpm variants   (new, available)             │   │
  │  └─────────────────────────────────────────────────┘   │
  │                                                         │
  │  ┌─────────────────────────────────────────────────┐   │
  │  │  CLOUD (primary model for main agents)          │   │
  │  │  openai-codex/gpt-5.2     (primary)             │   │
  │  │  moonshot/kimi-k2.5       (fallback 1)          │   │
  │  │  zai/glm-4.7              (fallback 2)          │   │
  │  │  zai/glm-4.7-flashx       (fast variant)        │   │
  │  └─────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────┘
```

### 3b. Request Flow (Detailed)

```
Telegram User
    │
    ▼
OpenClaw Telegram Plugin (native, built-in)
    │  Matches message to agent via botToken → agentId binding
    │
    ▼
Agent Session (e.g., "main" → RED agent)
    │  Context pruning: cache-ttl (1h)
    │  Compaction: safeguard mode
    │  Heartbeat: every 30m
    │
    ▼
Model Call (with fallback chain)
    │  Primary:   openai-codex/gpt-5.2
    │  Fallback1: moonshot/kimi-k2.5
    │  Fallback2: zai/glm-4.7
    │
    ▼  (for HATAKE agent, uses local only)
    │  Primary:   ollama/qwen2.5-coder:7b
    │  Fallback1: ollama/llama3.1:8b
    │  Fallback2: zai/glm-4.7-flashx
    │
    ▼
Response → Telegram (streaming: partial mode)
```

### 3c. Gateway Authentication Flow

```
Client (openclaw tui / status / CLI)
    │
    │  1. Connect WebSocket to ws://127.0.0.1:18789
    │
    ▼
Gateway sends:  { event: "connect.challenge", payload: { nonce, ts } }
    │
    │  2. Client signs payload:
    │     buildDeviceAuthPayload(deviceId, clientId, mode, role,
    │                            scopes, signedAtMs, token, nonce)
    │     → Ed25519 signature using device private key
    │
    ▼
Client sends:  { type: "req", id: "...", method: "connect",
                 params: { minProtocol: 3, maxProtocol: 3,
                           auth: { token: GATEWAY_TOKEN },
                           device: { id, publicKey, signature,
                                     signedAt, nonce },
                           role: "operator",
                           scopes: ["operator.admin"] }}
    │
    ▼
Gateway auth checks (in order):
    1. Signature validity      → "device signature invalid"
    2. Nonce match             → "device nonce mismatch"
    3. Shared secret check     → safeEqualSecret(auth.token, GATEWAY_TOKEN)
       └─ if OK → authOk=true, skip device token check
       └─ if FAIL → proceed to device token check
    4. Device token check      → verifyDeviceToken(token, deviceId)
       └─ Reads devices/paired.json
       └─ timingSafeEqual(provided, stored)
       └─ scopesAllow check
    │
    ▼
Success → { ok: true, auth: { method: "token" | "device-token" } }
```

### 3d. RedOS Orchestration Flow (Custom Layer)

```
User message (via any channel)
    │
    ▼
HATAKE Parser (agents/hatake-parser.js)
    │  Detects: intent, complexity (1-10), track
    │
    ├──[track=fast]──────────────────────────────────────┐
    │                                                    │
    ▼                                                    ▼
Resilient Handler                              Ed/RED Orchestrator
(gateway/resilient-handler.js)                (agents/ed-red-orchestrator.js)
    │                                                    │
    ▼                                                    │  Creates multi-step plan
Smart Router V2                                         │  Delegates to specialists:
(smart-router/selector-v2.js)                           │  ENG, RESEARCH, OPS, FINANCE
    │  Scores models, budget gate                        │
    │                                                    │  Each step → Resilient Handler
    ▼                                                    │
Model Call (Ollama or Cloud)                            │
    │                                                    │
    ▼                                                    ▼
Cost Monitor records → response                Assemble → validate (OPS gate)
    │                                                    │
    └──────────────────────────┬─────────────────────────┘
                               │
                               ▼
                     Response to user
```

---

## 4. Component Reference

### 4a. OpenClaw CLI Components (Layer 1)

| Component | File (in dist/) | Purpose |
|---|---|---|
| Gateway server | `gateway-cli-DbznSfRg.js` | WebSocket server, auth, client management |
| Gateway client | `pi-embedded-8DITBEle.js` | Client library (GatewayClient class) |
| Auth module | `auth-CkNWu3pU.js` | `authorizeGatewayConnect`, rate limiter |
| TUI | `tui-DMcWwYZ_.js` | Terminal UI client |
| Status command | `status-DDg1IFyC.js` | `openclaw status` probe |
| Paths | `paths-B4BZAPZh.js` | `resolveStateDir()` → `~/.openclaw` |
| Protocol | `client-B5KEYk4h.js` | Frame schemas, PROTOCOL_VERSION=3 |

### 4b. RedOS Components (Layer 2)

| Component | File | Purpose |
|---|---|---|
| HATAKE Parser | `agents/hatake-parser.js` | Intent detection, complexity scoring |
| Orchestrator | `agents/ed-red-orchestrator.js` | Multi-agent plan/delegate/assemble |
| CEO Agent | `agents/ceo-agent.js` | CEO task management + secretaries |
| Resilient Handler | `gateway/resilient-handler.js` | 3-retry loop, never-crash guarantee |
| Track Router | `gateway/track-router.js` | Fast vs orchestrated dispatch |
| Smart Router V2 | `smart-router/selector-v2.js` | Model scoring, budget gate |
| Telegram Bridge | `telegram/telegram-bridge.js` | 8-bot polling + HTTP forward |
| Cost Monitor | `cost-monitor/monitor.js` | Per-request cost tracking |
| Error Handler | `resilience/error-handler.js` | Recovery strategies |
| DevOps Agent | `resilience/devops-agent.js` | Continuous health monitoring |
| Ticket System | `resilience/ticket-system.js` | Auto-created issue tracking |
| Autonomous Learner | `learning/autonomous-learner.js` | Experience → Learn → Adapt |
| Kanban Board | `kanban/board.js` | Card/column project tracking |
| Task Scheduler | `scheduler/task-scheduler.js` | Background queue processing |

---

## 5. Agent Roster

| ID | Name | Role | Primary Model | Fallbacks | Telegram Bot |
|---|---|---|---|---|---|
| `main` | RED (CEO) | General assistant, CEO coordinator | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | @RedinsideBot |
| `allrounder` | ZEN (CSO) | Balanced multi-task, drafts | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | @ZenRedBot |
| `hatake` | HATAKE (Parser) | Intent parsing, routing only | ollama/qwen2.5-coder:7b | llama3.1:8b, glm-4.7-flashx | *(none — internal)* |
| `eng` | Engineering | Code, debug, architecture | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | @ENG_BOT |
| `research` | Research | Info gathering, analysis | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | @RESEARCH_BOT |
| `finance` | Finance | Financial analysis, portfolio | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | @FINANCE_BOT |
| `ops` | Operations | QA, validation, OPS gate | ollama/llama3.1:8b | *(none)* | @OPS_BOT |
| `infosec` | INFOSEC (Security) | Security, compliance | openai-codex/gpt-5.2 | kimi-k2.5, glm-4.7 | @INFOSEC_BOT |

**Group chat mentions:**
- `@RedinsideBot`, `RedinsideBot`, `redinsidebot` → main
- `@ZenRedBot`, `ZenRedBot`, `zenredbot` → allrounder
- `@INFOSECRED_BOT`, `INFOSECRED_BOT`, `infosecred_bot` → infosec

**Group settings:** All bots are configured for group `1012034994`. Messages require `@mention` in groups. DM policy varies per bot (main/allrounder are `open`, others vary).

---

## 6. Model Providers

### Local (Ollama) — `http://127.0.0.1:11434/v1`

| Model ID | Size | Best For | Context | Cost |
|---|---|---|---|---|
| `qwen2.5-coder:7b` | 7B | Code generation, debugging | 32k | $0 |
| `llama3.1:8b` | 8B | Chat, simple queries, fast | 128k | $0 |
| `glm-4.7-flash:latest` | — | Analysis, reasoning | — | $0 |
| `gpt-oss:20b` | 20B | General, high quality local | — | $0 |
| `minicpm-o2.6-16k:latest` | — | Multimodal | 16k | $0 |

> **Note:** Ollama API key configured as `"ollama-local"` (placeholder — Ollama doesn't require auth). Tools are globally DENIED for Ollama-backed agents (`tools.byProvider.ollama.deny: ["*"]`).

### Cloud Providers

| Provider | Models | API Key Location |
|---|---|---|
| **openai-codex** | gpt-5.2 | OAuth (profile: `openai-codex:default`) |
| **moonshot** | kimi-k1.5, kimi-k2.5 | Token (profile: `moonshot:manual`) |
| **zai** | glm-4.7, glm-4.7-flashx | `ZAI_API_KEY` in env (`8ae7e33ef1464...`) |
| **google** | gemini-1.5-flash | Token (profile: `google:manual`) |
| **xai** | — | `XAI_API_KEY` in env (placeholder) |
| **perplexity** | sonar-pro | `pplx-QOjmJ7Nj...` (web search) |

---

## 7. Configuration Files

### 7a. `~/.openclaw/openclaw.json` — Main Runtime Config

```
Key sections:
  meta.lastTouchedVersion       "2026.2.13" (will update on next save)
  env.vars                      API keys (ZAI, XAI, OLLAMA)
  auth.profiles                 OAuth/token profiles per provider
  models.providers.ollama       Ollama baseUrl + model definitions
  agents.defaults               Default model chain, workspace, pruning
  agents.list                   8 agent definitions with models/identity
  tools.byProvider.ollama       deny: ["*"] — no tools for Ollama
  tools.web.search              Perplexity sonar-pro integration
  tools.agentToAgent.enabled    true
  bindings                      agentId ↔ telegram account mapping
  channels.telegram             Per-account bot tokens + group policy
  channels.whatsapp             WhatsApp config (+16476092313)
  gateway.port                  18789
  gateway.mode                  "local"
  gateway.bind                  "loopback"
  gateway.auth.mode             "token"
  gateway.auth.token            "redinside-local-token-2024"  ← CRITICAL
```

### 7b. `~/Library/LaunchAgents/ai.openclaw.gateway.plist` — Service Definition

```xml
Key env vars the gateway process receives:
  OPENCLAW_GATEWAY_TOKEN    "redinside-local-token-2024"   ← must match openclaw.json
  OPENCLAW_SERVICE_VERSION  "2026.2.14"
  OPENCLAW_GATEWAY_PORT     "18789"
  HOME                      "/Users/redinside"
  PATH                      "/opt/homebrew/bin:..."
  ZAI_API_KEY               "8ae7e33ef1464..."
  OLLAMA_API_KEY            "ollama-local"
```

### 7c. `~/.openclaw/identity/device-auth.json` — Client-Side Device Token

```json
{
  "version": 1,
  "deviceId": "78771e433c212e61d9ed3546f673a4f44f8a2339436d181d10cd0017379e0770",
  "tokens": {
    "operator": {
      "token": "b_6QMNoJBOGQ4sGKOTJancO2ozC_HeyeyHtgmJJB3L4",
      "role": "operator",
      "scopes": ["operator.admin", "operator.approvals", "operator.pairing"],
      "updatedAtMs": 1771180049783
    }
  }
}
```

### 7d. `~/.openclaw/devices/paired.json` — Gateway-Side Device Registry

Two paired devices:
1. **CLI device** (`78771e43...`) — `token: b_6QMNoJBO...` · role: operator · platform: darwin
2. **Control UI** (`c1be9e35...`) — `token: bbd4c6a9...` · role: operator · platform: MacIntel · clientMode: webchat

### 7e. `~/.openclaw/identity/device.json` — Ed25519 Keypair

Contains `deviceId`, `publicKeyPem`, `privateKeyPem`. The device ID is derived as SHA-256 of the raw public key bytes (hex). **Never delete or replace this file** — it is required for device auth and cannot be regenerated.

---

## 8. Authentication & Security

### How the Gateway Token Works

```
Shell env:          OPENCLAW_GATEWAY_TOKEN = "redinside-local-token-2024"
openclaw.json:      gateway.auth.token     = "redinside-local-token-2024"  (config override)
launchd plist:      OPENCLAW_GATEWAY_TOKEN = "redinside-local-token-2024"  (gateway process env)

Resolution order:
  Gateway process: authConfig.token ?? process.env.OPENCLAW_GATEWAY_TOKEN
  Client (TUI/status): process.env.OPENCLAW_GATEWAY_TOKEN || config.gateway.auth.token

ALL THREE must be the same value.
```

### ⚠️ Critical Rule: Token Sync

If you ever change the gateway token:
1. Update `openclaw.json` → `gateway.auth.token`
2. Update the launchd plist → `OPENCLAW_GATEWAY_TOKEN`
3. Update your shell profile (`~/.zshrc`) → `export OPENCLAW_GATEWAY_TOKEN=...`
4. Restart the gateway: `launchctl unload/load ~/Library/LaunchAgents/ai.openclaw.gateway.plist`

### Device Pairing

- The CLI device (`78771e43...`) is paired with role `operator` and all three scopes
- `openclaw devices rotate` rotates the device token in `devices/paired.json` but does NOT automatically update `device-auth.json` — you must do it manually if you rotate
- `openclaw devices list` and `openclaw devices rotate` operate directly on disk — they do NOT test gateway connectivity

### Rate Limiting

- DEFAULT_MAX_ATTEMPTS = 10 per IP
- Two separate rate limit scopes: `shared-secret` and `device-token`
- Exceeding limits returns `rate_limited` reason

---

## 9. Project File Structure

```
/Users/redinside/.openclaw/
│
├── openclaw.json                 ← Main runtime config (see §7a)
├── openclaw.json.bak.*           ← Auto-backups (bak, bak.1, bak.2, bak.3)
│
├── identity/
│   ├── device.json               ← Ed25519 keypair (NEVER DELETE)
│   └── device-auth.json          ← Client-side device token
│
├── devices/
│   └── paired.json               ← Server-side paired device registry
│
├── logs/
│   ├── gateway.log               ← stdout of gateway process
│   └── gateway.err.log           ← stderr of gateway process
│
├── agents/
│   ├── main/                     ← RED (CEO) session state
│   ├── allrounder/               ← ZEN (CSO) session state
│   ├── eng/                      ← Engineering session state
│   ├── finance/                  ← Finance session state
│   ├── infosec/                  ← INFOSEC session state
│   ├── ops/                      ← Operations session state
│   ├── research/                 ← Research session state
│   ├── hatake/                   ← HATAKE parser session state
│   ├── hatake-parser.js          ← Intent detection, complexity scoring
│   ├── ed-red-orchestrator.js    ← Multi-agent orchestration
│   ├── ceo-agent.js              ← CEO tasks + secretary sub-agents
│   ├── ceo-worker.js             ← CEO worker helper
│   ├── autonomous-worker.js      ← Autonomous worker v1
│   └── autonomous-worker-v2.js   ← Autonomous worker v2
│
├── gateway/
│   └── (OpenClaw native, managed by launchd)
│
├── telegram/
│   └── telegram-bridge.js        ← 8-bot Telegram polling + forward
│
├── smart-router/
│   ├── selector-v2.js            ← Model scoring + budget gate
│   ├── selector.js               ← v1 selector
│   └── analyzer.js               ← Task complexity analysis
│
├── resilience/
│   ├── error-handler.js          ← Recovery strategies
│   ├── devops-agent.js           ← Continuous health monitoring
│   └── ticket-system.js          ← Auto issue tracking
│
├── cost-monitor/
│   ├── monitor.js                ← Cost tracking per request
│   └── state.json                ← Persisted cost state
│
├── kanban/
│   ├── board.js                  ← Kanban logic
│   └── board-state.json          ← Persisted board
│
├── learning/
│   ├── autonomous-learner.js     ← Experience → Learn → Adapt loop
│   └── learning-state.json       ← Persisted knowledge
│
├── scheduler/
│   └── task-scheduler.js         ← Background task queue
│
├── memory/
│   ├── main.sqlite               ← RED agent conversation memory
│   └── allrounder.sqlite         ← ZEN agent conversation memory
│
├── workspace/                    ← Shared agent workspace
│   ├── config/
│   │   ├── budget-guardrails.json
│   │   ├── model-registry.json
│   │   ├── routing-profiles.json
│   │   └── mcporter.json
│   ├── skills/                   ← 20+ agent skills
│   ├── ARCHITECTURE.md
│   └── ORG_STRUCTURE.md
│
├── workspace-main/               ← Per-agent workspaces (8 total)
├── workspace-allrounder/
├── workspace-eng/
├── workspace-finance/
├── workspace-infosec/
├── workspace-ops/
├── workspace-research/
├── workspace-bench_fast/
│
├── subagents/runs.json           ← Sub-agent execution log
├── mcp/                          ← MCP server state
├── sandbox/ + sandboxes/         ← Sandbox containers
├── cron/                         ← Cron job definitions + run logs
├── cache/                        ← Cleared cache (can be deleted safely)
├── credentials/                  ← Telegram auth state
├── backup/                       ← Backup scripts
├── update-check.json             ← Last update check result
├── package.json                  ← Node.js deps for RedOS layer
│
├── KNOWLEDGEBASE.md              ← THIS FILE
├── README.md                     ← Project overview + flow diagrams
├── ARCHITECTURE_ANALYSIS.md      ← Deep architecture analysis
├── SETUP_GUIDE.md                ← Initial setup instructions
├── RESILIENT_SYSTEM.md           ← Resilience layer docs
├── HATAKE_PROMPT_ENGINEERING.md  ← HATAKE parser details
├── TELEGRAM_DEMO_GUIDE.md        ← Telegram demo walkthrough
├── FIXES_COMPLETED.md            ← Historical fix log
└── NEW_FEATURES_ADDED.md         ← Feature changelog

/opt/homebrew/lib/node_modules/openclaw/
└── dist/                         ← Compiled OpenClaw CLI (do not edit)
    ├── index.js                  ← CLI entry point
    ├── gateway-cli-DbznSfRg.js   ← Gateway server code
    ├── pi-embedded-8DITBEle.js   ← GatewayClient code
    ├── auth-CkNWu3pU.js          ← Auth functions
    ├── tui-DMcWwYZ_.js           ← TUI code
    ├── status-DDg1IFyC.js        ← Status command
    ├── client-B5KEYk4h.js        ← Protocol schemas
    └── paths-B4BZAPZh.js         ← State directory resolution

~/Library/LaunchAgents/
└── ai.openclaw.gateway.plist     ← launchd service definition
```

---

## 10. Telegram Bot Mapping

| Bot Name | Telegram Handle | Token Location | Agent | DM Policy |
|---|---|---|---|---|
| RED_BOT | @RedinsideBot | `channels.telegram.accounts.default.botToken` | main | pairing |
| ZEN_BOT | @ZenRedBot | `channels.telegram.accounts.allrounder.botToken` | allrounder | open |
| ENG_BOT | — | `channels.telegram.accounts.eng.botToken` | eng | open |
| RESEARCH_BOT | — | `channels.telegram.accounts.research.botToken` | research | open |
| FINANCE_BOT | — | `channels.telegram.accounts.finance.botToken` | finance | open |
| OPS_BOT | — | `channels.telegram.accounts.ops.botToken` | ops | open |
| INFOSEC_BOT | @INFOSECRED_BOT | `channels.telegram.accounts.infosec.botToken` | infosec | open |

**Streaming mode:** All bots use `streamMode: "partial"` (sends partial responses as they stream in).
**Allowed group:** `1012034994` (your group ID) — all bots restrict groups to this allowlist.
**ACK reactions:** `ackReactionScope: "group-mentions"` — reaction emojis acknowledge mentions in groups.

---

## 11. Request Flow Walkthrough

### Simple Message via Telegram (Happy Path)

```
1. User DMs @ZenRedBot: "Summarize today's news"

2. OpenClaw Telegram plugin (native):
   → Receives update for account "allrounder"
   → Looks up binding: allrounder ↔ agentId "allrounder"
   → Passes message to agent session "allrounder" (ZEN)

3. Agent session:
   → Context window: gpt-5.2 (400k ctx)
   → Model chain: openai-codex/gpt-5.2 → kimi-k2.5 → glm-4.7
   → Sends to model with system prompt + history

4. Streaming response:
   → Partial chunks sent back to Telegram in real time
   → User sees response building up

5. Session state saved, heartbeat scheduled in 30m
```

### Gateway Connection (CLI / TUI)

```
1. User runs: openclaw tui

2. tui-DMcWwYZ_.js resolveGatewayConnection():
   → token = process.env.OPENCLAW_GATEWAY_TOKEN = "redinside-local-token-2024"
     OR config.gateway.auth.token = "redinside-local-token-2024"

3. GatewayClient sends connect:
   → auth.token = "redinside-local-token-2024"
   → device = { id, publicKey, signature(v2+nonce), signedAt, nonce }
   → role = "operator", scopes = ["operator.admin"]

4. Gateway authorizeGatewayConnect():
   → safeEqualSecret("redinside-local-token-2024", "redinside-local-token-2024") → TRUE
   → authOk = true → SKIP device token check

5. Connected. TUI session active.
```

---

## 12. Operational Procedures

### Start / Stop / Restart Gateway

```bash
# Restart gateway (picks up plist + config changes)
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
sleep 1
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# Check status
openclaw status

# View live logs
tail -f ~/.openclaw/logs/gateway.log
tail -f ~/.openclaw/logs/gateway.err.log
```

### Check All Systems

```bash
# Quick health
openclaw status

# Deep probe (tests connectivity, agents, probes)
openclaw status --deep

# Ollama models available
curl -s http://127.0.0.1:11434/api/tags | python3 -c \
  "import json,sys; [print(m['name']) for m in json.load(sys.stdin)['models']]"

# Gateway version running
ps aux | grep openclaw | grep gateway
```

### Upgrade OpenClaw CLI Only (safe)

```bash
# Check current vs latest
openclaw status | grep Update

# Upgrade CLI (does NOT touch RedOS)
npm update -g openclaw

# After upgrade, update plist version and restart
# Edit: ~/Library/LaunchAgents/ai.openclaw.gateway.plist
#   OPENCLAW_SERVICE_VERSION → new version
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

### Rotate Device Token (if needed)

```bash
# Get gateway token first
GW_TOKEN=$(grep -A1 "OPENCLAW_GATEWAY_TOKEN" ~/Library/LaunchAgents/ai.openclaw.gateway.plist | tail -1 | sed 's/<[^>]*>//g' | xargs)

# Rotate token (updates devices/paired.json)
openclaw devices rotate --token $GW_TOKEN

# Get new token value
NEW_TOKEN=$(node -e "
  const p = JSON.parse(require('fs').readFileSync(
    '/Users/redinside/.openclaw/devices/paired.json','utf8'));
  console.log(Object.values(p)[0].tokens.operator.token);
")

# Manually sync to device-auth.json (rotate does NOT do this automatically)
# Edit ~/.openclaw/identity/device-auth.json → tokens.operator.token = NEW_TOKEN
```

### Clear Cache

```bash
# Safe to delete - just model/vector cache
rm -rf ~/.openclaw/cache/*

# Truncate logs
> ~/.openclaw/logs/gateway.log
> ~/.openclaw/logs/gateway.err.log

# Restart gateway after cache clear
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

### Manage Paired Devices

```bash
# List paired devices
openclaw devices list

# Revoke a device
openclaw devices revoke <deviceId>
```

---

## 13. Known Issues & Fixes Applied

### FIX-001: Gateway Token Mismatch (2026-02-15)

**Symptom:** `openclaw tui` and `openclaw status` fail with:
```
unreachable (connect failed: unauthorized: device token mismatch (rotate/reissue device token))
```

**Root Cause:** Three different token values were in play:
- Shell env (`~/.zshrc`): `OPENCLAW_GATEWAY_TOKEN=redinside-local-token-2024`
- launchd plist: `OPENCLAW_GATEWAY_TOKEN=1a43d7bd555540a847330ce7a7fb7c6882c9ee38e5d01782`
- `openclaw.json`: `gateway.auth.token` had been removed (undefined)

The client sent `redinside-local-token-2024` (from shell). The gateway expected `1a43d7bd...` (from plist). Shared-secret auth failed, then device token check also failed because the client sent the gateway token string (not the device token), which didn't match the paired device token either.

**Fix:**
1. Updated plist `OPENCLAW_GATEWAY_TOKEN` → `redinside-local-token-2024`
2. Restored `openclaw.json` `gateway.auth.token` → `redinside-local-token-2024`
3. Updated `OPENCLAW_SERVICE_VERSION` in plist from `2026.2.12` → `2026.2.14`
4. Restarted gateway

**Result:** Gateway reachable in ~40ms, auth method: token.

**Prevention:** All three locations must always have the same gateway token value. See §8 (Authentication).

---

### FIX-002: Stale TUI Processes

**Symptom:** Multiple zombie TUI processes (PIDs from days ago) consuming memory.

**Fix:** `kill $(pgrep -f "openclaw tui")` — kill all TUI processes and restart fresh.

---

### FIX-003: openclaw devices rotate Does Not Sync device-auth.json

**Symptom:** After running `openclaw devices rotate`, the new token is written to `devices/paired.json` but `device-auth.json` still has the old token. Authentication fails with "device token mismatch" on the device token check path.

**Fix:** After `devices rotate`, manually update `identity/device-auth.json` → `tokens.operator.token` to match the new value in `devices/paired.json`.

---

### FIX-004: Protocol Version Mismatch in Custom WS Scripts

**Symptom:** Custom WebSocket test scripts fail with "invalid request frame".

**Root cause:** Request frame `id` field must be a **string** (not integer). Protocol version must be **3** (not 1). Client ID must be from the valid set (`"cli"`, `"gateway-client"`, etc.).

**Fix:** Use `id: "connect-1"` (string), `minProtocol: 3, maxProtocol: 3`, `client.id: "cli"`, `client.mode: "cli"`.

---

## 14. Version Control & Backup Strategy

### Git Repository

**Remote:** `https://github.com/redinside-dev/openclaw-redos.git`
**Branch:** `main`
**Working dir:** `~/.openclaw/`

#### What IS committed (your custom code only)

```
agents/*.js                   Your orchestration, workers, parsers
gateway/server.js             Your custom Express/WS server
gateway/resilient-handler.js  Your retry/fallback handler
gateway/fast-only-router.js   Your routing
gateway/timeout-handler.js    Your timeout logic
smart-router/selector-v2.js   Your model scoring
resilience/*.js               Your error handling + monitoring
telegram/telegram-bridge.js   Your Telegram bridge
mcp/auto-discovery.js         Your MCP discovery
security/maker-checker.js     Your security patterns
scripts/*.js                  Your utility scripts
workspace/*.md, workspace/config/*.json  Shared config
README.md, KNOWLEDGEBASE.md   Documentation
.env.example                  Secret template (no real values)
ai.openclaw.gateway.plist.example  Plist template (no real values)
package.json                  Dependencies list (no secrets)
```

#### What is NEVER committed (.gitignore protects)

```
.env                           All secret env vars
openclaw.json                  Live config (has bot tokens, API keys)
*.plist                        launchd plist (has OPENCLAW_GATEWAY_TOKEN)
identity/device.json           Ed25519 private key
identity/device-auth.json      Device token
devices/paired.json            Server-side device tokens
credentials/                   Telegram pairing state
exec-approvals.json            Socket token
openclaw/                      CLI runtime state
workspace-*/.openclaw/         Agent workspace state
telegram/update-offset-*.json  Runtime poll counters
completions/                   CLI auto-generated (not yours)
memory/*.sqlite                SQLite conversation memory
logs/                          Gateway logs
cache/                         Model/vector cache
*.bak, *.bak.*                 Backups
```

#### The Golden Rule: OpenClaw CLI ≠ Your Code

```
/opt/homebrew/lib/node_modules/openclaw/   ← NEVER in git
  └── dist/                                    upgraded with: npm update -g openclaw
      ├── gateway-cli-*.js                     DO NOT EDIT these files
      └── ...

~/.openclaw/                               ← YOUR git repo
  ├── agents/*.js                              your custom code
  └── gateway/server.js                        your custom code
```

#### Upgrade Workflow (CLI version bump)

```bash
# 1. Upgrade CLI
npm update -g openclaw

# 2. Get new version
openclaw --version

# 3. Update plist
nano ~/Library/LaunchAgents/ai.openclaw.gateway.plist
# Edit: OPENCLAW_SERVICE_VERSION → new version

# 4. Restart gateway
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# 5. Verify
openclaw status

# 6. Commit the version note to KNOWLEDGEBASE.md
git add KNOWLEDGEBASE.md && git commit -m "docs: update OpenClaw CLI version to X.X.X"
git push origin main
```

#### Standard Commit Workflow (for enhancements)

```bash
# Before starting work
git status             # see current state
git pull origin main   # get latest

# After making changes
git status             # confirm only your code is modified
git add <specific files>     # NEVER git add . (could catch secrets)
git commit -m "feat: description of what you built"
git push origin main

# KNOWLEDGEBASE.md must be updated with every significant change
```

### Google Drive Backup

**Status:** ⚠️ NOT YET ACTIVE

**Problem:** Google Drive is mounted in "Stream files" mode (`dr-x` read-only filesystem). The backup script (`backup/gdrive-backup.sh`) needs write access via `cp` to the GDrive path.

**Fix (one-time setup):**
1. Open Google Drive Desktop app
2. Preferences → Google Drive → select **"Mirror files"** (not Stream)
3. Wait for initial sync (~5 min)
4. Then run: `bash ~/.openclaw/backup/gdrive-backup.sh`

**What gets backed up (when active):**
- `openclaw.json` (secrets included — only in Drive, not Git)
- `agents/` directory
- `workspace*/` directories
- `smart-router/`, `cost-monitor/`, `gateway/`
- Keeps last 30 days of backups (auto-purges older)

**Backup location (once enabled):**
```
~/Library/CloudStorage/GoogleDrive-redinside.dev@gmail.com/
  MyDrive/OpenClaw/backups/
    openclaw-backup-YYYYMMDD-HHMMSS.tar.gz
```

**Primary backup = GitHub** (always up to date, always works)
**Secondary backup = Google Drive** (includes secrets/live config, needs Mirror mode)

### Security Token Inventory

| Token/Secret | Where Stored | Backed Up In |
|---|---|---|
| Telegram bot tokens (8) | `openclaw.json` | Google Drive backup |
| ZAI API key | `openclaw.json` + plist | Google Drive backup |
| Perplexity API key | `openclaw.json` | Google Drive backup |
| Gateway token | `openclaw.json` + plist + `~/.zshrc` | Google Drive backup |
| WhatsApp number | `openclaw.json` | Google Drive backup |
| Device Ed25519 key | `identity/device.json` | Google Drive backup |
| Device auth token | `identity/device-auth.json` | Google Drive backup |
| Exec approval token | `exec-approvals.json` | Google Drive backup |

**Template documents** (no real values, safe in GitHub):
- `.env.example` — documents all env var names
- `ai.openclaw.gateway.plist.example` — documents plist structure

---

## 15. Standard Practices (Must Follow)

### Every Session Rule

> **After every significant change — code, config, fix, or architectural decision — update KNOWLEDGEBASE.md and commit it.**

This ensures:
1. Any LLM (Claude, GPT, Gemini, etc.) starting a new session has full context
2. You can share KNOWLEDGEBASE.md with any collaborator and they're instantly oriented
3. No knowledge is lost between sessions

### What to document in KNOWLEDGEBASE.md

- Any new file created → add to §9 (File Structure)
- Any new agent → add to §5 (Agent Roster)
- Any auth/token change → update §8 (Authentication)
- Any bug fixed → add to §13 (Known Issues & Fixes)
- Any pending task → add to §14 (What Needs To Be Done)
- Version bump → update §1 (System Overview) and §14 (Upgrade Workflow)

### Commit Message Format

```
feat:     New feature or new file
fix:      Bug fix
docs:     Documentation only (KNOWLEDGEBASE.md, README.md)
chore:    Config/maintenance (plist, gitignore, package.json)
refactor: Code restructuring (no behavior change)
security: Security-related change
```

---

## 16. What Still Needs To Be Done

### Pending / In Progress

| # | Task | Priority | Notes |
|---|---|---|---|
| 1 | **Implement RedOS MCP servers** | HIGH | Build custom MCP servers on top of OpenClaw (not a parallel gateway). Skeleton exists at `~/openclaw-smart/` with 5 MCP servers planned |
| 2 | **Security: sandbox small models** | HIGH | `openclaw status` shows CRITICAL: `ollama/qwen2.5-coder:7b` and `ollama/llama3.1:8b` need sandboxing enabled OR web tools disabled. Fix: `agents.defaults.sandbox.mode = "all"` and `tools.deny = ["group:web","browser"]` |
| 3 | **XAI API key** | MEDIUM | `XAI_API_KEY` is still set to placeholder `<YOUR_XAI_KEY>` — update if xAI (Grok) access needed |
| 4 | **Test Telegram bots end-to-end** | MEDIUM | Verify all 8 bots respond correctly after the token fix |
| 5 | **Automate device-auth sync on rotate** | LOW | `devices rotate` should auto-sync `device-auth.json` |
| 6 | **Remove/replace old server.js (port 19000)** | LOW | Old RedOS custom gateway on port 19000 may still be referenced; migrate everything to native OpenClaw port 18789 |
| 7 | **Update `meta.lastTouchedVersion`** | LOW | Still shows `2026.2.13`; update to `2026.2.14` |

### Architecture Enhancements (Future)

- **MCP server integration**: Expose RedOS orchestration (HATAKE, Smart Router, Cost Monitor) as MCP tools that OpenClaw agents can call natively
- **Mission Control dashboards**: Connect to native OpenClaw Control UI at http://127.0.0.1:18789/
- **Add new local models**: `gpt-oss:20b`, `minicpm`, `glm-4.7-flash` are available in Ollama — register them in `openclaw.json` Ollama provider
- **Heartbeat for HATAKE**: Currently disabled (`heartbeat: disabled`) — can enable for keepalive
- **Node service**: LaunchAgent not installed — consider for distributed/remote agent hosting

---

## 17. Quick Reference Cheatsheet

```bash
## GATEWAY
openclaw status                          # Check if gateway is reachable
openclaw status --deep                   # Full probe including Telegram
openclaw tui                             # Open interactive TUI
launchctl list | grep openclaw           # Check launchd service status
tail -f ~/.openclaw/logs/gateway.log     # Live gateway log

## TOKENS (THE RULE: ALL THREE MUST MATCH)
echo $OPENCLAW_GATEWAY_TOKEN             # Shell env value
python3 -c "import json; c=json.load(open('/Users/redinside/.openclaw/openclaw.json')); print(c['gateway']['auth']['token'])"
grep OPENCLAW_GATEWAY_TOKEN ~/Library/LaunchAgents/ai.openclaw.gateway.plist

## OLLAMA
curl -s http://127.0.0.1:11434/api/tags | python3 -m json.tool | grep name
ollama list

## DEVICES
openclaw devices list                    # List paired devices
openclaw devices list --token $OPENCLAW_GATEWAY_TOKEN

## CACHE & CLEAN RESTART
rm -rf ~/.openclaw/cache/*
> ~/.openclaw/logs/gateway.log && > ~/.openclaw/logs/gateway.err.log
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist
sleep 3 && openclaw status

## CRITICAL FILES — DO NOT DELETE
~/.openclaw/identity/device.json         # Ed25519 keypair
~/.openclaw/devices/paired.json          # Device registry
~/.openclaw/openclaw.json                # Main config
~/Library/LaunchAgents/ai.openclaw.gateway.plist  # Service definition
```

---

## §18 — Pre-commit Cleanup (2026-02-15)

### What Was Cleaned

**Deleted — Pure stub with no implementation:**
- `resilience/status-bot.js` — 2-line file: `// - Knowledge base updated\n// TODO: Implement`. Removed entirely.

**Untracked from git — Runtime/generated files that were accidentally committed:**
- `completions/openclaw.bash`, `completions/openclaw.fish`, `completions/openclaw.ps1`, `completions/openclaw.zsh` — Auto-generated shell completions, not custom code.
- `telegram/update-offset-default.json` — Runtime counter (Telegram polling offset). Changes every minute.
- `update-check.json` — Auto-generated update check state. Not custom code.
- `workspace-infosec/security/audit_log/heartbeat_20260213T091520Z.txt` — Runtime heartbeat log.
- `workspace-infosec/security/audit_log/heartbeat_audit_2026-02-13T091858Z.md` — Runtime audit log.
- `workspace-infosec/security/audit_log/heartbeat_audit_2026-02-13_03-41-22.md` — Runtime audit log.

All of the above are now covered by `.gitignore` patterns (`completions/`, `telegram/update-offset-*.json`, `update-check.json`, `**/audit_log/`).

**README.md — Major update:**
- Fixed agent count: **7 → 8** (added hatake as an agent row)
- Fixed port: **19000 → 18789** everywhere (30+ occurrences)
- Updated gateway description: Custom Express → OpenClaw CLI 2026.2.14 / launchd
- Updated agent models: reflect actual cloud (gpt-5.2) and local (qwen2.5-coder) assignment
- Fixed scripts section: `npm start` → `openclaw gateway start`
- Fixed troubleshooting: `curl health` → `openclaw status`, corrected log paths
- Fixed upgrade section: correct CLI upgrade command
- Version bump: 3.6.0 → 3.7.0

### Security Audit Result

All committed JS files scanned — **no hardcoded credentials found**.
- `agents/allrounder/agent/models.json` contains ZAI API key but is protected by `**/agent/models.json` in `.gitignore`.
- `exec-approvals.json` has socket token — protected by `exec-approvals.json` in `.gitignore`.
- `identity/device-auth.json` and `devices/paired.json` — protected by `.gitignore`.

### Legacy Code Decision

`gateway/enhanced-handler.js` and `smart-router/selector.js` are legacy v1 components used only by `agents/ceo-agent.js`. They remain in place because:
1. They are still referenced by active code (`ceo-agent.js`)
2. Removal without testing could break CEO task delegation
3. They contain no secrets or security issues

**Action:** Leave as-is. Mark for future removal when `ceo-agent.js` is migrated to use v2 routing.

---

---

## §19 — Architecture Clarification (2026-02-15)

### The One-System Principle

The correct architecture is: **OpenClaw is the entire runtime. RedOS is the customization layer inside it.**

There is no second server, no parallel Express process, no custom Telegram bridge running alongside OpenClaw. Everything runs inside the OpenClaw gateway (port 18789, launchd).

### How RedOS Customizes OpenClaw

**Three mechanisms — all OpenClaw-native:**

1. **Skills** (`workspace/skills/`) — Declarative `SKILL.md` files that tell agents how to think. hatake-parser, smart-router, cost-tracker, retry-cascade, reflect-learn, and 15 others are all skills.

2. **MCP Servers** (`workspace/config/mcporter.json`) — External tool integrations injected into agent context. Exa (web search), Reddit, GitHub.

3. **Agent configuration** (`openclaw.json`) — 8 agents with identities (RED/ZEN/ENG etc.), model assignments, Telegram bot bindings, fallback chains.

### Legacy Code

`gateway/`, `agents/*.js`, `smart-router/`, and `resilience/` contain code from the pre-OpenClaw era when a custom Express server ran on port 19000. They are **not actively invoked** — the logic they implemented now lives in OpenClaw's native runtime + the RedOS skills. They are retained for reference only.

**Do not add new features to the legacy JS files.** New features go into skills or agent configuration.

### README Rewritten

The README was completely rewritten on 2026-02-15 to reflect this architecture. It now correctly shows:
- OpenClaw as the base runtime
- RedOS as the skills/MCP/config customization layer
- The correct request flow through OpenClaw → skills → models
- Legacy directories clearly labeled as pre-OpenClaw era

---

## §20 — Windsurf Session: Full Audit & Enhancement Roadmap (2026-02-15)

**Session by:** Windsurf Cascade (following Claude Code handoff)
**Date:** 2026-02-15 16:54 ET

### What Claude Code Completed (Verified)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Gateway token mismatch fixed (FIX-001) | DONE | `openclaw status` reachable ~40ms |
| 2 | KNOWLEDGEBASE.md created (§1–§19) | DONE | Full project context documented |
| 3 | Pre-commit cleanup (§18) | DONE | Stubs removed, runtime files untracked |
| 4 | README rewritten for OpenClaw-native architecture | DONE | Port 19000→18789, agent count 7→8 |
| 5 | Architecture clarified (§19) | DONE | RedOS = Skills + MCP + Config on OpenClaw |
| 6 | Model tier fixed: ZAI/GLM as primary PAYG fallback | DONE | `model-registry.json` updated |
| 7 | Kimi marked `status: unavailable` (no subscription) | DONE | `model-registry.json` updated |
| 8 | Mission Control port fixed: 19000→18789 | DONE | `dashboard/mission-control.js` updated |
| 9 | All committed & pushed to GitHub | DONE | Commit `8a5095d` on `main` |

### What Claude Code Did NOT Complete (Gaps Found by Windsurf)

| # | Gap | Impact |
|---|---|---|
| 1 | §20 (next steps section) never written — `MEMORY.md` references it | Any LLM starting here has no roadmap |
| 2 | Skills NOT registered in `openclaw.json` — `"skills": { "entries": {} }` is empty | All 20 skills are dead specs, not active |
| 3 | `workspace-allrounder/MEMORY.md` still lists `moonshot/kimi-k2.5` in fallback chain | Stale info, contradicts model tier fix |
| 4 | No work on self-healing, self-improvement, agent-to-agent scrum | Core vision not started |
| 5 | No work on CEO hiring/firing capabilities | Core vision not started |
| 6 | No Mission Control data flow verification | UI fixed but untested with live gateway |
| 7 | Agent fallback chains in `openclaw.json` not verified against ZAI-first policy | May still reference kimi-k2.5 |

### Skills Inventory (20 skills in `workspace/skills/`)

| Skill | Purpose | Registered in openclaw.json? |
|---|---|---|
| `hatake-parser` | Intent detection, complexity scoring, JSON brief output | YES |
| `smart-router` | Model scoring, budget gate, fallback chain selection | YES |
| `retry-cascade` | 4-level auto-retry: same model → fallback → escalate → RED rewrite → human | YES |
| `reflect-learn` | Self-improvement: scan corrections → propose agent updates → apply with approval | YES |
| `cost-tracker` | Per-call cost logging, budget checks, daily reports, waste detection | YES |
| `proactive-agent-1-2-4` | Memory architecture, self-healing, alignment, reverse prompting, heartbeat | YES |
| `agent-autonomy-kit` | Task queue, proactive heartbeat, continuous operation | YES |
| `task-runner` | Project lifecycle: create → plan → dispatch → track → verify → deliver | YES |
| `status-reporter` | Operational status reports from workspace trackers + cron | YES |
| `mission-control-telegram` | Telegram commands: /status, /agents, /budget, /routing, /pause, /resume | YES |
| `ai-humanizer` | 24-pattern AI text detection + rewriting to sound human | YES |
| `anurag-briefs` | Telegram-friendly topic briefs, X/Twitter link summaries | YES |
| `eng-coding` | Claude Code CLI primary, Cursor Agent fallback for coding tasks | YES |
| `model-usage` | CodexBar per-model usage/cost summaries | YES |
| `exa-mcp` | Exa web search MCP integration | YES |
| `holdings-analyzer` | Portfolio/holdings analysis | YES |
| `clawdhub` | ClawdHub integration | YES |
| `summarize` | Text summarization | YES |
| `x-mirror` | X/Twitter reading via Jina mirror | YES |
| `_quarantine` | Quarantined/disabled skills | N/A |

### Enhancement Roadmap

#### Phase 1 — Wire What's Already Built (HIGH priority)

| Task | Description | Status |
|---|---|---|
| 1.1 Register all skills in `openclaw.json` | 19 skills registered in `skills.entries` (excluding `_quarantine`) | DONE |
| 1.2 Verify agent fallback chains | All 8 agents fixed: `kimi-k2.5` removed, `zai/glm-4.7` is now first fallback | DONE |
| 1.3 Fix stale MEMORY.md files | Both updated: kimi removed from allrounder, session state current | DONE |

#### Phase 2 — Self-Healing Loop (MEDIUM priority)

| Task | Description | Status |
|---|---|---|
| 2.1 Wire retry-cascade skill | Register + connect to agent execution pipeline | NOT STARTED |
| 2.2 DevOps agent ticket→diagnose loop | DevOps reads tickets, attempts known fixes automatically | NOT STARTED |
| 2.3 Daily health report to CEO | DevOps → RED summary via Telegram each morning | NOT STARTED |

#### Phase 3 — Agent-to-Agent Scrum (MEDIUM priority)

| Task | Description | Status |
|---|---|---|
| 3.1 Morning standup cron | RED calls each agent "status/blockers?" — responses aggregated | NOT STARTED |
| 3.2 Async messaging via team workspace | Agents post completion/request messages to shared workspace | NOT STARTED |
| 3.3 CEO delegation flow | RED decomposes complex tasks → assigns to specialists → assembles results | NOT STARTED |

#### Phase 4 — CEO Hiring/Firing (MEDIUM priority)

| Task | Description | Status |
|---|---|---|
| 4.1 Dynamic agent creation | CEO writes new agent entry to `openclaw.json`, signals gateway reload | NOT STARTED |
| 4.2 Sub-agent spawning | CEO uses OpenClaw session system for temporary focused agents | NOT STARTED |
| 4.3 Agent decommission | CEO marks agent `status: inactive`, notifies via Telegram | NOT STARTED |

#### Phase 5 — Mission Control Visibility (MEDIUM priority)

| Task | Description | Status |
|---|---|---|
| 5.1 Verify Mission Control data flow | Confirm OpenClaw gateway sends events the UI expects | NOT STARTED |
| 5.2 Agent comms feed | Team workspace messages stream to Mission Control in real-time | NOT STARTED |
| 5.3 Issue tracker panel | Tickets from ticket-system.js displayed with status/priority/assignee | NOT STARTED |
| 5.4 Cost panel | Live cost events from cost-events.jsonl | NOT STARTED |
| 5.5 Model override UI | Dropdown to override routing profile or force a specific model | NOT STARTED |

### Model Tier (Corrected — Canonical)

```
Tier 1 — Free local (Ollama):
  llama3.1:8b · qwen2.5-coder:7b · gpt-oss:20b

Tier 2 — PAYG (primary cloud fallback):
  zai/glm-4.7 (PRIMARY) · zai/glm-4.7-flashx (ultra-cheap)
  moonshot/kimi-k2.5 → INACTIVE (no subscription)

Tier 3 — Subscription (web search):
  perplexity/sonar · sonar-pro · sonar-reasoning

Tier 4–5 — Subscription (primary agents):
  openai-codex/gpt-5.2 · claude-code/sonnet-4.5
```

**Fallback chain for all agents:** `openai-codex/gpt-5.2` → `zai/glm-4.7` → `ollama/llama3.1:8b`
**HATAKE (local only):** `ollama/qwen2.5-coder:7b` → `ollama/llama3.1:8b` → `zai/glm-4.7-flashx`

---

### Windsurf Session Progress Log

| Time (ET) | Action | Result |
|---|---|---|
| 16:54 | Full audit of Claude Code work vs gaps | 7 gaps identified |
| 17:05 | §20 written to KNOWLEDGEBASE.md | Full roadmap with 5 phases |
| 17:08 | Fixed `workspace-allrounder/MEMORY.md` | kimi-k2.5 → zai/glm-4.7 |
| 17:08 | Updated `workspace/MEMORY.md` | Session state current, §20 ref fixed |
| 17:12 | Registered 19 skills in `openclaw.json` | `skills.entries` populated |
| 17:12 | Fixed all 8 agent fallback chains | kimi-k2.5 removed, ZAI first |
| 17:15 | Updated §20 with completion status | Phase 1 fully DONE |

---

*Last updated: 2026-02-15 17:15 ET by Windsurf Cascade*
*OpenClaw version: 2026.2.14 | RedOS version: 3.7.0*
*Phase 1 COMPLETE. Phases 2–5 pending — see Enhancement Roadmap above.*
