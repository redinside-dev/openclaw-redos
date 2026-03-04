#!/usr/bin/env python3
"""
Command Fallback Wrapper - Integrates with OpenClaw exec tool
Provides automatic command fallback for exec calls.
"""

import sys
import os
import subprocess
from typing import List, Tuple

# Add the command_fallback module to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.command_fallback import CommandFallback

def main():
    """Main wrapper function."""
    if len(sys.argv) < 2:
        print("Usage: command_fallback_wrapper.py <command> [<args>...]")
        sys.exit(1)
    
    command = sys.argv[1]
    args = sys.argv[2:]
    
    # Execute with fallback
    returncode, stdout, stderr = CommandFallback.execute_with_fallback(command, *args)
    
    # Print output
    if stdout:
        print(stdout, end='')
    
    if stderr:
        print(stderr, end='', file=sys.stderr)
    
    sys.exit(returncode)

if __name__ == "__main__":
    main()