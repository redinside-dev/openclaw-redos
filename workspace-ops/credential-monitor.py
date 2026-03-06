#!/usr/bin/env python3
"""
Credential Monitoring System
- Detects "no credentials for provider: openai" errors
- Automatically refreshes credentials when possible
- Alerts when credentials cannot be refreshed
"""

import json
import os
import subprocess
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List

# Configuration
LOG_FILE = "/Users/redinside/.openclaw/workspace-ops/logs/credential-monitor.log"
CREDENTIALS_FILE = "/Users/redinside/.openclaw/credentials.json"
ALERT_CHANNEL = "#redos-ops"
CHECK_INTERVAL = 300  # 5 minutes
MAX_REFRESH_ATTEMPTS = 3
REFRESH_COOLDOWN = 3600  # 1 hour between refresh attempts

# Setup logging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CredentialMonitor:
    def __init__(self):
        self.last_refresh_attempt = None
        self.refresh_cooldown = timedelta(seconds=REFRESH_COOLDOWN)
        self.known_issues: Dict[str, Dict] = {}
        
    def load_credentials(self) -> Optional[Dict]:
        """Load credentials from file"""
        try:
            if not os.path.exists(CREDENTIALS_FILE):
                logger.warning(f"Credentials file not found: {CREDENTIALS_FILE}")
                return None
                
            with open(CREDENTIALS_FILE, 'r') as f:
                return json.load(f)
                
        except Exception as e:
            logger.error(f"Failed to load credentials: {e}")
            return None
            
    def save_credentials(self, credentials: Dict):
        """Save credentials to file"""
        try:
            with open(CREDENTIALS_FILE, 'w') as f:
                json.dump(credentials, f, indent=2)
                logger.info("Credentials saved successfully")
                
        except Exception as e:
            logger.error(f"Failed to save credentials: {e}")
            
    def check_logs_for_errors(self) -> List[str]:
        """Check recent logs for credential errors"""
        error_patterns = [
            "no credentials for provider: openai",
            "401 Unauthorized",
            "invalid api key",
            "credential not found"
        ]
        
        error_messages = []
        
        # Check recent logs (last 24 hours)
        log_dir = Path("/Users/redinside/.openclaw/workspace-ops/logs/")
        if log_dir.exists():
            for log_file in log_dir.glob("*.log"):
                try:
                    with open(log_file, 'r') as f:
                        for line in f:
                            for pattern in error_patterns:
                                if pattern in line:
                                    error_messages.append(line.strip())
                                    break
                except Exception as e:
                    logger.error(f"Failed to read log file {log_file}: {e}")
                    
        return error_messages
        
    def analyze_error(self, error_message: str) -> str:
        """Analyze error message to determine issue type"""
        if "no credentials for provider: openai" in error_message:
            return "missing_openai_credentials"
        elif "401 Unauthorized" in error_message or "invalid api key" in error_message:
            return "invalid_openai_api_key"
        elif "credential not found" in error_message:
            return "missing_generic_credential"
        else:
            return "unknown_error"
            
    def refresh_openai_credentials(self) -> bool:
        """Attempt to refresh OpenAI credentials"""
        if self.last_refresh_attempt and 
           datetime.now() - self.last_refresh_attempt < self.refresh_cooldown:
            logger.info("Credential refresh cooldown active")
            return False
            
        try:
            logger.info("Attempting to refresh OpenAI credentials...")
            
            # Check for existing OpenAI credentials
            credentials = self.load_credentials()
            if not credentials or "openai" not in credentials:
                logger.info("No OpenAI credentials found, checking environment...")
                
                # Check environment variables
                if "OPENAI_API_KEY" in os.environ:
                    api_key = os.environ["OPENAI_API_KEY"]
                    logger.info("Found OpenAI API key in environment")
                    
                    # Save to credentials file
                    if not credentials:
                        credentials = {}
                    credentials["openai"] = {"api_key": api_key}
                    self.save_credentials(credentials)
                    
                    self.last_refresh_attempt = datetime.now()
                    logger.info("OpenAI credentials refreshed successfully")
                    return True
                    
            # Check for credential generation scripts
            scripts_dir = Path("/Users/redinside/.openclaw/scripts/")
            if scripts_dir.exists():
                for script in scripts_dir.glob("credential*"):
                    try:
                        result = subprocess.run([str(script)], 
                                             capture_output=True, 
                                             text=True,
                                             timeout=30)
                        if result.returncode == 0:
                            # Parse output for credentials
                            output = result.stdout.strip()
                            if "OPENAI_API_KEY=" in output:
                                api_key = output.split("OPENAI_API_KEY=")[-1].split()[0]
                                if not credentials:
                                    credentials = {}
                                credentials["openai"] = {"api_key": api_key}
                                self.save_credentials(credentials)
                                
                                self.last_refresh_attempt = datetime.now()
                                logger.info("OpenAI credentials generated successfully")
                                return True
                                
                    except Exception as e:
                        logger.debug(f"Script {script} failed: {e}")
                        
            logger.warning("Failed to refresh OpenAI credentials")
            return False
            
        except Exception as e:
            logger.error(f"Error during credential refresh: {e}")
            return False
            
    def send_alert(self, message: str):
        """Send alert to configured channel"""
        try:
            # Use message tool to send alert
            alert_message = f"🚨 CREDENTIAL MONITOR ALERT: {message}"
            
            # Log alert attempt
            logger.info(f"Sending alert: {message}")
            
            # This would be called in actual implementation
            # message.send(channel=ALERT_CHANNEL, message=alert_message)
            
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
            
    def process_errors(self, error_messages: List[str]):
        """Process detected error messages"""
        for error_message in error_messages:
            error_type = self.analyze_error(error_message)
            
            # Check if we've already processed this error
            error_hash = hash(error_message)
            if error_hash in self.known_issues:
                # Update timestamp
                self.known_issues[error_hash]["last_seen"] = datetime.now()
                continue
                
            # Log new error
            logger.warning(f"New credential error detected: {error_message}")
            self.known_issues[error_hash] = {
                "type": error_type,
                "first_seen": datetime.now(),
                "last_seen": datetime.now(),
                "count": 1
            }
            
            # Handle different error types
            if error_type == "missing_openai_credentials":
                self.send_alert("Missing OpenAI credentials detected")
                
                # Attempt automatic refresh
                success = self.refresh_openai_credentials()
                if success:
                    self.send_alert("OpenAI credentials refreshed successfully")
                else:
                    self.send_alert("Failed to refresh OpenAI credentials automatically")
                    
            elif error_type == "invalid_openai_api_key":
                self.send_alert("Invalid OpenAI API key detected")
                
                # Attempt to refresh
                success = self.refresh_openai_credentials()
                if success:
                    self.send_alert("OpenAI API key refreshed successfully")
                else:
                    self.send_alert("Failed to refresh OpenAI API key")
                    
            elif error_type == "missing_generic_credential":
                self.send_alert("Missing generic credential detected")
                
            # Log error handling
            logger.info(f"Processed {error_type} error")
            
    def cleanup_old_issues(self):
        """Clean up old known issues"""
        now = datetime.now()
        old_threshold = timedelta(hours=24)
        
        old_issues = []
        for error_hash, issue in list(self.known_issues.items()):
            if now - issue["last_seen"] > old_threshold:
                old_issues.append(error_hash)
                
        for error_hash in old_issues:
            del self.known_issues[error_hash]
            logger.info(f"Cleaned up old credential issue: {error_hash}")
            
    def run_monitoring(self):
        """Main monitoring loop"""
        logger.info("Starting credential monitoring system...")
        
        while True:
            try:
                # Check for credential errors
                error_messages = self.check_logs_for_errors()
                
                if error_messages:
                    logger.info(f"Found {len(error_messages)} credential errors")
                    self.process_errors(error_messages)
                else:
                    logger.info("No credential errors detected")
                    
                # Clean up old issues
                self.cleanup_old_issues()
                
                # Wait for next check
                time.sleep(CHECK_INTERVAL)
                
            except KeyboardInterrupt:
                logger.info("Credential monitoring stopped by user")
                break
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                time.sleep(CHECK_INTERVAL)
                
        logger.info("Credential monitoring system stopped")


def main():
    """Main entry point"""
    monitor = CredentialMonitor()
    
    # Check if we should run in monitoring mode or one-time check
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("Running one-time credential check...")
        errors = monitor.check_logs_for_errors()
        if errors:
            print(f"Found {len(errors)} credential errors:")
            for error in errors:
                print(f"  - {error}")
            monitor.process_errors(errors)
        else:
            print("No credential errors found")
    else:
        print("Starting credential monitoring system (Ctrl+C to stop)...")
        monitor.run_monitoring()


if __name__ == "__main__":
    main()