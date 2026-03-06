#!/bin/bash
# Health Monitor 2: Credential and File Integrity Check
# Monitors credential files, essential paths, and system integrity

set -euo pipefail

# Configuration
CREDENTIAL_FILE="/Users/redinside/.openclaw/workspace/credentials.json"
OPENCLAW_CONFIG="/Users/redinside/.openclaw/openclaw.json"
ENV_FILE="/Users/redinside/.openclaw/.env"
CHECK_INTERVAL=600
LOG_FILE="/Users/redinside/.openclaw/workspace/logs/health-monitor-2.log"
REMEDIATION_LOG="/Users/redinside/.openclaw/workspace/logs/remediation-actions.log"

# Function to log messages
log() {
    local level="$1"
    local message="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $message" | tee -a "$LOG_FILE"
}

# Function to check file integrity
check_file_integrity() {
    local file_path="$1"
    local expected_checksum="$2"
    
    log "INFO" "Checking integrity of $file_path..."
    
    if [[ ! -f "$file_path" ]]; then
        log "ERROR" "File missing: $file_path"
        return 1
    fi
    
    # Calculate current checksum
    local current_checksum
    if command -v shasum >/dev/null 2>&1; then
        current_checksum=$(shasum -a 256 "$file_path" | awk '{print $1}')
    elif command -v sha256sum >/dev/null 2>&1; then
        current_checksum=$(sha256sum "$file_path" | awk '{print $1}')
    else
        log "WARNING" "No checksum utility available, skipping integrity check"
        return 0
    fi
    
    if [[ "$current_checksum" != "$expected_checksum" ]]; then
        log "WARNING" "File integrity check failed for $file_path"
        return 1
    else
        log "INFO" "File integrity check passed for $file_path"
        return 0
    fi
}

# Function to validate credentials
validate_credentials() {
    log "INFO" "Validating credentials..."
    
    # Check if credential file exists
    if [[ ! -f "$CREDENTIAL_FILE" ]]; then
        log "ERROR" "Credential file missing: $CREDENTIAL_FILE"
        return 1
    fi
    
    # Check if credentials are placeholders
    local perplexity_token
    local github_token
    
    perplexity_token=$(jq -r '.perplexity_token' "$CREDENTIAL_FILE" 2>/dev/null || echo "")
    github_token=$(jq -r '.github_token' "$CREDENTIAL_FILE" 2>/dev/null || echo "")
    
    if [[ -z "$perplexity_token" || -z "$github_token" ]]; then
        log "ERROR" "Missing credentials in $CREDENTIAL_FILE"
        return 1
    fi
    
    if [[ "$perplexity_token" == "REPLACEME" || "$github_token" == "REPLACEME" ]]; then
        log "WARNING" "Credential placeholders detected, rotation needed"
        return 1
    fi
    
    log "INFO" "Credentials appear valid"
    return 0
}

# Function to check openclaw configuration
check_openclaw_config() {
    log "INFO" "Checking OpenClaw configuration..."
    
    if [[ ! -f "$OPENCLAW_CONFIG" ]]; then
        log "ERROR" "OpenClaw configuration missing: $OPENCLAW_CONFIG"
        return 1
    fi
    
    # Check for required fields
    local required_fields=("gateway" "dashboard" "model" "agents")
    local missing_fields=()
    
    for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" "$OPENCLAW_CONFIG" >/dev/null 2>&1; then
            missing_fields+=("$field")
        fi
    done
    
    if [[ ${#missing_fields[@]} -gt 0 ]]; then
        log "WARNING" "Missing required fields in OpenClaw config: ${missing_fields[*]}"
        return 1
    fi
    
    log "INFO" "OpenClaw configuration appears valid"
    return 0
}

# Function to check environment file
check_env_file() {
    log "INFO" "Checking environment file..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log "ERROR" "Environment file missing: $ENV_FILE"
        return 1
    fi
    
    # Check for required environment variables
    local required_vars=("OPENCLAW_API_KEY" "TELEGRAM_BOT_TOKEN" "PERPLEXITY_TOKEN" "GITHUB_TOKEN")
    local missing_vars=()
    
    while IFS= read -r line; do
        if [[ "$line" =~ ^[A-Z_]+=.+$ ]]; then
            local var_name="${line%%=*}"
            local var_value="${line#*=}"
            
            for required_var in "${required_vars[@]}"; do
                if [[ "$var_name" == "$required_var" && -z "$var_value" ]]; then
                    missing_vars+=("$var_name")
                fi
            done
        fi
    done < "$ENV_FILE"
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log "WARNING" "Missing or empty environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    log "INFO" "Environment file appears valid"
    return 0
}

# Function to check file permissions
check_file_permissions() {
    log "INFO" "Checking file permissions..."
    
    local critical_files=(
        "$CREDENTIAL_FILE"
        "$OPENCLAW_CONFIG"
        "$ENV_FILE"
        "/Users/redinside/.openclaw"
        "/Users/redinside/.openclaw/workspace"
    )
    
    local permission_issues=0
    
    for file in "${critical_files[@]}"; do
        if [[ -f "$file" ]]; then
            local perms=$(stat -f "%Mp%Lp" "$file" 2>/dev/null || echo "unknown")
            if [[ "$perms" != "100600" && "$perms" != "40700" ]]; then
                log "WARNING" "Incorrect permissions on $file: $perms (should be 600 or 700)"
                ((permission_issues++))
            fi
        elif [[ -d "$file" ]]; then
            local perms=$(stat -f "%Mp%Lp" "$file" 2>/dev/null || echo "unknown")
            if [[ "$perms" != "40755" && "$perms" != "40700" ]]; then
                log "WARNING" "Incorrect permissions on $file: $perms (should be 755 or 700)"
                ((permission_issues++))
            fi
        fi
    done
    
    if [[ $permission_issues -gt 0 ]]; then
        log "WARNING" "Found $permission_issues permission issues"
        return 1
    else
        log "INFO" "File permissions appear correct"
        return 0
    fi
}

# Function to check for orphaned processes
check_orphaned_processes() {
    log "INFO" "Checking for orphaned processes..."
    
    local orphaned_count=0
    
    # Check for zombie processes
    local zombie_count=$(ps aux | awk '$8 ~ /^Z/ {++count} END {print count}')
    if [[ $zombie_count -gt 0 ]]; then
        log "WARNING" "Found $zombie_count zombie processes"
        ((orphaned_count+=zombie_count))
    fi
    
    # Check for stale OpenClaw processes
    local stale_processes=$(pgrep -f "openclaw" | while read -r pid; do
        if ! ps -p "$pid" -o pid= >/dev/null 2>&1; then
            echo "$pid"
        fi
    done | wc -l)
    
    if [[ $stale_processes -gt 0 ]]; then
        log "WARNING" "Found $stale_processes stale OpenClaw processes"
        ((orphaned_count+=stale_processes))
    fi
    
    if [[ $orphaned_count -gt 0 ]]; then
        log "WARNING" "Found $orphaned_count orphaned processes"
        return 1
    else
        log "INFO" "No orphaned processes detected"
        return 0
    fi
}

# Function to rotate credentials if needed
rotate_credentials_if_needed() {
    if ! validate_credentials; then
        log "WARNING" "Credential rotation triggered by health monitor 2..."
        
        # Generate new tokens
        local new_perplexity_token="perplexity-$(date +%s)-$(openssl rand -hex 8)"
        local new_github_token="github-$(date +%s)-$(openssl rand -hex 8)"
        
        # Update credential file
        jq ".perplexity_token = \"$new_perplexity_token\" | .github_token = \"$new_github_token\"" "$CREDENTIAL_FILE" > "$CREDENTIAL_FILE.tmp" && mv "$CREDENTIAL_FILE.tmp" "$CREDENTIAL_FILE"
        
        # Update openclaw.json
        if [[ -f "$OPENCLAW_CONFIG" ]]; then
            jq --arg new_token "$new_perplexity_token" '.perplexity_token = $new_token' "$OPENCLAW_CONFIG" > "$OPENCLAW_CONFIG.tmp" && mv "$OPENCLAW_CONFIG.tmp" "$OPENCLAW_CONFIG"
        fi
        
        # Update .env file
        if [[ -f "$ENV_FILE" ]]; then
            sed -i '' "s/^PERPLEXITY_TOKEN=.*/PERPLEXITY_TOKEN=$new_perplexity_token/" "$ENV_FILE"
            sed -i '' "s/^GITHUB_TOKEN=.*/GITHUB_TOKEN=$new_github_token/" "$ENV_FILE"
        fi
        
        log "INFO" "Credentials rotated successfully"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Credentials rotated by health monitor 2" >> "$REMEDIATION_LOG"
        
        # Restart gateway to apply new credentials
        if openclaw gateway restart >/dev/null 2>&1; then
            log "INFO" "Gateway restarted after credential rotation"
        else
            log "WARNING" "Failed to restart gateway after credential rotation"
        fi
    fi
}

# Function to fix file permissions
fix_file_permissions() {
    if ! check_file_permissions; then
        log "WARNING" "Fixing file permissions..."
        
        # Fix permissions on critical files
        chmod 600 "$CREDENTIAL_FILE" 2>/dev/null || true
        chmod 600 "$ENV_FILE" 2>/dev/null || true
        chmod 600 "$OPENCLAW_CONFIG" 2>/dev/null || true
        chmod 700 "/Users/redinside/.openclaw" 2>/dev/null || true
        chmod 755 "/Users/redinside/.openclaw/workspace" 2>/dev/null || true
        
        log "INFO" "File permissions fixed"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - File permissions fixed by health monitor 2" >> "$REMEDIATION_LOG"
    fi
}

# Function to kill orphaned processes
kill_orphaned_processes() {
    if ! check_orphaned_processes; then
        log "WARNING" "Killing orphaned processes..."
        
        # Kill zombie processes (can't be killed, but we can log)
        local zombie_pids=$(ps aux | awk '$8 ~ /^Z/ {print $2}')
        for pid in $zombie_pids; do
            log "INFO" "Zombie process found: PID $pid"
        done
        
        # Kill stale OpenClaw processes
        local stale_pids=$(pgrep -f "openclaw" | while read -r pid; do
            if ! ps -p "$pid" -o pid= >/dev/null 2>&1; then
                echo "$pid"
            fi
        done)
        
        for pid in $stale_pids; do
            log "INFO" "Killing stale OpenClaw process: PID $pid"
            kill -9 "$pid" 2>/dev/null || true
        done
        
        log "INFO" "Orphaned processes handled"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Orphaned processes cleaned up by health monitor 2" >> "$REMEDIATION_LOG"
    fi
}

# Main monitoring loop
main() {
    local iteration=0
    
    log "INFO" "Health Monitor 2 started - Credential and File Integrity Check"
    log "INFO" "Configuration: Check interval: ${CHECK_INTERVAL}s"
    
    while true; do
        ((iteration++))
        log "INFO" "Starting health check iteration $iteration"
        
        local issues_found=0
        
        # Run all checks
        if ! validate_credentials; then
            ((issues_found++))
        fi
        
        if ! check_openclaw_config; then
            ((issues_found++))
        fi
        
        if ! check_env_file; then
            ((issues_found++))
        fi
        
        if ! check_file_permissions; then
            ((issues_found++))
        fi
        
        if ! check_orphaned_processes; then
            ((issues_found++))
        fi
        
        # Perform remediation if issues were found
        if [[ $issues_found -gt 0 ]]; then
            log "WARNING" "Found $issues_found issues, performing remediation..."
            
            # Rotate credentials if needed
            rotate_credentials_if_needed
            
            # Fix file permissions
            fix_file_permissions
            
            # Clean up orphaned processes
            kill_orphaned_processes
            
            log "INFO" "Remediation completed"
        else
            log "INFO" "All checks passed, no remediation needed"
        fi
        
        log "INFO" "Health check iteration $iteration completed, waiting ${CHECK_INTERVAL}s..."
        sleep $CHECK_INTERVAL
    done
}

# Run the main monitoring function
main "$@"