#!/usr/bin/env bash

# Auto-provision missing files/paths to fix INFOSEC blockers
# GOAL-006 Deliverable 2: File provisioning script

set -euo pipefail

LOG_FILE="$HOME/.openclaw/logs/file-provisioning.log"
STATE_FILE="$HOME/.openclaw/workspace/tmp/file-provisioning-state.json"

log() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "[$timestamp] $*" | tee -a "$LOG_FILE"
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$STATE_FILE")"

log "=========================================="
log "File Provisioning Check"
log "=========================================="

# Track what was provisioned
PROVISIONED=()

# Critical paths that must exist
CRITICAL_PATHS=(
    "$HOME/.openclaw/secrets"
    "$HOME/.openclaw/workspace/tmp"
    "$HOME/.openclaw/workspace/scripts"
    "$HOME/.openclaw/workspace/docs"
    "$HOME/.openclaw/logs"
    "$HOME/.openclaw/cron/runs"
    "$HOME/.openclaw/workspace/approvals/pending"
    "$HOME/.openclaw/workspace/approvals/approved"
    "$HOME/.openclaw/workspace/approvals/rejected"
)

# Provision critical files with default content
provision_file() {
    local file="$1"
    local content="$2"
    
    if [[ ! -f "$file" ]]; then
        log "📄 Creating missing file: $file"
        echo "$content" > "$file"
        chmod 600 "$file"  # Secure permissions for secrets
        PROVISIONED+=("file:$file")
    fi
}

# Provision directories
for path in "${CRITICAL_PATHS[@]}"; do
    if [[ ! -d "$path" ]]; then
        log "📁 Creating missing directory: $path"
        mkdir -p "$path"
        PROVISIONED+=("dir:$path")
    fi
done

# Provision critical files
provision_file "$HOME/.openclaw/secrets/perplexity-tokens.json" '{
  "tokens": [
    {
      "key": "PLACEHOLDER_TOKEN_1",
      "created": "2026-03-03",
      "status": "active",
      "note": "Replace with actual Perplexity API token"
    },
    {
      "key": "PLACEHOLDER_TOKEN_2",
      "created": "2026-03-03",
      "status": "backup",
      "note": "Replace with backup Perplexity API token"
    }
  ]
}'

provision_file "$HOME/.openclaw/secrets/github-tokens.json" '{
  "tokens": [
    {
      "key": "PLACEHOLDER_GITHUB_TOKEN_1",
      "created": "2026-03-03",
      "status": "active",
      "note": "Replace with actual GitHub PAT"
    },
    {
      "key": "PLACEHOLDER_GITHUB_TOKEN_2",
      "created": "2026-03-03",
      "status": "backup",
      "note": "Replace with backup GitHub PAT"
    }
  ]
}'

provision_file "$HOME/.openclaw/workspace/tmp/credential-rotation-state.json" '{
  "last_check": null,
  "last_rotation": null,
  "perplexity_status": "unknown",
  "github_status": "unknown"
}'

provision_file "$HOME/.openclaw/workspace/tmp/file-provisioning-state.json" '{
  "last_run": null,
  "provisioned_count": 0
}'

# Check for common INFOSEC blockers from error logs
if [[ -f "$HOME/.openclaw/logs/gateway.err.log" ]]; then
    # Check for "path escapes workspace root" errors
    if grep -q "path escapes workspace root" "$HOME/.openclaw/logs/gateway.err.log" 2>/dev/null; then
        log "⚠️  Detected 'path escapes workspace root' errors in gateway.err.log"
        log "ℹ️  This is a known issue (LEARNING-20260228-006) - no auto-fix available"
    fi
    
    # Check for "No credentials for provider" errors
    if grep -q "No credentials for provider: openai" "$HOME/.openclaw/logs/gateway.err.log" 2>/dev/null; then
        log "⚠️  Detected OpenAI credential errors - checking openclaw.json"
        
        # Verify OpenAI provider exists in config
        if [[ -f "$HOME/Library/Application Support/openclaw/openclaw.json" ]]; then
            if ! grep -q '"id": "openai"' "$HOME/Library/Application Support/openclaw/openclaw.json"; then
                log "❌ OpenAI provider missing from openclaw.json - manual configuration required"
            fi
        fi
    fi
fi

# Update state file
cat > "$STATE_FILE" <<EOF
{
  "last_run": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "provisioned_count": ${#PROVISIONED[@]},
  "provisioned_items": $(printf '%s\n' "${PROVISIONED[@]}" | jq -R . | jq -s .)
}
EOF

# Summary
if [[ ${#PROVISIONED[@]} -eq 0 ]]; then
    log "✅ All critical paths and files exist"
    echo "NO_ALERT"
else
    log "✅ Provisioned ${#PROVISIONED[@]} missing items:"
    for item in "${PROVISIONED[@]}"; do
        log "  - $item"
    done
    log "⚠️  Review provisioned files and replace placeholders with actual credentials"
fi

log "=========================================="
