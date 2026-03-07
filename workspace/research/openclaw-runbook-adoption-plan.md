# OpenClaw Runbook (digitalknk) → Red OS adoption plan

Repo: https://github.com/digitalknk/openclaw-runbook

## What this repo is really pushing

1) **Coordinator vs worker model** (stop using one “god agent” for everything)
2) **Cost control by default** (cheap model for background/monitoring; strong models only when explicitly invoked)
3) **Explicit routing** (no magic/auto model selection; make it debuggable)
4) **Memory + task state are visible artifacts** (files, logs, trackers)
5) **Guardrails first** (tool policies, network binding, least privilege)

## Where we are today (your Red OS)

You already have the org chart:
- **RED (main)**: coordinator/CEO
- **ZEN (allrounder)**: fast generalist + web search
- **ENG / RESEARCH / OPS / FINANCE / INFOSEC**: specialists
- WhatsApp + Telegram channels connected
- Cron jobs installed for OPS monitoring + summaries

## Gaps vs the runbook

A) **Per-sender DM isolation** on WhatsApp (currently warned by `openclaw status`)
B) **Explicit “routing protocol” in chat** so team feels human and coordinated
C) **Shared artifacts** for collaboration (STATE.yaml / project folders) rather than ad-hoc chat
D) **Cost/latency resilience** (avoid invalid model IDs, auth invalidation; keep fallbacks sane)

## Proposed implementation plan (phased)

### Phase 0 — Read + index the repo (1 hour)
- Keep a local vendor copy at `workspace/research/vendor/openclaw-runbook`
- Create an index of:
  - `guide.md`
  - `examples/security-hardening.md`
  - `examples/heartbeat-example.md`
  - `examples/ta[REDACTED]
  - `showcases/*`

Deliverable: `workspace/research/openclaw-runbook-index.md` with quick links + what to steal.

### Phase 1 — Team protocol (“human-like team”) (same day)

**1) Add a routing convention** in *your* workflow:
- You type in WhatsApp/Telegram:
  - `@research: …`
  - `@eng: …`
  - `@ops: …`
  - `@finance: …`
  - `@infosec: …`

**2) RED becomes the coordinator**:
- RED parses the request, assigns sub-tasks, and merges output.

**3) Shared project folder per initiative**:
- `workspace/projects/<project>/STATE.yaml`
- `workspace/projects/<project>/brief.md`
- `workspace/projects/<project>/notes.md`
- `workspace/projects/<project>/deliverables/…`

This copies the runbook’s “make state explicit” idea.

### Phase 2 — Adopt 3 showcases that fit you (48 hours)

Pick 3 to implement first (these map cleanly to your existing stack):

1) **Daily brief** (`showcases/daily-brief.md`)
   - Delivery: WhatsApp to you
   - Content: calendar + tasks + weather + top 3 news + “what should I do today?”

2) **Tech discoveries** (`showcases/tech-discoveries.md`)
   - Delivery: Telegram or WhatsApp
   - Content: curated tech/security/AI updates; citations; short

3) **Idea pipeline** (`showcases/idea-pipeline.md`)
   - Workflow: you drop ideas in chat; RESEARCH expands overnight; ENG proposes MVP sketch; OPS adds rollout plan.

Mechanics:
- Use **cron isolated jobs** for scheduled work.
- Use **agent-to-agent via sessions** (send into the specialist sessions) rather than ad-hoc multi-chat.

### Phase 3 — Security + stability hardening (this week)

From `examples/security-hardening.md`, apply only what matches your preferences:

- Keep gateway loopback-only (already)
- Enable **per-sender DM isolation** on WhatsApp:
  - set `session.dmScope = "per-channel-peer"` (prevents context leaking between random WhatsApp DMs)
- Tighten tool allow/deny per agent (OPS/INFOSEC have broader tools; public-facing agents restricted)
- Add cost alerts + explicit model fallback chains (remove invalid models)

### Phase 4 — “Orchestrator” as an internal router (optional)

The runbook’s orchestrator pattern is mostly about routing coding tasks to different tooling.

For **your** constraints:
- Coding is via `cursor-agent --model sonnet-4.5`.
So the orchestrator becomes:
- Decide whether a task is:
  - quick answer (RED inline)
  - research (ZEN/RESEARCH)
  - coding (ENG → cursor-agent)
  - ops (OPS)

## Concrete next actions

1) Implement WhatsApp DM isolation (recommended; prevents cross-user leakage)
2) Create `projects/<name>/STATE.yaml` template + commit to workspace
3) Add one cron: “Daily brief” to WhatsApp
4) Add one cron: “Tech discoveries” to Telegram

## Open questions for Anurag

- Which channel should get your daily brief: WhatsApp or Telegram?
- Do you want daily brief every day or weekdays only?
- Do you want team routing keywords to be strict (`@eng:` required) or optional?
