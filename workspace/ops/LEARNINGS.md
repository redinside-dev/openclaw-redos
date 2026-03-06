# LEARNINGS.md — Agent Learning & Mistake Tracking

**Purpose:** Track mistakes, patterns, and lessons learned. Agents read this to avoid repeating errors.

---

## Recent Learnings (2026-03-05)

### Learning: A2A Delegation Deadlock Prevention
- **Issue:** A2A tasks can get stuck waiting for response
- **Fix:** Added timeout (120s) and retry (2x) to all A2A calls
- **Script:** `workspace/scripts/a2a-delegate-safe.sh`

### Learning: Session Cold Start
- **Issue:** Sessions timeout, A2A fails with "no session found"
- **Fix:** Session warmup cron every 10 minutes
- **Script:** `workspace/scripts/session-warmup.sh`

### Learning: Slack Token Expiration
- **Issue:** Slack bots stopped working, "account_inactive" errors
- **Fix:** Regenerated token, disabled broken accounts
- **Status:** Working now

### Learning: Task Generator Syntax Error
- **Issue:** autonomous_task_generator.py had syntax error
- **Fix:** Rewrote with simpler code
- **Status:** Working now

---

## Mistake Patterns to Avoid

1. ❌ Don't answer infrastructure questions from memory — check live first
2. ❌ Don't use cold sessions for A2A — warm up first
3. ❌ Don't let tasks stuck in "in_progress" forever — deadlock monitor recovers
4. ❌ Don't duplicate work — check LEARNINGS.md first

---

## Agent Memory Locations

| Agent | Memory File |
|-------|-------------|
| OPS | workspace/ops/memory/state-ops.json |
| ENG | workspace/eng/memory/state-eng.json |
| FINANCE | workspace/finance/memory/state-finance.json |
| RESEARCH | workspace/research/memory/state-research.json |

