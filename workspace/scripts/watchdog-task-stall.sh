#!/bin/bash
# Watchdog: Detect stalled tasks in AUTONOMOUS.md with auto-remediation
# Run every 30min via cron to catch tasks stuck IN_PROGRESS >2hrs
# Auto-remediation: nudge agent, reassign if no response, escalate if critical

AUTONOMOUS_FILE="$HOME/.openclaw/workspace/AUTONOMOUS.md"
STATE_FILE="$HOME/.openclaw/workspace/tmp/ta[REDACTED]
ALERT_THRESHOLD_HOURS=2
NUDGE_THRESHOLD_HOURS=1
NOW=$(date -u +%s)

# Initialize state file if missing
if [ ! -f "$STATE_FILE" ]; then
    echo '{"nudged":{},"reassigned":{},"escalated":{}}' > "$STATE_FILE"
fi

STATE=$(cat "$STATE_FILE")
NUDGED=$(echo "$STATE" | jq -r '.nudged // {}')
REASSIGNED=$(echo "$STATE" | jq -r '.reassigned // {}')
ESCALATED=$(echo "$STATE" | jq -r '.escalated // {}')

ALERTS=()
REMEDIATED=()

# Auto-remediation: nudge agent via sessions_send
nudge_agent() {
    local task_id=$1
    local agent=$2
    local age_hours=$3
    
    echo "  → Nudging $agent about $task_id (stalled ${age_hours}h)"
    
    # Use openclaw CLI to send nudge
    openclaw sessions send --agent "$agent" --message "[WATCHDOG NUDGE] Task $task_id has been IN_PROGRESS for ${age_hours}h. Please provide status update or mark as blocked." 2>/dev/null
    
    if [ $? -eq 0 ]; then
        REMEDIATED+=("✓ Nudged $agent about $task_id")
        # Update state
        echo "$STATE" | jq ".nudged[\"$task_id\"] = $NOW" > "$STATE_FILE"
        return 0
    else
        return 1
    fi
}

# Auto-remediation: reassign task if agent not responding
reassign_task() {
    local task_id=$1
    local old_agent=$2
    local age_hours=$3
    
    echo "  → Reassigning $task_id from $old_agent (no response after ${age_hours}h)"
    
    # Mark as PENDING in AUTONOMOUS.md
    sed -i.bak "s/| $task_id | .* | $old_agent | .* | IN_PROGRESS/| $task_id | P1 | — | Task reassigned (stalled ${age_hours}h) | PENDING/" "$AUTONOMOUS_FILE"
    
    if [ $? -eq 0 ]; then
        REMEDIATED+=("✓ Reassigned $task_id (was: $old_agent)")
        echo "$STATE" | jq ".reassigned[\"$task_id\"] = $NOW" > "$STATE_FILE"
        
        # Notify dispatcher
        openclaw sessions send --agent main --message "[WATCHDOG] Task $task_id reassigned to queue (stalled ${age_hours}h, agent $old_agent not responding)" 2>/dev/null
        return 0
    else
        return 1
    fi
}

# Extract IN_PROGRESS tasks with timestamps
grep "IN_PROGRESS (claimed" "$AUTONOMOUS_FILE" 2>/dev/null | while IFS='|' read -r task_id priority agent task status; do
    # Parse timestamp from status field
    timestamp=$(echo "$status" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' | head -1)
    
    if [ -n "$timestamp" ]; then
        # Convert to epoch (macOS compatible)
        claimed_epoch=$(date -j -f "%Y-%m-%dT%H:%M" "$timestamp" +%s 2>/dev/null)
        
        if [ -n "$claimed_epoch" ]; then
            age_seconds=$((NOW - claimed_epoch))
            age_hours=$((age_seconds / 3600))
            
            task_id_clean=$(echo "$task_id" | xargs)
            agent_clean=$(echo "$agent" | xargs)
            
            # Check if already nudged
            last_nudge=$(echo "$STATE" | jq -r ".nudged[\"$task_id_clean\"] // 0")
            last_reassign=$(echo "$STATE" | jq -r ".reassigned[\"$task_id_clean\"] // 0")
            
            # Stage 1: Nudge after 1 hour
            if [ $age_hours -ge $NUDGE_THRESHOLD_HOURS ] && [ $age_hours -lt $ALERT_THRESHOLD_HOURS ]; then
                if [ "$last_nudge" = "0" ] || [ $((NOW - last_nudge)) -gt 3600 ]; then
                    nudge_agent "$task_id_clean" "$agent_clean" "$age_hours"
                fi
            fi
            
            # Stage 2: Reassign after 2 hours if not already reassigned
            if [ $age_hours -ge $ALERT_THRESHOLD_HOURS ]; then
                if [ "$last_reassign" = "0" ]; then
                    if reassign_task "$task_id_clean" "$agent_clean" "$age_hours"; then
                        continue
                    else
                        ALERTS+=("⚠️ STALLED TASK (reassignment failed): $task_id_clean claimed by $agent_clean ${age_hours}h ago")
                    fi
                else
                    # Already reassigned, check if still stalled
                    time_since_reassign=$(((NOW - last_reassign) / 3600))
                    if [ $time_since_reassign -ge 1 ]; then
                        ALERTS+=("🔴 CRITICAL: $task_id_clean still stalled ${age_hours}h after reassignment")
                    fi
                fi
            fi
        fi
    fi
done

# Check if dispatcher itself is failing
DISPATCH_LOG="$HOME/.openclaw/workspace/logs/dispatch.jsonl"
if [ -f "$DISPATCH_LOG" ]; then
    consecutive_errors=$(tail -5 "$DISPATCH_LOG" | grep -c '"action":"error"')
    if [ $consecutive_errors -ge 3 ]; then
        # Try to restart dispatcher cron
        echo "  → Attempting to fix dispatcher (${consecutive_errors} consecutive errors)"
        openclaw cron trigger autonomous-ta[REDACTED] 2>/dev/null
        
        if [ $? -eq 0 ]; then
            REMEDIATED+=("✓ Restarted dispatcher cron")
        else
            ALERTS+=("🔴 DISPATCHER FAILURE: $consecutive_errors consecutive errors, restart failed")
        fi
    fi
fi

# Output results
if [ ${#REMEDIATED[@]} -gt 0 ]; then
    echo "AUTO-REMEDIATION APPLIED:"
    printf '%s\n' "${REMEDIATED[@]}"
fi

if [ ${#ALERTS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️ TASK STALL WATCHDOG — MANUAL INTERVENTION REQUIRED"
    printf '%s\n' "${ALERTS[@]}"
    exit 1
else
    if [ ${#REMEDIATED[@]} -eq 0 ]; then
        # No issues, no remediation needed
        exit 0
    else
        # Remediation applied successfully
        echo "All issues auto-remediated"
        exit 0
    fi
fi
