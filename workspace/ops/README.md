# Self-Healing Infrastructure

This directory contains scripts and configurations for maintaining the health and reliability of the OpenClaw system.

## Components

### Credential Rotation
- **Script**: `scripts/credential-rotation.sh`
- **Cron**: `cron/credential-rotation-cron.sh`
- **Purpose**: Automatically rotates API keys for services like Perplexity, GitHub, and OpenRouter
- **Schedule**: Runs daily at 02:00 AM

### Health Monitoring
- **Script**: `scripts/health-monitor.sh`
- **Cron**: `cron/health-monitor-cron.sh`
- **Purpose**: Monitors system health (CPU, memory, disk, services) and automatically remediates issues
- **Schedule**: Runs every 15 minutes

### File Provisioning
- **Script**: `scripts/file-provisioning.sh`
- **Cron**: `cron/file-provisioning-cron.sh`
- **Purpose**: Ensures all required files and directories exist with proper permissions
- **Schedule**: Runs weekly on Sundays at 03:00 AM

## Installation

1. **Make scripts executable**:
   ```bash
   chmod +x scripts/*.sh
   chmod +x cron/*.sh
   ```

2. **Add cron jobs** (run `crontab -e` and add):
   ```cron
   # Credential rotation - daily at 2 AM
   0 2 * * * /Users/redinside/.openclaw/workspace/ops/cron/credential-rotation-cron.sh
   
   # Health monitoring - every 15 minutes
   */15 * * * * /Users/redinside/.openclaw/workspace/ops/cron/health-monitor-cron.sh
   
   # File provisioning - weekly on Sunday at 3 AM
   0 3 * * 0 /Users/redinside/.openclaw/workspace/ops/cron/file-provisioning-cron.sh
   ```

## Logs

All scripts log to the `logs/` directory:
- `credential-rotation-YYYYMMDD.log`
- `health-monitor-YYYYMMDD.log`
- `file-provisioning-YYYYMMDD.log`

## Alerts

Health monitor generates alerts when issues are detected. Alerts are stored in `ops/alerts/` directory with timestamps.

## Manual Execution

You can run any script manually for testing:
```bash
# Test credential rotation
./scripts/credential-rotation.sh

# Test health monitoring
./scripts/health-monitor.sh

# Test file provisioning
./scripts/file-provisioning.sh
```