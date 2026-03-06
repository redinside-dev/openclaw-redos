---
name: a2a-transparency
description: Agent-to-Agent transparency protocol. Use this skill whenever delegating to another agent via sessions_spawn. Makes all A2A collaboration visible on Slack — every delegation, every result, every team conversation.
---

# A2A Transparency — Visible Agent Teamwork on Slack

Every `sessions_spawn` call MUST be visible on Slack. This skill defines the complete protocol.

---

## Channel Structure

| Channel | ID | Purpose |
|---|---|---|
| `#redos-mission-control` | C0AEV3MDEDD | CEO directives, A2A delegation threads, all inter-agent tasks |
| `#redos-scrum` | C0AEV3J2L23 | Daily standups, team check-ins |
| `#openclaw-optimization` | C0AF4KB4TUK | Knowledge sharing: research findings, ENG code, INFOSEC reviews |
| `#all-redos` | C0AG4AY6VME | Company-wide announcements, team greetings |

### Per-Agent Work Channels
Each agent also posts work updates to their own channel. Channel IDs are in
`config/slack-channels.json` (created by RED on first deploy).

| Channel | ID | Agent | Posts What |
|---|---|---|---|
| `#redos-red` | C0AFLUZ4P71 | RED | Task decisions, delegation summaries, CEO directives |
| `#redos-zen` | C0AFZ09R9V3 | ZEN | Research findings, briefings |
| `#redos-eng` | C0AFW1B0QUB | ENG | Code changes, architecture decisions |
| `#redos-research` | C0AG615R5E0 | RESEARCH | Analysis reports, learning updates |
| `#redos-finance` | C0AG6166CJ0 | FINANCE | Financial reports, budget status |
| `#redos-ops` | C0AGFA9417T | OPS | Health checks, orchestration log, task tracking |
| `#redos-infosec` | C0AG2CTU6AW | INFOSEC | Security reviews, alerts |

IDs are also in `config/slack-channels.json`. Use the ID directly when posting via the slack tool.
Post a brief update to your channel after completing any significant task.

---

## The Transparent A2A Protocol

### Step 1 — Dispatcher: Post before spawning

Before calling `sessions_spawn`, post to `#redos-mission-control`:

```
🔀 *{YOUR_EMOJI} {YOUR_IDENTITY}* → *{TARGET_EMOJI} {TARGET_AGENT}*
*Task:* {one-line summary}
```

**Save the returned message timestamp** (`ts`) — you'll pass it to the subagent.

Example:
```
🔀 *👑 RED (CEO)* → *💻 ENG (Engineering)*
*Task:* Write a cron job to monitor disk usage
```

### Step 2 — Dispatcher: Pass Slack thread context to subagent

Include this in your `sessions_spawn` task string:

```
[SLACK THREAD] When done, post your result as a threaded reply:
  BOT_TOKEN=$SLACK_BOT_TOKEN
  CHANNEL=C0AEV3MDEDD
  THREAD_TS={ts_from_step_1}
  YOUR_IDENTITY=💻 *ENG (Engineering Lead)*

Use exec to post:
  curl -s -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer $BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"channel":"C0AEV3MDEDD","thread_ts":"{ts}","text":"💻 *ENG*: {your result}"}'
```

### Step 3 — Subagent: Do the work, then post result to thread

The spawned agent:
1. Completes its task
2. Posts its result to the Slack thread using `exec`:

```bash
curl -s -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "C0AEV3MDEDD",
    "thread_ts": "{ts_passed_from_parent}",
    "text": "💻 *ENG (Engineering Lead)*:\n{result summary}"
  }'
```

3. Returns the result to the parent agent normally.

### Step 4 — Dispatcher: Post final synthesis to thread

After receiving all subagent results, post a summary in the same thread:

```bash
curl -s -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "C0AEV3MDEDD",
    "thread_ts": "{ts}",
    "text": "👑 *RED (CEO)*:\n✅ Task complete. {synthesis}"
  }'
```

---

## Multi-Agent Group Call (e.g. "hi everyone")

When RED receives a team greeting or needs all agents:

1. **Post ONE parent message** to the target channel — save the `ts`
2. **Spawn each agent** in parallel, passing the channel + thread_ts
3. **Each agent** posts their response as a threaded reply
4. Result: a visible multi-voice thread on Slack

**Example parent message:**
```
👑 *RED (CEO)*: Team check-in requested. Responses below ↓
```

**Example thread replies:**
```
🌐 *ZEN (CSO)*: Morning! Trending: [X, Y, Z]...
💻 *ENG (Engineering Lead)*: Working on [current task]...
🔬 *RESEARCH (Research Analyst)*: Completed analysis on [topic]...
⚙️ *OPS (Scrum Master)*: All systems green. Next standup at 9:15am.
💰 *FINANCE (Finance Analyst)*: Daily spend: $X. On budget.
🔒 *INFOSEC (Security Officer)*: No alerts. Policy review scheduled.
```

---

## Agent Identity Reference

| Agent | Emoji | Identity String |
|---|---|---|
| main (RED) | 👑 | `👑 *RED (CEO)*` |
| allrounder (ZEN) | 🌐 | `🌐 *ZEN (CSO)*` |
| eng (ENG) | 💻 | `💻 *ENG (Engineering Lead)*` |
| research (RESEARCH) | 🔬 | `🔬 *RESEARCH (Research Analyst)*` |
| finance (FINANCE) | 💰 | `💰 *FINANCE (Finance Analyst)*` |
| ops (OPS) | ⚙️ | `⚙️ *OPS (Scrum Master)*` |
| infosec (INFOSEC) | 🔒 | `🔒 *INFOSEC (Security Officer)*` |
| hatake (HATAKE) | 🥷 | `🥷 *HATAKE (Parser)*` |

---

## Slack Thread API (Direct, Always Works)

The OpenClaw `slack` skill does not expose `thread_ts`. Use `exec` with curl for threads:

```bash
# Post a new top-level message (returns ts for threading)
curl -s -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"C0AEV3MDEDD","text":"your message"}' \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('ts',''))"

# Reply in thread (use ts from above)
curl -s -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"C0AEV3MDEDD","thread_ts":"1234567890.123456","text":"reply text"}'
```

---

## Task Registry Protocol

When you accept a delegated task (spawned by another agent), register it:

1. Read `ops/ta[REDACTED]
2. Add an entry:
```json
{
  "id": "TASK-<YYYYMMDD>-<NNN>",
  "title": "<task summary>",
  "assignee": "<your agentId>",
  "requestedBy": "<spawner agentId>",
  "status": "in_progress",
  "eta": "<ISO datetime>",
  "startedAt": "<ISO datetime>",
  "completedAt": null,
  "notes": "Spawned at <time>"
}
```
3. When done: set `"status": "completed"` and `"completedAt": "<ISO>"`
4. Post completion to your personal channel and to #redos-mission-control thread

## A2A Delegation Log Protocol

Append to `logs/a2a-delegations.jsonl` on every spawn:
```json
{"type":"dispatch","ts":"<ISO>","spawner":"<agentId>","subagent":"<agentId>","task":"<one-line summary>"}
```
On result receipt:
```json
{"type":"result","ts":"<ISO>","spawner":"<agentId>","subagent":"<agentId>","task":"<same summary>","result_preview":"<first 100 chars of result>"}
```
This file is read by the Mission Control dashboard Team tab.

## What "Groups" Map To

| Human Concept | OpenClaw Equivalent |
|---|---|
| Group DM / team chat | Slack channel (e.g. #redos-mission-control) |
| Meeting / group call | A Slack thread started by RED with all agents replying |
| 1:1 conversation | sessions_spawn with a single agent + thread in #mission-control |
| Async collaboration | Cron jobs posting to #openclaw-optimization |
| Standup | #redos-scrum daily cron posts |
