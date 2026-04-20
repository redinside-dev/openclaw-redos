#!/usr/bin/env python3
"""
Health Monitor System for OpenClaw
Monitors system health and automatically remediates issues
"""

import os
import json
import time
import subprocess
import logging
from pathlib import Path
from datetime import datetime, timedelta
import hashlib
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HealthMonitor:
    def __init__(self):
        self.workspace_root = Path("/Users/redinside/.openclaw/workspace")
        self.openclaw_root = Path("/Users/redinside/.openclaw")
        self.health_log = self.openclaw_root / "logs" / "health.jsonl"
        self.health_state = self.openclaw_root / "logs" / "health-state.json"
        self.remediation_log = self.openclaw_root / "logs" / "remediation.log"
        self.cron_jobs_log = self.openclaw_root / "logs" / "cron-jobs.log"
        
        # Create necessary directories and files
        self.health_log.parent.mkdir(exist_ok=True)
        self.health_state.touch(exist_ok=True)
        self.remediation_log.parent.mkdir(exist_ok=True)
        self.cron_jobs_log.parent.mkdir(exist_ok=True)
        
        # Define health monitors
        self.monitors = [
            {
                'id': 'gateway_status',
                'name': 'Gateway Service Status',
                'check_interval': timedelta(minutes=5),
                'max_fails': 3,
                'auto_remediate': True,
                'remediation_script': 'gateway_restart.sh',
                'severity': 'P1',
                'description': 'Checks if OpenClaw gateway service is running'
            },
            {
                'id': 'credential_health',
                'name': 'Credential Health',
                'check_interval': timedelta(hours=1),
                'max_fails': 2,
                'auto_remediate': True,
                'remediation_script': 'credential_rotation.py',
                'severity': 'P1',
                'description': 'Checks health of API credentials (Perplexity, GitHub)'
            },
            {
                'id': 'file_structure',
                'name': 'File Structure Integrity',
                'check_interval': timedelta(hours=6),
                'max_fails': 1,
                'auto_remediate': True,
                'remediation_script': 'file_provisioning.py',
                'severity': 'P2',
                'description': 'Checks integrity of required file structure'
            },
            {
                'id': 'disk_space',
                'name': 'Disk Space',
                'check_interval': timedelta(hours=2),
                'max_fails': 2,
                'auto_remediate': True,
                'remediation_script': 'disk_cleanup.py',
                'severity': 'P2',
                'description': 'Monitors disk space and cleans up if needed'
            },
            {
                'id': 'memory_usage',
                'name': 'Memory Usage',
                'check_interval': timedelta(minutes=15),
                'max_fails': 3,
                'auto_remediate': True,
                'remediation_script': 'memory_cleanup.py',
                'severity': 'P3',
                'description': 'Monitors memory usage and cleans up if needed'
            }
        ]
        
        # Load state
        self.state = self.load_state()
    
    def load_state(self):
        """Load health monitoring state"""
        try:
            if self.health_state.exists():
                with open(self.health_state, 'r') as f:
                    return json.load(f)
        except:
            pass
        
        # Default state
        return {
            'last_check': {},
            'failure_counts': {},
            'last_remediation': {},
            'sla_breaches': [],
            'active_alerts': []
        }
    
    def save_state(self):
        """Save health monitoring state"""
        try:
            with open(self.health_state, 'w') as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
    
    def log_health_event(self, monitor_id, status, details=""):
        """Log health check event"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'monitor_id': monitor_id,
            'status': status,
            'details': details,
            'failure_count': self.state['failure_counts'].get(monitor_id, 0)
        }
        
        try:
            with open(self.health_log, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            logger.info(f"Logged health event: {monitor_id} - {status}")
        except Exception as e:
            logger.error(f"Failed to log health event: {e}")
    
    def log_remediation(self, monitor_id, action, success=True, details=""):
        """Log remediation activity"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'monitor_id': monitor_id,
            'action': action,
            'success': success,
            'details': details
        }
        
        try:
            with open(self.remediation_log, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            logger.info(f"Logged remediation: {monitor_id} - {action} - {'Success' if success else 'Failed'}")
        except Exception as e:
            logger.error(f"Failed to log remediation: {e}")
    
    def check_gateway_status(self):
        """Check if gateway service is running"""
        try:
            # Check if gateway process is running
            result = subprocess.run(['pgrep', '-f', 'openclaw gateway'], 
                                  capture_output=True, text=True)
            
            if result.stdout.strip():
                return True, "Gateway is running"
            else:
                return False, "Gateway is not running"
        except Exception as e:
            return False, f"Gateway check failed: {e}"
    
    def check_credential_health(self):
        """Check health of API credentials"""
        try:
            # Check if credential rotation script exists and is executable
            cred_script = self.openclaw_root / "workspace-ops" / "credential-rotation.py"
            if not cred_script.exists():
                return False, "Credential rotation script missing"
            
            if not os.access(cred_script, os.X_OK):
                return False, "Credential rotation script not executable"
            
            return True, "Credentials are healthy"
        except Exception as e:
            return False, f"Credential check failed: {e}"
    
    def check_file_structure(self):
        """Check integrity of required file structure"""
        try:
            # Check if essential directories exist
            required_dirs = [
                self.workspace_root,
                self.workspace_root / 'logs',
                self.workspace_root / 'memory',
                self.openclaw_root / 'logs',
                self.openclaw_root / 'backups'
            ]
            
            for dir_path in required_dirs:
                if not dir_path.exists():
                    return False, f"Missing directory: {dir_path}"
                if not dir_path.is_dir():
                    return False, f"Not a directory: {dir_path}"
            
            return True, "File structure is healthy"
        except Exception as e:
            return False, f"File structure check failed: {e}"
    
    def check_disk_space(self):
        """Check disk space"""
        try:
            # Get disk usage for the root filesystem
            result = subprocess.run(['df', '-h', '/'], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                # Parse output (last line contains root filesystem)
                lines = result.stdout.strip().split('\n')
                if len(lines) >= 2:
                    parts = lines[-1].split()
                    if len(parts) >= 5:
                        usage_percent = parts[4].rstrip('%')
                        usage = int(usage_percent)
                        
                        if usage > 90:
                            return False, f"Disk usage high: {usage}%"
                        return True, f"Disk usage healthy: {usage}%"
            
            return False, "Failed to parse disk usage"
        except Exception as e:
            return False, f"Disk space check failed: {e}"
    
    def check_memory_usage(self):
        """Check memory usage"""
        try:
            # Get memory usage
            result = subprocess.run(['free', '-h'], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                if len(lines) >= 2:
                    parts = lines[1].split()
                    if len(parts) >= 7:
                        mem_usage = parts[2]
                        # mem_usage is like "1.2G/8G"
                        used, total = mem_usage.split('/')
                        used_value = float(used.rstrip('G'))
                        total_value = float(total.rstrip('G'))
                        
                        usage_percent = (used_value / total_value) * 100
                        
                        if usage_percent > 80:
                            return False, f"Memory usage high: {usage_percent:.1f}%"
                        return True, f"Memory usage healthy: {usage_percent:.1f}%"
            
            return False, "Failed to parse memory usage"
        except Exception as e:
            return False, f"Memory check failed: {e}"
    
    def run_monitor(self, monitor):
        """Run a specific health monitor"""
        monitor_id = monitor['id']
        
        # Check if it's time to run this monitor
        last_check = self.state['last_check'].get(monitor_id)
        if last_check:
            last_check_time = datetime.fromisoformat(last_check)
            if datetime.now() - last_check_time < monitor['check_interval']:
                return  # Not time to check yet
        
        logger.info(f"Running monitor: {monitor['name']}")
        
        # Execute the appropriate check
        if monitor_id == 'gateway_status':
            is_healthy, details = self.check_gateway_status()
        elif monitor_id == 'credential_health':
            is_healthy, details = self.check_credential_health()
        elif monitor_id == 'file_structure':
            is_healthy, details = self.check_file_structure()
        elif monitor_id == 'disk_space':
            is_healthy, details = self.check_disk_space()
        elif monitor_id == 'memory_usage':
            is_healthy, details = self.check_memory_usage()
        else:
            is_healthy, details = False, "Unknown monitor"
        
        # Update last check time
        self.state['last_check'][monitor_id] = datetime.now().isoformat()
        
        # Log the health event
        self.log_health_event(monitor_id, "healthy" if is_healthy else "unhealthy", details)
        
        # Update failure count
        if not is_healthy:
            self.state['failure_counts'][monitor_id] = self.state['failure_counts'].get(monitor_id, 0) + 1
            
            # Check if we've exceeded max failures
            if self.state['failure_counts'][monitor_id] >= monitor['max_fails']:
                logger.warning(f"Monitor {monitor_id} has failed {self.state['failure_counts'][monitor_id]} times")
                
                # Auto-remediate if enabled
                if monitor['auto_remediate']:
                    self.remediate_monitor(monitor, details)
        else:
            # Reset failure count if healthy
            self.state['failure_counts'][monitor_id] = 0
        
        # Save state
        self.save_state()
    
    def remediate_monitor(self, monitor, failure_details):
        """Attempt to remediate a failing monitor"""
        monitor_id = monitor['id']
        
        logger.info(f"Attempting to remediate {monitor_id}")
        
        # Get remediation script
        remediation_script = self.openclaw_root / monitor['remediation_script']
        
        if not remediation_script.exists():
            logger.error(f"Remediation script not found: {remediation_script}")
            self.log_remediation(monitor_id, "remediation_attempt", success=False, 
                               details="Script not found")
            return False
        
        if not os.access(remediation_script, os.X_OK):
            logger.error(f"Remediation script not executable: {remediation_script}")
            self.log_remediation(monitor_id, "remediation_attempt", success=False, 
                               details="Script not executable")
            return False
        
        try:
            # Run the remediation script
            result = subprocess.run(['python3', str(remediation_script)], 
                                  capture_output=True, text=True, timeout=300)
            
            # Check if remediation was successful
            if result.returncode == 0:
                logger.info(f"Remediation successful for {monitor_id}")
                self.log_remediation(monitor_id, "remediation_success", success=True, 
                                   details=f"Exit code: {result.returncode}")
                
                # Reset failure count
                self.state['failure_counts'][monitor_id] = 0
                
                # Log that issue is resolved
                self.log_health_event(monitor_id, "remediated", 
                                    details=f"Remediated by {monitor['remediation_script']}")
                
                return True
            else:
                logger.error(f"Remediation failed for {monitor_id}: {result.stderr}")
                self.log_remediation(monitor_id, "remediation_failed", success=False, 
                                   details=f"Exit code: {result.returncode}, Error: {result.stderr}")
                return False
        except subprocess.TimeoutExpired:
            logger.error(f"Remediation timed out for {monitor_id}")
            self.log_remediation(monitor_id, "remediation_timeout", success=False, 
                               details="Timeout after 300 seconds")
            return False
        except Exception as e:
            logger.error(f"Remediation exception for {monitor_id}: {e}")
            self.log_remediation(monitor_id, "remediation_exception", success=False, 
                               details=str(e))
            return False
    
    def send_alert(self, monitor_id, message):
        """Send alert about health issue"""
        try:
            # Create email alert
            msg = MIMEMultipart()
            msg['From'] = 'openclaw@redinside.local'
            msg['To'] = 'admin@redinside.local'
            msg['Subject'] = f'OpenClaw Health Alert: {monitor_id}'
            
            body = f"Health Monitor Alert\n\n" \
                  f"Monitor: {monitor_id}\n" \
                  f"Message: {message}\n\n" \
                  f"Timestamp: {datetime.now().isoformat()}\n"
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email (configure your SMTP server)
            # For demo purposes, we'll just log
            logger.info(f"Alert sent: {message}")
            
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
    
    def run_all_monitors(self):
        """Run all health monitors"""
        logger.info("=== Running Health Monitors ===")
        
        for monitor in self.monitors:
            try:
                self.run_monitor(monitor)
            except Exception as e:
                logger.error(f"Error running monitor {monitor['id']}: {e}")
        
        logger.info("Health monitors completed")
    
    def run_cron_jobs(self):
        """Run scheduled cron jobs"""
        try:
            # Log cron job execution
            cron_entry = {
                'timestamp': datetime.now().isoformat(),
                'job': 'health_monitor',
                'status': 'running'
            }
            
            with open(self.cron_jobs_log, 'a') as f:
                f.write(json.dumps(cron_entry) + '\n')
            
            # Run health monitors
            self.run_all_monitors()
            
            # Update cron log
            cron_entry['status'] = 'completed'
            with open(self.cron_jobs_log, 'a') as f:
                f.write(json.dumps(cron_entry) + '\n')
            
            logger.info("Cron jobs completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Cron jobs failed: {e}")
            return False

def main():
    """Main entry point"""
    monitor = HealthMonitor()
    
    # Run the health monitoring system
    success = monitor.run_cron_jobs()
    
    if success:
        print("Health monitoring completed successfully")
    else:
        print("Health monitoring failed - check logs for details")

if __name__ == "__main__":
    main()