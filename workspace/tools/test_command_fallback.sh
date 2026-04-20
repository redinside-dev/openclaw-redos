#!/bin/bash

# Command Fallback Test Script
# Tests the command fallback system with various scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test functions
te() {
    local test_name="$1"
    local command="$2"
    local args="$3"
    local expected_fallback="$4"
    
    echo -e "${BLUE}=== Testing: $test_name ===${NC}"
    
    # Check if command exists
    if command -v "$command" >/dev/null 2>&1; then
        echo -e "  ${GREEN}PASS${NC}: '$command' is available"
        return 0
    fi
    
    # Try to execute with fallback
    python3 /Users/redinside/.openclaw/workspace/tools/command_fallback.py "exec_with_fallback" "$command" $args
    
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}PASS${NC}: Fallback executed successfully"
    else
        echo -e "  ${RED}FAIL${NC}: Fallback failed"
        return 1
    fi
}

# Test cases
te "rg command fallback" "rg" "--version" "grep"
te "python command fallback" "python" "--version" "python3"
te "pip command fallback" "pip" "--version" "pip3"
te "node command fallback" "node" "--version" "nodejs"
te "git command fallback" "git" "--version" "hub"

# Test help message
echo -e "\n${BLUE}=== Testing Help Message ===${NC}"
python3 /Users/redinside/.openclaw/workspace/tools/command_fallback.py "generate_help_message" | head -20

echo -e "${GREEN}\n=== All Tests Complete ===${NC}"