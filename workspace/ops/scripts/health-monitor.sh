#!/bin/bash

# Health Monitor Script for OpenClaw
# Monitors system health and automatically remediates issues

set -euo pipefail

# Configuration
CONFIG_DIR="$HOME/.openclaw/workspace/config"
LOG_FILE="$HOME/.openclaw/workspace/logs/health-monitor.log"
ALERT_THRESHOLD=80  # Percentage for resource thresholds

# Create directories if they don't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Alert function
alert() {
    local message="$1"
    log "ALERT: $message"
    
    # Send alert to main agent (placeholder - in production, this would use sessions_send)
    echo "ALERT: $message" > "$HOME/.openclaw/workspace/ops/alerts/$(date '+%Y%m%d_%H%M%S').txt"
}

# Check CPU usage
check_cpu() {
    local cpu_usage=$(top -l 1 -n 0 | awk '/CPU usage/ {print $3}' | sed 's/%//')
    
    if (( $(echo "$cpu_usage > $ALERT_THRESHOLD" | bc -l) )); then
        log "High CPU usage detected: ${cpu_usage}%"
        alert "High CPU usage: ${cpu_usage}%"
        return 1
    else
        log "CPU usage normal: ${cpu_usage}%"
        return 0
    fi
}

# Check memory usage
check_memory() {
    local memory_info=$(vm_stat | awk '/Pages active/ {active=$3} /Pages inactive/ {inactive=$3} END {print (active+inactive)*4096/1024/1024}')
    local total_memory=$(sysctl -n hw.memsize | awk '{print $0/1024/1024}')
    local memory_usage=$(echo "scale=2; ($memory_info/$total_memory)*100" | bc)
    
    if (( $(echo "$memory_usage > $ALERT_THRESHOLD" | bc -l) )); then
        log "High memory usage detected: ${memory_usage}%"
        alert "High memory usage: ${memory_usage}%"
        return 1
    else
        log "Memory usage normal: ${memory_usage}%"
        return 0
    fi
}

# Check disk space
check_disk() {
    local disk_usage=$(df -H / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if (( $disk_usage > $ALERT_THRESHOLD )); then
        log "Low disk space detected: ${disk_usage}%"
        alert "Low disk space: ${disk_usage}%"
        return 1
    else
        log "Disk space normal: ${disk_usage}%"
        return 0
    fi
}

# Check OpenClaw services
check_services() {
    local services=("gateway" "dashboard" "n8n" "nine_router" "ollama" "cloudflared")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if ! pgrep -f "$service" >/dev/null 2>&1; then
            log "Service $service is not running"
            failed_services+=("$service")
        else
            log "Service $service is running"
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        alert "Services not running: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Check OpenClaw configuration
check_configuration() {
    local config_file="$CONFIG_DIR/openclaw.json"
    
    if [[ ! -f "$config_file" ]]; then
        log "OpenClaw config file missing: $config_file"
        alert "OpenClaw config file missing: $config_file"
        return 1
    fi
    
    # Check for placeholder tokens
    if grep -q "PLACEHOLDER_TOKEN" "$config_file"; then
        log "Placeholder tokens found in config - needs credential rotation"
        alert "Placeholder tokens found in config - needs credential rotation"
        return 1
    fi
    
    log "OpenClaw configuration is valid"
    return 0
}

# Automatic remediation functions
remediate_service() {
    local service="$1"
    log "Attempting to restart $service..."
    
    case "$service" in
        "gateway")
            exec /opt/homebrew/bin/openclaw gateway restart
            ;;
        "n8n")
            exec /opt/homebrew/bin/n8n restart
            ;;
        "ollama")
            exec /opt/homebrew/bin/ollama serve &
            ;;
        *)
            log "No automatic restart for $service"
            return 1
            ;;
    esac
    
    sleep 5
    if pgrep -f "$service" >/dev/null 2>&1; then
        log "Service $service restarted successfully"
        return 0
    else
        log "Failed to restart $service"
        return 1
    fi
}

# Main health check
main() {
    log "Starting health check..."
    
    local failures=0
    
    # Run all checks
    check_cpu || ((failures++))
    check_memory || ((failures++))
    check_disk || ((failures++))
    check_services || ((failures++))
    check_configuration || ((failures++))
    
    # Automatic remediation for services
    if ! check_services; then
        local failed_services=()
        local services=("gateway" "n8n" "ollama" "nine_router" "dashboard" "cloudflared")
        
        for service in "${services[@]}"; do
            if ! pgrep -f "$service" >/dev/null 2>&1; then
                if remediate_service "$service"; then
                    log "Successfully remediated $service"
                else
                    log "Failed to remediate $service"
                    ((failures++))
                fi
            fi
        done
    fi
    
    # Check if any failures occurred
    if [[ $failures -gt 0 ]]; then
        log "Health check completed with $failures failures"
        return 1
    else
        log "Health check completed successfully"
        return 0
    fi
}

# Execute main function
main "$@"