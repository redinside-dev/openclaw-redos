# RedOS Decision Log — Event Sourced

**RULES (race-condition safe):**
- APPEND ONLY — never edit existing entries
- One entry per decision, timestamped
- Format: `## DECISION-{YYYYMMDD}-{NNN}` header, then structured fields
- Any agent can log a decision; only RED can mark one as "overridden"

---

## DECISION-20260228-001
**ts:** 2026-02-28T00:00:00Z
**agent:** main (RED)
**type:** architecture
**decision:** OpenClaw-native only — no custom middleware
**rationale:** Custom interceptors (check-command.cjs, interceptExec) violate upgrade-safety contract. Native sandbox + tools.deny provides equivalent enforcement at gateway level.
**impact:** policy-gate.cjs demoted to audit tool; tool-call-interceptor stripped of exec gate
**status:** active

## DECISION-20260228-002
**ts:** 2026-02-28T00:00:00Z
**agent:** main (RED)
**type:** security
**decision:** Remove ollama/llama3.1:8b from fallback chains of unsandboxed agents
**rationale:** Security audit CRITICAL — small model without sandbox + web tools = uncontrolled input risk
**impact:** main, allrounder, research, eng fallbacks cleaned; OPS 8b kept as local last resort
**status:** active

## DECISION-20260228-003
**ts:** 2026-02-28T00:00:00Z
**agent:** ops
**type:** reliability
**decision:** Remove sandbox from eng and ops agents
**rationale:** User instruction — sandbox isolation was blocking workspace file writes, preventing real work. Security comes from tools.deny and subagents.allowAgents.
**impact:** ENG can write workspace files; OPS can exec health checks freely
**status:** active

## DECISION-20260228-004
**ts:** 2026-02-28T00:00:00Z
**agent:** main (RED)
**type:** reliability
**decision:** OPS primary model: ollama/llama3.1:8b → 9router/free-unlimited
**rationale:** 8b causes 30-60s A2A latency. All sessions_send to OPS timed out at 15s. Switch to hosted model makes OPS A2A reliable (<5s).
**impact:** OPS sessions_send timeout reduced 90s→45s in SOUL.md
**status:** active

## DECISION-20260228-005
**ts:** 2026-02-28T00:00:00Z
**agent:** main (RED)
**type:** architecture
**decision:** File-based coordination (STATE.yaml, GOALS.md, DECISIONS.md) adopted
**rationale:** Inspired by awesome-openclaw-usecases file-coordination pattern. Eliminates message-passing bottlenecks; agents can share state without blocking on sessions_send.
**impact:** STATE.yaml, GOALS.md, DECISIONS.md, PROJECT_STATUS.md, AUTONOMOUS.md created
**status:** active
