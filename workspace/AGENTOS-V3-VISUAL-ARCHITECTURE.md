# AgentOS v3.0 — Complete Visual Architecture
## Your AI Company Operating System

---

## 🎯 COMPLETE END-TO-END FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         YOUR COMMAND (Telegram/API/CLI)                     │
│                    "Build a React dashboard with Stripe"                    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ① HATAKE (Prompt Parser) — Tier 1 (FREE)                                  │
│  Model: Ollama qwen2.5-coder:7b (Local)                                    │
│  ────────────────────────────────────────────────────────────────────────   │
│  INPUT:  "Build a React dashboard with Stripe"                             │
│  OUTPUT: Structured JSON Brief                                              │
│  {                                                                          │
│    "brief_id": "BRIEF-20260212-223045",                                     │
│    "intent": "Build React dashboard with Stripe integration",              │
│    "type": "code",                                                          │
│    "complexity": "complex",                                                 │
│    "needs_code": true,                                                      │
│    "needs_web": false,                                                      │
│    "departments_needed": ["ENG"],                                           │
│    "deliverables": ["React app", "Stripe integration", "Tests"]            │
│  }                                                                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ② SMART ROUTER (Model Selection Algorithm)                                │
│  ────────────────────────────────────────────────────────────────────────   │
│  ANALYZES:                                                                  │
│  • Complexity: "complex" → needs Tier 4+                                   │
│  • Needs code: true → Claude Code (Tier 5) or Codex (Tier 4)              │
│  • Context size: ~10K tokens → any model fits                              │
│  • Routing profile: "balanced"                                              │
│                                                                             │
│  SCORING:                                                                   │
│  ┌──────────────────┬─────────┬───────┬──────┬─────────┐                   │
│  │ Model            │ Quality │ Speed │ Cost │ Score   │                   │
│  ├──────────────────┼─────────┼───────┼──────┼─────────┤                   │
│  │ Claude Code      │ 10/10   │ 6/10  │ FREE │ 92/100  │ ← WINNER          │
│  │ Codex gpt-5.2    │ 10/10   │ 6/10  │ FREE │ 92/100  │                   │
│  │ Moonshot k2.5    │ 8/10    │ 6/10  │ $2   │ 74/100  │                   │
│  └──────────────────┴─────────┴───────┴──────┴─────────┘                   │
│                                                                             │
│  DECISION: ENG agent → Primary: Codex gpt-5.2                              │
│            For coding → delegates to Claude Code CLI                        │
│            Fallbacks: [Moonshot k2.5, Z.AI glm-4.7]                        │
│                                                                             │
│  LOGGED TO: ~/.openclaw/workspace/logs/routing-decisions.jsonl             │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ③ RED (CEO) — Planning & Orchestration — Tier 4                           │
│  Model: OpenAI Codex gpt-5.2 (400K context)                                │
│  ────────────────────────────────────────────────────────────────────────   │
│  RECEIVES: Parsed brief from HATAKE + Model assignments from Router        │
│                                                                             │
│  CREATES PROJECT:                                                           │
│  ~/.openclaw/workspace/projects/PROJ-20260212-223045/                      │
│  ├── BRIEF.md          ← Original requirements                             │
│  ├── TASKS.md          ← Breakdown of tasks                                │
│  ├── state.json        ← Project tracking                                  │
│  └── src/              ← Code workspace                                     │
│                                                                             │
│  TASK BREAKDOWN:                                                            │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │ TASK-001: Setup React scaffold                     → ENG       │        │
│  │ TASK-002: Stripe integration                       → ENG       │        │
│  │ TASK-003: Build dashboard components               → ENG       │        │
│  │ TASK-004: Write tests                              → ENG       │        │
│  │ TASK-005: QA + Lighthouse audit                    → OPS       │        │
│  │ TASK-006: Package & deliver                        → RED       │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  DISPATCHES TO: ENG agent (tasks 1-4 in parallel)                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ④ PARALLEL AGENT EXECUTION                                                │
│  ────────────────────────────────────────────────────────────────────────   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │   ENG (Tier 4)   │  │ RESEARCH (T4+Web)│  │ FINANCE (T4+Web) │         │
│  │ Codex gpt-5.2    │  │ Codex + Pplx Pro │  │ Codex + Pplx Rsn │         │
│  │ ──────────────── │  │ ──────────────── │  │ ──────────────── │         │
│  │ TASK-001:        │  │ Market research, │  │ Live stock data, │         │
│  │ • Plans arch     │  │ competitor intel,│  │ portfolio analy- │         │
│  │ • Calls Claude   │  │ trend analysis   │  │ sis with reason- │         │
│  │   Code CLI for   │  │                  │  │ ing chains       │         │
│  │   actual coding  │  │ Uses Perplexity  │  │                  │         │
│  │ • Reviews output │  │ web search (real │  │ Uses Perplexity  │         │
│  │                  │  │ -time data)      │  │ sonar-reasoning  │         │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘         │
│           │                     │                       │                  │
│  ┌────────▼─────────┐  ┌────────▼─────────┐                               │
│  │   OPS (Tier 2)   │  │  HATAKE (Tier 1) │                               │
│  │ Z.AI glm-4.7     │  │ Ollama qwen2.5   │                               │
│  │ ──────────────── │  │ ──────────────── │                               │
│  │ QA, validation,  │  │ Prompt parsing,  │                               │
│  │ health checks,   │  │ JSON extraction, │                               │
│  │ DevOps tasks     │  │ simple format    │                               │
│  └──────────────────┘  └──────────────────┘                               │
│                                                                             │
│  COST TRACKING: Every API call logged to cost-events.jsonl                 │
│  FALLBACK: If agent fails → retry cascade (4 levels)                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⑤ VERIFY OUTPUT                                                            │
│  ────────────────────────────────────────────────────────────────────────   │
│  OPS Agent performs:                                                        │
│  ✓ Code compiles/builds                                                     │
│  ✓ Tests pass                                                               │
│  ✓ Lighthouse score > 90                                                    │
│  ✓ Security scan (no vulnerabilities)                                       │
│  ✓ Cost within budget                                                       │
│                                                                             │
│  IF FAIL → Returns to responsible agent for fixes                          │
│  IF PASS → Proceeds to Review                                              │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⑥ REVIEW & APPROVE                                                         │
│  ────────────────────────────────────────────────────────────────────────   │
│  RED (CEO) reviews:                                                         │
│  • All tasks completed?                                                     │
│  • Quality meets standards?                                                 │
│  • Budget not exceeded?                                                     │
│  • Ready for delivery?                                                      │
│                                                                             │
│  DECISION: APPROVE ✓                                                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⑦ DELIVER                                                                  │
│  ────────────────────────────────────────────────────────────────────────   │
│  RED packages output:                                                       │
│  • Zip source code                                                          │
│  • Generate README                                                          │
│  • Create deployment guide                                                  │
│  • Send notification to owner (Telegram)                                    │
│                                                                             │
│  MESSAGE:                                                                   │
│  ✅ Project PROJ-20260212-223045 complete!                                 │
│     React dashboard with Stripe integration                                 │
│     📁 /workspace/projects/PROJ-20260212-223045/                           │
│     💰 Cost: $0.00 (all subscription models)                               │
│     ⏱️  Time: 8m 42s                                                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⑧ LEARN & OPTIMIZE                                                         │
│  ────────────────────────────────────────────────────────────────────────   │
│  System logs:                                                               │
│  • Task complexity → actual time taken (improve estimates)                  │
│  • Model performance → which models worked best                             │
│  • Common failures → patterns to avoid                                      │
│  • Cost optimization → find cheaper alternatives                            │
│                                                                             │
│  Stored in: ~/.openclaw/workspace/knowledge/                               │
│  Used by: Smart Router for better future decisions                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 RETRY CASCADE (Failure Recovery)

```
TASK FAILS
    │
    ▼
┌─────────────────────────────────────┐
│ RETRY #1: Same model, wait 15s     │
│ (handles transient errors)          │
└───────────┬─────────────────────────┘
            │ Still fails?
            ▼
┌─────────────────────────────────────┐
│ RETRY #2: Fallback model #1        │
│ (try different model)               │
└───────────┬─────────────────────────┘
            │ Still fails?
            ▼
┌─────────────────────────────────────┐
│ RETRY #3: Tier escalation          │
│ • Code task → Claude Code (T5)     │
│ • Reasoning → Codex (T4)           │
│ • Search → Pplx sonar-pro (T3)     │
└───────────┬─────────────────────────┘
            │ Still fails?
            ▼
┌─────────────────────────────────────┐
│ RETRY #4: Prompt rewrite           │
│ RED rewrites task prompt            │
│ Send to best available model        │
└───────────┬─────────────────────────┘
            │ Still fails?
            ▼
┌─────────────────────────────────────┐
│ ESCALATE TO HUMAN                   │
│ Telegram notification:              │
│ "⚠️ Task TASK-001 failed 4 times"  │
│ "Models tried: [list]"              │
│ "Action needed: [suggestion]"       │
│                                     │
│ Status: BLOCKED                     │
│ Other tasks continue in parallel    │
└─────────────────────────────────────┘
```

---

## 💰 COST TRACKING & BUDGET GUARDRAILS

```
EVERY API CALL
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Cost Tracker logs:                                      │
│ {                                                       │
│   "timestamp": "2026-02-12T22:30:45Z",                  │
│   "agent": "eng",                                       │
│   "model": "openai-codex/gpt-5.2",                      │
│   "task_id": "TASK-001",                                │
│   "input_tokens": 1240,                                 │
│   "output_tokens": 3890,                                │
│   "cost_usd": 0.00,  ← subscription model               │
│   "billing_type": "subscription"                        │
│ }                                                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Budget Guardrails check:                                │
│                                                         │
│ Daily variable spend:  $1.24 / $2.00  (62%)            │
│ Monthly variable:      $18.45 / $30.00 (61%)           │
│ Fixed monthly:         $460.00                          │
│                                                         │
│ Status: ✅ Within limits                               │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼ (if approaching limit)
┌─────────────────────────────────────────────────────────┐
│ AT 70%: Log warning                                     │
│ AT 90%: Auto-switch to "cost_saver" routing profile    │
│         (prefer cheaper models)                         │
│ AT 100%: Pause pay-as-you-go models                    │
│          (subscriptions continue running)               │
│          Notify owner via Telegram                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🎛️ MISSION CONTROL DASHBOARD

```
╔═══════════════════════════════════════════════════════════════════╗
║                    🦞 AGENTOS MISSION CONTROL                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  SYSTEM STATUS                          BUDGET                    ║
║  ━━━━━━━━━━━━━━                         ━━━━━━                    ║
║  Gateway: ● RUNNING                     Today:    $1.24 / $2.00   ║
║  Agents:  7 online, 0 idle              Month:   $18.45 / $30.00  ║
║  Models:  10 available                  Fixed:   $460.00/mo       ║
║                                                                   ║
║  ACTIVE AGENTS                          ROUTING PROFILE           ║
║  ━━━━━━━━━━━━━━                         ━━━━━━━━━━━━━━━           ║
║  🔴 RED      CEO         ● ACTIVE       ⚖️  BALANCED              ║
║  🟣 ZEN      CSO         ○ IDLE         Quality:  40%             ║
║  🟢 HATAKE   Parser      ● ACTIVE       Speed:    30%             ║
║  🔵 ENG      Engineer    ● ACTIVE       Cost:     30%             ║
║  🟣 RESEARCH Intel       ● ACTIVE                                 ║
║  🟡 OPS      QA          ○ IDLE         [Switch to Cost Saver]   ║
║  🟢 FINANCE  Analyst     ○ IDLE                                   ║
║                                                                   ║
║  CURRENT TASKS                                                    ║
║  ━━━━━━━━━━━━━━                                                   ║
║  TASK-001  Build React scaffold         ENG      ● RUNNING       ║
║  TASK-002  Stripe integration           ENG      ⏸ QUEUED        ║
║  TASK-003  Dashboard components         ENG      ⏸ QUEUED        ║
║  TASK-004  Write tests                  ENG      ⏸ QUEUED        ║
║  TASK-005  QA audit                     OPS      ⏸ QUEUED        ║
║                                                                   ║
║  MODEL USAGE (Today)                                              ║
║  ━━━━━━━━━━━━━━                                                   ║
║  Codex gpt-5.2    ████████████ 42 calls  $0.00 (subscription)    ║
║  Claude Code      ██████       18 calls  $0.00 (subscription)    ║
║  Pplx sonar-pro   ████         12 calls  $0.00 (subscription)    ║
║  Z.AI glm-4.7     ███          8 calls   $1.24 (pay-as-you-go)   ║
║  Ollama qwen2.5   ██           5 calls   $0.00 (local/free)      ║
║                                                                   ║
║  RECENT EVENTS                                                    ║
║  ━━━━━━━━━━━━━━                                                   ║
║  22:30:45  TASK-001 started by ENG (Codex gpt-5.2)               ║
║  22:30:42  TASK-001 assigned to ENG                              ║
║  22:30:39  Project PROJ-20260212-223045 created                  ║
║  22:30:35  Brief BRIEF-20260212-223035 parsed by HATAKE          ║
║  22:30:32  Command received from Telegram (user: 1012034994)     ║
║                                                                   ║
║  [View Full Logs]  [Export Report]  [Settings]                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

Access at: **http://127.0.0.1:18789/**

---

## 📊 TIER SYSTEM

```
TIER 5: BIG BRAIN ─────────────────────────────────────────────
│ Claude Code (Sonnet 4.5)
│ $20/mo subscription | 0 per-call cost
│ USE FOR: Complex multi-file coding, deep refactoring,
│          full-stack apps, hard debugging
│ AVOID FOR: Simple tasks, non-code work
└────────────────────────────────────────────────────────────

TIER 4: HEAVY REASONING ───────────────────────────────────────
│ OpenAI Codex gpt-5.2
│ $420/mo total (3 subscriptions) | 0 per-call cost
│ USE FOR: Architecture, planning, strategy, code review,
│          complex reasoning, delegation
│ AVOID FOR: Tasks Tier 1-2 can handle
└────────────────────────────────────────────────────────────

TIER 3: REAL-TIME INTELLIGENCE ───────────────────────────────
│ Perplexity Pro (sonar / sonar-pro / sonar-reasoning)
│ $20/mo subscription | 0 per-call cost
│ USE FOR: Web search, live data, market analysis,
│          competitor research, current events
│ AVOID FOR: Offline tasks, no web needed
└────────────────────────────────────────────────────────────

TIER 2: STANDARD CLOUD ────────────────────────────────────────
│ Z.AI glm-4.7, Moonshot kimi-k2.5
│ Pay-as-you-go | ~$0.001-0.003 per call
│ USE FOR: Standard tasks, validation, OPS work,
│          Ollama fallback when local is down
│ AVOID FOR: Complex reasoning, critical tasks
└────────────────────────────────────────────────────────────

TIER 1: LOCAL / FREE ──────────────────────────────────────────
│ Ollama (qwen2.5-coder, llama3.1)
│ FREE | Runs on Mac Mini locally
│ USE FOR: Parsing, formatting, classification,
│          simple summaries, JSON extraction
│ AVOID FOR: Complex reasoning, real-time data
└────────────────────────────────────────────────────────────

INTELLIGENCE FLOWS DOWNWARD → Hard task starts at top tier
FAILURES FLOW UPWARD → Failed task escalates to higher tier
```

---

## 🔐 YOUR CONFIGURATION

```yaml
CREDENTIALS: ✅ Preserved from old config
  - Z.AI API Key
  - Perplexity API Key
  - OpenAI Codex OAuth
  - Moonshot Auth
  - All 6 Telegram bot tokens

TELEGRAM BOTS: ✅ All connected
  - @RedinsideBot      → RED (CEO)
  - @ZenRedBot         → ZEN (CSO)
  - @EngRedBot         → ENG (Engineering)
  - @ResearchRedBot    → RESEARCH (Intelligence)
  - @FinanceRedBot     → FINANCE (Analyst)
  - @OpsRedBot         → OPS (QA/DevOps)

TAILSCALE: ❌ OFF (as requested)

WEB SEARCH: ✅ Perplexity sonar-pro
  - RESEARCH agent uses this for real-time intel
  - FINANCE agent uses this for market data
```

---

## 🚀 HOW TO USE

1. **Send command via Telegram:**
   ```
   @RedinsideBot build a todo app with authentication
   ```

2. **Watch the flow:**
   - HATAKE parses your command
   - Router picks best models
   - RED creates project & tasks
   - Agents execute in parallel
   - OPS verifies output
   - RED delivers result

3. **Monitor in real-time:**
   - Dashboard: http://127.0.0.1:18789/
   - Logs: `openclaw logs --follow`
   - Costs: `tail -f ~/.openclaw/workspace/logs/cost-events.jsonl`

4. **Get result:**
   - Notification via Telegram
   - Files in `~/.openclaw/workspace/projects/PROJ-{id}/`

---

**Your AgentOS v3 is a complete AI company running 24/7!** 🎉
