#!/bin/bash

echo "=== SECURITY AUDIT START ===" | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md

# Timestamp
echo "Audit started: $(date)" | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md

# 1. Scan for vulnerabilities
echo "\n1. Vulnerability Scan..." | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
if command -v npm && npm audit --audit-level=moderate --json 2>/dev/null; then
    npm audit --audit-level=moderate --json 2>/dev/null | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
else
    echo "npm not available or no package.json found" | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
fi

# 2. Review access logs
echo "\n2. Access Logs Review..." | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
if [ -d /var/log/auth.log ]; then
    echo "Auth log entries (last 50):" | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
    tail -n 50 /var/log/auth.log 2>/dev/null | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
else
    echo "No auth.log found" | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
fi

# 3. Check for exposed secrets
echo "\n3. Exposed Secrets Check..." | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
find /Users/redinside -name "*.env*" -o -name "*.key" -o -name "*.pem" -o -name "*.p12" 2>/dev/null | head -20 | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md

# 4. Audit file permissions
echo "\n4. File Permissions Audit..." | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
find /Users/redinside -type f -perm -o+rwx 2>/dev/null | head -20 | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md

# 5. Review recent code changes
echo "\n5. Recent Code Changes..." | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
if git -C /Users/redinside/.openclaw status && git -C /Users/redinside/.openclaw log --oneline -10; then
    git -C /Users/redinside/.openclaw log --oneline -10 | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
else
    echo "No git repo found in /Users/redinside/.openclaw" | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
fi

# 6. Fix vulnerabilities (basic)
echo "\n6. Security Fixes..." | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
# Remove world-writable files find found
echo "Removing world-writable files..." | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
find /Users/redinside -type f -perm -o+rwx -exec chmod o-w {} \; 2>/dev/null | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md

# 7. Report
echo "\n=== SECURITY AUDIT COMPLETE ===" | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md

# Check for critical issues
echo "\nCRITICAL ISSUES SUMMARY:" | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
if grep -q "high\|critical\|vulnerability" /Users/redinside/.openclaw/workspace/security/autonomous-log.md; then
    echo "ALERT: Critical vulnerabilities detected!" | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
    # Send notification to security channel if available
    if command -v curl && [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' --data '{"text":"Security Audit: Critical vulnerabilities detected! Check autonomous-log.md"}' $SLACK_WEBHOOK
    fi
else
    echo "No critical vulnerabilities found." | tee -a /Users/redinside/.openclaw/workspace/security/autonomous-log.md
fi