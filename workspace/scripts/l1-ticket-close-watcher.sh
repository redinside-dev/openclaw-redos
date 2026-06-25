#!/bin/bash
# L1 Ticket-Close Watcher — runs every 5 min via cron
# Detects ticket status transitions (OPEN -> CLOSED, or any -> CLOSED) by diffing
# TICKET-TRACKER.md against a cached hash. On transitions, appends structured
# entries to workspace/ops/LEARNINGS.md under a "## Ticket Closures" section.
#
# This script is read-only on TICKET-TRACKER.md and only writes to LEARNINGS.md +
# its own state cache. It must never fail the cron run (set +e, exit 0).

set +e
WORKSPACE="/Users/redinside/.openclaw/workspace"
TICKET_FILE="$WORKSPACE/ops/TICKET-TRACKER.md"
LEARNINGS="$WORKSPACE/ops/LEARNINGS.md"
CACHE_DIR="$WORKSPACE/ops/.l1-state"
CACHE_FILE="$CACHE_DIR/ticket-hashes.json"
LOG_DIR="$WORKSPACE/ops/alerts"
NOW_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
NOW_SHORT=$(date -u +%Y%m%d_%H%M%S)

mkdir -p "$CACHE_DIR" "$LOG_DIR"

# Bail if ticket file missing
if [ ! -f "$TICKET_FILE" ]; then
  echo "[L1] WARN: TICKET-TRACKER.md missing @ $NOW_UTC" >> "$LOG_DIR/_l1-watcher.log"
  exit 0
fi

# Extract all ticket blocks: "### TICKET-..." header + first Status: line.
# We use a python helper because awk-only parsing of the status field is fragile
# when tickets contain nested code blocks or repeated field names.
NEW_STATE=$(python3 - <<'PY' "$TICKET_FILE"
import re, sys, json
path = sys.argv[1]
text = open(path, encoding='utf-8').read()

# Split on ticket headers. A header looks like "### TICKET-...." (level-3 markdown).
chunks = re.split(r'(?m)^###\s+(TICKET-[\w\-]+)\s*$', text)
# After split: [pre, id1, body1, id2, body2, ...]
result = {}
for i in range(1, len(chunks), 2):
    tid = chunks[i].strip()
    body = chunks[i+1] if i+1 < len(chunks) else ''
    # Status line: look for "Status:**" or "Status: **" (em-dash safe)
    m = re.search(r'(?m)^\s*-\s*\*\*Status:\*\*\s*(.+?)\s*$', body)
    status = m.group(1).strip() if m else "UNKNOWN"
    # Priority
    m = re.search(r'(?m)^\s*-\s*\*\*Priority:\*\*\s*(.+?)\s*$', body)
    priority = m.group(1).strip() if m else "?"
    # Assignee
    m = re.search(r'(?m)^\s*-\s*\*\*Assignee:\*\*\s*(.+?)\s*$', body)
    assignee = m.group(1).strip() if m else "?"
    # Closed by / Closed reason (if present)
    m = re.search(r'(?m)^\s*-\s*\*\*Closed By:\*\*\s*(.+?)\s*$', body)
    closed_by = m.group(1).strip() if m else ""
    # First 200 chars of Summary (cleaned)
    m = re.search(r'(?m)^\s*-\s*\*\*Summary:\*\*\s*(.+?)\s*$', body)
    summary = m.group(1).strip() if m else ""
    # SHA256 of body so we re-fire only on REAL changes, not on every heartbeat
    import hashlib
    h = hashlib.sha256(body.encode('utf-8')).hexdigest()[:16]
    # Normalise status: strip emoji + leading "OPEN (" to get a base state
    base = re.sub(r'[^\w\s\-]', '', status)
    base = re.sub(r'\(.*?\)', '', base).strip().upper()
    # A ticket is "closed" if its normalised status begins with any terminal verb.
    # Real tracker uses: CLOSED, RESOLVED, DONE, COMPLETED, SUPERSEDED, ABANDONED,
    # CANCELLED, BATCH-RESOLVED, BATCH RESOLVED. The "BATCH RESOLVED..." strings
    # all start with "RESOLVED" so a single prefix check covers everything.
    is_closed = any(base.startswith(p) for p in (
        "CLOSED", "RESOLVED", "DONE", "COMPLETED", "SUPERSEDED",
        "ABANDONED", "CANCELLED", "CANCELED", "WONT",
    ))
    result[tid] = {
        "status": status,
        "base": base,
        "is_closed": is_closed,
        "priority": priority,
        "assignee": assignee,
        "closed_by": closed_by,
        "summary": summary[:200],
        "hash": h,
    }
print(json.dumps(result, indent=2, sort_keys=True))
PY
)

if [ -z "$NEW_STATE" ]; then
  echo "[L1] WARN: failed to parse TICKET-TRACKER.md @ $NOW_UTC" >> "$LOG_DIR/_l1-watcher.log"
  exit 0
fi

# First-run: just write the cache, no events to fire.
if [ ! -f "$CACHE_FILE" ]; then
  echo "$NEW_STATE" > "$CACHE_FILE"
  COUNT=$(python3 -c "import json; print(len(json.load(open('$CACHE_FILE'))))" 2>/dev/null || echo "?")
  echo "[L1] initialised cache @ $NOW_UTC ($COUNT tickets)" >> "$LOG_DIR/_l1-watcher.log"
  exit 0
fi

# Diff: find tickets whose `is_closed` is now true AND was not true before,
# OR whose hash changed while still closed (so we capture "Closed By" / reason edits).
# Use temp files (not heredoc interpolation) — ticket summaries contain
# apostrophes / quotes that break `'''$VAR'''` triple-quote embedding.
NEW_TMP=$(mktemp -t l1-new.XXXXXX)
DIFF_TMP=$(mktemp -t l1-diff.XXXXXX)
trap 'rm -f "$NEW_TMP" "$DIFF_TMP"' EXIT

printf '%s' "$NEW_STATE" > "$NEW_TMP"

python3 - "$NEW_TMP" "$CACHE_FILE" > "$DIFF_TMP" <<'PY'
import json, sys
new = json.load(open(sys.argv[1]))
old = json.load(open(sys.argv[2]))
events = []
for tid, n in new.items():
    o = old.get(tid)
    if not o:
        if n["is_closed"]:
            events.append({"tid": tid, "kind": "NEW_CLOSED", **n})
        continue
    if not o["is_closed"] and n["is_closed"]:
        events.append({"tid": tid, "kind": "OPEN_TO_CLOSED", **n})
    elif o["is_closed"] and n["is_closed"] and o["hash"] != n["hash"]:
        events.append({"tid": tid, "kind": "CLOSED_REASON_CHANGED", **n})
json.dump(events, sys.stdout, indent=2, sort_keys=True)
PY

# Update cache first so we don't re-fire if LEARNINGS write fails.
echo "$NEW_STATE" > "$CACHE_FILE"

EVENT_COUNT=$(python3 -c "import json; print(len(json.load(open('$DIFF_TMP'))))" 2>/dev/null || echo 0)

if [ "$EVENT_COUNT" = "0" ]; then
  exit 0
fi

# We have events. Append to LEARNINGS.md under "## Ticket Closures".
# Ensure the section exists.
if ! grep -q "^## Ticket Closures" "$LEARNINGS" 2>/dev/null; then
  printf "\n## Ticket Closures\n" >> "$LEARNINGS"
fi

{
  echo ""
  echo "### L1 watch @ $NOW_UTC ($EVENT_COUNT closure event(s))"
} >> "$LEARNINGS"

python3 - "$DIFF_TMP" >> "$LEARNINGS" <<'PY'
import json, sys
events = json.load(open(sys.argv[1]))
for e in events:
    if e["kind"] == "OPEN_TO_CLOSED":
        verb = "Closed"
    elif e["kind"] == "NEW_CLOSED":
        verb = "Discovered closed (backfill)"
    else:
        verb = "Closed (metadata updated)"
    print(f"- **{e['tid']}** — {verb} ({e['priority']}). Assignee: {e['assignee']}. {e['summary']}")
    if e.get("closed_by"):
        print(f"  - Closed by: {e['closed_by']}")
PY

echo "[L1] $EVENT_COUNT event(s) appended to LEARNINGS @ $NOW_UTC" >> "$LOG_DIR/_l1-watcher.log"

# Always exit 0 — this watcher itself must never page.
exit 0
