# A2A Handoff Protocol

Status: ACTIVE
Owner: ENG
Version: 2.0
Last Updated: 2026-03-02
Change: v2 adds `context_chain` field, conflict resolution protocol, updated SLA matrix, and deployment checklist (AUTO-028 / AUTO-030).

---

## 1) Purpose

Define a single, structured protocol for agent-to-agent (A2A) handoffs that improves reliability under timeout conditions, provides clear SLA rules, and preserves full task lineage via `context_chain`.

This protocol applies to all handoffs sent with:
- `sessions_send`
- `sessions_spawn`

---

## 2) Handoff Packet (Required Structure)

Every handoff must carry the following fields. JSON is preferred; plain-text header is the fallback.

```json
{
  "handoffId": "A2A-20260302-ENG-001",
  "taskId": "AUTO-028",
  "from": "eng",
  "to": "ops",
  "priority": "P1",
  "requestedAt": "2026-03-02T14:00:00Z",
  "responseSlaSeconds": 900,
  "deliveryMode": "sessions_send",
  "summary": "One-line request summary",
  "context": {
    "goal": "Why this handoff exists",
    "inputs": ["file/path/or/fact"],
    "constraints": ["hard constraints"],
    "definitionOfDone": ["completion checks"]
  },
  "context_chain": [
    {
      "step": 1,
      "agent": "main",
      "taskId": "GOAL-006",
      "ts": "2026-03-02T10:00:00Z",
      "action": "Assigned AUTO-028 to ENG for context engineering implementation",
      "artifacts": []
    },
    {
      "step": 2,
      "agent": "eng",
      "taskId": "AUTO-028",
      "ts": "2026-03-02T14:00:00Z",
      "action": "Claimed AUTO-028, planning A2A handoff protocol v2 + knowledge bases + episodes backfill",
      "artifacts": ["workspace/docs/a2a-handoff-protocol.md"]
    }
  ],
  "artifacts": [
    "workspace/docs/example.md"
  ],
  "fallback": {
    "enabled": true,
    "steps": [
      "retry_same_channel",
      "retry_with_compact_context",
      "slack_fallback",
      "ticket_escalation"
    ]
  }
}
```

### 2.1) `context_chain` field spec

`context_chain` is an ordered array of handoff steps tracing the full task lineage from origin to current agent. It must be:
- Appended (not overwritten) by each receiving agent before forwarding.
- Present in every handoff involving 2+ agents.
- Preserved in the final A2A log entry for the task.

Each step entry:

| Field | Type | Required | Description |
|---|---|---|---|
| `step` | int | ✅ | Monotonically increasing index (1-based) |
| `agent` | string | ✅ | Agent ID that generated this step |
| `taskId` | string | ✅ | Task/goal reference at this step |
| `ts` | ISO8601 | ✅ | Timestamp this step was appended |
| `action` | string | ✅ | One-sentence description of what this agent did/decided |
| `artifacts` | string[] | ✅ | File paths or empty array |

---

## 3) Plain-Text Header Fallback

When JSON is not practical, include this minimum header:

```text
[TASK-ID: AUTO-028] [HANDOFF-ID: A2A-20260302-ENG-001]
PRIORITY: P1
SLA: ack <= 15m, completion <= 2h
REQUEST: <one-line request>
DONE-WHEN: <completion criteria>
FALLBACK: retry x2 -> Slack mission-control -> ticket escalation
CONTEXT-CHAIN: step=2 agent=eng ts=2026-03-02T14:00:00Z action="Claimed and starting"
```

---

## 4) P0–P3 SLA Matrix

| Priority | Ack SLA | Completion SLA | Timeout Action | Human Alert |
|---|---:|---:|---|---|
| P0 | 5 min | 30 min | Immediate mission-control post + human alert | ✅ mandatory |
| P1 | 15 min | 2 hours | Mission-control escalation after retry #2 | ✅ if breach >1h |
| P2 | 60 min | 8 hours | Ticket tracker escalation | ❌ |
| P3 | 4 hours | 48 hours | Include in weekly review | ❌ |

Notes:
- **Ack** = explicit receipt + ownership claimed in log.
- **Completion** = definition-of-done criteria satisfied + result sent back + log appended.
- SLA clock starts at `requestedAt` in the packet.

---

## 5) Retry and Fallback Sequence

Use this exact sequence for failed or timed-out handoffs. **Never skip steps.**

### Step 1 — Primary send
- Send with full context packet including `context_chain`.
- Wait until ack SLA boundary.
- Log: `status: "sent"`.

### Step 2 — Retry #1 (same channel)
- Resend same handoff with `RETRY-1` marker added to `handoffId` suffix.
- Include original `handoffId` in body for dedup.
- Wait half of remaining SLA window.
- Log: `status: "retry_1"`, `fallbackStep: "retry_same_channel"`.

### Step 3 — Retry #2 (compact context)
- Resend with compressed context: summary + critical artifacts only.
- Mark `RETRY-2`, include original `handoffId`.
- Log: `status: "retry_2"`, `fallbackStep: "retry_compact_context"`.

### Step 4 — Slack channel fallback
- Post escalation note to `#redos-mission-control` (C0AEV3MDEDD) with:
  - `handoffId`, `taskId`, target agent, retries attempted, blocker impact.
- Log: `status: "escalated"`, `fallbackStep: "slack_fallback"`.

### Step 5 — Ticket fallback
- Open/update ticket in `workspace/ops/TICKET-TRACKER.md` with breach status.
- Tag ticket `SLA-BREACH`.
- Log: `status: "ticketed"`, `fallbackStep: "ticket_escalation"`.

### Step 6 — Human fallback (P0/P1 only)
- If still unacked after steps 1–5: trigger Telegram alert to owner.
- Log: `status: "human_alerted"`, `fallbackStep: "human_escalation"`.

### Fast-fail rules
- **Never** retry more than 2× on the same channel.
- **Never** skip Slack fallback for P0/P1.
- If the same handoff times out 3+ times in a row to the same target, open a `TICKET` immediately and suspend that channel — route through alternate delivery.

---

## 6) Conflict Resolution Protocol

When two agents claim the same task or produce conflicting artifacts simultaneously:

### Detection
- Each agent checks `workspace/AUTONOMOUS.md` before claiming — if `TODO` row exists for that task, do not claim.
- If a write conflict is detected post-facto (two log entries for the same task/step): the **earlier timestamp wins**.

### Resolution steps
1. **Identify conflict**: both agents log to `a2a-delegations.jsonl` with `status: "conflict_detected"`.
2. **Primary wins rule**: agent with the earlier `requestedAt` timestamp in their claim row is primary.
3. **Secondary yields**: secondary agent marks its work `SUPERSEDED`, appends note in `tasks-log.md`.
4. **Primary reviews secondary artifact** (it may contain useful work) and merges what is valid.
5. **Log resolution**: both agents append a `status: "conflict_resolved"` entry with `primary` and `superseded` agent fields.
6. **Update AUTONOMOUS.md**: single `TODO` row remains; duplicate is removed.

### Parallel work guardrails
- Only one agent may hold `TODO` on any given `taskId` at a time.
- Before starting parallel sub-tasks on the same deliverable, the lead agent must post a sub-task ownership table to `#redos-mission-control` Slack channel.
- Sub-tasks must use derived `handoffId` (e.g. `A2A-20260302-ENG-001-sub-1`) so they can be traced independently.

---

## 7) Standard Outcome States

Each handoff must end in exactly one terminal status:

| Status | Meaning |
|---|---|
| `accepted` | Received and ownership confirmed |
| `rejected` | Refused with reason |
| `blocked` | Cannot proceed — blocker + owner declared |
| `completed` | Done criteria met + result returned |
| `expired` | SLA breached without acceptance |
| `superseded` | Overridden by conflict resolution (secondary agent) |
| `conflict_resolved` | Conflict cleared; primary agent continues |

---

## 8) Logging Requirements

Every dispatch and terminal result must be appended to:
- `workspace/logs/a2a-delegations.jsonl`

Required keys per line:

```json
{
  "ts": "ISO8601",
  "from": "agent-id",
  "to": "agent-id",
  "task": "one-line description",
  "status": "sent|retry_1|retry_2|escalated|ticketed|completed|...",
  "handoffId": "A2A-YYYYMMDD-AGENT-NNN",
  "taskId": "AUTO-NNN",
  "priority": "P0|P1|P2|P3",
  "context_chain_length": 2,
  "fallbackStep": "retry_same_channel|...",
  "slaBreach": false
}
```

---

## 9) Definition of Done for Any Handoff

A handoff is complete when **all** of the following are true:
1. Receiver acknowledged ownership within ack SLA.
2. Requested deliverable meets declared done criteria.
3. Result sent back to requester with artifact paths.
4. A2A log line appended with terminal status.
5. `context_chain` updated with receiver's step appended.
6. If SLA breached: fallback/escalation evidence in log with `slaBreach: true`.

---

## 10) Quick Implementation Rules (non-negotiable)

- Always include `handoffId` and `taskId` on the first line of every message.
- Always include `context_chain` — append your step before forwarding.
- Never send a handoff without explicit SLA.
- Never retry more than 2× on the same channel.
- For P0/P1: Slack fallback is mandatory after retry #2.
- If a handoff times out repeatedly, convert to ticketed blocker immediately.
- Conflict: earlier timestamp wins; secondary yields and marks `SUPERSEDED`.
