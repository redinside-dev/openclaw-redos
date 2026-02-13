#!/usr/bin/env bash
set -euo pipefail
KEY_FILE="${HOME}/.api-keys/alphavantage_key"
if [[ ! -f "$KEY_FILE" ]]; then
  echo "Alpha Vantage key file not found: $KEY_FILE" >&2
  exit 1
fi
AV_KEY="$(cat "$KEY_FILE" | tr -d ' \n\r\t')"
if [[ -z "$AV_KEY" ]]; then
  echo "Alpha Vantage key is empty" >&2
  exit 1
fi

# Runs the local Alpha Vantage MCP server via uvx.
# NOTE: 'av-mcp' is provided by Alpha Vantage. uvx will fetch it on first run.
exec uvx av-mcp "$AV_KEY"
