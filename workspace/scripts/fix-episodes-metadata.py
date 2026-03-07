#!/usr/bin/env python3
"""fix-episodes-metadata.py - Fix missing error metadata in episodes.jsonl"""

import json
import sys

INPUT = "/Users/redinside/.openclaw/workspace/logs/episodes.jsonl"

def get_error_metadata(error_val):
    """Extract error_type, tool, agent from various error formats."""
    if error_val is None:
        return "unknown", "unknown", "unknown"
    
    error_str = str(error_val)
    
    # Pattern matching based on common failures
    if "⚠️ ✉️ Message failed" in error_str:
        return "⚠️ ✉️ Message failed", "message", "ops"
    elif "cron: job execution timed out" in error_str:
        return "cron: job execution timed out", "cron", "ops"
    elif "Error: spawn docker ENOENT" in error_str:
        return "Error: spawn docker ENOENT", "docker", "finance"
    elif "model not allowed:" in error_str:
        return "model not allowed", "model_routing", "finance"
    else:
        return error_str, "unknown", "unknown"

episodes = []
fixed = 0

with open(INPUT, 'r') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            ep = json.loads(line)
            episodes.append(ep)
        except json.JSONDecodeError as e:
            print(f"Warning: Skipping invalid JSON line: {e}", file=sys.stderr)
            continue

# Fix episodes with missing error_type/tool/agent but with outcome=failed
for ep in episodes:
    if ep.get('outcome') == 'failed':
        if ep.get('error_type') is None:
            error_val = ep.get('error_type')  # Could be None or some other field
            # Check if there's an error message in another field
            if 'error_msg' in ep:
                error_val = ep.get('error_msg')
            elif 'message' in ep:
                error_val = ep.get('message')
            
            if error_val is None:
                error_val = "unknown"
            
            error_type, tool, agent = get_error_metadata(error_val)
            ep['error_type'] = error_type
            ep['tool'] = tool
            ep['agent'] = agent
            fixed += 1
        # Also fix cases where error_type exists but tool/agent missing
        elif ep.get('tool') is None or ep.get('agent') is None:
            error_val = ep.get('error_type')
            error_type, tool, agent = get_error_metadata(error_val)
            if tool != "unknown" and agent != "unknown":
                if ep.get('tool') is None:
                    ep['tool'] = tool
                if ep.get('agent') is None:
                    ep['agent'] = agent
                fixed += 1

# Write back
with open(INPUT, 'w') as f:
    for ep in episodes:
        f.write(json.dumps(ep) + '\n')

print(f"Fixed {fixed} episodes with proper error metadata")
sys.exit(0)
