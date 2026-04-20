#!/usr/bin/env python3
"""Nightly evaluation analysis for episodes.jsonl"""

import json
import sys
from collections import defaultdict, Counter
from datetime import datetime, timezone, timedelta

# Read all episodes
episodes = []
with open('logs/episodes.jsonl', 'r') as f:
    for line in f:
        try:
            episodes.append(json.loads(line))
        except json.JSONDecodeError:
            continue

# Filter to last 24 hours from now (2026-03-07 05:29:00 EST = 2026-03-07 10:29:00 UTC)
now_utc = datetime(2026, 3, 7, 10, 29, 0, tzinfo=timezone.utc)
cutoff_utc = now_utc - timedelta(hours=24)

recent = []
for e in episodes:
    ts_str = e.get('ts')
    if not ts_str:
        continue
    try:
        if ts_str.endswith('Z'):
            ts_str = ts_str[:-1] + '+00:00'
        ts = datetime.fromisoformat(ts_str)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if ts >= cutoff_utc:
            recent.append(e)
    except (ValueError, TypeError) as err:
        continue

# Debug
print(f"DEBUG: Total episodes: {len(episodes)}, Recent: {len(recent)}", file=sys.stderr)
if recent:
    dates = [e.get('ts') for e in recent if e.get('ts')]
    if dates:
        print(f"DEBUG: Recent date range: {min(dates)} to {max(dates)}", file=sys.stderr)

# If no recent episodes, note that
if not recent:
    print("NIGHTLY EVAL REPORT")
    print("=" * 60)
    print(f"Analysis date: 2026-03-07 05:29 EST")
    print(f"Period: last 24 hours (since 2026-03-06 05:29 EST)")
    print("")
    print("⚠️  NO EPISODES FOUND IN LAST 24 HOURS")
    print("The episodes.jsonl log appears to be stale (last entries from 2026-02-28).")
    print("This means the Episode Seeder cron job may not be running or writing properly.")
    print("")
    print("RECOMMENDATION: Investigate cron seeding pipeline and workspace logging.")
    sys.exit(0)

# Stats
total = len(recent)
successful = sum(1 for e in recent if e.get('success', True))
failed = total - successful
failure_rate = (failed / total) * 100 if total > 0 else 0

# Cluster failures by (error_type, tool, agent)
failure_clusters = defaultdict(int)
for e in recent:
    if not e.get('success', True):
        key = (
            e.get('error_type', 'unknown'),
            e.get('tool', 'unknown'),
            e.get('agent', 'unknown')
        )
        failure_clusters[key] += 1

sorted_clusters = sorted(failure_clusters.items(), key=lambda x: -x[1])

# Report
print("NIGHTLY EVAL REPORT")
print("=" * 60)
print(f"Analysis date: 2026-03-07 05:29 EST")
print(f"Period: last 24 hours (2026-03-06 05:29 EST to 2026-03-07 05:29 EST)")
print(f"Total episodes analyzed: {total}")
print(f"Success rate: {successful}/{total} ({100-failure_rate:.1f}%)")
print(f"Failure rate: {failure_rate:.1f}%")
print("\nFailure breakdown by cluster (error_type, tool, agent):")
if sorted_clusters:
    for (error_type, tool, agent), count in sorted_clusters:
        print(f"  {count}x: error_type='{error_type}', tool='{tool}', agent='{agent}'")
else:
    print("  No failures detected.")

print("\nTop 3 recurring failure patterns:")
if sorted_clusters:
    for i, ((error_type, tool, agent), count) in enumerate(sorted_clusters[:3], 1):
        print(f"  {i}. {count} occurrences: {error_type} in {tool} ({agent})")
        if 'model not allowed' in error_type:
            print("     -> Fix: Update model routing to use allowed models for this agent/task")
        elif 'billing error' in error_type or 'insufficient balance' in error_type:
            print("     -> Fix: Top up provider credits or switch to fallback models")
        elif 'timeout' in error_type:
            print("     -> Fix: Increase job timeout or optimize task duration")
        elif 'cron: job execution timed out' in error_type:
            print("     -> Fix: Reduce task complexity or increase cron timeout")
        else:
            print("     -> Fix: Investigate root cause and update error handling")
else:
    print("  No failure patterns to report.")
