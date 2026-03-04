#!/usr/bin/env python3
"""
Command Fallback System - Robust handling for missing commands
Implements automatic detection and fallback for common command patterns.
"""

import subprocess
import os
import sys
import logging
from typing import Optional, List, Tuple, Callable

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CommandFallback:
    """
    Command fallback manager that provides automatic detection and fallback
    for missing commands based on common patterns.
    """
    
    # Common command patterns and their fallbacks
    COMMAND_PATTERNS = {
        # rg (ripgrep) -> grep fallback
        'rg': {
            'fallback': 'grep',
            'description': 'ripgrep not found, using grep as fallback',
            'check': lambda: os.system('command -v rg >/dev/null 2>&1') != 0,
            'transform': lambda args: ['grep'] + args,
            'example': 'rg "pattern" file.txt' 
                     '-> grep "pattern" file.txt'
        },
        
        # python -> python3 fallback (macOS)
        'python': {
            'fallback': 'python3',
            'description': 'python command not found, using python3',
            'check': lambda: os.system('command -v python >/dev/null 2>&1') != 0,
            'transform': lambda args: ['python3'] + args,
            'example': 'python script.py' 
                     '-> python3 script.py'
        },
        
        # pip -> pip3 fallback (macOS)
        'pip': {
            'fallback': 'pip3',
            'description': 'pip command not found, using pip3',
            'check': lambda: os.system('command -v pip >/dev/null 2>&1') != 0,
            'transform': lambda args: ['pip3'] + args,
            'example': 'pip install package' 
                     '-> pip3 install package'
        },
        
        # node -> nodejs fallback (some systems)
        'node': {
            'fallback': 'nodejs',
            'description': 'node command not found, using nodejs',
            'check': lambda: os.system('command -v node >/dev/null 2>&1') != 0,
            'transform': lambda args: ['nodejs'] + args,
            'example': 'node script.js' 
                     '-> nodejs script.js'
        },
        
        # npm -> npm3 fallback (some systems)
        'npm': {
            'fallback': 'npm3',
            'description': 'npm command not found, using npm3',
            'check': lambda: os.system('command -v npm >/dev/null 2>&1') != 0,
            'transform': lambda args: ['npm3'] + args,
            'example': 'npm install' 
                     '-> npm3 install'
        },
        
        # git -> hub fallback (if hub is available)
        'git': {
            'fallback': 'hub',
            'description': 'git command not found, using hub',
            'check': lambda: os.system('command -v git >/dev/null 2>&1') != 0,
            'transform': lambda args: ['hub'] + args,
            'example': 'git status' 
                     '-> hub status'
        }
    }
    
    @staticmethod
    def is_command_available(command: str) -> bool:
        """Check if a command is available in PATH."""
        return os.system(f'command -v {command} >/dev/null 2>&1') == 0
    
    @classmethod
    def get_fallback(cls, command: str) -> Optional[dict]:
        """
        Get fallback information for a command if available.
        Returns None if no fallback is configured or command is available.
        """
        if cls.is_command_available(command):
            return None
            
        return cls.COMMAND_PATTERNS.get(command, None)
    
    @classmethod
    def execute_with_fallback(cls, command: str, *args, **kwargs) -> Tuple[int, str, str]:
        """
        Execute a command with automatic fallback if the primary command is missing.
        Returns (returncode, stdout, stderr).
        """
        # Check if we need a fallback
        fallback_info = cls.get_fallback(command)
        
        if fallback_info:
            logger.info(f"Command '{command}' not found. {fallback_info['description']}")
            logger.info(f"Original: {command} {' '.join(args)}")
            logger.info(f"Fallback: {fallback_info['fallback']} {' '.join(args)}")
            
            # Transform the command
            transformed_command = [fallback_info['fallback']] + list(args)
            
            # Execute with fallback
            return cls._execute_command(transformed_command, **kwargs)
        else:
            # No fallback needed, execute normally
            return cls._execute_command([command] + list(args), **kwargs)
    
    @staticmethod
    def _execute_command(command_parts: List[str], 
                        timeout: Optional[int] = None,
                        check: bool = False,
                        env: Optional[dict] = None,
                        cwd: Optional[str] = None) -> Tuple[int, str, str]:
        """
        Execute a command and return (returncode, stdout, stderr).
        """
        try:
            result = subprocess.run(
                command_parts,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=env,
                cwd=cwd
            )
            return (result.returncode, result.stdout, result.stderr)
            
        except subprocess.TimeoutExpired:
            logger.error(f"Command timed out: {' '.join(command_parts)}")
            return (-1, "", "Command execution timed out")
        
        except Exception as e:
            logger.error(f"Command execution failed: {e}")
            return (-2, "", f"Command execution error: {e}")
    
    @classmethod
    def suggest_alternatives(cls, command: str) -> List[str]:
        """
        Suggest alternative commands or installation methods.
        """
        suggestions = []
        
        if command == 'rg':
            suggestions.append("Install ripgrep: 'brew install ripgrep' or 'apt install ripgrep'")
            suggestions.append("Use grep as fallback: 'grep -r pattern .' for recursive search")
            suggestions.append("Use find with xargs: 'find . -type f | xargs grep pattern' for complex searches")
        
        elif command == 'python':
            suggestions.append("Use python3: 'python3 script.py' (macOS default)")
            suggestions.append("Install python: 'brew install python' or 'apt install python3'")
            suggestions.append("Check python3 availability: 'which python3'")
        
        elif command == 'pip':
            suggestions.append("Use pip3: 'pip3 install package'")
            suggestions.append("Install pip: 'sudo apt install python3-pip' or 'brew install pip'")
        
        elif command == 'node':
            suggestions.append("Use nodejs: 'nodejs script.js'")
            suggestions.append("Install node: 'brew install node' or 'apt install nodejs'")
        
        elif command == 'git':
            suggestions.append("Install git: 'brew install git' or 'apt install git'")
            suggestions.append("Use hub: 'hub status' (GitHub CLI)")
        
        return suggestions
    
    @classmethod
    def generate_help_message(cls) -> str:
        """
        Generate a comprehensive help message with examples.
        """
        help_lines = []
        help_lines.append("Command Fallback System - Automatic Command Handling")
        help_lines.append("=" * 60)
        help_lines.append("")
        
        for command, info in cls.COMMAND_PATTERNS.items():
            help_lines.append(f"{command}:")
            help_lines.append(f"  Status: {'Available' if cls.is_command_available(command) else 'Missing'}")
            help_lines.append(f"  Fallback: {info['fallback']}")
            help_lines.append(f"  Description: {info['description']}")
            help_lines.append(f"  Example: {info['example']}")
            help_lines.append("")
        
        help_lines.append("Common Issues and Solutions:")
        help_lines.append("  - Command not found: Automatic fallback to alternative")
        help_lines.append("  - Installation needed: Suggested commands provided")
        help_lines.append("  - Cross-platform compatibility: Works on macOS, Linux, etc.")
        help_lines.append("")
        
        return "\n".join(help_lines)

# Convenience functions for easy usage
def exec_with_fallback(command: str, *args, **kwargs) -> Tuple[int, str, str]:
    """Convenience wrapper for CommandFallback.execute_with_fallback."""
    return CommandFallback.execute_with_fallback(command, *args, **kwargs)

def suggest_fallback(command: str) -> Optional[str]:
    """Get fallback command for a missing command."""
    fallback_info = CommandFallback.get_fallback(command)
    return fallback_info['fallback'] if fallback_info else None

def is_command_missing(command: str) -> bool:
    """Check if a command is missing (not available in PATH)."""
    return not CommandFallback.is_command_available(command)