#!/bin/bash

# Autonomous Security Scan Script
# Comprehensive security check for OpenClaw workspace

echo "=== SECURITY SCAN START ==="
echo "Timestamp: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "Scanning workspace: $(pwd)"
echo ""

# 1. Scan for exposed secrets/credentials
secrethits=$(find . -type f \( -name "*.json" -o -name "*.env" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" -o -name "*.txt" \) -exec grep -l -i 'password\|secret\|key\|token\|api_key\|auth' {} \; 2>/dev/null | wc -l)
echo "Potential secrets found: $secrethits files"
if [ $secrethits -gt 0 ]; then
    echo "Files with potential secrets:"
    find . -type f \( -name "*.json" -o -name "*.env" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" -o -name "*.txt" \) -exec grep -l -i 'password\|secret\|key\|token\|api_key\|auth' {} \; 2>/dev/null | head -10
    echo "..."
fi

# 2. Check for exposed AWS keys (common pattern)
awskeys=$(find . -type f -exec grep -l 'AKIA[0-9A-Z]{16}' {} \; 2>/dev/null | wc -l)
if [ $awskeys -gt 0 ]; then
    echo "CRITICAL: AWS access key found in $awskeys files"
    find . -type f -exec grep -l 'AKIA[0-9A-Z]{16}' {} \; 2>/dev/null | head -5
fi

# 3. Check git for committed secrets
committed_secrets=$(git log --oneline --all | head -5 | wc -l)
echo "Git commits scanned: $committed_secrets"

# 4. Check for exposed tokens (Bearer, etc.)
tokens=$(find . -type f -exec grep -l -i 'Bearer [A-Za-z0-9-_.]' {} \; 2>/dev/null | wc -l)
if [ $tokens -gt 0 ]; then
    echo "Bearer tokens found: $tokens files"
fi

# 5. Check file permissions
perm_issues=$(find . -type f -perm /o=rwx -o -perm /o=rw -o -perm /g=rwx -o -perm /g=rw 2>/dev/null | wc -l)
echo "File permission issues: $perm_issues files"
if [ $perm_issues -gt 0 ]; then
    echo "Top permission issues:"
    find . -type f -perm /o=rwx -o -perm /o=rw -o -perm /g=rwx -o -perm /g=rw 2>/dev/null | head -10
fi

# 6. Check for suspicious files
hidden_files=$(find . -name ".*" -type f 2>/dev/null | wc -l)
echo "Hidden files: $hidden_files"

# 7. Check for recent changes
recent_changes=$(find . -type f -mtime -7 2>/dev/null | wc -l)
echo "Files changed in last 7 days: $recent_changes"

# 8. Check for suspicious scripts
executables=$(find . -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.php" 2>/dev/null | wc -l)
echo "Executable files: $executables"

# 9. Check for open ports (if available)
if command -v netstat >/dev/null 2>&1; then
    open_ports=$(netstat -tuln 2>/dev/null | grep LISTEN | wc -l)
    echo "Open network ports: $open_ports"
fi

# 10. Check for running processes
if command -v ps >/dev/null 2>&1; then
    suspicious_procs=$(ps aux | grep -i 'malware\|backdoor\|hack' | grep -v grep | wc -l)
    echo "Suspicious processes: $suspicious_procs"
fi

echo ""
echo "=== SECURITY SCAN COMPLETE ==="