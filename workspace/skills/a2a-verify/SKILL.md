# Skill: a2a-verify

**A2A capability checklist, 5 smoke tests, instrumentation schema, root-cause diagnosis, and enforcement rules.**

---

## 1. A2A CAPABILITY CHECKLIST

### Required settings — all must be present

| Setting | Location | Required value | Current value |
|---------|----------|---------------|---------------|
| `tools.agentToAgent.enabled` | openclaw.json | `true` | ✅ `true` |
| `tools.agentToAgent.allow` | openclaw.json | all 8 agent IDs | ✅ all listed |
| `tools.sessions.visibility` | openclaw.json | `"all"` | ✅ `"all"` |
| `subagents.allowAgents` (main) | agents.list | `["*"]` | ✅ `["*"]` |
| `subagents.allowAgents` (allrounder) | agents.list | `["*"]` | ✅ `["*"]` |
| `subagents.allowAgents` (eng) | agents.list | `["infosec","eng"]` | ✅ fixed |
| `subagents.allowAgents` (ops) | agents.list | `["infosec"]` | ✅ |
| `subagents.allowAgents` (infosec) | agents.list | `[]` (reviewer only) | ✅ |
| `sessions_send` in sandbox allow | tools.sandbox | in allow list | ✅ |

### Silent A2A breakers — check these first

| Breaker | How to confirm | Fix |
|---------|---------------|-----|
| **Target session cold/sleeping** | `session-warmup-last.json` shows "timeout" | Session warmup cron fires every 20min — check it ran |
| **`subagents.allowAgents: []`** | `python3 -c "..."` audit above | Set allowAgents to required list per agent |
| **sessions.visibility: "own"** | grep openclaw.json | Must be `"all"` — agents can't see each other's sessions otherwise |
| **Sandbox denies sessions_send** | tools.sandbox.tools.deny | `sessions_send` must NOT be in deny list |
| **sessions_send timeout too short** | a2a-delegations.jsonl | For slow Ollama agents: use `timeoutSeconds=60` minimum; `90` for OPS |
| **Target agent in sandbox, exec denied** | subagents call requires exec? | Check sandbox tool policy per agent |
| **Loop detection fires** | gateway.log "loop detected" | Add `sessionTarget: "isolated"` to spawns |

---

## 2. FIVE SMOKE TESTS

Run from RED's main Telegram chat with this exact message prefix each time. RED will execute via SOUL.md A2A rules.

### Test 1 — RED → ZEN simple handoff
**Send to RED Telegram:**
```
A2A-SMOKE-1: Delegate to ZEN: ask ZEN what its current top priority is and report back to me with ZEN's exact reply. Use sessions_send(sessionKey="agent:allrounder:main", ...). Log to a2a-delegations.jsonl.
```
**Expected tool calls:** `sessions_send(sessionKey="agent:allrounder:main", message="RED here — what is your current top priority?", timeoutSeconds=60)`
**Pass criteria:**
- `a2a-delegations.jsonl` gets a `dispatch` + `result` entry
- ZEN's reply appears in RED's response
- No "timeout" status

### Test 2 — ZEN → ENG artifact delivery
**Send to ZEN Telegram:**
```
A2A-SMOKE-2: Spawn ENG to create a minimal file at workspace/tmp/a2a-test-artifact.txt containing today's date and the text "ENG delivered this". Wait for ENG to confirm completion. Post result to #redos-mission-control (C0AEV3MDEDD). Log to a2a-delegations.jsonl.
```
**Expected tool calls:**
1. ZEN posts to `#redos-mission-control` announcing delegation
2. `sessions_spawn(agentId="eng", task="Write workspace/tmp/a2a-test-artifact.txt with today's date...")`
3. ENG writes the file, posts threaded reply to Slack
4. ZEN posts synthesis to thread
**Pass criteria:**
- File `workspace/tmp/a2a-test-artifact.txt` exists with correct content
- Slack thread in `#redos-mission-control` has ≥2 messages (ZEN parent + ENG reply)
- `a2a-delegations.jsonl` has `dispatch` + `result` pair

### Test 3 — OPS → INFOSEC L3 approval
**Send to OPS Telegram:**
```
A2A-SMOKE-3: Request INFOSEC review for a simulated npm install. Use: sessions_send(sessionKey="agent:infosec:main", message="MAKER-CHECKER L3 REVIEW\nAction: npm install lodash\nRisk: new dependency\nApprove? (yes/no)", timeoutSeconds=120). Report INFOSEC's exact reply. Log to a2a-delegations.jsonl.
```
**Expected tool calls:** `sessions_send(sessionKey="agent:infosec:main", message="MAKER-CHECKER L3...", timeoutSeconds=120)`
**Pass criteria:**
- INFOSEC replies with "APPROVED" or "DENIED" + one-line reason
- Reply arrives within 120s
- `a2a-delegations.jsonl` has the pair

### Test 4 — ENG self-spawns a subagent
**Send to ENG Telegram:**
```
A2A-SMOKE-4: Spawn an isolated subagent of yourself (sessions_spawn agentId="eng") with this narrow task: "Write the string 'SUBAGENT-OK' to workspace/tmp/a2a-subagent-test.txt and return the word DONE." Report back the subagent's return value. Log to a2a-delegations.jsonl.
```
**Expected tool calls:** `sessions_spawn(agentId="eng", task="Write 'SUBAGENT-OK' to workspace/tmp/a2a-subagent-test.txt...")`
**Pass criteria:**
- File `workspace/tmp/a2a-subagent-test.txt` contains "SUBAGENT-OK"
- ENG's reply includes "DONE"
- `a2a-delegations.jsonl` has the pair
- **Prerequisite:** `eng.subagents.allowAgents` must include `"eng"` ✅ (fixed)

### Test 5 — Multi-agent Slack thread
**Send to ZEN Telegram:**
```
A2A-SMOKE-5: Post a task to #redos-mission-control (C0AEV3MDEDD): "Team sync: each agent report one sentence on what you worked on today." Then spawn ENG and OPS in parallel (sessions_spawn each), ask them to post their reply as a threaded reply to that Slack message using curl. After both reply, post a final synthesis as a closing thread reply. Log all to a2a-delegations.jsonl.
```
**Expected Slack output:**
```
🌐 ZEN: Team sync requested. Responses below ↓
  ↳ 💻 ENG: [one sentence on today's work]
  ↳ ⚙️ OPS: [one sentence on today's work]
  ↳ 🌐 ZEN: ✅ Synthesis: [summary]
```
**Pass criteria:**
- ≥3 messages in one Slack thread
- Both ENG and OPS replies present
- Thread visible in `#redos-mission-control`

---

## 3. INSTRUMENTATION — a2a-events.jsonl

### Log file
```
workspace/logs/a2a-events.jsonl
```

### Schema (one JSON object per line)
```json
{
  "ts":          "2026-02-28T09:00:00Z",
  "taskId":      "TASK-20260228-001",
  "fromAgent":   "main",
  "toAgent":     "eng",
  "messageType": "spawn|send|reply|timeout|error",
  "channel":     "sessions_spawn|sessions_send|slack|telegram",
  "threadId":    "C0AEV3MDEDD/1772265000.123456",
  "outcome":     "delivered|timeout|error|pending",
  "durationMs":  4200
}
```

### Metrics computed nightly by OPS from a2a-events.jsonl

| Metric | Formula | Alert threshold |
|--------|---------|----------------|
| A2A count/agent/day | count rows where fromAgent=X, date=today | < 3 = idle agent |
| Response latency p50/p95 | durationMs grouped by toAgent | p95 > 30s = slow |
| Handoff completion rate | delivered / (delivered+timeout+error) | < 80% = broken |
| Collaboration ratio | taskIds with >1 distinct agent / total taskIds | < 30% = silos |
| Silent work detector | tasks where channel="sessions_spawn" but NO slack threadId | > 20% = dark work |
| Timeout rate per agent | timeout / total where toAgent=X | > 20% = cold session |

### taskId propagation rule
Every `sessions_spawn` and `sessions_send` call MUST carry a `taskId` header in the message:
```
[TASK-ID: TASK-20260228-001]
<actual message content>
```
Receiving agent includes the same task ID in its reply and in any downstream spawns, so the full chain is traceable.

---

## 4. ROOT CAUSE: WHY IT FEELS LIKE NO COMMUNICATION

### Cause 1 — Sessions go cold (PRIMARY cause — all 6 timeouts)
**Evidence:** `a2a-delegations.jsonl` shows 6/7 attempts as `"timeout"`. No agent main sessions were active at time of check.
**How to confirm:** Check `workspace/tmp/session-warmup-last.json` — if eng/ops/infosec show "timeout" there too, sessions are cold.
**Fix:** Session warmup cron (every 20min, already added). Also: each agent's heartbeat keeps its OWN session alive, but does NOT warm other agents' sessions.

### Cause 2 — `eng.allowAgents: []` blocked all ENG spawning
**Evidence:** Phase 1 added `allowAgents: []` to eng. Test 4 would hard-fail.
**How to confirm:** `openclaw agent --agent eng --message "spawn a subagent" --json` → error about allowAgents.
**Fix:** `eng.allowAgents: ["infosec", "eng"]` ✅ done.

### Cause 3 — No enforced "public status update" rule
**Evidence:** `a2a-delegations.jsonl` has 1 entry with `"status":"no_a2a_required"` — ENG decided to work solo without notifying anyone.
**How to confirm:** Check Slack channels — do agents post after completing tasks?
**Fix:** See Section 5 — SOUL.md enforcement.

### Cause 4 — Allrounder (ZEN) absorbs everything
**Evidence:** ZEN is the catch-all allrounder. When a message doesn't route to a specialist, ZEN handles it alone without delegating.
**How to confirm:** Message history in `#redos-zen` — if ZEN has many posts but `#redos-mission-control` has few, ZEN is siloing.
**Fix:** ZEN needs a rule: any task with complexity > "simple lookup" MUST spawn a specialist.

### Cause 5 — timeoutSeconds too short for slow models
**Evidence:** OPS uses `ollama/llama3.1:8b` — cold start + inference = 30-60s. Sessions_send with `timeoutSeconds=30` will always fail for OPS.
**How to confirm:** `tail -f ~/.openclaw/logs/gateway.log | grep timeout`
**Fix:** Use `timeoutSeconds=90` when calling OPS. `timeoutSeconds=60` for all others.

### Cause 6 — Slack threading requires curl, not native `message` tool
**Evidence:** `a2a-transparency/SKILL.md` line 156: "The OpenClaw `slack` skill does not expose `thread_ts`."
**How to confirm:** Try `message(channel="slack", thread_ts="...")` → parameter ignored.
**Fix:** Already documented in a2a-transparency — use `exec: curl ...` for thread replies. Agents must be reminded of this.

---

## 5. ENFORCEMENT: MANDATORY COLLABORATION RULES

These rules are now in SOUL.md. Summary:

### ZEN mandatory peer-review
For any task tagged L2+ (code change, config change, external API, new dependency):
- ZEN MUST assign at least 1 reviewer via `sessions_send` BEFORE marking the task done
- Reviewer assignment logged to `a2a-events.jsonl` with `messageType: "review_request"`

### ENG mandatory INFOSEC sign-off
For any of: new tool, permission change, dependency add, exec command, secret access:
- ENG MUST call `check-command.cjs` (already enforced)
- ENG MUST `sessions_send` INFOSEC with MAKER-CHECKER L3 REVIEW
- No "INFOSEC unavailable" skip — if timeout: escalate to L4 Telegram

### OPS mandatory Slack pre-notification
Before any restart, deploy, or cron change:
- OPS MUST post to `#redos-ops` (C0AGFA9417T): `⚙️ OPS: about to [action] — ETA [time]`
- After completion: follow-up post with result

### No silent work rule
Any agent session running > 5 minutes on a task MUST post a progress update to its personal Slack channel. If a task completes without any Slack post, OPS flags it as "dark work" in the nightly eval.

### taskId required on all A2A calls
Every `sessions_spawn` and `sessions_send` message MUST start with `[TASK-ID: TASK-YYYYMMDD-NNN]`.
OPS generates the task ID and assigns it at the start of each sprint/task.

---

## SMOKE TEST RUNNER

To run all 5 tests, send this to RED on Telegram:
```
RUN A2A-SMOKE-TESTS: Execute smoke tests 1 through 5 from workspace/skills/a2a-verify/SKILL.md in order. After each test, log the result to workspace/logs/a2a-smoke-results.jsonl with fields: {test, ts, pass, evidence}. Send me a summary when all 5 are done.
```
