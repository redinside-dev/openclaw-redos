#!/bin/bash

# File Provisioning Script for OpenClaw
# Automatically provisions missing files and directories for OpenClaw

set -euo pipefail

# Configuration
CONFIG_DIR="$HOME/.openclaw/workspace/config"
BACKUP_DIR="$HOME/.openclaw/workspace/backups"
LOG_FILE="$HOME/.openclaw/workspace/logs/file-provisioning.log"

# Create directories if they don't exist
mkdir -p "$CONFIG_DIR" "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Backup function
backup_file() {
    local file="$1"
    if [[ -f "$file" ]]; then
        local backup_file="$BACKUP_DIR/$(basename "$file")-$(date '+%Y%m%d%H%M%S')"
        cp "$file" "$backup_file"
        log "Backed up $file to $backup_file"
    fi
}

# Create missing directories
create_directories() {
    local dirs=(
        "$HOME/.config/gh"
        "$HOME/.config/git"
        "$HOME/.config/openrouter"
        "$HOME/.config/perplexity"
        "$HOME/.ssh/agent"
        "$HOME/.openclaw/workspace/config"
        "$HOME/.openclaw/workspace/logs"
        "$HOME/.openclaw/workspace/backups"
        "$HOME/.openclaw/workspace/ops/alerts"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            log "Creating missing directory: $dir"
            mkdir -p "$dir"
        else
            log "Directory exists: $dir"
        fi
    done
}

# Create missing configuration files
create_config_files() {
    local config_file="$CONFIG_DIR/openclaw.json"
    
    if [[ ! -f "$config_file" ]]; then
        log "Creating missing OpenClaw config file: $config_file"
        
        # Create a basic config file with placeholders
        cat > "$config_file" << 'EOF'
{
  "meta": {
    "lastTouchedVersion": "2026.3.2",
    "lastTouchedAt": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  },
  "env": {
    "vars": {
      "XAI_API_KEY": "<YOUR_XAI_KEY>",
      "ZAI_API_KEY": "7d6b2c47525542558519b40878820eac.WorBrewofFf4Rifb"
    },
    "PERPLEXITY_API_KEY": "PLACEHOLDER_TOKEN_2"
  },
  "auth": {
    "profiles": {
      "openai-codex:default": {
        "provider": "openai-codex",
        "mode": "oauth"
      },
      "anthropic:default": {
        "provider": "anthropic",
        "mode": "token"
      }
    }
  }
}
EOF
        
        log "OpenClaw config file created successfully"
    else
        log "OpenClaw config file exists: $config_file"
    fi
}

# Create missing GitHub config
create_github_config() {
    local gh_config="$HOME/.config/gh/config.yml"
    
    if [[ ! -f "$gh_config" ]]; then
        log "Creating missing GitHub config: $gh_config"
        
        cat > "$gh_config" << 'EOF'
# The current version of the config schema
version: 1
# What protocol to use when performing git operations. Supported values: ssh, https
git_protocol: https
# What editor gh should run when creating issues, pull requests, etc. If blank, will refer to environment.
editor:
# When to interactively prompt. This is a global config that cannot be overridden by hostname. Supported values: enabled, disabled
prompt: enabled
# Preference for editor-based interactive prompting. This is a global config that cannot be overridden by hostname. Supported values: enabled, disabled
prefer_editor_prompt: disabled
# A pager program to send command output to, e.g. "less". If blank, will refer to environment. Set the value to "cat" to disable the pager.
pager:
# Aliases allow you to create nicknames for gh commands
aliases:
    co: pr checkout
# The path to a unix socket through which to send HTTP connections. If blank, HTTP traffic will be handled by net/http.DefaultTransport.
http_unix_socket:
# What web browser gh should use when opening URLs. If blank, will refer to environment.
browser:
# Whether to display labels using their RGB hex color codes in terminals that support truecolor. Supported values: enabled, disabled
color_labels: disabled
# Whether customizable, 4-bit accessible colors should be used. Supported values: enabled, disabled
accessible_colors: disabled
# Whether an accessible prompter should be used. Supported values: enabled, disabled
accessible_prompter: disabled
# Whether to use a animated spinner as a progress indicator. If disabled, a textual progress indicator is used instead. Supported values: enabled, disabled
spinner: enabled
EOF
        
        log "GitHub config created successfully"
    else
        log "GitHub config exists: $gh_config"
    fi
}

# Create missing SSH keys
create_ssh_keys() {
    local ssh_dir="$HOME/.ssh"
    local key_file="$ssh_dir/openclaw_opsrunner"
    
    if [[ ! -f "$key_file" ]]; then
        log "Creating missing SSH key: $key_file"
        
        # Create SSH directory if it doesn't exist
        mkdir -p "$ssh_dir"
        chmod 700 "$ssh_dir"
        
        # Generate SSH key
        ssh-keygen -t rsa -b 4096 -f "$key_file" -N '' -C "openclaw_opsrunner@$(hostname)" << EOF
y
EOF
        
        # Set proper permissions
        chmod 600 "$key_file"
        chmod 644 "${key_file}.pub"
        
        log "SSH key created successfully"
        log "Public key: $(cat "${key_file}.pub")"
    else
        log "SSH key exists: $key_file"
    fi
}

# Check and fix file permissions
check_permissions() {
    local files=(
        "$HOME/.config/gh"
        "$HOME/.config/git"
        "$HOME/.ssh"
        "$HOME/.openclaw"
    )
    
    for file in "${files[@]}"; do
        if [[ -d "$file" ]]; then
            local current_perms=$(stat -f '%A' "$file")
            local required_perms="700"
            
            if [[ "$current_perms" != "drwx------" ]]; then
                log "Fixing permissions for $file: $current_perms -> $required_perms"
                chmod 700 "$file"
            fi
        fi
    done
    
    log "File permissions checked and fixed"
}

# Main provisioning
main() {
    log "Starting file provisioning process..."
    
    # Create missing directories
    create_directories
    
    # Create missing configuration files
    create_config_files
    create_github_config
    
    # Create missing SSH keys
    create_ssh_keys
    
    # Check and fix file permissions
    check_permissions
    
    log "File provisioning completed successfully"
    return 0
}

# Execute main function
main "$@"