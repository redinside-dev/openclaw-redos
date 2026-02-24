# RED Daily Ops Pipeline
# Deterministic morning routine: read state, check team, act on priorities
# Runs via cron or manually: lobster run red-daily-ops.lobster

exec --json --shell '
  DATE=$(date +%Y-%m-%d)
  echo "{\"date\":\"$DATE\",\"step\":\"start\"}"
'
| exec --stdin json --shell '
  DATE=$(echo $STDIN | jq -r .date)
  # Read goal stack
  GOALS=$(cat ~/.openclaw/workspace/goals/goals-main.json 2>/dev/null || echo "{}")
  # Read motivational state
  STATE=$(cat ~/.openclaw/workspace/memory/state-main.json 2>/dev/null || echo "{}")
  # Read working memory
  WORKING=$(cat ~/.openclaw/workspace/memory/working-main.json 2>/dev/null || echo "{}")
  echo "{\"date\":\"$DATE\",\"goals\":$GOALS,\"state\":$STATE,\"working\":$WORKING}"
'
| exec --stdin json --shell '
  DATE=$(echo $STDIN | jq -r .date)
  # Check A2A activity log
  A2A_COUNT=$(wc -l < ~/.openclaw/workspace/logs/a2a-delegations.jsonl 2>/dev/null || echo "0")
  # Check ticket tracker
  OPEN_TICKETS=$(grep -c "OPEN\|IN_PROGRESS" ~/.openclaw/workspace/ops/TICKET-TRACKER.md 2>/dev/null || echo "0")
  echo "{\"date\":\"$DATE\",\"a2a_count\":$A2A_COUNT,\"open_tickets\":$OPEN_TICKETS}"
'
| exec --stdin json --shell '
  A2A=$(echo $STDIN | jq -r .a2a_count)
  TICKETS=$(echo $STDIN | jq -r .open_tickets)
  DATE=$(echo $STDIN | jq -r .date)
  # Build priority list
  PRIORITIES="[]"
  if [ "$A2A" = "0" ]; then
    PRIORITIES=$(echo $PRIORITIES | jq ". + [{\"priority\":\"P1\",\"action\":\"A2A log empty — agents not communicating. Send sessions_send to each agent.\"}]")
  fi
  if [ "$TICKETS" -gt "5" ]; then
    PRIORITIES=$(echo $PRIORITIES | jq ". + [{\"priority\":\"P2\",\"action\":\"$TICKETS open tickets. Review and assign.\"}]")
  fi
  echo "{\"date\":\"$DATE\",\"a2a_count\":$A2A,\"open_tickets\":$TICKETS,\"priorities\":$PRIORITIES}"
'
| approve --preview-from-stdin --prompt "RED daily ops brief ready. Review priorities and approve action?" --limit 3
| exec --stdin json --shell '
  DATE=$(echo $STDIN | jq -r .date)
  # Write daily ops log entry
  LOG_FILE=~/.openclaw/workspace/memory/$DATE.md
  echo "" >> "$LOG_FILE"
  echo "## $(date +%H:%M) — RED — Daily Ops" >> "$LOG_FILE"
  echo "Daily ops pipeline ran. Priorities reviewed." >> "$LOG_FILE"
  echo "{\"status\":\"complete\",\"date\":\"$DATE\",\"log\":\"$LOG_FILE\"}"
'
