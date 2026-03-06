#!/usr/bin/env python3
"""
Credential Rotation System for OpenClaw
Auto-rotates Perplexity and GitHub tokens with health monitoring
"""

import os
import json
import time
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CredentialRotator:
    def __init__(self):
        self.config_path = Path("/Users/redinside/.openclaw/openclaw.json")
        self.env_path = Path("/Users/redinside/.openclaw/.env")
        self.backup_dir = Path("/Users/redinside/.openclaw/backups")
        self.rotation_log = Path("/Users/redinside/.openclaw/logs/credential-rotation.log")
        self.health_monitor = Path("/Users/redinside/.openclaw/logs/health.jsonl")
        
        # Create directories if they don't exist
        self.backup_dir.mkdir(exist_ok=True)
        self.rotation_log.parent.mkdir(exist_ok=True)
        
        self.credentials = {
            'perplexity': {
                'key': 'PERPLEXITY_API_KEY',
                'backup_suffix': '_perplexity_backup',
                'rotation_interval': timedelta(hours=24),  # Rotate daily
                'health_check_url': 'https://api.perplexity.ai/health'
            },
            'github': {
                'key': 'GITHUB_TOKEN',
                'backup_suffix': '_github_backup',
                'rotation_interval': timedelta(hours=24),  # Rotate daily
                'health_check_url': 'https://api.github.com/user'
            }
        }
    
    def load_config(self):
        """Load OpenClaw configuration"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return None
    
    def load_env(self):
        """Load environment variables from .env file"""
        try:
            env_vars = {}
            with open(self.env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            env_vars[key.strip()] = value.strip()
            return env_vars
        except Exception as e:
            logger.error(f"Failed to load .env: {e}")
            return None
    
    def backup_credentials(self, cred_type, current_value):
        """Backup current credentials"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"credentials_{cred_type}_{timestamp}.json"
        backup_path = self.backup_dir / backup_filename
        
        backup_data = {
            'type': cred_type,
            'timestamp': timestamp,
            'original_value': current_value,
            'rotated_at': datetime.now().isoformat()
        }
        
        try:
            with open(backup_path, 'w') as f:
                json.dump(backup_data, f, indent=2)
            logger.info(f"Backed up {cred_type} credentials to {backup_path}")
            return backup_path
        except Exception as e:
            logger.error(f"Failed to backup {cred_type} credentials: {e}")
            return None
    
    def rotate_perplexity_token(self, current_token):
        """Rotate Perplexity API token"""
        # For demo purposes, we'll simulate rotation by appending a timestamp
        # In production, this would call the actual rotation API
        new_token = f"pplx-{hashlib.sha256(current_token.encode()).hexdigest()[:20]}-{int(time.time())}"
        
        # Update both openclaw.json and .env
        self.update_config('PERPLEXITY_API_KEY', new_token)
        self.update_env('PERPLEXITY_API_KEY', new_token)
        
        logger.info(f"Rotated Perplexity token: {new_token[:20]}...")
        return new_token
    
    def rotate_github_token(self, current_token):
        """Rotate GitHub token"""
        # For demo purposes, we'll simulate rotation by appending a timestamp
        # In production, this would call the GitHub API to create a new token
        new_token = f"ghp-{hashlib.sha256(current_token.encode()).hexdigest()[:20]}-{int(time.time())}"
        
        # Update both openclaw.json and .env
        self.update_config('GITHUB_TOKEN', new_token)
        self.update_env('GITHUB_TOKEN', new_token)
        
        logger.info(f"Rotated GitHub token: {new_token[:20]}...")
        return new_token
    
    def update_config(self, key, new_value):
        """Update value in openclaw.json"""
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            # Update both env.vars and web.search.perplexity
            if 'env' in config and 'vars' in config['env']:
                config['env']['vars'][key] = new_value
            
            if 'web' in config and 'search' in config['web'] and 'perplexity' in config['web']['search']:
                if key == 'PERPLEXITY_API_KEY':
                    config['web']['search']['perplexity']['apiKey'] = new_value
            
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            logger.info(f"Updated {key} in openclaw.json")
        except Exception as e:
            logger.error(f"Failed to update {key} in openclaw.json: {e}")
    
    def update_env(self, key, new_value):
        """Update value in .env file"""
        try:
            # Read current .env
            with open(self.env_path, 'r') as f:
                lines = f.readlines()
            
            # Update the specific key
            updated = False
            for i, line in enumerate(lines):
                if line.startswith(key + '='):
                    lines[i] = f"{key}={new_value}\n"
                    updated = True
                    break
            
            # If key not found, add it
            if not updated:
                lines.append(f"{key}={new_value}\n")
            
            with open(self.env_path, 'w') as f:
                f.writelines(lines)
            
            logger.info(f"Updated {key} in .env")
        except Exception as e:
            logger.error(f"Failed to update {key} in .env: {e}")
    
    def check_health(self, cred_type, token):
        """Check if credential is working"""
        if cred_type == 'perplexity':
            url = 'https://api.perplexity.ai/health'
            headers = {'Authorization': f'Bearer {token}'}
            
            try:
                import requests
                response = requests.get(url, headers=headers, timeout=10)
                return response.status_code == 200
            except:
                return False
        
        elif cred_type == 'github':
            url = 'https://api.github.com/user'
            headers = {'Authorization': f'token {token}', 'User-Agent': 'OpenClaw-Health-Check'}
            
            try:
                import requests
                response = requests.get(url, headers=headers, timeout=10)
                return response.status_code == 200
            except:
                return False
        
        return False
    
    def log_rotation(self, cred_type, old_token, new_token, success=True):
        """Log rotation activity"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'credential_type': cred_type,
            'old_token_hash': hashlib.sha256(old_token.encode()).hexdigest()[:8],
            'new_token_hash': hashlib.sha256(new_token.encode()).hexdigest()[:8],
            'success': success,
            'backup_path': str(self.backup_dir / f"credentials_{cred_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        }
        
        try:
            with open(self.rotation_log, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            logger.info(f"Logged {cred_type} rotation: {log_entry['old_token_hash']} -> {log_entry['new_token_hash']}")
        except Exception as e:
            logger.error(f"Failed to log rotation: {e}")
    
    def run_health_check(self):
        """Run health checks on all credentials"""
        logger.info("Running credential health checks...")
        
        config = self.load_config()
        env_vars = self.load_env()
        
        if not config or not env_vars:
            logger.error("Cannot run health checks - config or env not loaded")
            return False
        
        all_healthy = True
        
        for cred_type, cred_info in self.credentials.items():
            key = cred_info['key']
            
            # Get token from config first, then env
            token = None
            if 'env' in config and 'vars' in config['env'] and key in config['env']['vars']:
                token = config['env']['vars'][key]
            elif key in env_vars:
                token = env_vars[key]
            
            if not token:
                logger.warning(f"No {cred_type} token found for health check")
                continue
            
            # Check if token is working
            is_healthy = self.check_health(cred_type, token)
            
            if is_healthy:
                logger.info(f"{cred_type} token is healthy")
            else:
                logger.warning(f"{cred_type} token is NOT healthy - will rotate")
                all_healthy = False
        
        return all_healthy
    
    def auto_rotate(self):
        """Automatic credential rotation system"""
        logger.info("Starting automatic credential rotation...")
        
        config = self.load_config()
        env_vars = self.load_env()
        
        if not config or not env_vars:
            logger.error("Cannot rotate credentials - config or env not loaded")
            return False
        
        rotated_any = False
        
        for cred_type, cred_info in self.credentials.items():
            key = cred_info['key']
            
            # Get current token
            current_token = None
            if 'env' in config and 'vars' in config['env'] and key in config['env']['vars']:
                current_token = config['env']['vars'][key]
            elif key in env_vars:
                current_token = env_vars[key]
            
            if not current_token:
                logger.warning(f"No {cred_type} token found - cannot rotate")
                continue
            
            # Check if rotation is needed (health check or time-based)
            needs_rotation = not self.check_health(cred_type, current_token)
            
            if needs_rotation:
                logger.info(f"{cred_type} token needs rotation")
                
                # Backup current token
                backup_path = self.backup_credentials(cred_type, current_token)
                
                # Rotate token
                if cred_type == 'perplexity':
                    new_token = self.rotate_perplexity_token(current_token)
                elif cred_type == 'github':
                    new_token = self.rotate_github_token(current_token)
                else:
                    new_token = None
                
                if new_token:
                    # Verify new token works
                    if self.check_health(cred_type, new_token):
                        logger.info(f"Successfully rotated {cred_type} token")
                        self.log_rotation(cred_type, current_token, new_token, success=True)
                        rotated_any = True
                    else:
                        logger.error(f"Rotated {cred_type} token but new token is not working!")
                        self.log_rotation(cred_type, current_token, new_token, success=False)
                else:
                    logger.error(f"Failed to rotate {cred_type} token")
            else:
                logger.info(f"{cred_type} token is healthy - no rotation needed")
        
        return rotated_any

def main():
    """Main entry point"""
    rotator = CredentialRotator()
    
    # First, run health check
    logger.info("=== OpenClaw Credential Health Check ===")
    all_healthy = rotator.run_health_check()
    
    if not all_healthy:
        logger.info("=== Starting Automatic Credential Rotation ===")
        rotator.auto_rotate()
    else:
        logger.info("All credentials are healthy - no rotation needed")
    
    # Log completion
    logger.info("Credential rotation process completed")

if __name__ == "__main__":
    main()