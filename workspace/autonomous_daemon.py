#!/usr/bin/env python3
"""
Autonomous Task Daemon
Drives autonomous agent activity by triggering periodic scans and task creation
"""

import json
import logging
import os
import subprocess
import time
import signal
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

# Configuration
WORKSPACE = Path(__file__).parent
TASK_MANAGER = WORKSPACE / "tasks" / "task_manager.py"
PID_FILE = WORKSPACE / "autonomous_daemon.pid"
LOG_FILE = WORKSPACE / "logs" / "autonomous_daemon.log"

# Scan intervals (in seconds)
SCAN_INTERVALS = {
    "infosec": 300,      # 5 minutes
    "ops": 3600,         # 1 hour
    "research": 21600,   # 6 hours
    "eng": 21600,        # 6 hours
    "finance": 86400,    # 24 hours (daily)
    "allrounder": 86400, # 24 hours (daily)
    "main": 86400        # 24 hours (daily)
}

# Scan prompts for each agent
SCAN_PROMPTS = {
    "infosec": """Run your security monitoring scan:
1. Check workspace/security/access_control/ for pending requests
2. Review active grants and check for expired access
3. Check workspace/security/audit_log/ for anomalies
4. Review trust scores in workspace/security/trust_scores.json
5. Create tasks if you find issues requiring attention

Report any findings and create tasks as needed.""",
    
    "ops": """Run your system health check:
1. Check system resources and service status
2. Review logs for errors or warnings
3. Check for outdated dependencies (npm outdated, pip list --outdated)
4. Verify backup status
5. Test critical endpoints

Create tasks for any issues found.""",
    
    "research": """Run your deep analysis scan:
1. Review recent developments in AI/tech relevant to our stack
2. Check for security advisories in our dependencies
3. Research optimization opportunities
4. Analyze system performance trends
5. Identify learning opportunities

Create tasks for valuable findings.""",
    
    "eng": """Run your code quality review:
1. Check for code quality issues
2. Review recent changes for potential bugs
3. Identify refactoring opportunities
4. Check test coverage
5. Review technical debt

Create tasks for improvements.""",
    
    "finance": """Run your budget analysis:
1. Check workspace/config/budget-guardrails.json for usage
2. Review API costs and spending patterns
3. Identify cost optimization opportunities
4. Check for unused resources
5. Forecast spending trends

Create tasks for cost optimizations.""",
    
    "allrounder": """Run your intelligence scan (ZEN):
1. Search for relevant news and trends (use web search)
2. Check for industry developments affecting our work
3. Identify emerging opportunities
4. Monitor competitive landscape
5. Gather strategic insights

Create tasks for actionable intelligence.""",
    
    "main": """Run your progress review (RED):
1. Review task completion rates
2. Check team coordination and bottlenecks
3. Assess overall system health
4. Review strategic priorities
5. Identify areas needing attention

Create tasks for strategic improvements."""
}

# Logging setup
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class AutonomousDaemon:
    def __init__(self):
        self.running = False
        self.last_scan_times = {agent: datetime.min for agent in SCAN_INTERVALS.keys()}
        self.pid = None
        
    def write_pid(self):
        """Write PID file"""
        self.pid = os.getpid()
        with open(PID_FILE, 'w') as f:
            f.write(str(self.pid))
        logger.info(f"PID {self.pid} written to {PID_FILE}")
    
    def remove_pid(self):
        """Remove PID file"""
        if PID_FILE.exists():
            PID_FILE.unlink()
            logger.info("PID file removed")
    
    def trigger_agent_scan(self, agent: str) -> bool:
        """Trigger a scan for the given agent"""
        prompt = SCAN_PROMPTS.get(agent, "")
        if not prompt:
            logger.warning(f"No scan prompt defined for agent: {agent}")
            return False
        
        try:
            logger.info(f"Triggering scan for agent: {agent}")
            
            # Send message to agent via openclaw CLI
            result = subprocess.run(
                [
                    'openclaw', 'agent',
                    '--agent', agent,
                    '--message', prompt
                ],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                logger.info(f"✅ Scan completed for {agent}")
                return True
            else:
                logger.error(f"❌ Scan failed for {agent}: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error(f"⏱️ Scan timeout for {agent}")
            return False
        except Exception as e:
            logger.error(f"❌ Error triggering scan for {agent}: {e}")
            return False
    
    def should_scan(self, agent: str) -> bool:
        """Check if it's time to scan this agent"""
        interval = SCAN_INTERVALS.get(agent, 86400)
        last_scan = self.last_scan_times.get(agent, datetime.min)
        now = datetime.now()
        
        time_since_last = (now - last_scan).total_seconds()
        return time_since_last >= interval
    
    def run_scan_cycle(self):
        """Run one cycle of scans"""
        logger.info("=== Running scan cycle ===")
        
        for agent, interval in SCAN_INTERVALS.items():
            if self.should_scan(agent):
                logger.info(f"🔍 Scanning {agent} (interval: {interval}s)")
                
                success = self.trigger_agent_scan(agent)
                
                if success:
                    self.last_scan_times[agent] = datetime.now()
                    logger.info(f"✅ {agent} scan complete, next in {interval}s")
                else:
                    logger.warning(f"⚠️ {agent} scan failed, will retry next cycle")
            else:
                time_until_next = SCAN_INTERVALS[agent] - (datetime.now() - self.last_scan_times[agent]).total_seconds()
                logger.debug(f"⏭️ Skipping {agent}, next scan in {int(time_until_next)}s")
        
        logger.info("=== Scan cycle complete ===\n")
    
    def start(self):
        """Start the daemon"""
        logger.info("🚀 Starting Autonomous Task Daemon")
        
        self.write_pid()
        self.running = True
        
        # Register signal handlers
        signal.signal(signal.SIGTERM, self.handle_signal)
        signal.signal(signal.SIGINT, self.handle_signal)
        
        logger.info("Daemon running. Press Ctrl+C to stop.")
        
        try:
            while self.running:
                self.run_scan_cycle()
                
                # Sleep for 60 seconds before next check
                time.sleep(60)
                
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the daemon"""
        logger.info("🛑 Stopping Autonomous Task Daemon")
        self.running = False
        self.remove_pid()
        logger.info("Daemon stopped")
    
    def handle_signal(self, signum, frame):
        """Handle termination signals"""
        logger.info(f"Received signal {signum}")
        self.stop()
        sys.exit(0)


def main():
    """Main entry point"""
    # Check if already running
    if PID_FILE.exists():
        with open(PID_FILE) as f:
            old_pid = int(f.read().strip())
        
        # Check if process is still running
        try:
            os.kill(old_pid, 0)
            logger.error(f"Daemon already running with PID {old_pid}")
            sys.exit(1)
        except OSError:
            # Process not running, remove stale PID file
            PID_FILE.unlink()
            logger.info("Removed stale PID file")
    
    daemon = AutonomousDaemon()
    daemon.start()


if __name__ == "__main__":
    main()
