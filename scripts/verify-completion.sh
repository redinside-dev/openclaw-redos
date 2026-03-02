#!/usr/bin/env bash
# verify-completion.sh — Ground-truth artifact verification
#
# Usage: verify-completion.sh <taskId> <taskType> <expectedArtifact>
#
# Task types:
#   commit    — verify <expectedArtifact> (commit SHA prefix) exists in recent git log
#   pipeline  — verify last pipeline run on redinside-dev/openclaw-redos is green
#   file      — verify <expectedArtifact> (path) exists and was modified in last 10 min
#   endpoint  — verify HTTP GET to <expectedArtifact> returns 200
#
# Output: VERIFIED or FAILED (also updates tasks-log.md with verification result)
#
# Called by autonomous-worker-v2.js after writing "done" to tasks-log.md.
# If FAILED: re-opens task in AUTONOMOUS.md as BLOCKED with failure reason.

set -euo pipefail

TASK_ID="${1:-}"
TASK_TYPE="${2:-}"
ARTIFACT="${3:-}"
TASKS_LOG="$HOME/.openclaw/workspace/tasks-log.md"
AUTONOMOUS_MD="$HOME/.openclaw/workspace/AUTONOMOUS.md"

if [[ -z "$TASK_ID" || -z "$TASK_TYPE" || -z "$ARTIFACT" ]]; then
  echo "Usage: $0 <taskId> <taskType> <expectedArtifact>"
  echo "Types: commit | pipeline | file | endpoint"
  exit 1
fi

RESULT="FAILED"
REASON=""

case "$TASK_TYPE" in
  commit)
    # Verify commit SHA prefix appears in last 20 commits on openclaw-redos
    if gh api "repos/redinside-dev/openclaw-redos/commits" --jq '.[].sha' 2>/dev/null | grep -q "^${ARTIFACT}"; then
      RESULT="VERIFIED"
    else
      REASON="commit ${ARTIFACT} not found in recent git log"
    fi
    ;;

  pipeline)
    # Verify last pipeline run on openclaw-redos is green
    CONCLUSION=$(gh run list --repo redinside-dev/openclaw-redos --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "unknown")
    if [[ "$CONCLUSION" == "success" ]]; then
      RESULT="VERIFIED"
    else
      REASON="last pipeline conclusion: ${CONCLUSION} (not success)"
    fi
    ;;

  file)
    # Verify file exists and was modified in last 10 minutes
    if [[ ! -f "$ARTIFACT" ]]; then
      REASON="file not found: ${ARTIFACT}"
    else
      AGE=$(( $(date +%s) - $(date -r "$ARTIFACT" +%s) ))
      if [[ $AGE -lt 600 ]]; then
        RESULT="VERIFIED"
      else
        REASON="file exists but last modified ${AGE}s ago (threshold: 600s)"
      fi
    fi
    ;;

  endpoint)
    # Verify HTTP endpoint responds 200
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$ARTIFACT" 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" == "200" ]]; then
      RESULT="VERIFIED"
    else
      REASON="HTTP ${HTTP_CODE} from ${ARTIFACT}"
    fi
    ;;

  *)
    echo "Unknown task type: $TASK_TYPE"
    exit 1
    ;;
esac

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [[ "$RESULT" == "VERIFIED" ]]; then
  # Append verification to tasks-log.md
  echo "| ${TASK_ID} | verify | ${TIMESTAMP} | VERIFIED | artifact: ${ARTIFACT} |" >> "$TASKS_LOG"
  echo "VERIFIED"
else
  # Append failure to tasks-log.md
  echo "| ${TASK_ID} | verify | ${TIMESTAMP} | FAILED | ${REASON} |" >> "$TASKS_LOG"

  # Re-open task in AUTONOMOUS.md as BLOCKED if it was DONE
  if [[ -f "$AUTONOMOUS_MD" ]]; then
    python3 - << PYEOF
import re, sys

task_id = "${TASK_ID}"
reason = "${REASON}"
ts = "${TIMESTAMP}"

with open("${AUTONOMOUS_MD}", "r") as f:
    content = f.read()

# Check if task is in completed section — if so, add BLOCKED back to queue
if task_id in content:
    # Add BLOCKED entry to Queue if not already there
    block_line = f"| {task_id} | P1 | — | VERIFICATION FAILED: {reason} — re-investigate | BLOCKED ({ts}) |"
    queue_end = "---\n\n## Completed"
    if queue_end in content and task_id + " | BLOCKED" not in content:
        content = content.replace(queue_end, f"{block_line}\n{queue_end}")
        with open("${AUTONOMOUS_MD}", "w") as f:
            f.write(content)
        print(f"Re-opened {task_id} as BLOCKED in AUTONOMOUS.md")
PYEOF
  fi

  echo "FAILED: $REASON"
fi
