#!/usr/bin/env python3
import json
import sys
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# Read episodes file
episodes_file = sys.argv[1] if len(sys.argv) > 1 else '/Users/redinside/.openclaw/workspace/logs/episodes.jsonl'
output_file = sys.argv[2] if len(sys.argv) > 2 else '/Users/redinside/.openclaw/workspace/reports/daily-evals-2026-03-12.md'

# Parse cutoff time (24 hours ago from now)
cutoff_ts = datetime.now(timezone.utc) - timedelta(hours=24)
print(f"Cutoff time: {cutoff_ts}")

# Load entries
entries = []
with open(episodes_file, 'r') as f:
    for line in f:
        try:
            entry = json.loads(line.strip())
            ts_str = entry.get('ts')
            if ts_str:
                entry_ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                if entry_ts >= cutoff_ts:
                    entries.append(entry)
        except Exception as e:
            continue

print(f"Total entries in last 24h: {len(entries)}")

if not entries:
    print("No entries found in last 24h")
    sys.exit(0)

# Count success/failure
total = len(entries)
success_count = sum(1 for e in entries if e.get('outcome') == 'ok')
failure_count = total - success_count
failure_rate = (failure_count / total) * 100

print(f"Success: {success_count}, Failures: {failure_count}, Rate: {failure_rate:.2f}%")

# Cluster failures by (error_type, tool, agent)
failure_clusters = defaultdict(int)
for entry in entries:
    if entry.get('outcome') != 'ok':
        error_type = entry.get('error_type', 'unknown')
        tool = entry.get('tool', 'null')
        agent = entry.get('agentId', 'unknown')
        cluster_key = (error_type, tool, agent)
        failure_clusters[cluster_key] += 1

# Sort by count descending
sorted_clusters = sorted(failure_clusters.items(), key=lambda x: x[1], reverse=True)

# Print top clusters
print("\nTop failure clusters:")
for (error_type, tool, agent), count in sorted_clusters[:10]:
    print(f"  {count}x: error_type={error_type}, tool={tool}, agent={agent}")

# Generate report
report = f"""# Nightly Eval Report — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}

## Summary

- **Total episodes analyzed:** {total}
- **Success rate:** {success_count/total*100:.2f}% ({success_count}/{total})
- **Failure rate:** {failure_rate:.2f}% ({failure_count}/{total})

## Failure Clustering

| Count | Error Type | Tool | Agent |
|-------|------------|------|-------|
"""

for (error_type, tool, agent), count in sorted_clusters:
    report += f"| {count} | {error_type} | {tool} | {agent} |\n"

report += """
## Top 3 Recurring Failure Patterns & Proposed Fixes

"""

# Add top 3 patterns with fixes
for i, ((error_type, tool, agent), count) in enumerate(sorted_clusters[:3]):
    report += f"### Pattern {i+1}: {count} occurrences\n"
    report += f"- **Error:** {error_type}\n"
    report += f"- **Tool:** {tool}\n"
    report += f"- **Agent:** {agent}\n"
    report += f"- **Proposed fix:** "
    
    # Generate fix based on error type
    if error_type == 'billing' or 'billing' in str(error_type).lower():
        report += "Add billing monitoring and auto-topup for 9router keys. Implement fallback to alternative providers.\n"
    elif 'timeout' in str(error_type).lower():
        report += "Review timeout thresholds. Consider increasing cron job timeouts or optimizing slow operations.\n"
    elif 'model not allowed' in str(error_type).lower():
        report += "Fix model routing configuration. Ensure agents use allowed models, update agent configs to use approved providers.\n"
    elif error_type == 'unknown' or error_type is None:
        report += "Add better error classification. Capture full exceptions and improve logging.\n"
    else:
        report += "Investigate root cause. Consider adding retry logic or error-specific handling.\n"
    
    report += "\n"

report += """
## Autonomy Scorecard

*Note: Autonomy scorecard skill would be run here. Currently not available via script.*
"""

# Write report
with open(output_file, 'w') as f:
    f.write(report)

print(f"\nReport written to: {output_file}")

# Return thresholds
if failure_rate > 15:
    print(f"\n⚠️ FAILURE RATE EXCEEDS 15% THRESHOLD: {failure_rate:.2f}%")
else:
    print(f"\n✅ Failure rate within threshold: {failure_rate:.2f}%")

print("\nNO_REPLY")