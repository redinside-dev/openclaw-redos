# Context Window Policy — Company-Wide Standard

**Applies to:** ALL agents (RED, ZEN, ENG, OPS, RESEARCH, INFOSEC, FINANCE, HATAKE)
**Authority:** Mandatory — no exceptions. Failure = session overflow = blocked lane.

---

## The 70% Rule

**When your session feels heavy, proactively flush. Never wait for overflow.**

Signs you are at ~70% capacity:
- You've read 5+ large files in this session
- You've spawned 3+ agents and collected their results
- You've been in sustained conversation for 30+ minutes
- You see large tool outputs (API responses, logs, file dumps) in recent messages
- You've gone through 10+ back-and-forth turns with a peer agent

**At 70%: flush immediately, without being asked.**

---

## What to Archive (do this proactively)

| Content type | Action |
|---|---|
| Tool output > 500 tokens | Summarize in 1 paragraph, discard original from context |
| File contents you've already acted on | Summarize key findings (1-3 bullets), discard full content |
| Agent results you've already processed | Write conclusion to memory, discard raw response |
| Error traces you've diagnosed | Write root cause + fix to memory, discard full trace |

## What to KEEP in Context

- Current task objective (1-3 sentences)
- Last 3 decisions made and their rationale
- Names of files/agents consulted (not their contents)
- Pending items: who you're waiting on, what's blocked
- Any in-flight tool calls or approvals

---

## Flush Procedure (do immediately, no user prompt needed)

```
1. Write current state to workspace/memory/working-<your-agentId>.json:
   {
     "task": "<current objective>",
     "decisions": ["<last 3>"],
     "waiting_on": ["<who/what>"],
     "open_items": ["<pending>"],
     "files_consulted": ["<names only>"],
     "flushed_at": "<ISO timestamp>"
   }

2. For each large tool output in recent context:
   → Write 1-paragraph summary to the working memory file
   → Note: do not re-read the file; your summary IS the record

3. Post to your Slack channel:
   "🧠 <AGENT>: context flush — archiving large outputs to maintain responsiveness"

4. Reply to user (if active conversation):
   "Archiving context now to maintain responsiveness — back in a moment."
```

---

## Proactive Flush Triggers (do WITHOUT being told)

Flush immediately after ANY of these:
- **Spawned 3+ agents** and collected all results → flush before synthesizing
- **Read 5+ large files** in one session → flush before continuing
- **Completed a P0/P1 incident response** → flush after writing LEARNINGS.md
- **Every 30 minutes** of sustained conversation → flush as a heartbeat

---

## Memory Retrieval Pattern

After session reset, recover context with:

```bash
# Query RAG for recent context
~/.openclaw/.venv/bin/python3 ~/.openclaw/workspace/scripts/rag_query.py "recent tasks and decisions" --top 3

# Read your working memory file
cat workspace/memory/working-<your-agentId>.json

# Check archived sessions (if overflow occurred)
ls workspace/memory/archived-sessions/<your-agentId>/
# Read the most recent archive:
cat workspace/memory/archived-sessions/<your-agentId>/<latest>.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Archived: {d[\"archived_at\"]}')
for t in d['turns'][-10:]:
    role = t.get('role','?')
    content = str(t.get('content',''))[:200]
    print(f'[{role}] {content}')
"
```

---

## Session Reset Protocol

If you receive a context overflow error or notice your session was reset:

1. **Do NOT silently fail.** Tell the user:
   > "My session context was reset. Retrieving memory now..."

2. Run RAG query:
   ```
   rag_query.py "recent tasks and decisions" --top 3
   ```

3. Read `workspace/memory/working-<your-agentId>.json`

4. Check `workspace/memory/archived-sessions/<your-agentId>/` for last archive

5. Resume task from recovered context. Summarize what you recovered in 2-3 sentences.

---

## Token Budget Awareness

| Session size | Action |
|---|---|
| < 200KB | Normal operation |
| 200–500KB | Warning zone — start flushing large outputs proactively |
| > 500KB | Overflow monitor will archive — flush NOW before it forces a reset |
| 70% of model context (≈91K tokens for 131K model) | memoryFlush fires automatically |

**The memoryFlush fires at 40K tokens remaining (≈70% of 131K).** This gives you room to actually write memory before being cut off. Do not fight it — cooperate with it.

---

## Related Files

- `workspace/SOUL.md` — top-level rules (Context Window Management section)
- `workspace/memory/working-<agentId>.json` — your persistent working memory
- `workspace/memory/archived-sessions/` — archived session contexts
- `workspace/scripts/rag_query.py` — semantic search over workspace
