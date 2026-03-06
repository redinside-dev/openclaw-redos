#!/bin/bash
# Health Monitor 1: Gateway Service Status and Response Time
# Checks if gateway service is running and responds within acceptable time

set -euo pipefail

# Configuration
GATEWAY_ENDPOINT="http://localhost:3000/api/health"
MAX_RESPONSE_TIME_MS=2000
CHECK_INTERVAL=300
LOG_FILE="/Users/redinside/.openclaw/workspace/logs/health-monitor-1.log"
REMEDIATION_LOG="/Users/redinside/.openclaw/workspace/logs/remediation-actions.log"

# Function to log messages
log() {
    local level="$1"
    local message="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $message" | tee -a "$LOG_FILE"
}

# Function to check gateway service status
check_gateway_status() {
    local status_code
    local response_time
    
    log "INFO" "Checking gateway service status..."
    
    # Check if gateway process is running
    if pgrep -f "openclaw gateway" >/dev/null; then
        log "INFO" "Gateway process is running"
        
        # Check HTTP endpoint response
        local start_time=$(date +%s%3N)
        if curl -s --max-time 10 "$GATEWAY_ENDPOINT" >/dev/null; then
            local end_time=$(date +%s%3N)
            response_time=$((end_time - start_time))
            
            log "INFO" "Gateway endpoint responded in ${response_time}ms"
            
            if [[ $response_time -gt $MAX_RESPONSE_TIME_MS ]]; then
                log "WARNING" "Gateway response time ${response_time}ms exceeds threshold ${MAX_RESPONSE_TIME_MS}ms"
                return 1
            else
                log "INFO" "Gateway response time within acceptable limits"
                return 0
            fi
        else
            log "ERROR" "Gateway endpoint did not respond"
            return 1
        fi
    else
        log "ERROR" "Gateway process is not running"
        return 1
    fi
}

# Function to restart gateway service
restart_gateway() {
    log "INFO" "Attempting to restart gateway service..."
    
    # Try graceful restart first
    if openclaw gateway restart >/dev/null 2>&1; then
        log "INFO" "Gateway restarted successfully"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Gateway restarted by health monitor 1" >> "$REMEDIATION_LOG"
        return 0
    else
        log "ERROR" "Failed to restart gateway using openclaw CLI"
        
        # Try direct process management
        if pgrep -f "openclaw gateway" >/dev/null; then
            pkill -f "openclaw gateway"
            sleep 2
        fi
        
        if nohup openclaw gateway >/dev/null 2>&1 & then
            log "INFO" "Gateway started successfully via direct process management"
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Gateway started by health monitor 1 (direct process)" >> "$REMEDIATION_LOG"
            return 0
        else
            log "ERROR" "Failed to start gateway via direct process management"
            return 1
        fi
    fi
}

# Function to clear gateway cache
clear_gateway_cache() {
    log "INFO" "Clearing gateway cache..."
    
    local cache_dir="/Users/redinside/.openclaw/cache"
    if [[ -d "$cache_dir" ]]; then
        rm -rf "$cache_dir"/*
        log "INFO" "Gateway cache cleared"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Gateway cache cleared by health monitor 1" >> "$REMEDIATION_LOG"
        return 0
    else
        log "INFO" "No cache directory found, nothing to clear"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local disk_usage
    local threshold=85
    
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $disk_usage -gt $threshold ]]; then
        log "WARNING" "Disk usage at ${disk_usage}% exceeds threshold ${threshold}%"
        return 1
    else
        log "INFO" "Disk usage at ${disk_usage}% within acceptable limits"
        return 0
    fi
}

# Main monitoring loop
main() {
    local iteration=0
    
    log "INFO" "Health Monitor 1 started - Gateway Service Status"
    log "INFO" "Configuration: Max response time: ${MAX_RESPONSE_TIME_MS}ms, Check interval: ${CHECK_INTERVAL}s"
    
    while true; do
        ((iteration++))
        log "INFO" "Starting health check iteration $iteration"
        
        # Check gateway status
        if check_gateway_status; then
            log "INFO" "Gateway health check passed"
        else
            log "WARNING" "Gateway health check failed, attempting remediation..."
            
            # Try cache clearing first
            if clear_gateway_cache; then
                log "INFO" "Gateway cache cleared, waiting for recovery..."
                sleep 30
                
                if check_gateway_status; then
                    log "INFO" "Gateway recovered after cache clearing"
                else
                    log "WARNING" "Gateway still unhealthy, attempting restart..."
                    if restart_gateway; then
                        log "INFO" "Gateway restarted successfully"
                        sleep 60  # Wait for service to fully start
                        
                        if check_gateway_status; then
                            log "INFO" "Gateway recovered after restart"
                        else
                            log "ERROR" "Gateway still unhealthy after restart"
                        fi
                    else
                        log "ERROR" "Failed to restart gateway"
                    fi
                fi
            else
                log "WARNING" "Failed to clear gateway cache, attempting restart..."
                if restart_gateway; then
                    log "INFO" "Gateway restarted successfully"
                    sleep 60
                    
                    if check_gateway_status; then
                        log "INFO" "Gateway recovered after restart"
                    else
                        log "ERROR" "Gateway still unhealthy after restart"
                    fi
                else
                    log "ERROR" "Failed to restart gateway"
                fi
            fi
        fi
        
        # Check disk space
        if check_disk_space; then
            log "INFO" "Disk space check passed"
        else
            log "WARNING" "Low disk space detected, attempting cleanup..."
            
            # Simple cleanup: remove old logs
            local old_logs="/Users/redinside/.openclaw/workspace/logs/old"
            if [[ -d "$old_logs" ]]; then
                find "$old_logs" -type f -mtime +7 -delete 2>/dev/null || true
                log "INFO" "Cleaned up old log files older than 7 days"
                echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleaned old logs (>7 days) by health monitor 1" >> "$REMEDIATION_LOG"
            fi
        fi
        
        log "INFO" "Health check iteration $iteration completed, waiting ${CHECK_INTERVAL}s..."
        sleep $CHECK_INTERVAL
    done
}

# Run the main monitoring function
main "$@"