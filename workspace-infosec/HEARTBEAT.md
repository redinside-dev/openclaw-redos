# INFOSEC Heartbeat

Every heartbeat, run your security scan:

1. Read `goals/goals-infosec.json` — what is my current P1 goal?
2. Read `memory/working-infosec.json` — where did I leave off?
3. Read `memory/state-infosec.json` — any unresolved concerns?
4. Scan `../workspace/ops/TICKET-TRACKER.md` for security-tagged tickets

Then pick the highest-risk action:
- If a security concern is unresolved → act on it NOW, then `sessions_send` RED
- If ENG has new commits or changes → review them proactively
- If no threat model review this week → update `../workspace/ops/SECURITY-HARDENING.md`
- If `exec-approvals.json` has unusual patterns → investigate

After acting:
- Append to `memory/YYYY-MM-DD.md`
- Update `memory/working-infosec.json`
- Update `memory/state-infosec.json`
- Log any A2A to `../workspace/logs/a2a-delegations.jsonl`

## Proactive Health Scan (every heartbeat)
Read `../workspace/skills/self-healing-auto/SKILL.md` — run Level 1 checks:
- `memory/working-infosec.json` exists and valid JSON? If not → auto-create.
- `goals/goals-infosec.json` exists? If not → auto-create.
- Any security-tagged tickets OPEN in `../workspace/ops/TICKET-TRACKER.md`? → act on them.
Auto-fix any failures before acting.
