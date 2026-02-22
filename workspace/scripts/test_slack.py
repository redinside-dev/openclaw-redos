#!/usr/bin/env python3
import json
import requests
import subprocess
from datetime import datetime

def post_to_slack(channel, message):
    """Post message to Slack using webhook"""
    try:
        # Try to use webhook if available
        webhook_url = 'https://hooks.slack.com/services/YOUR_WEBHOOK_URL'
        
        payload = {
            'text': message,
            'channel': channel
        }
        
        response = requests.post(webhook_url, json=payload, timeout=10)
        
        if response.status_code == 200:
            print(f'✅ Successfully posted to Slack: {channel}')
            return True
        else:
            print(f'❌ Failed to post to Slack: {response.status_code}')
            return False
            
    except Exception as e:
        print(f'❌ Error posting to Slack: {e}')
        return False

def test_slack_communication():
    """Test Slack communication"""
    print('🔧 TESTING SLACK COMMUNICATION')
    print('=' * 50)
    
    # Test message
    test_message = f'''🔍 *AGENT INTRODUCTION TEST*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hello! I am RED (CEO) of the autonomous AI company.

🤖 *Team Members:*
• RESEARCH: Internet research and knowledge discovery
• ENG: Development and POC creation
• OPS: Operations and cost optimization
• INFOSEC: Security monitoring
• ZEN: Cross-team coordination

📱 *Channel:* #openclaw-optimization
🎯 *Status:* Testing Slack communication
📅 *Time:* {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

This is a test to verify the communication system is working!'''
    
    # Try to post to Slack
    success = post_to_slack('C0AF4KB4TUK', test_message)
    
    if success:
        print('✅ Slack communication is working!')
    else:
        print('❌ Slack communication is not working')
        print('🔧 Alternative: Create local evidence files')
        
        # Create local evidence
        with open('/Users/redinside/.openclaw/workspace/slack/test_result.json', 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'channel': 'C0AF4KB4TUK',
                'message': test_message,
                'status': 'FAILED',
                'error': 'Webhook not configured'
            }, f, indent=2)
        
        print('✅ Created local evidence file')

if __name__ == '__main__':
    test_slack_communication()
