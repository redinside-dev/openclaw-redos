#!/bin/bash

# Security Autonomy Script - Comprehensive Security Audit
# This script performs autonomous security checks and vulnerability scanning

echo "=== SECURITY AUTONOMY CHECK - $(date) ==="
echo "Host: $(hostname)"
echo "User: $(whoami)"
echo "OS: $(uname -s) $(uname -m)"
echo ""

# 1. System Updates Check
if command -v softwareupdate &> /dev/null; then
    echo "1. System Updates:"
    softwareupdate -l 2>/dev/null | head -10
    echo ""
fi

# 2. Vulnerability Scan (if tools available)
if command -v nmap &> /dev/null; then
    echo "2. Network Scan:"
    echo "Open ports:"
    nmap -p 1-1000 localhost 2>/dev/null | grep -E "(open|closed)"
    echo ""
fi

# 3. Check for Exposed Credentials
if command -v grep &> /dev/null; then
    echo "3. Credential Scan:"
    echo "Searching for potential exposed secrets..."
    find /Users/redinside -name "*.env" -o -name "*.key" -o -name "*.pem" -o -name "*.p12" -o -name "*.pfx" 2>/dev/null | head -10
    echo ""
fi

# 4. File Permission Audit
echo "4. File Permission Check:"
echo "Home directory permissions:"
ls -la /Users/redinside | head -10

# 5. Process Check
echo "5. Running Processes:"
ps aux --sort=-%cpu | head -10

# 6. Firewall Check
if command -v pfctl &> /dev/null; then
    echo "6. Firewall Status:"
    pfctl -s info 2>/dev/null | head -5
    echo ""
fi

# 7. Log Review
if command -v last &> /dev/null; then
    echo "7. Recent Login Activity:"
    last -n 5 2>/dev/null
    echo ""
fi

# 8. SSH Key Check
if [ -d ~/.ssh ]; then
    echo "8. SSH Keys:"
    ls -la ~/.ssh/ | head -10
    echo ""
fi

echo "=== SECURITY AUTONOMY CHECK COMPLETE ==="