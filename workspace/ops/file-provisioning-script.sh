#!/bin/bash
# File provisioning script to auto-provision missing files/paths
# Runs on demand or via cron to fix INFOSEC blockers

set -euo pipefail

# Configuration
WORKSPACE_ROOT="/Users/redinside/.openclaw/workspace"
LOG_FILE="/Users/redinside/.openclaw/workspace/logs/file-provisioning.log"

# Function to check and create missing files
check_and_create_file() {
    local file_path="$1"
    local default_content="$2"
    local permissions="${3:-600}"
    
    if [[ ! -f "$file_path" ]]; then
        echo "$(date): Creating missing file: $file_path" >> "$LOG_FILE"
        
        # Create parent directories if needed
        local parent_dir="$(dirname "$file_path")"
        if [[ ! -d "$parent_dir" ]]; then
            echo "$(date): Creating parent directory: $parent_dir" >> "$LOG_FILE"
            mkdir -p "$parent_dir"
        fi
        
        # Write default content
        echo "$default_content" > "$file_path"
        chmod "$permissions" "$file_path"
        echo "$(date): Successfully created $file_path" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): File exists, skipping: $file_path" >> "$LOG_FILE"
        return 1
    fi
}

# Function to check and create missing directories
check_and_create_dir() {
    local dir_path="$1"
    local permissions="${2:-755}"
    
    if [[ ! -d "$dir_path" ]]; then
        echo "$(date): Creating missing directory: $dir_path" >> "$LOG_FILE"
        mkdir -p "$dir_path"
        chmod "$permissions" "$dir_path"
        echo "$(date): Successfully created $dir_path" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): Directory exists, skipping: $dir_path" >> "$LOG_FILE"
        return 1
    fi
}

# Function to verify file permissions
verify_file_permissions() {
    local file_path="$1"
    local expected_permissions="$2"
    
    local current_permissions=$(stat -f "%Mp%Lp" "$file_path" 2>/dev/null || echo "unknown")
    
    if [[ "$current_permissions" != "$expected_permissions" ]]; then
        echo "$(date): Fixing permissions for $file_path: $current_permissions -> $expected_permissions" >> "$LOG_FILE"
        chmod "$expected_permissions" "$file_path"
        echo "$(date): Permissions fixed for $file_path" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): Permissions correct for $file_path: $current_permissions" >> "$LOG_FILE"
        return 1
    fi
}

# Function to verify directory permissions
verify_dir_permissions() {
    local dir_path="$1"
    local expected_permissions="$2"
    
    local current_permissions=$(stat -f "%Mp%Lp" "$dir_path" 2>/dev/null || echo "unknown")
    
    if [[ "$current_permissions" != "$expected_permissions" ]]; then
        echo "$(date): Fixing permissions for $dir_path: $current_permissions -> $expected_permissions" >> "$LOG_FILE"
        chmod "$expected_permissions" "$dir_path"
        echo "$(date): Permissions fixed for $dir_path" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): Permissions correct for $dir_path: $current_permissions" >> "$LOG_FILE"
        return 1
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install missing commands
install_missing_command() {
    local command_name="$1"
    local install_command="$2"
    
    if ! command_exists "$command_name"; then
        echo "$(date): Installing missing command: $command_name" >> "$LOG_FILE"
        
        if command_exists brew; then
            brew install $install_command >> "$LOG_FILE" 2>&1
        elif command_exists apt-get; then
            sudo apt-get install -y $install_command >> "$LOG_FILE" 2>&1
        else
            echo "$(date): No package manager found for $command_name" >> "$LOG_FILE"
            return 1
        fi
        
        if command_exists "$command_name"; then
            echo "$(date): Successfully installed $command_name" >> "$LOG_FILE"
            return 0
        else
            echo "$(date): Failed to install $command_name" >> "$LOG_FILE"
            return 1
        fi
    else
        echo "$(date): Command exists: $command_name" >> "$LOG_FILE"
        return 1
    fi
}

# Function to create symlink if target doesn't exist
create_symlink() {
    local source="$1"
    local target="$2"
    
    if [[ ! -e "$target" ]]; then
        echo "$(date): Creating symlink: $target -> $source" >> "$LOG_FILE"
        ln -s "$source" "$target"
        echo "$(date): Successfully created symlink $target" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): Symlink target exists, skipping: $target" >> "$LOG_FILE"
        return 1
    fi
}

# Main provisioning logic
main() {
    echo "$(date): Starting file provisioning run" >> "$LOG_FILE"
    
    # Track changes
    local changes_detected=0
    
    # Check essential directories
    echo "$(date): Checking essential directories..." >> "$LOG_FILE"
    
    # Create workspace directories
    local essential_dirs=(
        "$WORKSPACE_ROOT/logs"
        "$WORKSPACE_ROOT/memory"
        "$WORKSPACE_ROOT/sessions"
        "$WORKSPACE_ROOT/tasks"
        "$WORKSPACE_ROOT/credentials"
        "$WORKSPACE_ROOT/backups"
        "$WORKSPACE_ROOT/health"
    )
    
    for dir in "${essential_dirs[@]}"; do
        if check_and_create_dir "$dir" "755"; then
            ((changes_detected++))
        fi
    done
    
    # Check essential files
    echo "$(date): Checking essential files..." >> "$LOG_FILE"
    
    # Create essential config files with defaults
    local essential_files=(
        "$WORKSPACE_ROOT/config/defaults.json"
        "$WORKSPACE_ROOT/config/cron-jobs.json"
        "$WORKSPACE_ROOT/config/health-checkers.json"
        "$WORKSPACE_ROOT/config/sla-targets.json"
    )
    
    for file in "${essential_files[@]}"; do
        local default_content="{}"
        if check_and_create_file "$file" "$default_content" "600"; then
            ((changes_detected++))
        fi
    done
    
    # Check and fix permissions on critical files
    echo "$(date): Verifying file permissions..." >> "$LOG_FILE"
    
    local permission_checks=(
        "$WORKSPACE_ROOT/config/defaults.json:600"
        "$WORKSPACE_ROOT/config/cron-jobs.json:600"
        "$WORKSPACE_ROOT/config/health-checkers.json:600"
        "$WORKSPACE_ROOT/credentials/credentials.json:600"
        "$WORKSPACE_ROOT/logs:755"
        "$WORKSPACE_ROOT/memory:755"
    )
    
    for check in "${permission_checks[@]}"; do
        local file_path="${check%:*}"
        local expected_perms="${check#*:}"
        
        if [[ -f "$file_path" ]]; then
            if verify_file_permissions "$file_path" "$expected_perms"; then
                ((changes_detected++))
            fi
        elif [[ -d "$file_path" ]]; then
            if verify_dir_permissions "$file_path" "$expected_perms"; then
                ((changes_detected++))
            fi
        fi
    done
    
    # Check for missing commands and install
    echo "$(date): Checking for missing commands..." >> "$LOG_FILE"
    
    local missing_commands=(
        "jq"
        "curl"
        "wget"
        "git"
        "openssl"
    )
    
    for cmd in "${missing_commands[@]}"; do
        if install_missing_command "$cmd" "$cmd"; then
            ((changes_detected++))
        fi
    done
    
    # Create symlinks for common tools
    echo "$(date): Creating symlinks..." >> "$LOG_FILE"
    
    local symlinks=(
        "$WORKSPACE_ROOT/scripts/health-check -> $WORKSPACE_ROOT/ops/health-check.sh"
        "$WORKSPACE_ROOT/scripts/cron-runner -> $WORKSPACE_ROOT/ops/cron-runner.sh"
        "$WORKSPACE_ROOT/scripts/provisioner -> $WORKSPACE_ROOT/ops/file-provisioning-script.sh"
    )
    
    for link in "${symlinks[@]}"; do
        local source="${link#*-> }"
        local target="${link% ->*}"
        
        if create_symlink "$source" "$target"; then
            ((changes_detected++))
        fi
    done
    
    # Check and create backup rotation config
    echo "$(date): Setting up backup rotation..." >> "$LOG_FILE"
    
    local backup_config="$WORKSPACE_ROOT/config/backup-rotation.json"
    local backup_content="{
  \"enabled\": true,
  \"schedule\": \"daily\",
  \"retention_days\": 30,
  \"paths_to_backup\": [
    \"/Users/redinside/.openclaw/workspace/logs\",
    \"/Users/redinside/.openclaw/workspace/memory\",
    \"/Users/redinside/.openclaw/workspace/credentials\"
  ],
  \"backup_dir\": \"/Users/redinside/.openclaw/workspace/backups\",
  \"compression\": \"gzip\"
}"
    
    if check_and_create_file "$backup_config" "$backup_content" "600"; then
        ((changes_detected++))
    fi
    
    # Final report
    echo "$(date): File provisioning completed" >> "$LOG_FILE"
    echo "$(date): Total changes detected: $changes_detected" >> "$LOG_FILE"
    
    if [[ $changes_detected -gt 0 ]]; then
        echo "$(date): Provisioning completed with $changes_detected changes" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): No changes needed, system is provisioned" >> "$LOG_FILE"
        return 1
    fi
}

# Run the main provisioning function
main "$@"