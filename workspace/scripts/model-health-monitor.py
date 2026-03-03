#!/usr/bin/env python3

"""Health monitor with auto-remediation for model outages.

GOAL-006 Deliverable 3: Health monitor #2 with auto-fix loop

Features:
- Monitors model availability via gateway health endpoint
- Auto-remediates by restarting gateway on repeated failures
- Only alerts if remediation fails after 3 attempts
"""

import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

LOG_FILE = Path.home() / ".openclaw/logs/model-health-monitor.log"
STATE_FILE = Path.home() / ".openclaw/workspace/tmp/model-health-state.json"

MAX_RETRIES = 3
RETRY_DELAY = 30  # seconds


def log(msg: str):
    """Log to file and stdout."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    log_msg = f"[{timestamp}] {msg}"
    print(log_msg)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(log_msg + "\n")


def check_model_health() -> bool:
    """Check if models are responding."""
    try:
        # Test with a simple model call
        result = subprocess.run(
            ["openclaw", "models", "list"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and len(result.stdout) > 0:
            log("✅ Models responding")
            return True
        
        log(f"⚠️  Model check failed: {result.stderr[:200]}")
        return False
        
    except subprocess.TimeoutExpired:
        log("⚠️  Model check timed out")
        return False
    except Exception as e:
        log(f"ERROR: Model health check failed: {e}")
        return False


def restart_gateway() -> bool:
    """Auto-remediation: restart gateway."""
    log("🔧 Attempting gateway restart...")
    
    try:
        # Stop gateway
        subprocess.run(
            ["launchctl", "stop", "ai.openclaw.gateway"],
            capture_output=True,
            timeout=10
        )
        time.sleep(5)
        
        # Start gateway
        result = subprocess.run(
            ["launchctl", "start", "ai.openclaw.gateway"],
            capture_output=True,
            timeout=10
        )
        
        if result.returncode == 0:
            log("✅ Gateway restarted")
            time.sleep(10)  # Wait for gateway to initialize
            return True
        
        log(f"❌ Gateway restart failed: {result.stderr}")
        return False
        
    except Exception as e:
        log(f"ERROR: Gateway restart failed: {e}")
        return False


def main():
    """Main health monitor logic."""
    log("=" * 60)
    log("Model Health Monitor")
    log("=" * 60)
    
    # Check model health
    if check_model_health():
        log("✅ All models healthy")
        print("NO_ALERT")
        return
    
    log("⚠️  Model health check failed - starting auto-remediation")
    
    # Auto-remediate with retries
    for attempt in range(1, MAX_RETRIES + 1):
        log(f"🔄 Remediation attempt {attempt}/{MAX_RETRIES}")
        
        if restart_gateway():
            # Verify fix worked
            time.sleep(5)
            if check_model_health():
                log(f"✅ Auto-remediation successful on attempt {attempt}")
                print("NO_ALERT")
                return
        
        if attempt < MAX_RETRIES:
            log(f"⏳ Waiting {RETRY_DELAY}s before retry...")
            time.sleep(RETRY_DELAY)
    
    log(f"❌ Auto-remediation failed after {MAX_RETRIES} attempts")
    log("🚨 ALERT: Manual intervention required")
    sys.exit(1)


if __name__ == "__main__":
    main()
