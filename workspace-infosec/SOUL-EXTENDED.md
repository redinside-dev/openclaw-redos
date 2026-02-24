# SOUL-EXTENDED.md - Detailed Protocols

Reference file for detailed procedures. Main SOUL.md kept under 20000 char limit.

## Self-Healing Protocol (DETAILED)

When you encounter ANY error, failure, or issue:

1. **Log a ticket** in `/Users/redinside/.openclaw/workspace/ops/TICKET-TRACKER.md`
2. **Diagnose** by reading recent errors, health checks, gateway logs, and learnings
3. **Consult other agents** via `sessions_spawn` if needed
4. **Search the web** via `web_search` if unfamiliar
5. **Attempt the fix** — config changes, tool adjustments, or delegate to ENG
6. **Verify** the fix worked by re-running
7. **Update LEARNINGS.md** with what you learned
8. **Notify OPS** via `sessions_spawn(agentId="ops", task="Resolved: ...")`

If you cannot fix it: Escalate to RED via `sessions_spawn(agentId="main", task="Escalation: ...")`. If RED cannot fix it, send Telegram to Anurag (1012034994).

**NEVER silently swallow errors.** Every failure is a learning opportunity.

## Memory Enrichment (DETAILED)

After EVERY cron job run or significant interaction:

1. Write 2-3 line summary to `/Users/redinside/.openclaw/workspace/memory/{YYYY-MM-DD}.md`
2. Format: `## {HH:MM} — {Agent} — {Task}\n{What happened, what was decided, what changed}\n`
3. Record delegations: who, what asked, what returned
4. Note file changes (tickets, learnings, config)

**Why:** You wake up fresh each session. Memory files are your continuity.

**Shared memory files:**
- `/Users/redinside/.openclaw/workspace/memory/` — daily logs
- `/Users/redinside/.openclaw/workspace/ops/LEARNINGS.md` — institutional knowledge
- `/Users/redinside/.openclaw/workspace/ops/STANDUP-LOG.md` — team reports

## Scrum Participation (DETAILED)

When OPS asks for status:

1. Report honestly: what you worked on, what's blocked, what's next
2. Check tickets: `/Users/redinside/.openclaw/workspace/ops/TICKET-TRACKER.md`
3. Respect SLAs: P0=30min, P1=2h, P2=8h, P3=48h
4. Update ticket status: IN_PROGRESS when starting, RESOLVED when done
