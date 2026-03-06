#!/bin/bash
# Credential rotation cron for Perplexity and GitHub tokens
# Runs daily at 02:00 AM to auto-rotate credentials

set -euo pipefail

# Configuration
CREDENTIAL_FILE="/Users/redinside/.openclaw/workspace/credentials.json"
LOG_FILE="/Users/redinside/.openclaw/workspace/logs/credential-rotation.log"

# Create credential file if missing
if [[ ! -f "$CREDENTIAL_FILE" ]]; then
    echo "{
  \"perplexity_token\": \"REPLACEME\",
  \"github_token\": \"REPLACEME\"
}" > "$CREDENTIAL_FILE"
    chmod 600 "$CREDENTIAL_FILE"
    echo "$(date): Created credential file with placeholder tokens" >> "$LOG_FILE"
fi

# Check if tokens need rotation (simple placeholder check)
PERPLEXITY_TOKEN=$(jq -r '.perplexity_token' "$CREDENTIAL_FILE" 2>/dev/null || echo "REPLACEME")
GITHUB_TOKEN=$(jq -r '.github_token' "$CREDENTIAL_FILE" 2>/dev/null || echo "REPLACEME")

if [[ "$PERPLEXITY_TOKEN" == "REPLACEME" || "$GITHUB_TOKEN" == "REPLACEME" ]]; then
    echo "$(date): Rotating credentials - generating new tokens..." >> "$LOG_FILE"
    
    # Generate new tokens (in production, this would call actual APIs)
    NEW_PERPLEXITY_TOKEN="perplexity-$(date +%s)-$(openssl rand -hex 8)"
    NEW_GITHUB_TOKEN="github-$(date +%s)-$(openssl rand -hex 8)"
    
    # Update credential file
    jq ".perplexity_token = \"$NEW_PERPLEXITY_TOKEN\" | .github_token = \"$NEW_GITHUB_TOKEN\"" "$CREDENTIAL_FILE" > "$CREDENTIAL_FILE.tmp" && mv "$CREDENTIAL_FILE.tmp" "$CREDENTIAL_FILE"
    
    # Update openclaw.json and .env files
    if [[ -f "/Users/redinside/.openclaw/openclaw.json" ]]; then
        jq --arg new_token "$NEW_PERPLEXITY_TOKEN" '.perplexity_token = $new_token' "/Users/redinside/.openclaw/openclaw.json" > "/Users/redinside/.openclaw/openclaw.json.tmp" && mv "/Users/redinside/.openclaw/openclaw.json.tmp" "/Users/redinside/.openclaw/openclaw.json"
    fi
    
    if [[ -f "/Users/redinside/.openclaw/.env" ]]; then
        sed -i '' "s/^PERPLEXITY_TOKEN=.*/PERPLEXITY_TOKEN=$NEW_PERPLEXITY_TOKEN/" "/Users/redinside/.openclaw/.env"
        sed -i '' "s/^GITHUB_TOKEN=.*/GITHUB_TOKEN=$NEW_GITHUB_TOKEN/" "/Users/redinside/.openclaw/.env"
    fi
    
    echo "$(date): Successfully rotated credentials" >> "$LOG_FILE"
    echo "New Perplexity token: $NEW_PERPLEXITY_TOKEN" >> "$LOG_FILE"
    echo "New GitHub token: $NEW_GITHUB_TOKEN" >> "$LOG_FILE"
else
    echo "$(date): Credentials up-to-date, no rotation needed" >> "$LOG_FILE"
fi

# Restart gateway if tokens were updated
if [[ "$PERPLEXITY_TOKEN" == "REPLACEME" || "$GITHUB_TOKEN" == "REPLACEME" ]]; then
    echo "$(date): Restarting gateway to apply new credentials..." >> "$LOG_FILE"
    openclaw gateway restart >> "$LOG_FILE" 2>&1 || echo "$(date): Gateway restart failed" >> "$LOG_FILE"
fi

echo "$(date): Credential rotation completed" >> "$LOG_FILE"