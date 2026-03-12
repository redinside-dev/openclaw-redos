#!/usr/bin/env python3
"""
Nightly Eval Analysis for episodes.jsonl
Filters last 24h, clusters failures, computes metrics, and generates report.
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from collections import Counter, defaultdict
import os

# Configuration
EPISODES_PATH = "../workspace/logs/episodes.jsonl"
REPORTS_DIR = "../workspace/reports"
now = datetime.now(timezone.utc)
cutoff_24h = now - timedelta(hours=24)

def parse_ts(ts_str):
    """Parse ISO timestamp to datetime."""
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

def main():
    # Read and filter last 24h
    episodes = []
    try:
        with open(EPISODES_PATH, 'r') as f:
            for line in f:
                try:
                    ep = json.loads(line.strip())
                    ts = parse_ts(ep.get('ts', ''))
                    if ts >= cutoff_24h:
                        episodes.append(ep)
                except Exception:
                    continue
    except FileNotFoundError:
        print(f"Error: {EPISODES_PATH} not found", file=sys.stderr)
        sys.exit(1)

    total = len(episodes)
    if total == 0:
        print("No episodes in last 24h. Skipping analysis.", file=sys.stderr)
        sys.exit(0)

    # Count successes/failures
    failed_episodes = [ep for ep in episodes if ep.get('outcome') != 'ok']
    failed_count = len(failed_episodes)
    success_count = total - failed_count
    failure_rate = (failed_count / total) * 100

    # Cluster failures by (error_type, tool, agent)
    cluster_counts = Counter()
    for ep in failed_episodes:
        error_type = ep.get('error_type', 'unknown') or 'unknown'
        tool = ep.get('tool', 'unknown') or 'unknown'
        agent = ep.get('agent', 'unknown') or 'unknown'
        cluster_counts[(error_type, tool, agent)] += 1

    # Get top 3 recurring failure patterns
    top_failures = cluster_counts.most_common(3)

    # Generate report filename
    date_str = now.strftime("%Y-%m-%d")
    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, f"daily-evals-{date_str}.md")

    # Build report content
    report_lines = [
        f"# 🧪 Nightly Eval Report — {date_str}",
        f"",
        f"**Generated:** {now.isoformat()}",
        f"**Episodes analyzed (last 24h):** {total}",
        f"**Success rate:** {success_count}/{total} ({100-failure_rate:.1f}%)",
        f"**Failure rate:** {failure_rate:.1f}%",
        f"",
        f"## 📊 Failure Clusters",
        f"",
        f"| # | Error Type | Tool | Agent | Count |",
        f"|---|------------|------|-------|-------|"
    ]

    for idx, ((err, tool, agent), count) in enumerate(top_failures, start=1):
        report_lines.append(f"| {idx} | {err} | {tool} | {agent} | {count} |")

    report_lines.extend([
        "",
        "## 🔍 Top 3 Recurring Failure Patterns & Proposed Fixes",
        ""
    ])

    for idx, ((err, tool, agent), count) in enumerate(top_failures, start=1):
        fix_suggestions = []
        if "billing" in err.lower() or "quota" in err.lower():
            fix_suggestions.append("Add billing alerts, increase quota, implement graceful failover")
        if "timeout" in err.lower():
            fix_suggestions.append("Increase timeout thresholds, split long-running tasks, add retry with backoff")
        if "unknown" in err.lower() and tool == "unknown":
            fix_suggestions.append("Improve error logging and context capture in cron tasks")
        if "cron: job execution timed out" in err.lower():
            fix_suggestions.append("Adjust cron timeouts, break large tasks into smaller chunks")
        if "model not allowed" in err.lower():
            fix_suggestions.append("Review model routing rules, ensure required models are enabled for agents")
        if "rate_limit" in err.lower():
            fix_suggestions.append("Implement exponential backoff and circuit breaker for rate-limited APIs")
        if not fix_suggestions:
            fix_suggestions.append("Investigate root cause; add targeted monitoring and alerts")

        report_lines.extend([
            f"### {idx}. {err} (Tool: {tool}, Agent: {agent}) — {count} occurrences",
            f"",
            f"**Proposed fixes:** {'; '.join(fix_suggestions)}",
            ""
        ])

    # Try to get autonomy scorecard if available
    report_lines.extend([
        "## 📈 Autonomy Scorecard",
        "",
        "*(To be populated by autonomy-scorecard skill)*"
    ])

    # Deny pattern recommendations
    report_lines.extend([
        "",
        "## 🛡️ Deny Pattern Recommendations",
        ""
    ])

    # Suggest based on error clusters
    deny_suggestions = []
    if any("billing" in err.lower() for (err, _, _) in cluster_counts):
        deny_suggestions.append("Add deny_pattern for tasks with `billing` errors to prevent repeated failures")
    if any("rate_limit" in err.lower() for (err, _, _) in cluster_counts):
        deny_suggestions.append("Add deny_pattern for `rate_limit` errors during high-traffic periods")
    if any("model not found" in err.lower() for (err, _, _) in cluster_counts):
        deny_suggestions.append("Add deny_pattern for invalid model names to stop unnecessary attempts")

    if deny_suggestions:
        for i, sug in enumerate(deny_suggestions, 1):
            report_lines.append(f"{i}. {sug}")
    else:
        report_lines.append("No specific deny_pattern recommendations based on recent failures.")

    # Write report
    with open(report_path, 'w') as f:
        f.write("\n".join(report_lines))

    print(f"Report written to {report_path}")

    # Check thresholds and send alerts
    if failure_rate > 15:
        # Alert via Telegram to 1012034994
        print(f"⚠️ ALERT: Failure rate {failure_rate:.1f}% exceeds 15% threshold. Would send Telegram DM to 1012034994 (not implemented in this script).")
    else:
        print(f"✅ Failure rate {failure_rate:.1f}% is within threshold.")

    # For autonomy score, we would call the skill but can't here; it would be invoked separately
    print("Note: Autonomy scorecard should be run separately via the autonomy-scorecard skill.")

if __name__ == "__main__":
    main()
