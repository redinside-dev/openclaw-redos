#!/usr/bin/env python3
"""
Simple verification script to test autonomous worker functionality
"""

import subprocess
import time

def test_autonomous_worker():
    print("🧪 Testing autonomous worker functionality...")
    
    # Test 1: Check if daemon is running
    try:
        with open('/Users/redinside/.openclaw/workspace/autonomous_daemon_v2.pid', 'r') as f:
            pid = int(f.read().strip())
        
        # Check if process is running
        result = subprocess.run(['ps', '-p', str(pid), '-o', 'comm='], 
                              capture_output=True, text=True)
        if result.stdout.strip():
            print(f"✅ Daemon is running with PID {pid}")
        else:
            print("❌ Daemon process not found")
            return False
            
    except Exception as e:
        print(f"❌ Error checking daemon: {e}")
        return False
    
    # Test 2: Check if worker can call CLI
    print("🔧 Testing CLI call functionality...")
    try:
        result = subprocess.run(['openclaw', 'agent', '--agent', 'main', '--message', 'test', '--local'],
                              capture_output=True, timeout=10)
        
        if result.returncode == 0:
            print("✅ CLI call successful")
            print("✨ Worker functionality verified")
            return True
        else:
            print("❌ CLI call failed")
            print("⚠️  Return code:", result.returncode)
            print("⚠️  Stderr:", result.stderr.decode())
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ CLI call timed out")
        return False
    except Exception as e:
        print(f"❌ Error testing CLI: {e}")
        return False

if __name__ == "__main__":
    success = test_autonomous_worker()
    if success:
        print("🎉 All tests passed - autonomous worker is functioning!")
    else:
        print("❌ Some tests failed - worker may have issues")
    
    print("📊 Verification complete")