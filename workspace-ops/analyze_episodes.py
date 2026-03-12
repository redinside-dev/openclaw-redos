#!/usr/bin/env python3
import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta

# Read all lines from episodes.jsonl
with open('../workspace/logs/episodes.jsonl', 'r') as f:
    lines = f.readlines()

# Parse entries
entries = []
for line in lines:
    try:
        entry = json.loads(line)
        entries.append(entry)
    except:
        continue

# Filter to last 24 hours (from current time: 2026-03-10 01:37 UTC)
cutoff_time = datetime(2026, 3, 10, 1, 37, 0)
recent_entries = []
for entry in entries:
    ts_str = entry.get('ts')
    if not ts_str:
        continue
    # Parse timestamp (handle various formats)
    try:
        ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00')).replace(tzinfo=None)
    except:
        try:
            ts = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%S.%fZ")
        except:
            try:
                ts = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%SZ")
            except:
                continue
    
    cutoff_naive = cutoff_time.replace(tzinfo=None)
    if ts >= cutoff_naive - timedelta(hours=24):
        recent_entries.append(entry)

print(f"Total episodes in last 24h: {len(recent_entries)}")

# If no recent entries, output a special message and still generate report with zeros
if not recent_entries:
    print("No episodes found in the last 24 hours. System may have been idle or episodes.jsonl not updated.")
    total = 0
    success = 0
    failed = 0
    failure_rate = 0.0
    failure_clusters = {}
else:
    # Count successes/failures
    total = len(recent_entries)
    failed = sum(1 for e in recent_entries if e.get('outcome') == 'failed')
    success = total - failed
    failure_rate = (failed / total * 100) if total > 0 else 0.0

    # Cluster failures by (error_type, tool, agent)
    failure_clusters = defaultdict(int)
    for entry in recent_entries:
        if entry.get('outcome') == 'failed':
            error_type = entry.get('error_type', 'unknown')
            tool = entry.get('tool', 'unknown')
            agent = entry.get('agent', 'unknown')
            key = (error_type, tool, agent)
            failure_clusters[key] += 1

    print(f"Success: {success}, Failed: {failed}, Failure rate: {failure_rate:.2f}%")
    print("\nFailure clusters:")
    for (err, tool, agent), count in sorted(failure_clusters.items(), key=lambda x: -x[1])[:10]:
        print(f"- {count}x: error_type='{err}', tool='{tool}', agent='{agent}'")

# Get top 3 recurring failure patterns
top3 = sorted(failure_clusters.items(), key=lambda x: -x[1])[:3]
print("\nTop 3 recurring failure patterns:")
if not top3:
    print("None")
else:
    for i, ((err, tool, agent), count) in enumerate(top3, 1):
        print(f"{i}. {count} occurrences: {err} (tool: {tool}, agent: {agent})")

# Also write a summary file for the report
with open('episode_analysis_summary.json', 'w') as out:
    json.dump({
        'total': total,
        'success': success,
        'failed': failed,
        'failure_rate': failure_rate,
        'clusters': {str(k): v for k, v in failure_clusters.items()},
        'top3': [{'error_type': k[0], 'tool': k[1], 'agent': k[2], 'count': v} for k, v in top3]
    }, out, indent=2)
