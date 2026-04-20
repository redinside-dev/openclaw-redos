#!/usr/bin/env python3
"""
Security Monitoring Daemon
Runs periodic security scans: checks expired grants, detects anomalies,
generates compliance reports.
"""

import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

# Paths
SECURITY_DIR = Path(__file__).parent
COMPLIANCE_DIR = SECURITY_DIR / "compliance"
AUDIT_LOG_DIR = SECURITY_DIR / "audit_log"
ACTIVE_GRANTS = SECURITY_DIR / "access_control" / "active_grants.json"
PENDING_REQUESTS = SECURITY_DIR / "access_control" / "pending_requests.json"
TRUST_SCORES = SECURITY_DIR / "trust_scores.json"
PID_FILE = SECURITY_DIR / "monitoring_daemon.pid"
LOG_FILE = SECURITY_DIR / "monitoring_daemon.log"

# Ensure directories exist
COMPLIANCE_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_LOG_DIR.mkdir(parents=True, exist_ok=True)

# Scan interval (seconds)
SCAN_INTERVAL = 300  # 5 minutes

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("monitoring_daemon")


def load_json(path: Path, default=None):
    """Load JSON file or return default"""
    if default is None:
        default = []
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return default
    return default


def save_json(path: Path, data):
    """Save JSON file"""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)


def log_audit(message: str):
    """Log audit message"""
    ts = datetime.now()
    log_file = AUDIT_LOG_DIR / f"{ts.strftime('%Y-%m-%d')}.log"
    with open(log_file, 'a') as f:
        f.write(f"[{ts.isoformat()}] [monitoring] {message}\n")


class SecurityMonitor:

    def __init__(self):
        self.running = False
        self.scan_count = 0

    # ── Grant checks ────────────────────────────────────────

    def check_expired_grants(self) -> List[str]:
        """Revoke any grants that have expired"""
        grants = load_json(ACTIVE_GRANTS, [])
        now = datetime.now()
        expired = []
        remaining = []

        for grant in grants:
            try:
                expires_at = datetime.fromisoformat(grant["expires_at"])
                if now > expires_at:
                    expired.append(grant["request_id"])
                    log_audit(
                        f"Grant expired and revoked: {grant['request_id']} "
                        f"(agent={grant.get('agent', '?')})"
                    )
                else:
                    remaining.append(grant)
            except (KeyError, ValueError):
                remaining.append(grant)

        if expired:
            save_json(ACTIVE_GRANTS, remaining)
            logger.info(f"Revoked {len(expired)} expired grant(s): {expired}")

        return expired

    def check_stale_requests(self) -> List[str]:
        """Flag pending requests older than 1 hour"""
        requests = load_json(PENDING_REQUESTS, [])
        now = datetime.now()
        stale = []

        for req in requests:
            try:
                submitted = datetime.fromisoformat(req["submitted_at"])
                if (now - submitted) > timedelta(hours=1):
                    stale.append(req["id"])
                    log_audit(f"Stale request detected: {req['id']} (age > 1h)")
            except (KeyError, ValueError):
                pass

        if stale:
            logger.warning(f"Found {len(stale)} stale pending request(s): {stale}")

        return stale

    # ── Trust score checks ──────────────────────────────────

    def check_trust_anomalies(self) -> List[Dict]:
        """Flag agents whose trust score is below threshold"""
        scores = load_json(TRUST_SCORES, {})
        alerts = []

        for agent, score in scores.items():
            if score < 20:
                alert = {
                    "agent": agent,
                    "score": score,
                    "level": "critical",
                    "message": f"Agent {agent} trust score critically low ({score})"
                }
                alerts.append(alert)
                log_audit(f"CRITICAL: {alert['message']}")
            elif score < 50:
                alert = {
                    "agent": agent,
                    "score": score,
                    "level": "warning",
                    "message": f"Agent {agent} trust score low ({score})"
                }
                alerts.append(alert)
                log_audit(f"WARNING: {alert['message']}")

        return alerts

    # ── Compliance report ───────────────────────────────────

    def generate_compliance_report(self) -> Dict:
        """Generate a compliance report for this scan cycle"""
        grants = load_json(ACTIVE_GRANTS, [])
        pending = load_json(PENDING_REQUESTS, [])
        scores = load_json(TRUST_SCORES, {})

        expired = self.check_expired_grants()
        stale = self.check_stale_requests()
        trust_alerts = self.check_trust_anomalies()

        report = {
            "timestamp": datetime.now().isoformat(),
            "scan_number": self.scan_count,
            "summary": {
                "active_grants": len(grants),
                "pending_requests": len(pending),
                "expired_revoked": len(expired),
                "stale_requests": len(stale),
                "trust_alerts": len(trust_alerts),
                "status": "SECURE" if not trust_alerts else "ALERT"
            },
            "active_grants": grants,
            "pending_requests": pending,
            "trust_scores": scores,
            "trust_alerts": trust_alerts,
            "expired_grants": expired,
            "stale_requests": stale
        }

        # Save report
        report_file = COMPLIANCE_DIR / f"{datetime.now().strftime('%Y-%m-%d_%H-%M')}.json"
        save_json(report_file, report)

        # Also save a "latest" symlink-style file for easy access
        save_json(COMPLIANCE_DIR / "latest.json", report)

        return report

    # ── Daemon lifecycle ────────────────────────────────────

    def run_scan(self):
        """Run one security scan cycle"""
        self.scan_count += 1
        logger.info(f"=== Security scan #{self.scan_count} ===")

        report = self.generate_compliance_report()
        summary = report["summary"]

        status = summary["status"]
        logger.info(
            f"Scan complete: {status} | "
            f"grants={summary['active_grants']} "
            f"pending={summary['pending_requests']} "
            f"expired={summary['expired_revoked']} "
            f"alerts={summary['trust_alerts']}"
        )

        if summary["trust_alerts"] > 0:
            logger.warning(f"SECURITY ALERTS: {summary['trust_alerts']} trust issues detected")

        log_audit(
            f"Scan #{self.scan_count} complete: {status} | "
            f"grants={summary['active_grants']} alerts={summary['trust_alerts']}"
        )

    def start(self):
        """Start the monitoring daemon"""
        logger.info("Starting Security Monitoring Daemon")
        logger.info(f"Scan interval: {SCAN_INTERVAL}s ({SCAN_INTERVAL // 60}m)")

        # Write PID
        with open(PID_FILE, 'w') as f:
            f.write(str(os.getpid()))

        self.running = True
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)

        try:
            while self.running:
                self.run_scan()
                time.sleep(SCAN_INTERVAL)
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()

    def stop(self):
        """Stop the daemon"""
        logger.info("Stopping Security Monitoring Daemon")
        self.running = False
        if PID_FILE.exists():
            PID_FILE.unlink()
        log_audit("Monitoring daemon stopped")

    def _handle_signal(self, signum, frame):
        logger.info(f"Received signal {signum}")
        self.stop()
        sys.exit(0)


# ── CLI ─────────────────────────────────────────────────────

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "start"

    if cmd == "start":
        # Check for existing process
        if PID_FILE.exists():
            old_pid = int(PID_FILE.read_text().strip())
            try:
                os.kill(old_pid, 0)
                print(f"Daemon already running (PID {old_pid})")
                sys.exit(1)
            except OSError:
                PID_FILE.unlink()

        monitor = SecurityMonitor()
        monitor.start()

    elif cmd == "scan":
        # Run a single scan and exit
        monitor = SecurityMonitor()
        monitor.run_scan()
        print("Single scan complete. See compliance/latest.json")

    elif cmd == "status":
        latest = COMPLIANCE_DIR / "latest.json"
        if latest.exists():
            report = load_json(latest, {})
            print(json.dumps(report.get("summary", {}), indent=2))
        else:
            print("No scans have been run yet.")

    elif cmd == "stop":
        if PID_FILE.exists():
            pid = int(PID_FILE.read_text().strip())
            try:
                os.kill(pid, signal.SIGTERM)
                print(f"Sent SIGTERM to PID {pid}")
            except OSError as e:
                print(f"Failed to stop: {e}")
                PID_FILE.unlink()
        else:
            print("Daemon not running (no PID file)")

    else:
        print("Usage: monitoring_daemon.py [start|scan|status|stop]")
        sys.exit(1)
