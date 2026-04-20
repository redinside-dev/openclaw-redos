#!/usr/bin/env bash
set -euo pipefail

# Reddit MCP server wrapper
# Reads credentials from ~/.api-keys/* so secrets are not stored in mcporter config.

CID_FILE="$HOME/.api-keys/reddit_client_id"
CSEC_FILE="$HOME/.api-keys/reddit_client_secret"
UA_FILE="$HOME/.api-keys/reddit_user_agent"

if [[ ! -f "$CID_FILE" || ! -f "$CSEC_FILE" || ! -f "$UA_FILE" ]]; then
  echo "Missing Reddit API credentials files. Create these files (chmod 600):" >&2
  echo "- $CID_FILE" >&2
  echo "- $CSEC_FILE" >&2
  echo "- $UA_FILE" >&2
  echo "User agent example: reddit-mcp-tool:v0.2.0 (by /u/<yourusername>)" >&2
  exit 1
fi

export REDDIT_CLIENT_ID="$(cat "$CID_FILE")"
export REDDIT_CLIENT_SECRET="$(cat "$CSEC_FILE")"
export REDDIT_USER_AGENT="$(cat "$UA_FILE")"

exec /opt/homebrew/bin/uvx reddit-mcp-tool@latest
