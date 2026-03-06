#!/bin/bash
# Cron Setup Script for OpenClaw Self-Healing Infrastructure
# Sets up cron jobs for credential rotation, file provisioning, and health monitoring

set -e

# Configuration
SCRIPT_DIR="/Users/redinside/.openclaw/workspace-ops"
LOG_DIR="/Users/redinside/.openclaw/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if running as root (for cron setup)
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
   exit 1
fi

# Check if required scripts exist
check_scripts() {
    local missing=false
    
    for script in credential-rotation.py file-provisioning.py health-monitor.py gateway-restart.sh disk-cleanup.py memory-cleanup.py; do
        if [[ ! -f "$SCRIPT_DIR/$script" ]]; then
            error "Missing script: $script"
            missing=true
        elif [[ ! -x "$SCRIPT_DIR/$script" ]] && [[ "$script" != *.py ]]; then
            error "Script not executable: $script"
            missing=true
        fi
    done
    
    if [[ "$missing" == true ]]; then
        error "Please ensure all required scripts are present and executable"
        exit 1
    fi
}

# Create log directory if it doesn't exist
create_log_dir() {
    if [[ ! -d "$LOG_DIR" ]]; then
        log "Creating log directory: $LOG_DIR"
        mkdir -p "$LOG_DIR"
    fi
}

# Set up cron jobs
setup_cron_jobs() {
    log "Setting up cron jobs..."
    
    # Create a temporary file for the new crontab
    local temp_cron=$(mktemp)
    
    # Get current crontab
    crontab -l 2>/dev/null | grep -v "# OpenClaw Self-Healing" > "$temp_cron"
    
    # Add OpenClaw self-healing cron jobs
    echo "" >> "$temp_cron"
    echo "# OpenClaw Self-Healing Infrastructure (Auto-generated)" >> "$temp_cron"
    echo "# Credential rotation - every 6 hours" >> "$temp_cron"
    echo "0 */6 * * * cd $SCRIPT_DIR && /usr/bin/python3 credential-rotation.py >> $LOG_DIR/cron-credential-rotation.log 2>&1" >> "$temp_cron"
    echo "" >> "$temp_cron"
    echo "# File provisioning - every 12 hours" >> "$temp_cron"
    echo "0 */12 * * * cd $SCRIPT_DIR && /usr/bin/python3 file-provisioning.py >> $LOG_DIR/cron-file-provisioning.log 2>&1" >> "$temp_cron"
    echo "" >> "$temp_cron"
    echo "# Health monitoring - every 5 minutes" >> "$temp_cron"
    echo "*/5 * * * * cd $SCRIPT_DIR && /usr/bin/python3 health-monitor.py >> $LOG_DIR/cron-health-monitor.log 2>&1" >> "$temp_cron"
    echo "" >> "$temp_cron"
    echo "# Disk cleanup - every hour" >> "$temp_cron"
    echo "0 * * * * cd $SCRIPT_DIR && /usr/bin/python3 disk-cleanup.py >> $LOG_DIR/cron-disk-cleanup.log 2>&1" >> "$temp_cron"
    echo "" >> "$temp_cron"
    echo "# Memory cleanup - every 30 minutes" >> "$temp_cron"
    echo "*/30 * * * * cd $SCRIPT_DIR && /usr/bin/python3 memory-cleanup.py >> $LOG_DIR/cron-memory-cleanup.log 2>&1" >> "$temp_cron"
    
    # Install new crontab
    crontab "$temp_cron"
    rm "$temp_cron"
    
    log "Cron jobs set up successfully"
}

# Verify cron jobs are running
verify_cron() {
    log "Verifying cron jobs..."
    
    # Check if cron daemon is running
    if pgrep cron > /dev/null; then
        log "Cron daemon is running"
    else
        error "Cron daemon is not running"
        return 1
    fi
    
    # Check if our cron jobs are in the crontab
    if crontab -l 2>/dev/null | grep -q "OpenClaw Self-Healing"; then
        log "OpenClaw cron jobs are configured"
    else
        error "OpenClaw cron jobs not found in crontab"
        return 1
    fi
    
    # Test cron by running health monitor once
    log "Testing cron job by running health monitor..."
    cd "$SCRIPT_DIR" && /usr/bin/python3 health-monitor.py
    
    if [[ $? -eq 0 ]]; then
        log "Health monitor test completed successfully"
    else
        error "Health monitor test failed"
        return 1
    fi
    
    log "Cron verification completed"
}

# Main execution
main() {
    log "Starting OpenClaw Self-Healing Infrastructure setup..."
    
    # Check required scripts
    check_scripts
    
    # Create log directory
    create_log_dir
    
    # Set up cron jobs
    setup_cron_jobs
    
    # Verify setup
    if verify_cron; then
        log "OpenClaw Self-Healing Infrastructure setup completed successfully!"
        echo ""
        echo -e "${GREEN}Setup Summary:${NC}"
        echo "  ✓ Cron jobs configured"
        echo "  ✓ Log directory created"
        echo "  ✓ Scripts verified"
        echo ""
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "1. Monitor logs in $LOG_DIR/"
        echo "2. Check cron jobs with: crontab -l"
        echo "3. Review system health in $LOG_DIR/health.jsonl"
        echo ""
        echo -e "${GREEN}System is now self-healing!${NC}"
    else
        error "Setup failed - please check the error messages above"
        exit 1
    fi
}

# Run main function
main "$@"