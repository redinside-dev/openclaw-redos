#!/usr/bin/env python3

"""Health monitor with auto-remediation for disk space.

GOAL-006 Deliverable 3: Health monitor with auto-fix loop

Features:
- Monitors disk usage every 5 minutes
- Auto-remediates at 85% threshold
- Only alerts if remediation fails to bring disk below 90%
"""

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

LOG_FILE = Path.home() / ".openclaw/logs/disk-health-monitor.log"
STATE_FILE = Path.home() / ".openclaw/workspace/tmp/disk-health-state.json"

THRESHOLD_WARNING = 85
THRESHOLD_CRITICAL = 90


def log(msg: str):
    """Log to file and stdout."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    log_msg = f"[{timestamp}] {msg}"
    print(log_msg)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(log_msg + "\n")


def get_disk_usage() -> int:
    """Get disk usage percentage."""
    try:
        result = subprocess.run(
            ["df", "-h", str(Path.home())],
            capture_output=True,
            text=True
        )
        lines = result.stdout.strip().split("\n")
        if len(lines) > 1:
            parts = lines[1].split()
            usage = parts[4].rstrip("%")
            return int(usage)
    except Exception as e:
        log(f"ERROR: Failed to get disk usage: {e}")
        return 0


def cleanup_old_files():
    """Auto-remediation: cleanup old files."""
    log("🔧 Starting auto-remediation...")
    
    actions = []
    
    # 1. Compress old session files (>30 days)
    try:
        result = subprocess.run(
            ["find", str(Path.home() / ".openclaw/sessions"), "-name", "*.jsonl",
             "-mtime", "+30", "-exec", "gzip", "{}", ";"],
            capture_output=True,
            timeout=60
        )
        if result.returncode == 0:
            actions.append("✅ Compressed old session files")
    except Exception as e:
        actions.append(f"⚠️  Session compression failed: {e}")
    
    # 2. Clean Docker unused resources
    try:
        result = subprocess.run(
            ["docker", "system", "prune", "-f", "--volumes"],
            capture_output=True,
            timeout=120
        )
        if result.returncode == 0:
            actions.append("✅ Cleaned Docker resources")
    except Exception:
        actions.append("ℹ️  Docker cleanup skipped (not available)")
    
    # 3. Archive old memory files (>90 days)
    try:
        memory_dir = Path.home() / ".openclaw/workspace-ops/memory"
        if memory_dir.exists():
            result = subprocess.run(
                ["find", str(memory_dir), "-name", "*.md",
                 "-mtime", "+90", "-exec", "gzip", "{}", ";"],
                capture_output=True,
                timeout=60
            )
            if result.returncode == 0:
                actions.append("✅ Archived old memory files")
    except Exception as e:
        actions.append(f"⚠️  Memory archival failed: {e}")
    
    # 4. Clean old logs (>7 days)
    try:
        logs_dir = Path.home() / ".openclaw/logs"
        if logs_dir.exists():
            result = subprocess.run(
                ["find", str(logs_dir), "-name", "*.log",
                 "-mtime", "+7", "-exec", "gzip", "{}", ";"],
                capture_output=True,
                timeout=60
            )
            if result.returncode == 0:
                actions.append("✅ Compressed old logs")
    except Exception as e:
        actions.append(f"⚠️  Log compression failed: {e}")
    
    # 5. Clean /tmp files
    try:
        result = subprocess.run(
            ["find", "/tmp", "-name", "openclaw-*", "-mtime", "+1", "-delete"],
            capture_output=True,
            timeout=30
        )
        if result.returncode == 0:
            actions.append("✅ Cleaned /tmp files")
    except Exception as e:
        actions.append(f"⚠️  /tmp cleanup failed: {e}")
    
    for action in actions:
        log(action)
    
    return len(actions)


def main():
    """Main health monitor logic."""
    log("=" * 60)
    log("Disk Health Monitor")
    log("=" * 60)
    
    usage = get_disk_usage()
    log(f"📊 Current disk usage: {usage}%")
    
    if usage < THRESHOLD_WARNING:
        log("✅ Disk usage healthy")
        print("NO_ALERT")
        return
    
    log(f"⚠️  Disk usage at {usage}% (threshold: {THRESHOLD_WARNING}%)")
    
    # Auto-remediate
    cleanup_old_files()
    
    # Check if remediation worked
    usage_after = get_disk_usage()
    log(f"📊 Disk usage after cleanup: {usage_after}%")
    
    if usage_after < THRESHOLD_CRITICAL:
        log(f"✅ Auto-remediation successful: {usage}% → {usage_after}%")
        print("NO_ALERT")
    else:
        log(f"❌ Auto-remediation failed: disk still at {usage_after}%")
        log("🚨 ALERT: Manual intervention required")
        sys.exit(1)


if __name__ == "__main__":
    main()
