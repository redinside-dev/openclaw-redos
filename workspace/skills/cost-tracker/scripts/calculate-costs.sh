#!/bin/bash
# AgentOS — Calculate today's costs from cost-events.jsonl
# Usage: bash calculate-costs.sh [date]
# Default: today

DATE=${1:-$(date +%Y-%m-%d)}
OPENCLAW_DIR="$HOME/.openclaw"
COST_FILE="$OPENCLAW_DIR/workspace/logs/cost-events.jsonl"
BUDGET_FILE="$OPENCLAW_DIR/workspace/config/budget-guardrails.json"

if [ ! -f "$COST_FILE" ]; then
  echo "{\"date\":\"$DATE\",\"total_variable\":0,\"by_provider\":{},\"call_count\":0}"
  exit 0
fi

# Extract today's events
TODAYS_EVENTS=$(grep "$DATE" "$COST_FILE" 2>/dev/null || echo "")

if [ -z "$TODAYS_EVENTS" ]; then
  echo "{\"date\":\"$DATE\",\"total_variable\":0,\"by_provider\":{},\"call_count\":0}"
  exit 0
fi

# Calculate totals
RESULT=$(echo "$TODAYS_EVENTS" | jq -s '{
  date: "'"$DATE"'",
  total_variable: ([.[] | select(.billing_type == "payg") | .cost_usd] | add // 0),
  total_calls: length,
  by_provider: (group_by(.provider) | map({
    key: .[0].provider,
    value: {
      calls: length,
      cost: ([.[] | .cost_usd] | add // 0),
      tokens: ([.[] | .tokens.total] | add // 0)
    }
  }) | from_entries),
  by_billing: (group_by(.billing_type) | map({
    key: .[0].billing_type,
    value: length
  }) | from_entries),
  by_agent: (group_by(.agent) | map({
    key: .[0].agent,
    value: {
      calls: length,
      cost: ([.[] | .cost_usd] | add // 0)
    }
  }) | from_entries),
  retries: ([.[] | select(.was_retry == true)] | length),
  failures: ([.[] | select(.success == false)] | length)
}')

# Check against budget
if [ -f "$BUDGET_FILE" ]; then
  DAILY_LIMIT=$(jq -r '.variable_spend.daily_limit_usd' "$BUDGET_FILE")
  TOTAL_VAR=$(echo "$RESULT" | jq -r '.total_variable')
  PCT=$(echo "scale=2; $TOTAL_VAR / $DAILY_LIMIT * 100" | bc 2>/dev/null || echo "0")
  RESULT=$(echo "$RESULT" | jq --arg pct "$PCT" --arg limit "$DAILY_LIMIT" \
    '. + {daily_limit: ($limit|tonumber), budget_used_pct: ($pct|tonumber)}')
fi

echo "$RESULT"
