#!/usr/bin/env bash
# index-episodes.sh — Index episodes.jsonl entries into memsearch flat index
#
# This makes 1,628+ past task experiences semantically searchable via rag_query.py.
# Each episode becomes: text = taskName + outcome + error_type + actions context
# Stored in ~/.openclaw/.memsearch/ alongside workspace markdown chunks.
#
# Usage: bash index-episodes.sh
# Called by: memory-sync-nightly-0001 cron (appended to nightly run)

set -euo pipefail

EPISODES="$HOME/.openclaw/workspace/logs/episodes.jsonl"
WORKSPACE_SCRIPTS="$HOME/.openclaw/workspace/scripts"
VENV_PYTHON="$HOME/.openclaw/.venv/bin/python3"
PYTHON="${VENV_PYTHON:-python3}"

if [[ ! -f "$EPISODES" ]]; then
  echo "episodes.jsonl not found at $EPISODES — skipping"
  exit 0
fi

EPISODE_COUNT=$(wc -l < "$EPISODES" | tr -d ' ')
echo "Indexing $EPISODE_COUNT episodes from $EPISODES..."

"$PYTHON" - << PYEOF
import json, sys
from pathlib import Path

episodes_path = Path("${EPISODES}")
workspace = Path.home() / ".openclaw" / "workspace"
index_dir = Path.home() / ".openclaw" / ".memsearch"
index_dir.mkdir(parents=True, exist_ok=True)
episodes_index_file = index_dir / "episodes-index.json"

# Load existing episode index (keyed by episode id to avoid re-indexing)
existing = {}
if episodes_index_file.exists():
    try:
        with open(episodes_index_file) as f:
            existing = json.load(f)
    except Exception:
        existing = {}

new_count = 0
with open(episodes_path) as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            ep = json.loads(line)
        except json.JSONDecodeError:
            continue

        ep_id = ep.get("id") or ep.get("taskId") or ep.get("episodeId") or str(hash(line))
        if ep_id in existing:
            continue  # Already indexed

        # Build searchable text from episode fields
        parts = []
        for field in ["taskName", "task", "name", "description"]:
            if ep.get(field):
                parts.append(str(ep[field]))
        for field in ["outcome", "result", "status", "conclusion"]:
            if ep.get(field):
                parts.append(f"outcome: {ep[field]}")
        for field in ["error", "errorType", "error_type", "failureReason"]:
            if ep.get(field):
                parts.append(f"error: {ep[field]}")
        # Include context/action chain if present
        ctx = ep.get("context") or ep.get("context_chain") or ep.get("actions")
        if isinstance(ctx, list):
            parts.append("actions: " + " | ".join(str(a) for a in ctx[:5]))
        elif isinstance(ctx, str):
            parts.append(f"context: {ctx[:200]}")

        text = " ".join(parts)[:800]
        if not text.strip():
            continue

        existing[ep_id] = {
            "text": text,
            "agentId": ep.get("agentId") or ep.get("agent"),
            "outcome": ep.get("outcome") or ep.get("status"),
            "taskId": ep.get("taskId") or ep.get("id"),
            "timestamp": ep.get("timestamp") or ep.get("ts") or ep.get("createdAt"),
            "source": "episodes.jsonl"
        }
        new_count += 1

with open(episodes_index_file, "w") as f:
    json.dump(existing, f)

print(f"Indexed {new_count} new episodes ({len(existing)} total in index)")
PYEOF

echo "Episode indexing complete. Run 'python3 ~/.openclaw/workspace/scripts/memsearch.py index' to rebuild full workspace index."
