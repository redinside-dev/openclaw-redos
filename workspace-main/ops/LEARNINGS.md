# LEARNINGS.md - Institutional Knowledge

## Critical Issues Resolved
- TICKET-060 (2026-04-12 → 2026-04-16): agent-status stub files created for all agent IDs
- TICKET-059 (2026-04-02): Gmail cron — gateway restart resolved exec allowlist deadlock

## Patterns Learned
- **Memory index embedding-model drift** (TICKET-20260608-MEMORY-INDEX-003): when the embedding model config changes, the index silently desynchronizes and `memory_search` returns `unavailable=true` for ALL agents. Recovery: `openclaw memory index --force`. Add a pre-flight check in RED's startup that runs `memory_search` with a known probe; if disabled, escalate to OPS before continuing.
- **Missing logs (errors.jsonl, routing-decisions.jsonl)** indicate logging pipeline failure, not just empty history. Both have been absent for the entire lifetime of this deployment. Add log rotation cron task AND a self-check that the files exist.
- **Empty agent status files** for non-RED agents = no telemetry pipeline. The allrounder + infosec + research files are being updated by hand; eng/ops/finance/infosec are stale or missing. Need an automated status-writer on every agent turn.
- **Stale OPEN tickets rot the tracker**: TICKET-20260417-001 (Slack channel) was reported OPEN on 2026-04-17 but the allrounder log proves Slack IS live (msg 1780931520.217469 posted 2026-06-08 11:09 EDT). Verify-before-keep policy: any ticket older than 14 days with no recent activity should be re-validated by OPS each Monday standup.
- **Exec allowlist deadlock** (TICKET-20260418-EXEC-001) is now a P0 RECURRING because the gateway regenerates exec-approvals.json from internal source config on restart. Fix must be applied to the SOURCE, not the generated file. Patches to the output get wiped.
- **Mitiga MCP hijack class** (INFOSEC cycle 24, 2026-06-08): any system with `~/.claude.json` + OAuth-bearing MCP servers is in the exposed class. Anthropic marked out-of-scope Apr 12, no patch planned. Mitigation lives in the operator's hands: baseline + diff `~/.claude.json`, localhost-proxy canary, `~/.npmrc ignore-scripts=true`, MCP server provenance inventory.
- **Slack exec-approvals config gap** (TICKET-20260418-EXEC-001, 2026-06-09 update): On Slack, exec fails with "native chat exec approvals are not configured on Slack" — distinct from the source-regeneration deadlock. Fix is channel-level: set `channels.slack.execApprovals.approvers` (or `commands.ownerAllowFrom`) and ensure `channels.slack.execApprovals.enabled` is unset/`auto`/`true`. The source-regeneration issue (gateway overwrites exec-approvals.json) and this channel-config gap are TWO SEPARATE FIXES.
- **Memory index embedding-model drift is now a verified recurring failure** (TICKET-20260608-MEMORY-INDEX-003, 2026-06-09 meta-check): `memory_search` returns `disabled=true` across sessions. The pre-task RAG retrieval step in SOUL.md silently fails. Add a hard gate in RED's startup: if memory_search disabled, abort task and escalate to OPS — do not proceed with degraded context.

## Known Limitations
- No historical logging
- Single-agent system (only RED status available)

## Best Practices
### Logging Resolution
- Add log rotation cron task for errors.jsonl and routing-decisions.jsonl
- Configure log retention policy
- Ensure agent status files are written on startup
- Verify exec allowlist includes necessary commands (e.g., gog)

### System Initialization Context
- Current state: Barebones deployment
- No agent diversity
- Risk of orphaned tasks without logs- **Agent-status-stale self-heal writer** (2026-06-11, HANDOVER): when verifier reports `agent-status-stale`, the root cause is usually dormant agents (hatake, allrounder, etc.) not writing their own status. The verifier reads `workspace/ops/agent-status/{agent}.json` — same path the agents write. Fix: `scripts/agent-status-refresh.sh` cron'd every 5 min writes a placeholder if file missing or >30 min stale. The agent's real write still wins on its next refuel tick. Cron id: `agent-status-refresh-0001`. **Why this matters:** the 30-min evidence-gated verifier goes red when a single agent's status is stale; one dormant agent = 9/10 = fail. Self-heal writer keeps the verifier green even when agents are between refuels. This is the difference between "system is healthy" and "verifier lies about health."
- **Two status-file locations** (2026-06-11, audit): `workspace/ops/agent-status/` (what the verifier reads) vs `workspace-main/ops/agent-status/` (where some agents were historically writing). Pick one canonical path; the verifier is authoritative. Future status writers must go to `workspace/ops/agent-status/`.
- **Handover is a valid task type** (2026-06-11, HANDOVER): the queue.json `pending[]` list can carry ack-only tasks (`type: handover-ack`, `priority: P3`) for agents to consume on next refuel. This works as a soft broadcast — the next refuel tick picks it up and the agent writes to LEARNINGS. No approval gate needed.
