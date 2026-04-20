#!/usr/bin/env python3
"""
Disk Space Monitor for OPS Agent
Automated disk usage monitoring with alerts
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

class DiskMonitor:
    def __init__(self):
        self.bridge_script = "/Users/redinside/.openclaw/scripts/agent_bridge.py"
        
    def get_disk_usage(self) -> dict:
        """Get comprehensive disk usage information"""
        usage = {}
        
        try:
            # Get df -h output
            result = subprocess.run([
                "python3", self.bridge_script, "run", "df -h"
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                volumes = []
                
                for line in lines[1:]:  # Skip header
                    if line.strip() and not line.startswith('map') and not line.startswith('Filesystem'):
                        parts = line.split()
                        if len(parts) >= 6:
                            volumes.append({
                                'filesystem': parts[0],
                                'size': parts[1],
                                'used': parts[2],
                                'available': parts[3],
                                'usage_percent': parts[4],
                                'mounted': parts[8] if len(parts) > 8 else parts[-1]
                            })
                
                usage['volumes'] = volumes
                usage['main_volume'] = volumes[0] if volumes else None
            else:
                usage['error'] = "Failed to get disk usage"
                
        except Exception as e:
            usage['error'] = str(e)
        
        return usage
    
    def get_largest_directories(self, path="/Users/redinside", limit=10) -> list:
        """Get largest directories"""
        try:
            result = subprocess.run([
                "python3", self.bridge_script, "run", 
                f"du -sh {path}/* 2>/dev/null | sort -hr | head -{limit}"
            ], capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0:
                directories = []
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        parts = line.split('\t')
                        if len(parts) >= 2:
                            size = parts[0]
                            dir_path = parts[1]
                            directories.append({
                                'size': size,
                                'path': dir_path,
                                'name': Path(dir_path).name
                            })
                return directories
            else:
                return []
                
        except Exception as e:
            print(f"Error getting directories: {e}")
            return []
    
    def check_alerts(self, usage: dict) -> list:
        """Check for disk space alerts"""
        alerts = []
        
        if 'volumes' in usage:
            for volume in usage['volumes']:
                usage_percent = volume.get('usage_percent', '0%')
                if usage_percent.endswith('%'):
                    try:
                        usage_num = int(usage_percent[:-1])
                        if usage_num > 85:
                            alerts.append({
                                'level': 'CRITICAL' if usage_num > 90 else 'WARNING',
                                'volume': volume['mounted'],
                                'usage': usage_percent,
                                'message': f"High disk usage on {volume['mounted']}: {usage_percent}"
                            })
                    except ValueError:
                        pass
        
        return alerts
    
    def format_report(self, usage: dict, directories: list = None) -> str:
        """Format disk usage report"""
        report = f"""💾 DISK SPACE MONITORING REPORT
📅 {datetime.now().strftime('%Y-%m-%d %H:%M')}

📊 MAIN VOLUME STATUS"""
        
        if 'main_volume' in usage and usage['main_volume']:
            vol = usage['main_volume']
            report += f"""
Size: {vol.get('size', 'Unknown')}
Used: {vol.get('used', 'Unknown')}
Available: {vol.get('available', 'Unknown')}
Usage: {vol.get('usage_percent', 'Unknown')}
Mount: {vol.get('mounted', 'Unknown')}"""
        
        if 'volumes' in usage and len(usage['volumes']) > 1:
            report += f"\n\n📋 ALL VOLUMES:"
            for vol in usage['volumes'][1:]:  # Skip main volume
                report += f"\n{vol['mounted']}: {vol['used']}/{vol['size']} ({vol['usage_percent']})"
        
        if directories:
            report += f"\n\n📁 LARGEST DIRECTORIES (Top {len(directories)}):"
            for i, directory in enumerate(directories[:10], 1):
                report += f"\n{i}: {directory['size']} - {directory['name']}"
        
        # Check alerts
        alerts = self.check_alerts(usage)
        if alerts:
            report += f"\n\n🚨 ALERTS:"
            for alert in alerts:
                emoji = "🔴" if alert['level'] == 'CRITICAL' else "⚠️"
                report += f"\n{emoji} {alert['message']}"
        else:
            report += f"\n\n✅ No disk space alerts"
        
        report += "\n\n---\nGenerated by OPS Agent via Agent Bridge"
        return report
    
    def send_telegram_report(self, report: str) -> bool:
        """Send report to Telegram"""
        try:
            # This would integrate with your Telegram system
            print("TELEGRAM REPORT:")
            print(report)
            return True
        except Exception as e:
            print(f"Failed to send Telegram report: {e}")
            return False

def main():
    """Generate disk space monitoring report"""
    monitor = DiskMonitor()
    
    # Get disk usage
    usage = monitor.get_disk_usage()
    
    # Get largest directories
    directories = monitor.get_largest_directories()
    
    # Format report
    report = monitor.format_report(usage, directories)
    
    # Send report
    monitor.send_telegram_report(report)
    
    # Save to log
    with open("/Users/redinside/.openclaw/logs/disk_monitor.log", "a") as f:
        f.write(f"\n{'='*50}\n{report}\n{'='*50}\n")

if __name__ == "__main__":
    main()
