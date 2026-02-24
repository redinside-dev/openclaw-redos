#!/usr/bin/env zsh
# Preflight for OPS self-healing: ensure expected files/paths exist and are parseable.
# Safe to run repeatedly.

set -euo pipefail

workspace_root="${0:A:h:h:h}"   # .../workspace-ops
logs_dir="$workspace_root/logs"
ops_dir="$workspace_root/workspace/ops"

mkdir -p "$logs_dir" "$ops_dir"

# Ensure files exist
: > "$logs_dir/gateway.err.log" 2>/dev/null || true

# Ensure errors.jsonl is valid JSONL (at least one JSON object per line).
errors_file="$logs_dir/errors.jsonl"
if [[ ! -f "$errors_file" || ! -s "$errors_file" ]]; then
  print -r -- "{\"ts\":\"$(date -Iseconds)\",\"level\":\"info\",\"source\":\"ops-preflight\",\"msg\":\"initialized errors.jsonl\"}" > "$errors_file"
else
  # If first non-empty line isn't JSON-looking, append a marker and leave existing content for forensics.
  first_nonempty=$(grep -m1 -v '^[[:space:]]*$' "$errors_file" || true)
  if [[ "$first_nonempty" != \{*\}* ]]; then
    print -r -- "{\"ts\":\"$(date -Iseconds)\",\"level\":\"warn\",\"source\":\"ops-preflight\",\"msg\":\"errors.jsonl contained non-JSONL content; leaving as-is for forensics\"}" >> "$errors_file"
  fi
fi

# Ensure health.jsonl exists
: > "$logs_dir/health.jsonl" 2>/dev/null || true

# Ensure tracker files exist
: > "$ops_dir/TICKET-TRACKER.md" 2>/dev/null || true
: > "$ops_dir/LEARNINGS.md" 2>/dev/null || true

print "ops preflight ok: $(date -Iseconds)"