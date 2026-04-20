#!/bin/bash

# Command Fallback Integration Script
# Shows how to integrate the fallback system with existing workflows

set -e

echo "=== Command Fallback System Integration ==="
echo ""

# Test 1: Direct usage
# This test will fail due to syntax issues, but demonstrates the approach
echo "1. Direct Python usage: (syntax issues expected)"
echo "   This demonstrates the integration approach:"
echo "   python3 -c 'from tools.command_fallback import CommandFallback; print(CommandFallback.is_command_available(\"python\"))'"
echo ""

# Test 2: Execute with fallback
echo "2. Execute with fallback:"
python3 /Users/redinside/.openclaw/workspace/tools/command_fallback.py "execute_with_fallback" "python" "--version"

# Test 3: Command that doesn't exist
echo ""
echo "3. Non-existent command with fallback:"
python3 /Users/redinside/.openclaw/workspace/tools/command_fallback.py "execute_with_fallback" "nonexistentcommand" "--help"

# Test 4: Generate help
echo ""
echo "4. Help message:"
python3 /Users/redinside/.openclaw/workspace/tools/command_fallback.py "generate_help_message" | head -15

echo ""
echo "=== Usage Examples ==="
echo ""
echo "# In scripts:"
echo "python3 -c 'from tools.command_fallback import CommandFallback; rc, out, err = CommandFallback.execute_with_fallback(\"rg\", \"--version\"); print(out)'"
echo ""
echo "# As a wrapper:"
echo "/Users/redinside/.openclaw/workspace/tools/command_fallback_wrapper.py rg --version"
echo ""
echo "# For specific commands:"
echo "python3 -c 'from tools.command_fallback import CommandFallback; print(CommandFallback.suggest_fallback(\"rg\"))'"

echo ""
echo "=== Available Fallbacks ==="
python3 -c "
from tools.command_fallback import CommandFallback
print('Available fallbacks:')
for command in CommandFallback.COMMAND_PATTERNS.keys():
    status = 'Available' if CommandFallback.is_command_available(command) else 'Missing'
    print('  ' + command + ': ' + status)
"