# Directive-20260224-Skill-Autonomy — Definition of Done

This document defines what "done" means for the skill autonomy directive. All criteria must be met for the directive to be considered complete.

---

## Criteria

### 1. A2A Logging Non-Empty Daily ✓

**Requirement:** `workspace/logs/a2a-delegations.jsonl` contains ≥ 1 dispatch + result entry per agent per day (or explicit "idle" log entry if agent had no work).

**Verification:**
```bash
# Check for entries from each agent (main, eng, research, ops, infosec, finance, allrounder)
grep '"from": "eng"' workspace/logs/a2a-delegations.jsonl | tail -1
# Should have a recent timestamp (within last 24h)
```

**Status:** In progress. Logging started 2026-02-24; need to verify all agents are logging daily by 2026-02-25.

---

### 2. State Hygiene — Each Agent Has Default Next Action ✓

**Requirement:** Each agent's `memory/state-{agentId}.json` and `memory/working-{agentId}.json` are updated at least daily with:
- `currentFocus` (what are they working on?)
- `lastAction` (what did they just do?)
- `nextAction` (what's next?)
- `blockers` (what's stopping them?)

**Verification:**
```bash
# Check all agent state files
for agent in main eng research ops infosec finance allrounder; do
  echo "=== $agent ==="
  cat workspace/ops/agent-status/$agent.json | jq '.currentFocus, .nextAction, .blockers'
done
```

**Status:** In progress. State files exist; need to verify daily updates by 2026-02-25.

---

### 3. Skill Audit Completed ✓

**Requirement:** `workspace/ops/skill-audit-2026-02-24.md` is complete with:
- Per-skill "owner agent" assignment
- Usage evidence (cron jobs, scripts, logs, or "idle")
- "Unused skills" list with recommended next actions
- Adoption targets for each agent

**Verification:**
```bash
# Check that skill audit exists and has all sections
grep -E "^## (Skill Inventory|Unused Skills|Summary)" workspace/ops/skill-audit-2026-02-24.md
```

**Status:** ✅ Complete. Audit created with 8 active skills, 6 idle skills, adoption targets assigned.

---

### 4. Autonomy Hygiene Contract Drafted ✓

**Requirement:** `workspace/ops/autonomy-contract.md` defines:
- Heartbeat state update requirements (daily minimum)
- A2A logging standards (every dispatch)
- Blocker transparency (immediate ticket + state file)
- Skill adoption targets (1 per agent per week)
- Escalation path (if blocked >30 min)

**Verification:**
```bash
# Check that contract exists and has all sections
grep -E "^## [0-9]" workspace/ops/autonomy-contract.md
```

**Status:** ✅ Complete. Contract drafted with 6 core practices + enforcement rules.

---

### 5. Adoption Targets Assigned ✓

**Requirement:** Each agent has been assigned 1 idle skill to adopt within 7 days:
- **ENG:** `video-frames` (frame extraction from demos/meetings)
- **OPS:** `mcporter` (MCP server discovery + config)
- **RESEARCH:** `openai-whisper` (voice-to-text for transcripts)

**Verification:**
```bash
# Check skill audit for adoption assignments
grep -A 5 "Adoption target:" workspace/ops/skill-audit-2026-02-24.md
```

**Status:** ✅ Complete. Adoption targets assigned in skill audit.

---

### 6. Definition of Done Documented ✓

**Requirement:** This file (`directive-20260224-definition-of-done.md`) exists and is linked from the directive task.

**Verification:**
```bash
# Check that this file exists
ls -la workspace/ops/directive-20260224-definition-of-done.md
```

**Status:** ✅ Complete. This file is the definition of done.

---

## Completion Timeline

| Criterion | Owner | Target Date | Status |
|-----------|-------|-------------|--------|
| A2A logging non-empty daily | All agents | 2026-02-25 | In progress |
| State hygiene (daily updates) | All agents | 2026-02-25 | In progress |
| Skill audit completed | ZEN | 2026-02-24 | ✅ Done |
| Autonomy contract drafted | ZEN | 2026-02-24 | ✅ Done |
| Adoption targets assigned | ZEN | 2026-02-24 | ✅ Done |
| Definition of done documented | ZEN | 2026-02-24 | ✅ Done |

---

## Sign-Off

- **RED (Anurag):** Reviews and approves definition of done.
- **ZEN (allrounder):** Executes Chunks 1–2; monitors compliance.
- **All agents:** Execute daily state updates + A2A logging by 2026-02-25.

---

## Next Steps (After Completion)

1. **Chunk 3 (ENG):** Tool schema validator shim (TICKET-20260224-024) — 1–2h
2. **Chunk 4 (OPS):** Deduplicate health-snapshot auto-tickets — 1h
3. **Weekly review:** RED reviews compliance + skill adoption progress.
