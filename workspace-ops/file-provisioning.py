#!/usr/bin/env python3
"""
File Provisioning System for OpenClaw
Auto-provision missing files/paths and fix INFOSEC blockers
"""

import os
import json
import shutil
from pathlib import Path
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FileProvisioner:
    def __init__(self):
        self.workspace_root = Path("/Users/redinside/.openclaw/workspace")
        self.openclaw_root = Path("/Users/redinside/.openclaw")
        self.backups_dir = self.openclaw_root / "backups"
        self.provisioning_log = self.openclaw_root / "logs" / "file-provisioning.log"
        
        # Create necessary directories
        self.backups_dir.mkdir(exist_ok=True)
        self.provisioning_log.parent.mkdir(exist_ok=True)
        
        # Define required file structure
        self.required_structure = {
            # Essential directories
            'workspace': {
                'path': self.workspace_root,
                'type': 'directory',
                'required': True,
                'description': 'Main workspace directory'
            },
            'workspace_logs': {
                'path': self.workspace_root / 'logs',
                'type': 'directory',
                'required': True,
                'description': 'Workspace log files'
            },
            'workspace_memory': {
                'path': self.workspace_root / 'memory',
                'type': 'directory',
                'required': True,
                'description': 'Workspace memory files'
            },
            'workspace_tasks': {
                'path': self.workspace_root / 'tasks',
                'type': 'directory',
                'required': False,
                'description': 'Workspace task files'
            },
            'workspace_skills': {
                'path': self.workspace_root / 'skills',
                'type': 'directory',
                'required': False,
                'description': 'Workspace skill files'
            },
            
            # Essential files in workspace
            'workspace_goals': {
                'path': self.workspace_root / 'GOALS.md',
                'type': 'file',
                'required': True,
                'description': 'Workspace goals and objectives'
            },
            'workspace_state': {
                'path': self.workspace_root / 'STATE.yaml',
                'type': 'file',
                'required': True,
                'description': 'Workspace state information'
            },
            'workspace_autonomous': {
                'path': self.workspace_root / 'AUTONOMOUS.md',
                'type': 'file',
                'required': True,
                'description': 'Autonomous task assignments'
            },
            
            # Essential files in openclaw root
            'openclaw_config': {
                'path': self.openclaw_root / 'openclaw.json',
                'type': 'file',
                'required': True,
                'description': 'OpenClaw configuration'
            },
            'openclaw_env': {
                'path': self.openclaw_root / '.env',
                'type': 'file',
                'required': True,
                'description': 'OpenClaw environment variables'
            },
            'openclaw_logs': {
                'path': self.openclaw_root / 'logs',
                'type': 'directory',
                'required': True,
                'description': 'OpenClaw system logs'
            },
            
            # Agent-specific directories
            'ops_workspace': {
                'path': self.workspace_root / 'ops',
                'type': 'directory',
                'required': True,
                'description': 'OPS workspace'
            },
            'eng_workspace': {
                'path': self.workspace_root / 'eng',
                'type': 'directory',
                'required': True,
                'description': 'ENG workspace'
            },
            'research_workspace': {
                'path': self.workspace_root / 'research',
                'type': 'directory',
                'required': True,
                'description': 'RESEARCH workspace'
            }
        }
        
        # Template files for missing essential files
        self.templates = {
            'GOALS.md': """# Workspace Goals & Objectives

## Current Sprint

### GOAL-001: 
**Status:** 
- **Progress:** 
- **Next Action:** 

### GOAL-002: 
**Status:** 
- **Progress:** 
- **Next Action:** 

---

## Completed Goals

---

## Backlog

---

## SLA Metrics

- **P0:** 30 min response, 30 min resolution
- **P1:** 15 min response, 2 hour resolution  
- **P2:** 1 hour response, 8 hour resolution
- **P3:** 4 hour response, 48 hour resolution""",
            
            'STATE.yaml': """version: '1.0'
last_updated: '{timestamp}'
updated_by: ops
status: healthy
last_health_check: '{timestamp}'
openclaw_version: {openclaw_version}
services:
  gateway: running
  dashboard: running
crons_enabled: 0
crons_disabled: 0
crons_total: 0
""",
            
            'AUTONOMOUS.md': """# AUTONOMOUS.md - Assigned Tasks

## Current Task

**Status:** 

### Task Details:
**Due:** 
**Goal:** 

### Progress:
- [ ] 
- [ ] 
- [ ] 

### Subagent Context:
This task is being executed by subagent: 

### Instructions:
1. 
2. 
3. 

---

## Recent Completed Tasks

### (None yet - this is the first active task)"""
        }
    
    def check_file_structure(self):
        """Check the current file structure against requirements"""
        logger.info("Checking file structure...")
        
        missing_items = []
        existing_items = []
        
        for item_name, item_info in self.required_structure.items():
            path = item_info['path']
            
            if path.exists():
                existing_items.append(item_name)
                
                # Verify type
                if item_info['type'] == 'directory' and not path.is_dir():
                    logger.warning(f"{item_name} exists but is not a directory: {path}")
                    missing_items.append(item_name)
                elif item_info['type'] == 'file' and not path.is_file():
                    logger.warning(f"{item_name} exists but is not a file: {path}")
                    missing_items.append(item_name)
            else:
                missing_items.append(item_name)
                logger.info(f"{item_name} is missing: {path}")
        
        logger.info(f"Found {len(existing_items)} existing items, {len(missing_items)} missing items")
        return missing_items
    
    def create_directory(self, path, description=""):
        """Create a directory with logging"""
        try:
            path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created directory: {path} ({description})")
            return True
        except Exception as e:
            logger.error(f"Failed to create directory {path}: {e}")
            return False
    
    def create_file(self, path, content, description=""):
        """Create a file with logging"""
        try:
            # Backup existing file if it exists
            if path.exists():
                self.backup_file(path)
            
            with open(path, 'w') as f:
                f.write(content)
            
            logger.info(f"Created file: {path} ({description})")
            return True
        except Exception as e:
            logger.error(f"Failed to create file {path}: {e}")
            return False
    
    def backup_file(self, path):
        """Backup a file before overwriting"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backups_dir / f"{path.name}_{timestamp}.bak"
        
        try:
            shutil.copy2(path, backup_path)
            logger.info(f"Backed up file to: {backup_path}")
            return backup_path
        except Exception as e:
            logger.error(f"Failed to backup file {path}: {e}")
            return None
    
    def provision_missing_items(self, missing_items):
        """Provision all missing items"""
        logger.info(f"Provisioning {len(missing_items)} missing items...")
        
        for item_name in missing_items:
            item_info = self.required_structure[item_name]
            path = item_info['path']
            
            if item_info['type'] == 'directory':
                self.create_directory(path, item_info['description'])
            elif item_info['type'] == 'file':
                # Use template if available
                if item_name in self.templates:
                    content = self.templates[item_name]
                    # Replace placeholders in templates
                    if '{timestamp}' in content:
                        content = content.replace('{timestamp}', datetime.now().isoformat())
                    if '{openclaw_version}' in content:
                        try:
                            with open(self.openclaw_root / 'openclaw.json', 'r') as f:
                                openclaw_config = json.load(f)
                                version = openclaw_config.get('meta', {}).get('lastTouchedVersion', 'unknown')
                                content = content.replace('{openclaw_version}', version)
                        except:
                            content = content.replace('{openclaw_version}', 'unknown')
                    
                    self.create_file(path, content, item_info['description'])
                else:
                    # Create empty file for unknown templates
                    self.create_file(path, "", item_info['description'])
        
        logger.info("Provisioning completed")
    
    def check_and_fix_permissions(self):
        """Check and fix file/directory permissions"""
        logger.info("Checking file and directory permissions...")
        
        # Define required permissions
        required_permissions = {
            self.workspace_root: 0o755,  # rwxr-xr-x
            self.openclaw_root: 0o755,    # rwxr-xr-x
            self.backups_dir: 0o755,      # rwxr-xr-x
            self.provisioning_log.parent: 0o755,  # rwxr-xr-x
        }
        
        fixed_permissions = 0
        
        for path, required_mode in required_permissions.items():
            if path.exists():
                current_mode = os.stat(path).st_mode & 0o777
                if current_mode != required_mode:
                    try:
                        os.chmod(path, required_mode)
                        logger.info(f"Fixed permissions for {path}: {oct(current_mode)} -> {oct(required_mode)}")
                        fixed_permissions += 1
                    except Exception as e:
                        logger.error(f"Failed to fix permissions for {path}: {e}")
        
        logger.info(f"Checked permissions - fixed {fixed_permissions} items")
        return fixed_permissions
    
    def check_and_fix_ownership(self):
        """Check and fix file/directory ownership"""
        logger.info("Checking file and directory ownership...")
        
        # Get current user info
        import pwd
        import grp
        
        try:
            current_user = pwd.getpwuid(os.getuid()).pw_name
            current_group = grp.getgrgid(os.getgid()).gr_name
        except:
            current_user = 'current_user'
            current_group = 'current_group'
        
        # Define required ownership (current user should own everything)
        fixed_ownership = 0
        
        # Check key directories
        key_paths = [
            self.workspace_root,
            self.openclaw_root,
            self.backups_dir,
            self.provisioning_log.parent
        ]
        
        for path in key_paths:
            if path.exists():
                try:
                    stat = os.stat(path)
                    if stat.st_uid != os.getuid() or stat.st_gid != os.getgid():
                        # Only attempt to fix if we have permission
                        try:
                            os.chown(path, -1, -1)  # Change group only if needed
                            logger.info(f"Fixed ownership for {path}")
                            fixed_ownership += 1
                        except:
                            logger.warning(f"Cannot fix ownership for {path} (insufficient permissions)")
                except:
                    logger.warning(f"Cannot check ownership for {path}")
        
        logger.info(f"Checked ownership - fixed {fixed_ownership} items")
        return fixed_ownership
    
    def log_provisioning_activity(self, activity):
        """Log provisioning activity"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'activity': activity,
            'workspace_root': str(self.workspace_root),
            'openclaw_root': str(self.openclaw_root)
        }
        
        try:
            with open(self.provisioning_log, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            logger.info(f"Logged provisioning activity: {activity}")
        except Exception as e:
            logger.error(f"Failed to log provisioning activity: {e}")
    
    def run_provisioning(self):
        """Run complete file provisioning process"""
        logger.info("=== Starting File Provisioning System ===")
        
        # Step 1: Check current structure
        missing_items = self.check_file_structure()
        
        if not missing_items:
            logger.info("File structure is complete - no provisioning needed")
            self.log_provisioning_activity("File structure check - all items present")
            return True
        
        # Step 2: Provision missing items
        self.provision_missing_items(missing_items)
        
        # Step 3: Check permissions and ownership
        self.check_and_fix_permissions()
        self.check_and_fix_ownership()
        
        # Step 4: Final check
        final_missing = self.check_file_structure()
        
        if not final_missing:
            logger.info("File provisioning completed successfully")
            self.log_provisioning_activity(f"File provisioning completed - provisioned {len(missing_items)} items")
            return True
        else:
            logger.error(f"File provisioning incomplete - still missing {len(final_missing)} items")
            self.log_provisioning_activity(f"File provisioning failed - still missing {len(final_missing)} items")
            return False

def main():
    """Main entry point"""
    provisioner = FileProvisioner()
    
    # Run provisioning
    success = provisioner.run_provisioning()
    
    if success:
        print("File provisioning completed successfully")
    else:
        print("File provisioning failed - check logs for details")

if __name__ == "__main__":
    main()