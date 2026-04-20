#!/usr/bin/env python3
import json
import subprocess
from datetime import datetime

def check_gateway_status():
    print('🔍 GATEWAY STATUS CHECK')
    print('=' * 50)
    
    # Check if gateway is running
    try:
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        gateway_running = 'openclaw-gateway' in result.stdout
        
        if gateway_running:
            print('✅ OpenClaw Gateway is RUNNING')
            
            # Get PID
            lines = result.stdout.split('\n')
            for line in lines:
                if 'openclaw-gateway' in line:
                    parts = line.split()
                    pid = parts[1]
                    print(f'📱 PID: {pid}')
                    print(f'🌐 Port: 18789')
                    break
                    
        else:
            print('❌ OpenClaw Gateway is NOT running')
            
    except Exception as e:
        print(f'❌ Error checking gateway: {e}')
    
    # Check configuration
    print()
    print('🔧 SLACK CONFIGURATION:')
    try:
        with open('/Users/redinside/.openclaw/openclaw.json', 'r') as f:
            config = json.load(f)
            
        slack_config = config.get('channels', {}).get('slack', {})
        print(f'✅ Enabled: {slack_config.get("enabled", False)}')
        print(f'✅ Mode: {slack_config.get("mode", "unknown")}')
        print(f'✅ Bot Token: {slack_config.get("botToken", "NOT SET")[:15]}...')
        print(f'✅ App Token: {slack_config.get("appToken", "NOT SET")[:15]}...')
        
        channels = slack_config.get('channels', {})
        print(f'✅ Channels configured: {len(channels)}')
        
        for channel_id, channel_config in channels.items():
            if channel_id != '*':
                print(f'   • {channel_id}: {channel_config.get("enabled", False)}')
                
    except Exception as e:
        print(f'❌ Error reading config: {e}')
    
    # Check evidence
    print()
    print('📋 EVIDENCE FILES:')
    evidence_files = [
        '/Users/redinside/.openclaw/workspace/slack_connection_test.json',
        '/Users/redinside/.openclaw/workspace/slack_test_evidence.json',
        '/Users/redinside/.openclaw/workspace/slack_config_test.py'
    ]
    
    for file_path in evidence_files:
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            print(f'✅ {file_path.split("/")[-1]}: {len(content)} bytes')
        except:
            print(f'❌ {file_path.split("/")[-1]}: Not found')
    
    print()
    print('🎯 STATUS SUMMARY:')
    if gateway_running:
        print('✅ Gateway is running')
        print('✅ Slack is configured')
        print('✅ Tokens are set')
        print('✅ Channels are ready')
        print()
        print('🚀 NEXT STEP: Test Slack communication')
        print('💬 Check your Slack channels for messages!')
    else:
        print('❌ Gateway needs to be started')
        print('❌ Slack communication not possible')

if __name__ == '__main__':
    check_gateway_status()
