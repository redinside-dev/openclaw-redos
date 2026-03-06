#!/usr/bin/env python3
"""
Credential Monitoring System
Detects and alerts on 'no credentials for provider: openai' errors
Implements automatic credential refresh logic
"""

import os
import json
import time
import logging
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Configuration
LOG_FILE = "/Users/redinside/.openclaw/workspace/logs/credential-monitor.log"
CREDENTIAL_CHECK_INTERVAL = 60  # seconds
ALERT_THRESHOLD = 3  # alert after 3 consecutive failures
OPENAI_CREDENTIAL_FILE = "/Users/redinside/.openai/api-key"
REFRESH_SCRIPT = "/Users/redinside/.openclaw/scripts/refresh-openai-credentials.sh"

class CredentialMonitor:
    def __init__(self):
        self.failure_count = 0
        self.last_success_time = datetime.now()
        self.alerted = False
        
        # Setup logging
        logging.basicConfig(
            filename=LOG_FILE,
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
        # Load any existing state
        self.load_state()
        
    def load_state(self):
        """Load monitoring state from file"""
        state_file = "/Users/redinside/.openclaw/workspace/ops/credential-monitor-state.json"
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r') as f:
                    state = json.load(f)
                    self.failure_count = state.get('failure_count', 0)
                    self.last_success_time = datetime.fromisoformat(state.get('last_success_time', datetime.now().isoformat()))
                    self.alerted = state.get('alerted', False)
                    self.logger.info(f"Loaded state: failures={self.failure_count}, last_success={self.last_success_time}")
            except Exception as e:
                self.logger.error(f"Failed to load state: {e}")
    
    def save_state(self):
        """Save monitoring state to file"""
        state = {
            'failure_count': self.failure_count,
            'last_success_time': self.last_success_time.isoformat(),
            'alerted': self.alerted
        }
        state_file = "/Users/redinside/.openclaw/workspace/ops/credential-monitor-state.json"
        try:
            with open(state_file, 'w') as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save state: {e}")
    
    def check_credentials(self) -> bool:
        """Check if OpenAI credentials are available"""
        try:
            # Check if credential file exists and is readable
            if not os.path.exists(OPENAI_CREDENTIAL_FILE):
                self.logger.warning(f"Credential file missing: {OPENAI_CREDENTIAL_FILE}")
                return False
            
            # Check if file has content
            with open(OPENAI_CREDENTIAL_FILE, 'r') as f:
                content = f.read().strip()
                if not content:
                    self.logger.warning(f"Credential file empty: {OPENAI_CREDENTIAL_FILE}")
                    return False
            
            # Test credential by making a simple API call
            try:
                result = subprocess.run(
                    ['curl', '-s', '-X', 'POST', 'https://api.openai.com/v1/models', 
                     '-H', f'Authorization: Bearer {content}'],
                    capture_output=True,
                    timeout=10
                )
                if result.returncode == 0:
                    self.logger.info("OpenAI credentials verified successfully")
                    return True
                else:
                    self.logger.warning(f"OpenAI API test failed: {result.stderr.decode().strip()}")
                    return False
            except subprocess.TimeoutExpired:
                self.logger.warning("OpenAI API test timed out")
                return False
            
        except Exception as e:
            self.logger.error(f"Credential check failed: {e}")
            return False
    
    def refresh_credentials(self) -> bool:
        """Attempt to refresh OpenAI credentials"""
        try:
            self.logger.info("Attempting to refresh OpenAI credentials")
            
            # Check if refresh script exists
            if not os.path.exists(REFRESH_SCRIPT):
                self.logger.error(f"Refresh script not found: {REFRESH_SCRIPT}")
                return False
            
            # Run the refresh script
            result = subprocess.run(
                [REFRESH_SCRIPT],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.logger.info("Credential refresh successful")
                # Verify new credentials
                if self.check_credentials():
                    self.failure_count = 0
                    self.alerted = False
                    self.save_state()
                    self.send_alert(
                        f"OpenAI credentials refreshed successfully\n\nNew credentials verified and working.",
                        level="info"
                    )
                    return True
                else:
                    self.logger.warning("Refresh succeeded but credentials still invalid")
                    return False
            else:
                self.logger.error(f"Credential refresh failed: {result.stderr}")
                return False
                
        except Exception as e:
            self.logger.error(f"Credential refresh error: {e}")
            return False
    
    def send_alert(self, message: str, level: str = "error"):
        """Send alert via configured channels"""
        try:
            # Send Telegram alert
            subprocess.run([
                'openclaw', 'message', 'send',
                '--channel', 'telegram',
                '--message', f"[CREDENTIAL MONITOR] {message}"
            ], check=True, capture_output=True)
            
            # Log the alert
            if level == "error":
                self.logger.error(message)
            else:
                self.logger.info(message)
                
        except Exception as e:
            self.logger.error(f"Failed to send alert: {e}")
    
    def analyze_logs_for_errors(self) -> int:
        """Analyze recent logs for 'no credentials for provider: openai' errors"""
        error_count = 0
        try:
            # Search for the specific error pattern in recent logs
            result = subprocess.run(
                ['rg', '-i', 'no credentials for provider: openai', 
                 '/Users/redinside/.openclaw/workspace/logs/',
                 '--type', 'log',
                 '--after-context', '0',
                 '--before-context', '0',
                 '-C', '0',
                 '--count-matches'
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                error_count = int(result.stdout.strip())
                self.logger.info(f"Found {error_count} credential error matches in logs")
            else:
                self.logger.warning(f"Log search failed: {result.stderr}")
                
        except Exception as e:
            self.logger.error(f"Log analysis failed: {e}")
        
        return error_count
    
    def run_monitoring_cycle(self):
        """Run a single monitoring cycle"""
        try:
            self.logger.info("Starting credential monitoring cycle")
            
            # Check current credential status
            credentials_valid = self.check_credentials()
            
            if credentials_valid:
                self.failure_count = 0
                self.last_success_time = datetime.now()
                self.alerted = False
                self.logger.info("Credentials are currently valid")
            else:
                self.failure_count += 1
                self.logger.warning(f"Credentials invalid (failure #{self.failure_count})")
                
                # Check if we should alert
                if self.failure_count >= ALERT_THRESHOLD:
                    # Analyze logs to see if this is a recent pattern
                    error_count = self.analyze_logs_for_errors()
                    
                    if error_count > 0:
                        # Send alert
                        self.send_alert(
                            f"OpenAI credential failure detected!\n" +
                            f"Consecutive failures: {self.failure_count}\n" +
                            f"Recent error matches in logs: {error_count}\n" +
                            f"Last success: {self.last_success_time}\n\n" +
                            f"Attempting automatic credential refresh..."
                        )
                        
                        # Try to refresh credentials
                        refresh_success = self.refresh_credentials()
                        
                        if refresh_success:
                            self.failure_count = 0
                            self.alerted = False
                        else:
                            self.alerted = True
                    else:
                        self.logger.info("No recent credential errors found in logs")
            
            # Save state
            self.save_state()
            
        except Exception as e:
            self.logger.error(f"Monitoring cycle error: {e}")
    
    def run_forever(self):
        """Run monitoring continuously"""
        self.logger.info("Starting credential monitoring service")
        
        while True:
            try:
                self.run_monitoring_cycle()
                
                # Sleep until next cycle
                time.sleep(CREDENTIAL_CHECK_INTERVAL)
                
            except KeyboardInterrupt:
                self.logger.info("Monitoring service interrupted")
                break
            except Exception as e:
                self.logger.error(f"Unexpected error in monitoring loop: {e}")
                time.sleep(CREDENTIAL_CHECK_INTERVAL)

def main():
    """Main entry point"""
    monitor = CredentialMonitor()
    
    # Run in continuous mode
    monitor.run_forever()

if __name__ == "__main__":
    main()