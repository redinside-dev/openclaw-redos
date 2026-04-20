#!/usr/bin/env python3
"""
Disk Cleanup Script for OpenClaw
Cleans up old logs and temporary files to free up disk space
"""

import os
import shutil
from pathlib import Path
import logging
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DiskCleanup:
    def __init__(self):
        self.openclaw_root = Path("/Users/redinside/.openclaw")
        self.workspace_root = Path("/Users/redinside/.openclaw/workspace")
        self.cleanup_log = self.openclaw_root / "logs" / "disk-cleanup.log"
        
        # Create necessary directories
        self.cleanup_log.parent.mkdir(exist_ok=True)
        
        # Define cleanup targets and rules
        self.cleanup_targets = [
            {
                'path': self.openclaw_root / "logs",
                'pattern': '*.log',
                'max_age_days': 30,
                'description': 'Old log files'
            },
            {
                'path': self.workspace_root / "logs",
                'pattern': '*.log',
                'max_age_days': 30,
                'description': 'Workspace log files'
            },
            {
                'path': self.workspace_root / "memory",
                'pattern': '*.json',
                'max_age_days': 7,
                'description': 'Old memory files'
            },
            {
                'path': self.openclaw_root / "backups",
                'pattern': '*.json',
                'max_age_days': 90,
                'description': 'Old backup files'
            },
            {
                'path': self.workspace_root / "tmp",
                'pattern': '*',
                'max_age_days': 1,
                'description': 'Temporary files'
            }
        ]
        
        # Define size thresholds
        self.size_thresholds = {
            'warn': 80,  # 80% disk usage
            'critical': 90  # 90% disk usage
        }
    
    def check_disk_usage(self):
        """Check current disk usage"""
        try:
            result = subprocess.run(['df', '-h', '/'], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                if len(lines) >= 2:
                    parts = lines[-1].split()
                    if len(parts) >= 5:
                        usage_percent = parts[4].rstrip('%')
                        usage = int(usage_percent)
                        return usage, usage_percent
        except:
            pass
        
        return None, "Unknown"
    
    def get_file_age_days(self, file_path):
        """Get age of file in days"""
        try:
            file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            age = datetime.now() - file_mtime
            return age.days
        except:
            return None
    
    def cleanup_target(self, target):
        """Clean up a specific target directory"""
        path = target['path']
        pattern = target['pattern']
        max_age_days = target['max_age_days']
        description = target['description']
        
        if not path.exists():
            logger.info(f"Target {description} does not exist: {path}")
            return 0, 0
        
        if not path.is_dir():
            logger.warning(f"Target {description} is not a directory: {path}")
            return 0, 0
        
        files_cleaned = 0
        bytes_freed = 0
        
        logger.info(f"Cleaning up {description} in {path}")
        
        # Find files matching the pattern
        for file_path in path.glob(pattern):
            if not file_path.is_file():
                continue
            
            # Get file age
            age_days = self.get_file_age_days(file_path)
            if age_days is None:
                continue
            
            # Check if file is too old
            if age_days > max_age_days:
                file_size = file_path.stat().st_size
                
                try:
                    # Backup file before deleting (optional)
                    backup_path = self.openclaw_root / "backups" / f"{file_path.name}_{age_days}d_{int(time.time())}"
                    shutil.copy2(file_path, backup_path)
                    
                    # Delete the file
                    os.remove(file_path)
                    
                    files_cleaned += 1
                    bytes_freed += file_size
                    
                    logger.info(f"Cleaned: {file_path} (age: {age_days}d, size: {file_size} bytes)")
                    
                except Exception as e:
                    logger.error(f"Failed to clean {file_path}: {e}")
        
        return files_cleaned, bytes_freed
    
    def cleanup_old_sessions(self):
        """Clean up old OpenClaw sessions"""
        sessions_dir = self.openclaw_root / "sessions"
        
        if not sessions_dir.exists():
            return 0, 0
        
        files_cleaned = 0
        bytes_freed = 0
        
        max_age_days = 7  # Keep sessions for 7 days
        
        for session_file in sessions_dir.glob('*.json'):
            if not session_file.is_file():
                continue
            
            age_days = self.get_file_age_days(session_file)
            if age_days is None:
                continue
            
            if age_days > max_age_days:
                file_size = session_file.stat().st_size
                
                try:
                    os.remove(session_file)
                    files_cleaned += 1
                    bytes_freed += file_size
                    
                    logger.info(f"Cleaned old session: {session_file} (age: {age_days}d)")
                except Exception as e:
                    logger.error(f"Failed to clean session {session_file}: {e}")
        
        return files_cleaned, bytes_freed
    
    def run_cleanup(self):
        """Run complete disk cleanup process"""
        logger.info("=== Starting Disk Cleanup ===")
        
        total_files_cleaned = 0
        total_bytes_freed = 0
        
        # Step 1: Check disk usage
        usage, usage_percent = self.check_disk_usage()
        logger.info(f"Current disk usage: {usage_percent}")
        
        # Step 2: Clean up each target
        for target in self.cleanup_targets:
            files_cleaned, bytes_freed = self.cleanup_target(target)
            total_files_cleaned += files_cleaned
            total_bytes_freed += bytes_freed
        
        # Step 3: Clean up old sessions
        files_cleaned, bytes_freed = self.cleanup_old_sessions()
        total_files_cleaned += files_cleaned
        total_bytes_freed += bytes_freed
        
        # Step 4: Log results
        total_bytes_freed_mb = total_bytes_freed / (1024 * 1024)
        
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'files_cleaned': total_files_cleaned,
            'bytes_freed_mb': total_bytes_freed_mb,
            'initial_usage': usage_percent,
            'final_usage': self.check_disk_usage()[1]
        }
        
        try:
            with open(self.cleanup_log, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            logger.info(f"Disk cleanup completed: {total_files_cleaned} files cleaned, {total_bytes_freed_mb:.2f} MB freed")
        except Exception as e:
            logger.error(f"Failed to log cleanup results: {e}")
        
        return total_files_cleaned, total_bytes_freed

def main():
    """Main entry point"""
    cleanup = DiskCleanup()
    
    # Run disk cleanup
    files_cleaned, bytes_freed = cleanup.run_cleanup()
    
    if files_cleaned > 0:
        print(f"Disk cleanup completed: {files_cleaned} files cleaned, {bytes_freed / (1024 * 1024):.2f} MB freed")
    else:
        print("No files needed cleanup")

if __name__ == "__main__":
    main()