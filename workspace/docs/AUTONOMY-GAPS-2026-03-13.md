# Autonomy Gaps — OpenClaw vs RedOS Current State
**Date:** 2026-03-13
**Author:** Claude (Consultant)
**Purpose:** Document what OpenClaw natively supports vs what we're missing or doing wrong

---

## TL;DR — Why It Broke and Why It Feels Fake

The system looked autonomous but wasn't. Three structural problems:

1. **56 crons hardcoded to `ollama/llama3.1:8b`** — model not installed, so ZERO work was ever done. Fixed 2026-03-13.
2. **Heartbeat not configured** — we use a cron as a workaround, but native heartbeat is more reliable and purpose-built for this.
3. **`maxSpawnDepth` not set** — RED can't actually orchestrate workers. All A2A is shallow `sessions_send` calls with no spawn hierarchy.

---

## Gap 1: Heartbeat (CRITICAL)

**What OpenClaw has natively:**
```json5
agents: {
  defaults: {
    heartbeat: {
      every: "30m",
      target: "last",         // delivers to your Telegram
      lightContext: true,     // only loads HEARTBEAT.md, cheap
      activeHours: { start: "08:00", end: "24:00", timezone: "America/Toronto" }
    }
  }
}
```
- Runs every 30m per agent in background
- Agent reads `HEARTBEAT.md`, acts on it, replies `HEARTBEAT_OK` if nothing to do
- Native retry, skip-if-busy, active hours baked in
- `lightContext: true` = cheap runs (only loads HEARTBEAT.md, not full workspace)

**What we have:**
- `system-pulse-always-on-0001` cron every 5 min — a custom hack
- No HEARTBEAT.md per agent
- No `heartbeat` block in any agent config
- Heartbeat runs in STATE.yaml show `disabled` for 7 of 8 agents

**Fix needed:**
- Add `heartbeat` block to each agent in `openclaw.json`
- Create `workspace/HEARTBEAT.md`, `workspace-finance/HEARTBEAT.md`, etc. per agent
- Disable `system-pulse-always-on-0001` cron (replaced by native heartbeat)

---

## Gap 2: Sub-agent Orchestration Depth (HIGH)

**What OpenClaw has natively:**
```json5
agents: {
  defaults: {
    subagents: {
      maxSpawnDepth: 2,        // RED can spawn orchestrators that spawn workers
      maxChildrenPerAgent: 5,
      maxConcurrent: 8,
      runTimeoutSeconds: 900
    }
  }
}
```
- `maxSpawnDepth: 2` = RED spawns a coordinator, coordinator spawns workers
- This is the real "autonomous company" pattern — RED delegates, doesn't do everything itself
- Currently `maxSpawnDepth` is NOT SET (defaults to 1) — RED can only spawn direct workers, no hierarchy

**Fix needed:**
- Set `maxSpawnDepth: 2` in `agents.defaults.subagents`
- Update RED's SOUL.md to use `sessions_spawn` for delegation instead of `sessions_send`
- Pattern: RED → sessions_spawn(eng, task) → ENG → sessions_spawn(subagent, subtask)

---

## Gap 3: Per-Agent Tool Profiles (MEDIUM)

**What OpenClaw has natively:**
```json5
// ENG agent - only needs coding tools
{ id: "eng", tools: { profile: "coding" } }

// RESEARCH agent - needs web tools
{ id: "research", tools: { allow: ["web_search", "web_fetch", "read", "write"] } }

// FINANCE agent - read-only, no shell
{ id: "finance", tools: { deny: ["exec", "browser", "write"] } }
```

**What we have:**
- ALL agents have ALL tools enabled (no profile set on any agent)
- FINANCE and RESEARCH can run arbitrary shell commands — security risk
- ENG and OPS have no special `coding` or `exec` priority

**Fix needed:**
- Set `tools.profile` or explicit `tools.allow/deny` per agent based on role
- At minimum: restrict FINANCE and HATAKE from `exec`

---

## Gap 4: ACP Sessions — Real Coding Factory (MEDIUM)

**What OpenClaw has natively:**
```json5
// ENG can spawn Claude Code (ACPX) as a sub-agent to write real code
sessions_spawn({
  agentId: "eng",
  runtime: "acp",           // ACP protocol
  model: "acpx",            // Claude Code harness
  message: "implement spec X"
})
```
- `acpx` plugin = Claude Code as a delegated coding runtime
- ENG agent doesn't write code itself — it spawns a Claude Code session, gives it a task, collects output
- This is actual coding factory: ENG orchestrates, Claude Code implements, ENG reviews + commits

**What we have:**
- `eng-poc-continuous-0001` cron sends a message to ENG and asks it to "write code"
- ENG uses `exec` to run scripts — but the model itself is not a coding agent
- No ACP/ACPX plugin configured

**Fix needed:**
- Enable `acpx` plugin in `openclaw.json`
- Update ENG inner loop to use `sessions_spawn` with `runtime: "acp"`
- ENG becomes orchestrator, Claude Code does the actual implementation

---

## Gap 5: Web Search Without Perplexity (MEDIUM)

**What OpenClaw has natively:**
- Brave Search API (free tier available)
- Kimi/Moonshot (free tier)
- Gemini Google Search grounding
- All configured via `tools.web.search.provider`

**What we have:**
- Perplexity only — disabled now (quota exhausted)
- No fallback search provider
- RESEARCH agent is completely blind to current events

**Fix needed (no API key required for Brave free tier):**
```json5
tools: {
  web: {
    search: {
      enabled: true,
      provider: "brave",
      brave: { apiKey: { source: "env", id: "BRAVE_SEARCH_API_KEY" } }
    }
  }
}
```
- Sign up at brave.com/search/api (2,000 free queries/month)
- Or use `9router/if/kimi-k2` which has built-in search grounding

---

## Gap 6: `lightContext` on Cron Jobs (MEDIUM)

**What OpenClaw supports:**
```json5
// In cron payload:
{ "lightContext": true }  // Only loads HEARTBEAT.md, not full 5-file workspace bootstrap
```
- Most of our 72 crons do NOT need full workspace context
- Each full-context cron loads: GOALS.md + STATE.yaml + AUTONOMOUS.md + MEMORY.md + knowledge base
- With `lightContext: true`, only the relevant small file loads — 80%+ cheaper per cron run

**What we have:**
- No `lightContext` on any cron payload
- Every cron loads full workspace context — expensive and slow

**Fix needed:**
- Add `"lightContext": true` to all monitoring/watchdog crons
- Keep full context only for inner-loop crons that need to pick tasks

---

## Gap 7: Native Hooks Not Used (LOW)

**What OpenClaw has natively:**

| Hook | What it does |
|---|---|
| `session-memory` | Auto-saves session context to memory on `/new` |
| `bootstrap-extra-files` | Injects extra files at agent bootstrap |
| `boot-md` | Runs `BOOT.md` at gateway start — initialization tasks |
| `command-logger` | Logs all commands (already enabled) |

**What we have:**
- Only `command-logger` is enabled
- `boot-md` not enabled — gateway start has no initialization sequence
- `session-memory` not enabled — agents don't auto-save between sessions

**Fix needed:**
- Enable `boot-md` + create `workspace/BOOT.md` with startup checklist
- Enable `session-memory` for long-running agents (ENG, RESEARCH)

---

## Gap 8: Memory Quality (LOW)

**What OpenClaw supports:**
```json5
memory: {
  search: {
    hybrid: { mmr: { enabled: true } },    // diversity re-ranking
    temporalDecay: { enabled: true }        // recency boost
  },
  experimental: { sessionMemory: true }    // search past sessions
}
```

**What we have:**
- `memory: {}` — empty config, all defaults
- No MMR re-ranking (agents get repetitive/stale memory results)
- No temporal decay (old memories rank equally to recent ones)
- No session memory indexing

---

## Gap 9: Cron Session Retention (LOW)

**What OpenClaw supports:**
```json5
cron: {
  sessionRetention: "2h"   // clean up isolated cron sessions after 2h
}
```

**What we have:**
- `cron.sessionRetention` NOT SET — defaults unclear, sessions may be accumulating
- STATE.yaml shows 376 active sessions — likely many are stale cron sessions

**Fix needed:**
- Set `cron.sessionRetention: "2h"` to auto-clean cron sessions

---

## What's Actually Working Well

- ✅ 9Router with free-unlimited as primary — correct
- ✅ Loop detection configured and enabled
- ✅ Fallback chains: `minimax/MiniMax-M2.5` → `9router/heartbeat-cheap` (after today's fix)
- ✅ A2A via `sessions_send` — basic agent-to-agent comms working
- ✅ n8n webhook delegation for credential-isolated external calls
- ✅ `llm-task` plugin enabled
- ✅ Telegram bots × 7 agents all connected
- ✅ L4/L5 Telegram approval loop wired
- ✅ SOUL.md + GOALS.md + AUTONOMOUS.md inner loop pattern (structurally correct, just broken by wrong model)

---

## Priority Fix List

| Priority | Fix | Effort | Impact |
|---|---|---|---|
| P0 | ✅ Remove `ollama/llama3.1:8b` from all crons | Done | Restores all agent execution |
| P0 | ✅ Disable Perplexity web search | Done | Stops 401 flood |
| P1 | Configure native `heartbeat` per agent + HEARTBEAT.md files | 2h | Replaces fragile cron pulse |
| P1 | Set `maxSpawnDepth: 2` + update RED to use `sessions_spawn` | 1h | Enables real orchestration |
| P1 | Enable Brave Search (free tier) for RESEARCH | 30m | Restores web search |
| P2 | Per-agent `tools.profile` / deny lists | 1h | Security + efficiency |
| P2 | Add `lightContext: true` to monitoring crons | 30m | 60%+ cost reduction on crons |
| P2 | Enable `acpx` plugin for ENG coding factory | 2h | Real code output |
| P3 | Enable `boot-md` + `session-memory` hooks | 1h | Better initialization + memory |
| P3 | Set `cron.sessionRetention: "2h"` | 10m | Clean up 376 stale sessions |
| P3 | Memory MMR + temporal decay | 30m | Better memory recall |

---

## The One Thing That Makes It "Fully Autonomous"

The working example you saw was almost certainly using the **heartbeat + HEARTBEAT.md** pattern properly:

```
Gateway starts
  → boot-md hook runs BOOT.md (initializes state)
  → Each agent has heartbeat: { every: "30m", target: "last", lightContext: true }
  → Every 30m: agent reads HEARTBEAT.md, checks task queue, acts, replies HEARTBEAT_OK if idle
  → No crons needed for the "pulse" — it's native
  → Crons only for scheduled real-world tasks (portfolio review, lead gen, etc.)
  → sessions_spawn (depth 2) for actual work delegation
```

What we built instead: 72 crons trying to simulate what heartbeat does natively, using a model that wasn't installed. The structure is right — it just needs to use the native primitives.
