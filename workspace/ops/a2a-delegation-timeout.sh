#!/bin/bash

# A2A Delegation Timeout and Retry Mechanism
# Prevents task deadlocks with 120s timeout and 2x retry

set -euo pipefail

# Configuration
TIMEOUT_SECONDS=120
MAX_RETRIES=2
CHECK_INTERVAL=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}INFO: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

# Function to check if a delegation is still active
check_delegation_status() {
    local run_id="$1"
    local log_file="$2"
    
    if grep -q "\"runId\": \"$run_id\"" "$log_file"; then
        return 0 # Found
    else
        return 1 # Not found
    fi
}

# Function to monitor and retry delegation
monitor_delegation() {
    local source="$1"
    local target="$2"
    local message="$3"
    local channel="$4"
    local max_wait=${5:-$TIMEOUT_SECONDS}
    
    local run_id
    local start_time
    local elapsed_time
    local retry_count=0
    local max_retries=$MAX_RETRIES
    
    log_info "Starting delegation: $source -> $target"
    log_info "Message: $message"
    log_info "Timeout: ${TIMEOUT_SECONDS}s, Max retries: $max_retries"
    
    while [ $retry_count -le $max_retries ]; do
        # Start the delegation
        log_info "Attempt $((retry_count + 1))/$((max_retries + 1))"
        
        # Simulate delegation (in real implementation, this would be the actual delegation call)
        start_time=$(date +%s)
        elapsed_time=0
        
        # Monitor the delegation
        while [ $elapsed_time -lt $max_wait ]; do
            # Check if delegation completed
            if check_delegation_status "$run_id" "/Users/redinside/.openclaw/workspace/logs/a2a-delegations.jsonl"; then
                log_info "Delegation completed successfully"
                return 0
            fi
            
            # Check if delegation failed
            if grep -q "\"status\": \"error\"" "/Users/redinside/.openclaw/workspace/logs/a2a-delegations.jsonl"; then
                log_error "Delegation failed"
                break
            fi
            
            # Wait before next check
            sleep $CHECK_INTERVAL
            elapsed_time=$((elapsed_time + CHECK_INTERVAL))
            
            log_info "Elapsed: ${elapsed_time}s/$max_wait"
        done
        
        # If we reach here, delegation timed out
        if [ $retry_count -lt $max_retries ]; then
            log_warning "Delegation timed out after ${elapsed_time}s. Retrying..."
            retry_count=$((retry_count + 1))
            sleep 5 # Brief pause before retry
        else
            log_error "Delegation failed after $max_retries retries"
            return 1
        fi
    done
    
    return 1
}

# Main execution
main() {
    # Example usage
    local source="ops"
    local target="infosec"
    local message="What is your current priority? Please provide a brief status update on what you're working on."
    local channel="webchat"
    
    if monitor_delegation "$source" "$target" "$message" "$channel"; then
        log_info "Delegation succeeded"
        exit 0
    else
        log_error "Delegation failed after all retries"
        exit 1
    fi
}

# Run main function
main "$@"