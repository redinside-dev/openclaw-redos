#!/usr/bin/env python3
"""
Smart Worker Suspension System
Implements exponential backoff to eliminate 96% waste rate from idle workers

Open Source - MIT License
Part of OpenClaw autonomous agent infrastructure
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional

WORKSPACE = Path(__file__).parent.parent
STATE_FILE = WORKSPACE / "workspace" / "ops" / "worker-suspension-state.json"
TASKS_LOG = WORKSPACE / "workspace" / "tasks-log.md"

# Backoff configuration
MIN_INTERVAL = 60        # 1 minute minimum
MAX_INTERVAL = 3600      # 1 hour maximum
BACKOFF_MULTIPLIER = 2.0 # Double interval on each idle cycle
RESET_THRESHOLD = 300    # Reset to min after 5 minutes of activity

class WorkerSuspensionManager:
    def __init__(self):
        self.state = self._load_state()
    
    def _load_state(self) -> Dict:
        """Load suspension state from disk"""
        if STATE_FILE.exists():
            with open(STATE_FILE) as f:
                return json.load(f)
        return {
            "workers": {},
            "last_updated": datetime.now().isoformat()
        }
    
    def _save_state(self):
        """Save suspension state to disk"""
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        self.state["last_updated"] = datetime.now().isoformat()
        with open(STATE_FILE, 'w') as f:
            json.dump(self.state, f, indent=2)
    
    def get_worker_state(self, worker: str) -> Dict:
        """Get current state for a worker"""
        if worker not in self.state["workers"]:
            self.state["workers"][worker] = {
                "current_interval": MIN_INTERVAL,
                "last_scan": None,
                "last_productive_work": None,
                "idle_cycles": 0,
                "total_scans": 0,
                "productive_scans": 0
            }
        return self.state["workers"][worker]
    
    def should_scan(self, worker: str) -> bool:
        """Check if worker should scan now"""
        state = self.get_worker_state(worker)
        
        if state["last_scan"] is None:
            return True
        
        last_scan = datetime.fromisoformat(state["last_scan"])
        elapsed = (datetime.now() - last_scan).total_seconds()
        
        return elapsed >= state["current_interval"]
    
    def record_scan(self, worker: str, was_productive: bool):
        """Record scan result and adjust interval"""
        state = self.get_worker_state(worker)
        
        state["last_scan"] = datetime.now().isoformat()
        state["total_scans"] += 1
        
        if was_productive:
            # Reset to minimum interval after productive work
            state["current_interval"] = MIN_INTERVAL
            state["idle_cycles"] = 0
            state["productive_scans"] += 1
            state["last_productive_work"] = datetime.now().isoformat()
        else:
            # Exponential backoff for idle workers
            state["idle_cycles"] += 1
            state["current_interval"] = min(
                state["current_interval"] * BACKOFF_MULTIPLIER,
                MAX_INTERVAL
            )
        
        self._save_state()
    
    def get_next_scan_time(self, worker: str) -> Optional[datetime]:
        """Get next scheduled scan time for worker"""
        state = self.get_worker_state(worker)
        
        if state["last_scan"] is None:
            return datetime.now()
        
        last_scan = datetime.fromisoformat(state["last_scan"])
        return last_scan + timedelta(seconds=state["current_interval"])
    
    def get_stats(self) -> Dict:
        """Get overall system stats"""
        total_scans = sum(w["total_scans"] for w in self.state["workers"].values())
        productive_scans = sum(w["productive_scans"] for w in self.state["workers"].values())
        
        waste_rate = 0
        if total_scans > 0:
            waste_rate = ((total_scans - productive_scans) / total_scans) * 100
        
        return {
            "total_workers": len(self.state["workers"]),
            "total_scans": total_scans,
            "productive_scans": productive_scans,
            "waste_rate": round(waste_rate, 1),
            "workers": {
                name: {
                    "interval": state["current_interval"],
                    "idle_cycles": state["idle_cycles"],
                    "efficiency": round(
                        (state["productive_scans"] / state["total_scans"] * 100)
                        if state["total_scans"] > 0 else 0,
                        1
                    )
                }
                for name, state in self.state["workers"].items()
            }
        }
    
    def force_wake(self, worker: str):
        """Force immediate wake for a worker"""
        state = self.get_worker_state(worker)
        state["current_interval"] = MIN_INTERVAL
        state["last_scan"] = None
        self._save_state()


def main():
    """CLI interface"""
    import sys
    
    manager = WorkerSuspensionManager()
    
    if len(sys.argv) < 2:
        print("Usage: smart_worker_suspension.py <command> [args]")
        print("Commands:")
        print("  should-scan <worker>     - Check if worker should scan")
        print("  record-scan <worker> <productive>  - Record scan result")
        print("  stats                    - Show system stats")
        print("  force-wake <worker>      - Force immediate wake")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "should-scan":
        worker = sys.argv[2]
        should = manager.should_scan(worker)
        print("yes" if should else "no")
        if not should:
            next_scan = manager.get_next_scan_time(worker)
            wait_seconds = (next_scan - datetime.now()).total_seconds()
            print(f"Next scan in {int(wait_seconds)}s", file=sys.stderr)
    
    elif cmd == "record-scan":
        worker = sys.argv[2]
        productive = sys.argv[3].lower() in ['true', '1', 'yes']
        manager.record_scan(worker, productive)
        state = manager.get_worker_state(worker)
        print(f"Recorded. Next interval: {state['current_interval']}s")
    
    elif cmd == "stats":
        stats = manager.get_stats()
        print(json.dumps(stats, indent=2))
    
    elif cmd == "force-wake":
        worker = sys.argv[2]
        manager.force_wake(worker)
        print(f"Worker {worker} forced awake")
    
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
