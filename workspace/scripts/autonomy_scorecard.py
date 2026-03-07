#!/usr/bin/env python3
"""Autonomy Scorecard computation"""

import json
import sys
from collections import defaultdict
from datetime import datetime, timezone, timedelta

# Use fixed "now" for reproducibility (based on cron runtime: 2026-03-07 05:29 EST)
now_utc = datetime(2026, 3, 7, 10, 29, 0, tzinfo=timezone.utc)
today_date = now_utc.date()  # 2026-03-07
today_start_utc = datetime(2026, 3, 7, 5, 0, 0, tzinfo=timezone.utc)  # 00:00 EST = 05:00 UTC
today_end_utc = datetime(2026, 3, 8, 4, 59, 59, tzinfo=timezone.utc)    # 23:59 EST = 04:59 UTC next day

window_ago_ms = int((now_utc - timedelta(hours=24)).timestamp() * 1000)

def read_json(path):
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: File not found: {path}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"Warning: JSON decode error in {path}: {e}", file=sys.stderr)
        return None

def read_jsonl(path):
    entries = []
    try:
        with open(path, 'r') as f:
            for line in f:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except FileNotFoundError:
        print(f"Warning: File not found: {path}", file=sys.stderr)
    return entries

def read_txt(path):
    try:
        with open(path, 'r') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Warning: File not found: {path}", file=sys.stderr)
        return ""

# 1. Cron success rate (last 24h) from /Users/redinside/.openclaw/cron/jobs.json
cron_jobs = read_json('/Users/redinside/.openclaw/cron/jobs.json')
cron_ok = 0
cron_error = 0
cron_total_with_status = 0
delivery_success = 0
delivery_total = 0
if cron_jobs and 'jobs' in cron_jobs:
    for job in cron_jobs['jobs']:
        last_run = job.get('state', {}).get('lastRunAtMs', 0)
        last_status = job.get('state', {}).get('lastStatus')
        last_delivered = job.get('state', {}).get('lastDelivered')
        if last_run >= window_ago_ms:
            if last_status in ('ok', 'success'):
                cron_ok += 1
                cron_total_with_status += 1
            elif last_status in ('error', 'failed'):
                cron_error += 1
                cron_total_with_status += 1
            # Delivery metric (only count if we have a delivered flag)
            if last_delivered is not None:
                delivery_total += 1
                if last_delivered:
                    delivery_success += 1
cron_success_rate = (cron_ok / cron_total_with_status * 100) if cron_total_with_status > 0 else 0
delivery_success_rate = (delivery_success / delivery_total * 100) if delivery_total > 0 else 0

# 2. A2A activity (today) from workspace/logs/a2a-delegations.jsonl
a2a_entries = read_jsonl('/Users/redinside/.openclaw/workspace/logs/a2a-delegations.jsonl')
a2a_count_today = 0
for e in a2a_entries:
    ts_str = e.get('ts')
    if not ts_str:
        continue
    try:
        if ts_str.endswith('Z'):
            ts_str = ts_str[:-1] + '+00:00'
        ts = datetime.fromisoformat(ts_str)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if today_start_utc <= ts <= today_end_utc:
            a2a_count_today += 1
    except (ValueError, TypeError):
        continue

# 3. Open ticket count by priority from TICKET-TRACKER.md
ticket_content = read_txt('/Users/redinside/.openclaw/workspace/ops/TICKET-TRACKER.md')
open_p0 = 0
open_p1 = 0
import re
for line in ticket_content.split('\n'):
    if '|' in line and 'TICKET-' in line:
        parts = [p.strip() for p in line.split('|')]
        if len(parts) >= 4:
            priority = parts[2]
            status = parts[3]
            if status.upper() in ('OPEN', 'IN_PROGRESS'):
                if priority.upper() == 'P0':
                    open_p0 += 1
                elif priority.upper() == 'P1':
                    open_p1 += 1
open_p0_p1 = open_p0 + open_p1

# 4. Delivery success rate already computed above

# 5. Tool validation errors (today) from logs/tool-validation-errors.jsonl
tool_errors = 0
tool_errors_log = read_jsonl('/Users/redinside/.openclaw/workspace/logs/tool-validation-errors.jsonl')
for e in tool_errors_log:
    ts_str = e.get('ts')
    if not ts_str:
        continue
    try:
        if ts_str.endswith('Z'):
            ts_str = ts_str[:-1] + '+00:00'
        ts = datetime.fromisoformat(ts_str)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if today_start_utc <= ts <= today_end_utc:
            tool_errors += 1
    except (ValueError, TypeError):
        continue

# Compute overall score (1-10)
base = 5
score = base
if cron_success_rate >= 95:
    score += 1
if a2a_count_today >= 10:
    score += 1
if open_p0_p1 == 0:
    score += 1
if delivery_success_rate >= 95:
    score += 1
if tool_errors == 0:
    score += 1

# Determine status
if score >= 8:
    status = "HEALTHY"
elif score >= 6:
    status = "NEEDS ATTENTION"
else:
    status = "CRITICAL"

# Find lowest metric for next action
metrics = [
    ("cron_success_rate", cron_success_rate, 95),
    ("a2a_count", a2a_count_today, 10),
    ("open_p0_p1_tickets", open_p0_p1, 0),
    ("delivery_success_rate", delivery_success_rate, 95),
    ("tool_errors", tool_errors, 0)
]
lowest = None
lowest_ratio = float('inf')
for name, value, target in metrics:
    if target == 0:
        ratio = 0 if value > 0 else 1
    else:
        ratio = value / target
    if ratio < lowest_ratio:
        lowest_ratio = ratio
        lowest = (name, value, target)

next_action_map = {
    "cron_success_rate": "Investigate failing cron jobs and improve error handling.",
    "a2a_count": "Increase A2A delegation volume to meet autonomy targets.",
    "open_p0_p1_tickets": "Focus on resolving P0/P1 tickets immediately.",
    "delivery_success_rate": "Analyze delivery failures and fix underlying causes.",
    "tool_errors": "Review tool validation errors and tighten input validation."
}
next_action = next_action_map.get(lowest[0] if lowest else "cron_success_rate", "Review all metrics and take corrective action.")

# Output scorecard
print("AUTONOMY SCORECARD — 2026-03-07")
print("-" * 40)
print(f"Score: {score}/10")
print()
print(f"✅ Cron success: {cron_success_rate:.1f}% (ok={cron_ok}, error={cron_error})")
print(f"✅ A2A activity: {a2a_count_today} interactions today")
print(f"✅ Open P0/P1 tickets: {open_p0_p1}")
print(f"✅ Delivery success: {delivery_success_rate:.1f}%")
print(f"✅ Tool errors: {tool_errors}")
print()
print(f"Status: {status}")
print(f"Next action: {next_action}")

# Write JSON output to workspace/ops/
import os
os.makedirs('/Users/redinside/.openclaw/workspace/ops', exist_ok=True)
json_out = {
    "date": "2026-03-07",
    "score": score,
    "cron_success_rate": round(cron_success_rate, 1),
    "a2a_count": a2a_count_today,
    "open_p0_p1": open_p0_p1,
    "delivery_success_rate": round(delivery_success_rate, 1),
    "tool_errors": tool_errors
}
with open('/Users/redinside/.openclaw/workspace/ops/AUTONOMY-SCORE-2026-03-07.json', 'w') as f:
    json.dump(json_out, f, indent=2)
print(f"\nWrote scorecard to /Users/redinside/.openclaw/workspace/ops/AUTONOMY-SCORE-2026-03-07.json")
