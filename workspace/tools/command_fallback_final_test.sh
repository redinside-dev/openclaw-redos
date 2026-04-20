#!/bin/bash

# Command Fallback System - Final Integration Script
# Demonstrates complete integration with existing workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test command with fallback
echo_test() {
    local command="$1"
    local args="$2"
    
    echo -e "${BLUE}Testing: $command $args${NC}"
    
    # Check if command exists
    if command -v "$command" >/dev/null 2>&1; then
        echo -e "  ${GREEN}Available${NC}: $command"
        return 0
    fi
    
    # Try with fallback
    echo -e "  ${YELLOW}Missing${NC}: $command, trying fallback..."
    
    # Use the wrapper script
    output=$(python3 /Users/redinside/.openclaw/workspace/tools/command_fallback_wrapper.py "$command" $args 2>&1)
    status=$?
    
    if [ $status -eq 0 ]; then
        echo -e "  ${GREEN}Success${NC}: Fallback worked"
        echo -e "  Output: $output"
    else
        echo -e "  ${RED}Failed${NC}: Fallback didn't work"
        echo -e "  Error: $output"
    fi
    
    return $status
}

# Function to show fallback information
show_fallback_info() {
    local command="$1"
    
    echo -e "${BLUE}Fallback Information for $command:${NC}"
    
    # Get fallback info using Python
    info=$(python3 -c "
from tools.command_fallback import CommandFallback
fallback = CommandFallback.get_fallback('$command')
if fallback:
    print(f'Fallback: {fallback[\\\"fallback\\\"]}')
    print(f'Description: {fallback[\\\"description\\\"]}')
    print(f'Example: {fallback[\\\"example\\\"]}')
else:
    print('No fallback available')
" 2>&1)
    
    echo "$info"
    echo ""
}

# Function to suggest installation
suggest_installation() {
    local command="$1"
    
    echo -e "${BLUE}Installation Suggestions for $command:${NC}"
    
    # Get suggestions using Python
    suggestions=$(python3 -c "
from tools.command_fallback import CommandFallback
from tools.command_fallback import CommandFallback
print('''.join(CommandFallback.suggest_alternatives('$command')))
" 2>&1)
    
    if [ -n "$suggestions" ]; then
        echo "$suggestions" | while read -r line; do
            echo "  $line"
        done
    else
        echo "  No suggestions available"
    fi
    
    echo ""
}

# Main execution
echo "=== Command Fallback System Integration Test ==="
echo ""

# Test all configured commands
echo "=== Testing All Configured Commands ==="
echo ""

for command in rg python pip node npm git; do
    echo_test "$command" "--version"
done

echo ""
echo "=== Fallback Information ==="
echo ""

for command in rg python pip node npm git; do
    show_fallback_info "$command"
done

echo ""
echo "=== Installation Suggestions ==="
echo ""

for command in rg python pip node npm git; do
    suggest_installation "$command"
done

echo ""
echo "=== Help Message ==="
echo ""
python3 /Users/redinside/.openclaw/workspace/tools/command_fallback.py "generate_help_message" | head -20

echo ""
echo "=== Integration Examples ==="
echo ""
echo "# Example 1: In a shell script"
echo "python3 -c ''from tools.command_fallback import CommandFallback; rc, out, err = CommandFallback.execute_with_fallback(\"rg\", \"--version\"); print(out)''"
echo ""
echo "# Example 2: Using the wrapper"
echo "/Users/redinside/.openclaw/workspace/tools/command_fallback_wrapper.py rg --version"
echo ""
echo "# Example 3: Checking availability"
echo "python3 -c ''from tools.command_fallback import CommandFallback; print(CommandFallback.is_command_available(\"python\"))''"
echo ""
echo "# Example 4: Getting fallback"
echo "python3 -c ''from tools.command_fallback import CommandFallback; print(CommandFallback.get_fallback(\"python\"))''"

echo ""
echo "=== Summary ==="
echo ""
python3 -c "
from tools.command_fallback import CommandFallback
print('System Status:')
print(f'  Python available: {CommandFallback.is_command_available(\\\"python\\\")}')
print(f'  rg available: {CommandFallback.is_command_available(\\\"rg\\\")}')
print(f'  Total commands configured: {len(CommandFallback.COMMAND_PATTERNS)}')
print(f'  Missing commands: {len([c for c, info in CommandFallback.COMMAND_PATTERNS.items() if not CommandFallback.is_command_available(c)])}')
"