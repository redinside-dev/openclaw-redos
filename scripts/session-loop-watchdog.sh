#!/bin/bash
# session-loop-watchdog.sh — detect and kill looping agent sessions.
#
# PERFORMANCE FIX: Single Python invocation. macOS find doesn't support -printf
# so we use -print + a while loop to capture paths. Old version spawned Python
# once per session file (~19 calls) which accumulated to 30s+ and timed out.
# This version pre-filters with find then passes all candidates to Python once.
#
# Tier L2 — pre-approved

set -uo pipefail

AGENTS_DIR="$HOME/.openclaw/agents"
LOG="$HOME/.openclaw/workspace/logs/loop-watchdog.log"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LOOP_THRESHOLD=10
SIZE_THRESHOLD_KB=20
ACTIVE_WINDOW_MINS=15

# ── Pre-filter with find (BSD find on macOS — use -print, not -printf) ───────
# find returns only recently-active files ≥SIZE_THRESHOLD_KB (no Python yet).
# Using -print + newline capture (not \0) since macOS find supports %s but not %p\0.
cd "$AGENTS_DIR" && CANDIDATES=$(find . -path '*/sessions/*.jsonl' \
                 -not -name '*.archived' \
                 -mmin -"$ACTIVE_WINDOW_MINS" \
                 -size +"${SIZE_THRESHOLD_KB}k" \
                 -print 2>/dev/null | sed 's|^\./||')

if [ -z "$CANDIDATES" ]; then
  exit 0
fi

# ── Single Python call with all candidate paths ──────────────────────────────
PY_OUT=$(echo "$CANDIDATES" | python3 - "$TS" "$LOG" "$LOOP_THRESHOLD" << 'PYEOF'
import sys, os, json
from collections import Counter
from pathlib import Path

TS        = sys.argv[1]
LOG_PATH  = sys.argv[2]
THRESHOLD = int(sys.argv[3])
base_dir  = Path.home() / ".openclaw" / "agents"

# Read newline-delimited candidate paths from stdin (one per line)
paths = [Path(base_dir / p.strip()) for p in sys.stdin.read().splitlines() if p.strip()]

killed = 0
for p in paths:
    try:
        p.stat().st_size
    except OSError:
        continue

    # Read last 200KB (seek from end)
    with open(p, "rb") as f:
        f.seek(max(0, p.stat().st_size - 200_000))
        f.readline()
        raw = f.read().decode("utf-8", errors="ignore")

    calls = []
    for line in raw.splitlines():
        try:
            d = json.loads(line)
            if d.get("type") == "message":
                for c in (d.get("message", {}).get("content") or []):
                    if isinstance(c, dict) and c.get("type") == "toolCall":
                        name = c.get("name", "?")
                        args = str(c.get("arguments", ""))[:60]
                        calls.append(f"{name}|{args}")
        except (json.JSONDecodeError, KeyError):
            pass

    calls = calls[-50:]
    if not calls:
        continue

    top_count, top_cmd = Counter(calls).most_common(1)[0]
    if not isinstance(top_count, int) or top_count < THRESHOLD:
        continue

    archived = Path(str(p) + ".archived")
    try:
        os.rename(p, archived)
    except OSError:
        continue

    agent = p.parent.parent.name
    session_id = p.stem
    msg = f"LOOP KILLED: {agent}/{session_id} — {top_count}x: {top_cmd[:80]}"
    print(f"[{TS}] {msg}")
    Path(LOG_PATH).parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "a") as lf:
        lf.write(f"[{TS}] {msg}\n")
    killed += 1

if killed > 0:
    print(f"__KILLED:{killed}__")
sys.exit(0 if killed == 0 else 2)
PYEOF
)
PY_EXIT=$?

echo "$PY_OUT"

if [ "$PY_EXIT" -eq 2 ]; then
  kill_n=$(echo "$PY_OUT" | grep -oP '__KILLED:\K\d+' | head -1)
  [ -z "$kill_n" ] && kill_n=1
  curl -s --max-time 5 -X POST "http://127.0.0.1:5678/webhook/slack-post" \
    -H "Content-Type: application/json" \
    -d "{\"channel\":\"C0AEV3MDEDD\",\"text\":\"🔁 Loop watchdog killed ${kill_n} session(s). See logs/loop-watchdog.log\"}" \
    > /dev/null 2>&1 || true
fi

exit 0
