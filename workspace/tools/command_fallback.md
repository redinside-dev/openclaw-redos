# Command Fallback System

A robust system for handling missing commands with automatic fallbacks and suggestions.

## Overview

This system implements automatic detection and fallback for common command patterns, particularly addressing the issues documented in TICKET-20260301-040/041:

- `rg` (ripgrep) command not found (41 occurrences)
- `python` command not found (34 occurrences)

## Key Features

1. **Automatic Fallback**: When a command is missing, automatically use a configured alternative
2. **Command Detection**: Check if commands are available before execution
3. **Installation Suggestions**: Provide helpful suggestions for installing missing commands
4. **Cross-Platform Compatibility**: Works on macOS, Linux, and other Unix-like systems
5. **Extensible**: Easy to add new command patterns and fallbacks

## Available Fallbacks

### Current Command Patterns

| Command | Fallback | Description | Status |
|---------|----------|-------------|---------|
| `rg` | `grep` | ripgrep not found, use grep | Available |
| `python` | `python3` | python command not found, use python3 | Missing |
| `pip` | `pip3` | pip command not found, use pip3 | Missing |
| `node` | `nodejs` | node command not found, use nodejs | Available |
| `npm` | `npm3` | npm command not found, use npm3 | Available |
| `git` | `hub` | git command not found, use hub | Available |

### Status Explanation
- **Available**: Command exists and can be executed directly
- **Missing**: Command not found, fallback will be used automatically

## Usage Examples

### Direct Python Usage

```python
from tools.command_fallback import CommandFallback

# Check if a command is available
if CommandFallback.is_command_available('rg'):
    print("rg is available")
else:
    print("rg is missing, using fallback")

# Get fallback information
fallback = CommandFallback.get_fallback('python')
if fallback:
    print(f"Fallback for python: {fallback['fallback']}")
    print(f"Description: {fallback['description']}")
    print(f"Example: {fallback['example']}")
```

### Execute with Fallback

```python
from tools.command_fallback import CommandFallback

# Execute a command with automatic fallback
returncode, stdout, stderr = CommandFallback.execute_with_fallback(
    'python', '--version'
)
print(f"Return code: {returncode}")
print(f"Output: {stdout}")
print(f"Error: {stderr}")
```

### Command Line Usage

```bash
# Execute with fallback
python3 /Users/redinside/.openclaw/workspace/tools/command_fallback.py "execute_with_fallback" "python" "--version"

# Get help message
python3 /Users/redinside/.openclaw/workspace/tools/command_fallback.py "generate_help_message"

# Check available fallbacks
python3 -c "
from tools.command_fallback import CommandFallback
print('Available fallbacks:')
for command in CommandFallback.COMMAND_PATTERNS.keys():
    status = 'Available' if CommandFallback.is_command_available(command) else 'Missing'
    print('  ' + command + ': ' + status)
"
```

### Integration with Scripts

```bash
#!/bin/bash

# Use the fallback system in your scripts
python3 -c '
from tools.command_fallback import CommandFallback
rc, out, err = CommandFallback.execute_with_fallback("rg", "--version")
print(out)
'
```

### Wrapper Script Usage

```bash
# Use the wrapper script for simpler command line usage
/Users/redinside/.openclaw/workspace/tools/command_fallback_wrapper.py rg --version
```

## Installation Suggestions

When commands are missing, the system provides helpful installation suggestions:

### ripgrep (`rg`)
```bash
# macOS (Homebrew)
brew install ripgrep

# Ubuntu/Debian
apt install ripgrep

# Alternative using grep
find . -type f | xargs grep "pattern"
```

### Python (`python`)
```bash
# macOS (Homebrew)
brew install python

# Ubuntu/Debian
apt install python3

# Check availability
which python3
```

### pip (`pip`)
```bash
# macOS (Homebrew)
brew install pip

# Ubuntu/Debian
apt install python3-pip

# Use pip3 instead
pip3 install package
```

### Node.js (`node`)
```bash
# macOS (Homebrew)
brew install node

# Ubuntu/Debian
apt install nodejs

# Alternative using nodejs
nodejs script.js
```

## Integration with Existing Workflows

### In Shell Scripts

```bash
#!/bin/bash

# Use the fallback system for critical commands
PYTHON_VERSION=$(python3 -c "
from tools.command_fallback import CommandFallback
rc, out, err = CommandFallback.execute_with_fallback('python', '--version')
print(out.strip())
" 2>/dev/null)

echo "Python version: $PYTHON_VERSION"
```

### In Cron Jobs

```bash
# Add to cron jobs for automatic fallback handling
*/5 * * * * /Users/redinside/.openclaw/workspace/tools/command_fallback.py "execute_with_fallback" "rg" "--version" >> /tmp/command_fallback.log 2>&1
```

### In Monitoring Scripts

```bash
#!/bin/bash

# Monitor command availability
check_command() {
    local command="$1"
    local fallback_info
    
    fallback_info=$(python3 -c "
from tools.command_fallback import CommandFallback
fallback = CommandFallback.get_fallback('$command')
if fallback:
    print(fallback['fallback'])
")
    
    if [ -n "$fallback_info" ]; then
        echo "Command '$command' is missing, fallback: $fallback_info"
    else
        echo "Command '$command' is available"
    fi
}

check_command "rg"
check_command "python"
check_command "git"
```

## Extending the System

### Adding New Command Patterns

To add new command patterns, modify the `COMMAND_PATTERNS` dictionary in `command_fallback.py`:

```python
# Add to COMMAND_PATTERNS dictionary
COMMAND_PATTERNS['newcommand'] = {
    'fallback': 'fallbackcommand',
    'description': 'newcommand not found, using fallbackcommand',
    'check': lambda: os.system('command -v newcommand >/dev/null 2>&1') != 0,
    'transform': lambda args: ['fallbackcommand'] + args,
    'example': 'newcommand arg1 arg2 -> fallbackcommand arg1 arg2'
}
```

### Custom Fallback Logic

For more complex fallback logic, you can modify the `execute_with_fallback` method:

```python
@classmethod
def execute_with_fallback(cls, command: str, *args, **kwargs) -> Tuple[int, str, str]:
    """Custom fallback logic for specific commands."""
    
    # Custom logic for specific commands
    if command == 'specialcommand':
        # Custom handling
        pass
    
    # Default fallback logic
    fallback_info = cls.get_fallback(command)
    if fallback_info:
        # Use fallback
        pass
    else:
        # Execute normally
        pass
```

## Error Handling

### Common Error Scenarios

1. **Command Not Found**: System automatically uses fallback
2. **Fallback Not Available**: Returns error message with suggestions
3. **Execution Timeout**: Returns timeout error with retry suggestions
4. **Permission Denied**: Returns permission error with sudo suggestions

### Error Messages

The system provides helpful error messages:

```
Error: Command 'nonexistentcommand' not found
Suggestions:
- Install the command: 'brew install nonexistentcommand' or 'apt install nonexistentcommand'
- Use alternative commands: 'alternativecommand --help'
- Check if the command is in your PATH: 'echo $PATH'
```

## Performance Considerations

### Caching

The system caches command availability checks to improve performance:

```python
# Command availability is cached after first check
if CommandFallback.is_command_available('rg'):
    # Fast subsequent checks
    pass
```

### Lazy Loading

Command patterns are loaded lazily to minimize startup overhead:

```python
# Patterns loaded only when needed
fallback = CommandFallback.get_fallback('python')
```

## Security Considerations

### Command Injection Prevention

The system validates commands before execution:

```python
def _execute_command(command_parts: List[str], **kwargs) -> Tuple[int, str, str]:
    """Execute command with validation."""
    # Validate command parts
    for part in command_parts:
        if ';' in part or '|' in part or '&' in part:
            raise ValueError("Potential command injection detected")
    
    # Execute safely
    result = subprocess.run(command_parts, capture_output=True, text=True, **kwargs)
    return (result.returncode, result.stdout, result.stderr)
```

### Path Validation

Commands are validated against PATH to prevent execution of unintended binaries:

```python
def is_command_available(command: str) -> bool:
    """Check if command is available in PATH."""
    # Validate PATH
    path = os.environ.get('PATH', '')
    if not path:
        return False
    
    # Check each directory in PATH
    for directory in path.split(os.pathsep):
        if os.path.exists(os.path.join(directory, command)):
            return True
    return False
```

## Testing

### Unit Tests

```bash
# Run the test script
./test_command_fallback.sh

# Expected output:
# === Testing: rg command fallback ===
#   PASS: 'rg' is available
# === Testing: python command fallback ===
#   PASS: Fallback executed successfully
# ...
```

### Integration Tests

```bash
# Test integration with existing workflows
./command_fallback_integration.sh

# Expected output includes:
# Available fallbacks:
#   rg: Available
#   python: Missing
#   pip: Missing
#   node: Available
#   npm: Available
#   git: Available
```

## Troubleshooting

### Common Issues

1. **Command Still Not Found**: Check PATH and command availability
2. **Fallback Not Working**: Verify fallback command exists
3. **Permission Issues**: Check file permissions and sudo requirements
4. **Syntax Errors**: Check command syntax and arguments

### Debug Mode

Enable debug logging for troubleshooting:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Log Analysis

Check logs for command execution details:

```bash
tail -f /tmp/command_fallback.log
```

## Future Enhancements

### Planned Features

1. **Configuration File**: External configuration for command patterns
2. **Plugin System**: Allow third-party command patterns
3. **Remote Fallbacks**: Support for remote command execution
4. **Performance Monitoring**: Track fallback usage and performance

### Requested Features

1. **Batch Command Execution**: Execute multiple commands with fallbacks
2. **Command Aliasing**: Create custom command aliases
3. **Cross-Platform Detection**: Better platform-specific handling
4. **Dependency Resolution**: Handle command dependencies

## Support

### Documentation

- **README**: This file
- **API Documentation**: Inline code documentation
- **Examples**: Usage examples in this document

### Contact

For issues and feature requests:
- **File an Issue**: In the project repository
- **Documentation**: Check this documentation first
- **Community**: Consult community resources

## License

This command fallback system is provided as part of the OpenClaw workspace and follows the project's licensing terms.