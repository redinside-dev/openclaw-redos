# Directive-20260224-Skill-Autonomy — Execution Checklist

**Directive:** Enable agent skill autonomy via A2A logging, state hygiene, and skill adoption targets.

**Definition of Done:** See `directive-20260224-definition-of-done.md`

---

## Execution Checklist

### Chunk 1 & 2 (ZEN — Completed)
- [x] A2A logging non-empty daily (started 2026-02-24)
- [x] State hygiene contract drafted (`autonomy-contract.md`)
- [x] Skill audit completed (`skill-audit-2026-02-24.md`)
- [x] Definition of Done documented
- [x] Adoption targets assigned (ENG: video-frames, OPS: mcporter, RESEARCH: openai-whisper)

### Chunk 3 (ENG — In Progress)
- [ ] Tool schema validator shim deployed (TICKET-20260224-024)
  - [ ] Commits merged (07152fc, b8369a0, b47b468)
  - [ ] Middleware hooked into resilient-handler.js
  - [ ] Gateway restarted + schema drift errors drop to zero
  - [ ] Verification: `gateway.err.log` shows `[Tool Validation]` lines, no legacy schema errors

### Chunk 4 (OPS — In Progress)
- [x] Deduplicate health-snapshot auto-tickets
  - [x] Updated `health_snapshot_ticket.py` to check for existing OPEN/TODO tickets with same pattern
  - [x] Removed global `**` wildcard from `exec-approvals.json` (P0 security incident TICKET-20260224-071)
  - [ ] Tighten exec approvals per-agent (TICKET-20260224-072, pending INFOSEC decision)
  - [ ] Gateway restart for schema validator middleware (coordinated with ENG)

### Chunk 5 (INFOSEC — In Progress)
- [ ] DNS fix for TICKET-20260223-002 (microsoft.com sinkhole)
  - [ ] Clarify Tailscale DNS override (exit node? Use Tailscale DNS enabled?)
  - [ ] Provide minimal toggle sequence (Option 1: UI toggle vs Option 2: sudo block)
  - [ ] Verify: `dscacheutil www.microsoft.com` returns public IP (not 198.18/15)
  - [ ] Verify: `web_fetch https://www.microsoft.com` succeeds without SSRF block

### Chunk 6 (All Agents — In Progress)
- [ ] Daily state updates (by 2026-02-25)
  - [ ] main: `memory/state-main.json` updated
  - [ ] eng: `memory/state-eng.json` updated
  - [ ] research: `memory/state-research.json` updated
  - [ ] ops: `memory/state-ops.json` updated
  - [ ] infosec: `memory/state-infosec.json` updated
  - [ ] finance: `memory/state-finance.json` updated
  - [ ] allrounder: `memory/state-allrounder.json` updated

- [ ] Skill adoption targets (by 2026-03-03)
  - [x] ENG: video-frames (DONE — frame extracted at t=1s)
  - [ ] OPS: mcporter (in progress — need to use mcporter CLI + log evidence)
  - [ ] RESEARCH: openai-whisper (in progress — need to use whisper CLI + log evidence)

---

## Status Summary

| Chunk | Owner | Status | Blocker | ETA |
|-------|-------|--------|---------|-----|
| 1–2 | ZEN | ✅ Complete | None | 2026-02-24 |
| 3 | ENG | 🔄 In Progress | Gateway restart coordination | 2026-02-24 |
| 4 | OPS | 🔄 In Progress | INFOSEC exec-approvals decision | 2026-02-24 |
| 5 | INFOSEC | 🔄 In Progress | RED DNS clarification | 2026-02-24 |
| 6 | All | 🔄 In Progress | Daily compliance | 2026-02-25 |

---

## Next Actions

1. **OPS (this heartbeat):** Adopt `mcporter` skill — use it to list MCP servers, log evidence to skill audit.
2. **ENG:** Confirm schema validator shim deployment + gateway restart readiness.
3. **INFOSEC:** Provide DNS fix runbook (Tailscale UI toggle sequence).
4. **All agents:** Update state files daily by EOD 2026-02-25.

---

**Last Updated:** 2026-02-24T15:23:35Z
**Updated By:** OPS (heartbeat)
