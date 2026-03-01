# Runbook: Context Window Overflow

**Category:** infra / session management
**Severity:** P1 (blocks Telegram lane if unresolved)
**Who runs this:** Any agent experiencing context overflow; OPS for monitoring
**Last updated:** 2026-03-01 (by external consultant — cascade/claude-code)
**Learning ref:** LEARNING-20260301-010

---

## What is this?

Context window overflow occurs when an agent's session accumulates more tokens than the model can process (131K limit for most agents). When it happens:
- OpenClaw's internal compaction runs but fails (same model, same limit)
- The agent lane becomes stuck — no new messages processed
- Telegram/Slack channel backs up
- Manual human intervention was previously required

**After this runbook was applied, overflow is largely prevented automatically.** But if it happens again, follow this runbook.

---

## Part 1 — Agent Self-Help (do this yourself, immediately)

### Symptoms you're experiencing overflow
- You receive a system message: "Context window at 70% capacity. Mandatory memory flush in progress."
- Your session feels slow or you notice you've read many files / spawned many agents
- You get an error about context length
- A 30-min heartbeat cron fires asking you to "flush or reply clean"

### Immediate action: proactive flush (BEFORE overflow)

**Do this at the 70% mark — do not wait:**

```
1. Write to workspace/memory/working-<your-agentId>.json:
   {
     "task": "<current objective in 2-3 sentences>",
     "decisions": ["last decision 1", "last decision 2", "last decision 3"],
     "waiting_on": ["agent:eng:main - awaiting code review", ...],
     "open_items": ["still need to check X", ...],
     "files_consulted": ["SOUL.md", "openclaw.json", ...],
     "key_findings": ["finding 1 in 1 paragraph", "finding 2 in 1 paragraph"],
     "flushed_at": "<ISO timestamp>"
   }

2. Summarize every large tool output (>500 tokens) into 1 paragraph in key_findings.
   Discard the original from your mental context — your summary IS the record.

3. Post to your Slack channel:
   "🧠 <AGENT>: context flush — archiving to working memory, continuing task"

4. If in active conversation, tell the user:
   "Archiving context now to maintain responsiveness — back in a moment."
```

### If overflow already happened (session was reset)

```
1. Tell the user: "My session context was reset. Retrieving memory now..."

2. Run RAG query:
   ~/.openclaw/.venv/bin/python3 ~/.openclaw/workspace/scripts/rag_query.py \
     "recent tasks and decisions" --top 3

3. Read your working memory:
   cat workspace/memory/working-<your-agentId>.json

4. Check for archived session context:
   ls workspace/memory/archived-sessions/<your-agentId>/
   # Read the most recent file — it has your last 30 conversation turns

5. Resume from recovered context. Summarize to user what you recovered.
```

---

## Part 2 — OPS Diagnosis (when an agent is stuck)

### Symptoms of a stuck lane
- Telegram/Slack channel not responding for >5 min
- `gateway.err.log` shows repeated errors for same agentId
- `session-overflow-monitor.log` shows a recent archive event for that agent

### Step 1: Check session sizes

```bash
find ~/.openclaw/agents -name "*.jsonl" -not -name "*.deleted.*" \
  -exec stat -f "%z %N" {} \; | sort -rn | head -20
```

Expected: all sessions < 500KB. If any are > 500KB, the monitor should have caught them.

### Step 2: Check monitor log

```bash
tail -50 ~/.openclaw/logs/session-overflow-monitor.log
```

Look for: `ARCHIVED` or `WARNING` lines for the stuck agent.

### Step 3: Check gateway errors

```bash
tail -100 ~/.openclaw/logs/gateway.err.log | grep -i "context\|overflow\|compaction\|token"
```

### Step 4: Force archive a stuck session

If monitor didn't catch it (e.g., stuck mid-compaction):

```bash
# Find the stuck session file
AGENT=main  # or eng, ops, etc.
find ~/.openclaw/agents/$AGENT -name "*.jsonl" -not -name "*.deleted.*"

# Get its size
stat -f%z ~/.openclaw/agents/$AGENT/sessions/<SESSION_ID>.jsonl

# Archive it manually (saves context first)
SIZE=$(stat -f%z ~/.openclaw/agents/$AGENT/sessions/<SESSION_ID>.jsonl)
echo "Session size: $SIZE bytes"

# Extract last 30 turns before deleting
python3 - << 'PYEOF'
import json
session_file = "/Users/redinside/.openclaw/agents/<AGENT>/sessions/<SESSION_ID>.jsonl"
archive_path = "/Users/redinside/.openclaw/workspace/memory/archived-sessions/<AGENT>/manual-archive.json"
import os; os.makedirs(os.path.dirname(archive_path), exist_ok=True)
lines = open(session_file).readlines()[-100:]
msgs = [json.loads(l) for l in lines if l.strip()]
turns = [m for m in msgs if m.get('role') in ('user','assistant')][-30:]
import json
open(archive_path,'w').write(json.dumps({'manual_archive': True, 'turns': turns}, indent=2))
print(f"Saved {len(turns)} turns to {archive_path}")
PYEOF

# Now archive the session file
mv ~/.openclaw/agents/$AGENT/sessions/<SESSION_ID>.jsonl \
   ~/.openclaw/agents/$AGENT/sessions/<SESSION_ID>.jsonl.deleted.$(date -u +%Y-%m-%dT%H-%M-%SZ)

# Remove from sessions.json
python3 - ~/.openclaw/agents/$AGENT/sessions/sessions.json <SESSION_ID> << 'PYEOF'
import json, sys
path, sid = sys.argv[1], sys.argv[2]
d = json.load(open(path))
removed = [k for k, v in d.items() if isinstance(v, dict) and v.get('sessionId') == sid]
for k in removed: del d[k]
json.dump(d, open(path,'w'))
print(f"Removed: {removed}")
PYEOF
```

### Step 5: Verify agent recovers

```bash
# Send a test ping
openclaw agent --agent <agentId> --message "ping — session reset, retrieving context" --json
```

The agent should respond by reading its working memory and confirming recovery.

---

## Part 3 — Config Health Check

Run this after any suspected overflow incident to verify the safeguards are configured:

```bash
# Check softThresholdTokens (must be 40000, NOT 6000)
python3 -c "
import json
cfg = json.load(open('/Users/redinside/.openclaw/openclaw.json'))
defaults = cfg.get('agents', {}).get('defaults', {})
compaction = defaults.get('compaction', {})
mf = compaction.get('memoryFlush', {})
print('softThresholdTokens:', mf.get('softThresholdTokens'))
print('mode:', compaction.get('mode'))
print('rotateBytes:', cfg.get('session', {}).get('maintenance', {}).get('rotateBytes'))
"

# Expected output:
# softThresholdTokens: 40000
# mode: safeguard
# rotateBytes: 2mb

# Check monitor interval (must be 180, NOT 600)
grep -A1 "StartInterval" ~/Library/LaunchAgents/ai.openclaw.session-overflow-monitor.plist

# Check monitor is running
launchctl list | grep session-overflow
```

### If values are wrong (regression check)

| Parameter | Wrong value | Correct value | Fix |
|---|---|---|---|
| `softThresholdTokens` | 6000 | 40000 | Edit `openclaw.json`, restart stack |
| `rotateBytes` | 10mb | 2mb | Edit `openclaw.json`, restart stack |
| Monitor `StartInterval` | 600 | 180 | Edit plist, `launchctl unload && launchctl load` |
| Monitor archive threshold | 50MB (52428800 bytes) | 500KB (512000 bytes) | Edit `session-overflow-monitor.sh` |

---

## Part 4 — Escalation (if self-help fails)

If the agent cannot recover after following Part 1–2:

1. Open ticket in `workspace/ops/TICKET-TRACKER.md`:
   ```
   TICKET-<ID>: Context overflow not self-resolving — <agent>
   Agent: <agentId>
   Symptoms: <what's happening>
   Attempted: [steps from Part 1-2 above]
   ```

2. Send to OPS via `sessions_send`:
   ```
   sessions_send(sessionKey="agent:ops:main",
     message="[TASK-ID: TASK-...] Context overflow on <agent>. Session archived. Please verify safeguards via context-overflow-runbook.md Part 3 and ping Anurag if regression found.")
   ```

3. If OPS is also stuck: send Telegram DM to Anurag (1012034994):
   ```
   🚨 Context overflow: <agent> stuck. Safeguards may have regressed.
   Check: softThresholdTokens (should be 40000), monitor threshold (should be 500KB).
   Runbook: workspace/ops/runbooks/context-overflow-runbook.md
   ```

---

## Part 5 — Root Cause History

**Why this happened (original incident, 2026-03-01):**

| Root cause | Old value | Fixed value |
|---|---|---|
| Compaction fires too late | `softThresholdTokens: 6000` (95% full) | `40000` (70% — 40K tokens left) |
| Rotate never fires | `rotateBytes: 10mb` | `2mb` |
| Monitor useless | Archive threshold: 50MB | 500KB |
| Monitor too infrequent | Every 10 min | Every 3 min |
| No proactive policy | No policy | `context-window-policy/SKILL.md` |
| No recovery path | Context lost on reset | Working memory + RAG + archived sessions |
| No heartbeat | No cron | 6 new `*/30` heartbeat crons |

**Timeline of a cascading failure (old behavior):**
```
Session grows → hits 131K limit → compaction fires at 6K left
→ compaction model also at 131K → compaction fails
→ agent stuck → lane queue backs up → Telegram blocked
→ human manually kills session → agent loses all context
→ agent starts fresh, no memory of what it was doing
```

**Timeline of failure (new behavior):**
```
Session grows → hits 40K remaining → memoryFlush fires
→ agent writes to working-<agentId>.json → summarizes large outputs
→ compaction has room to work → session continues
  OR
500KB file detected by monitor → last 30 turns extracted to archive
→ working memory updated with pointer → session archived
→ fresh session starts → agent reads memory → continues task
```

---

## Related Files

- `workspace/skills/context-window-policy/SKILL.md` — the 70% rule all agents must follow
- `workspace/SOUL.md` § "Context Window Management" — mandatory section read every session start
- `workspace/memory/working-<agentId>.json` — per-agent persistent working memory
- `workspace/memory/archived-sessions/` — extracted session contexts from overflow events
- `workspace/ops/LEARNINGS.md` § LEARNING-20260301-010 — full incident debrief
- `scripts/session-overflow-monitor.sh` — the monitor script
- `cron/jobs.json` — search "context-health-check" for the 6 heartbeat crons
