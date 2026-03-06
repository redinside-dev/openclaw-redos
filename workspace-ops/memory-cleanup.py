#!/usr/bin/env python3
"""
Memory Cleanup Script for OpenClaw
Cleans up memory-intensive files and processes to free up RAM
"""

import os
import subprocess
import logging
from pathlib import Path
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MemoryCleanup:
    def __init__(self):
        self.openclaw_root = Path("/Users/redinside/.openclaw")
        self.workspace_root = Path("/Users/redinside/.openclaw/workspace")
        self.cleanup_log = self.openclaw_root / "logs" / "memory-cleanup.log"
        
        # Create necessary directories
        self.cleanup_log.parent.mkdir(exist_ok=True)
        
        # Define memory cleanup targets
        self.cleanup_targets = [
            {
                'path': self.workspace_root / "memory",
                'pattern': '*.json',
                'max_size_mb': 50,
                'description': 'Large memory files'
            },
            {
                'path': self.workspace_root / "logs",
                'pattern': '*.log',
                'max_size_mb': 100,
                'description': 'Large log files'
            },
            {
                'path': self.openclaw_root / "logs",
                'pattern': '*.log',
                'max_size_mb': 100,
                'description': 'System log files'
            }
        ]
        
        # Define process cleanup rules
        self.process_rules = [
            {
                'name': 'node',
                'max_count': 10,
                'description': 'Node.js processes'
            },
            {
                'name': 'python',
                'max_count': 5,
                'description': 'Python processes'
            },
            {
                'name': 'openclaw',
                'max_count': 3,
                'description': 'OpenClaw processes'
            }
        ]
    
    def check_memory_usage(self):
        """Check current memory usage"""
        try:
            result = subprocess.run(['free', '-h'], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                if len(lines) >= 2:
                    parts = lines[1].split()
                    if len(parts) >= 7:
                        mem_usage = parts[2]
                        used, total = mem_usage.split('/')
                        used_value = float(used.rstrip('G'))
                        total_value = float(total.rstrip('G'))
                        
                        usage_percent = (used_value / total_value) * 100
                        return usage_percent
        except:
            pass
        
        return None
    
    def get_file_size_mb(self, file_path):
        """Get file size in MB"""
        try:
            file_size = file_path.stat().st_size
            return file_size / (1024 * 1024)
        except:
            return None
    
    def cleanup_large_files(self):
        """Clean up files that are too large"""
        total_files_cleaned = 0
        total_bytes_freed = 0
        
        for target in self.cleanup_targets:
            path = target['path']
            pattern = target['pattern']
            max_size_mb = target['max_size_mb']
            description = target['description']
            
            if not path.exists():
                continue
            
            logger.info(f"Checking {description} in {path}")
            
            for file_path in path.glob(pattern):
                if not file_path.is_file():
                    continue
                
                file_size_mb = self.get_file_size_mb(file_path)
                if file_size_mb is None:
                    continue
                
                if file_size_mb > max_size_mb:
                    file_size = file_path.stat().st_size
                    
                    try:
                        # Backup file before cleanup (optional)
                        backup_path = self.openclaw_root / "backups" / f"{file_path.name}_{int(file_size_mb)}MB_{int(time.time())}"
                        shutil.copy2(file_path, backup_path)
                        
                        # Truncate the file to reduce size
                        with open(file_path, 'w') as f:
                            f.truncate(0)
                        
                        total_files_cleaned += 1
                        total_bytes_freed += file_size
                        
                        logger.info(f"Cleaned large file: {file_path} ({file_size_mb:.1f} MB -> 0 MB)")
                        
                    except Exception as e:
                        logger.error(f"Failed to clean {file_path}: {e}")
        
        return total_files_cleaned, total_bytes_freed
    
    def cleanup_processes(self):
        """Clean up excessive processes"""
        total_processes_killed = 0
        
        for rule in self.process_rules:
            process_name = rule['name']
            max_count = rule['max_count']
            description = rule['description']
            
            try:
                # Get running processes
                result = subprocess.run(['ps', '-ef'], 
                                      capture_output=True, text=True)
                
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')[1:]  # Skip header
                    matching_processes = []
                    
                    for line in lines:
                        if process_name in line:
                            parts = line.split()
                            if len(parts) >= 2:
                                pid = parts[1]
                                matching_processes.append(pid)
                    
                    # If we have too many processes, kill the oldest ones
                    if len(matching_processes) > max_count:
                        excess_count = len(matching_processes) - max_count
                        processes_to_kill = matching_processes[:excess_count]
                        
                        for pid in processes_to_kill:
                            try:
                                os.kill(int(pid), 9)
                                total_processes_killed += 1
                                logger.info(f"Killed excess {description} process: PID {pid}")
                            except Exception as e:
                                logger.error(f"Failed to kill {description} process {pid}: {e}")
            except Exception as e:
                logger.error(f"Failed to check {description}: {e}")
        
        return total_processes_killed
    
    def run_cleanup(self):
        """Run complete memory cleanup process"""
        logger.info("=== Starting Memory Cleanup ===")
        
        # Step 1: Check current memory usage
        initial_usage = self.check_memory_usage()
        logger.info(f"Initial memory usage: {initial_usage:.1f}%" if initial_usage else "Could not determine initial memory usage")
        
        # Step 2: Clean up large files
        files_cleaned, bytes_freed = self.cleanup_large_files()
        
        # Step 3: Clean up excessive processes
        processes_killed = self.cleanup_processes()
        
        # Step 4: Log results
        final_usage = self.check_memory_usage()
        
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'initial_usage': initial_usage,
            'final_usage': final_usage,
            'files_cleaned': files_cleaned,
            'bytes_freed_mb': bytes_freed / (1024 * 1024),
            'processes_killed': processes_killed
        }
        
        try:
            with open(self.cleanup_log, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            logger.info(f"Memory cleanup completed: {files_cleaned} files cleaned, {bytes_freed / (1024 * 1024):.2f} MB freed, {processes_killed} processes killed")
        except Exception as e:
            logger.error(f"Failed to log cleanup results: {e}")
        
        return files_cleaned, bytes_freed, processes_killed

def main():
    """Main entry point"""
    cleanup = MemoryCleanup()
    
    # Run memory cleanup
    files_cleaned, bytes_freed, processes_killed = cleanup.run_cleanup()
    
    if files_cleaned > 0 or processes_killed > 0:
        print(f"Memory cleanup completed: {files_cleaned} files cleaned, {bytes_freed / (1024 * 1024):.2f} MB freed, {processes_killed} processes killed")
    else:
        print("No memory cleanup needed")

if __name__ == "__main__":
    main()