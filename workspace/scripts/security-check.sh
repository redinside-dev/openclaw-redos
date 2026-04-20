#!/bin/bash

# Security Check Script for INFOSEC Autonomous Agent
# Runs comprehensive security audit

echo "=== SECURITY VULNERABILITY SCAN ==="
echo "Starting at $(date)"
echo ""

# 1. System updates and package vulnerabilities
if command -v brew &> /dev/null; then
    echo "Checking Homebrew packages..."
    brew outdated --quiet || echo "All Homebrew packages up to date"
    brew doctor || echo "Homebrew check completed"
fi

if command -v npm &> /dev/null; then
    echo ""
    echo "Checking npm packages..."
    npm audit --audit-level=moderate 2>/dev/null || echo "npm audit not available or no issues found"
fi

# 2. Check for exposed secrets in common locations
if command -v rg &> /dev/null; then
    echo ""
    echo "Scanning for exposed secrets..."
    # Search for common secret patterns
    rg -i "password|secret|key|token|api_key|credential|private_key" /Users/redinside --type-not docker -g '!{node_modules,.git,Library,Trash,Downloads}' -C 0 --line-number 2>/dev/null | head -20 || echo "No exposed secrets found in common locations"
fi

# 3. File permissions audit
echo ""
echo "=== FILE PERMISSIONS AUDIT ==="

echo "Checking home directory permissions..."
find /Users/redinside -type f -name "*.pem" -o -name "*.key" -o -name "*.crt" -o -name "*.p12" 2>/dev/null | head -10

echo "Checking world-writable files..."
find /Users/redinside -type f -perm -o=w 2>/dev/null | head -10 || echo "No world-writable files found"

# 4. Recent access logs and suspicious activity
echo ""
echo "=== ACCESS LOGS REVIEW ==="

if [ -f /var/log/system.log ]; then
fi

if [ -f /var/log/auth.log ]; then
    echo ""
    echo "Recent auth log entries..."
    tail -50 /var/log/auth.log | grep -i "failed\|invalid\|denied" || echo "No suspicious auth log entries found"
fi

# 5. SSH key and configuration review
echo ""
echo "=== SSH CONFIGURATION CHECK ==="

if [ -f ~/.ssh/authorized_keys ]; then
    echo "Authorized keys count: $(wc -l < ~/.ssh/authorized_keys)"
    echo "Last modified: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M" ~/.ssh/authorized_keys)"
fi

if [ -f ~/.ssh/config ]; then
    echo "SSH config permissions: $(stat -f "%A" ~/.ssh/config)"
fi

# 6. Firewall and network security
echo ""
echo "=== FIREWALL & NETWORK SECURITY ==="

if command -v sudo &> /dev/null; then
    if sudo -n pfctl -s rules 2>/dev/null; then
        echo "PF firewall is enabled and active"
    else
        echo "PF firewall status: $(sudo pfctl -s info 2>/dev/null | grep "Status" || echo "Unknown")"
    fi
fi

# 7. Recent code changes security review
echo ""
echo "=== RECENT CODE CHANGES SECURITY REVIEW ==="

if [ -d /Users/redinside/.openclaw/workspace ]; then
    echo "Checking workspace for recent changes..."
    cd /Users/redinside/.openclaw/workspace
    if git log --oneline -10 2>/dev/null; then
        echo "Last commit: $(git log -1 --format='%h - %s (%cr)')"
    else
        echo "No git repository found or git not available"
    fi
fi

# 8. System integrity check
echo ""
echo "=== SYSTEM INTEGRITY CHECK ==="

if command -v spctl &> /dev/null; then
    echo "Gatekeeper status: $(spctl --status 2>/dev/null || echo "Unknown")"
fi

echo ""
echo "=== SECURITY SCAN COMPLETE ==="
echo "Finished at $(date)"