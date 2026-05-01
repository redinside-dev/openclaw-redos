#!/bin/bash
# ops-incident-log.sh — log infrastructure incidents + solutions for future retrieval
# Called by OPS after any infra fix. Results go into RAG index via memsearch.
# Usage: ops-incident-log.sh "gateway crashed" "restart via launchctl fixed it" "high"
# Priority: low | medium | high | critical

set -euo pipefail

INCIDENT="$1"
SOLUTION="$2"
PRIORITY="${3:-medium}"

TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S%z)
LOGFILE="$HOME/.openclaw/logs/ops-incidents.logl"

mkdir -p "$(dirname "$LOGFILE")"

# JSONL entry
python3 -c "
import json, sys
entry = {
    'timestamp': '$TIMESTAMP',
    'incident': '''$INCIDENT'''.strip(),
    'solution': '''$SOLUTION'''.strip(),
    'priority': '$PRIORITY',
    'agent': 'ops'
}
print(json.dumps(entry, ensure_ascii=False))
" >> "$LOGFILE"

# Index via memsearch
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INDEXABLE="[OPS INCIDENT] $INCIDENT | FIX: $SOLUTION | P:$PRIORITY | $TIMESTAMP"
echo "$INDEXABLE" | python3 "$SCRIPT_DIR/memsearch.py" --index-mode --tag ops-incident 2>/dev/null || true

echo "[OPS-INCIDENT-LOG] logged: $INCIDENT" >&2
echo "  → $LOGFILE"
echo "  → RAG index updated" >&2