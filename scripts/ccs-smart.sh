#!/usr/bin/env bash
# ccs-smart.sh — Single coding agent (Claude Code) with subscription-aware backend switching
#
# There is ONE coding agent: claude (Claude Code CLI).
# This script only changes WHICH subscription backend pays for it:
#
#   1. claude-direct  — Anthropic subscription  (ANTHROPIC_BASE_URL unset)
#   2. cursor         — Cursor Pro subscription  (ANTHROPIC_BASE_URL=http://localhost:20129)
#
# Auto-selects highest-priority available backend. Falls back gracefully.
#
# Usage:
#   bash scripts/ccs-smart.sh -p "build me a REST API"
#   bash scripts/ccs-smart.sh --provider cursor -p "refactor auth.ts"
#   bash scripts/ccs-smart.sh --dry-run -p "anything"

set -euo pipefail

QUOTA_FILE="${OPENCLAW_HOME:-$HOME/.openclaw}/workspace/tmp/provider-quota.json"
QUOTA_STALE_SECONDS=3600
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.local/bin/claude}"
CURSOR_DAEMON_PORT=20129

PROMPT=""
PROJECT=""
FORCE_PROVIDER=""
DRY_RUN=false

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--prompt)    PROMPT="$2";         shift 2 ;;
    --project)      PROJECT="$2";        shift 2 ;;
    --provider)     FORCE_PROVIDER="$2"; shift 2 ;;
    --dry-run)      DRY_RUN=true;        shift ;;
    *)              PROMPT="$1";         shift ;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  echo "Usage: $0 -p <prompt> [--project <id>] [--provider claude-direct|cursor] [--dry-run]"
  exit 1
fi

# ------- Quota helpers -------

is_quota_fresh() {
  [[ -f "$QUOTA_FILE" ]] || return 1
  local updated age
  updated=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(d.get('updated',''))" 2>/dev/null || echo "")
  [[ -z "$updated" ]] && return 1
  age=$(python3 -c "
from datetime import datetime, timezone
try:
    ts = datetime.fromisoformat('$updated'.replace('Z','+00:00'))
    print(int((datetime.now(timezone.utc) - ts).total_seconds()))
except: print(9999)
" 2>/dev/null || echo "9999")
  [[ "$age" -lt "$QUOTA_STALE_SECONDS" ]]
}

provider_available() {
  local provider="$1"
  is_quota_fresh || return 0  # fail-open if stale
  python3 -c "
import json, sys
try:
    d = json.load(open('$QUOTA_FILE'))
    p = d.get('$provider', {})
    avail = p.get('available', True) if isinstance(p, dict) else bool(p)
    sys.exit(0 if avail else 1)
except: sys.exit(0)
" 2>/dev/null
}

cursor_daemon_running() {
  curl -sf "http://localhost:${CURSOR_DAEMON_PORT}/v1/models" > /dev/null 2>&1
}

# ------- Provider selection -------

select_provider() {
  if [[ -n "$FORCE_PROVIDER" ]]; then
    echo "$FORCE_PROVIDER"; return
  fi
  # Tier 1: Anthropic direct
  if provider_available "claude-code"; then
    echo "claude-direct"; return
  fi
  # Tier 2: Cursor Pro (if daemon is running)
  if cursor_daemon_running && provider_available "cursor"; then
    echo "cursor"; return
  fi
  # Fallback: try direct anyway
  echo "claude-direct"
}

# ------- Invocation — always claude, only the base URL changes -------

invoke_provider() {
  local provider="$1" prompt="$2"
  case "$provider" in
    claude-direct)
      echo "[ccs-smart] Backend: Anthropic (claude-direct)" >&2
      env -u CLAUDECODE -u ANTHROPIC_BASE_URL \
        "$CLAUDE_BIN" -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
    cursor)
      echo "[ccs-smart] Backend: Cursor Pro (port ${CURSOR_DAEMON_PORT})" >&2
      env -u CLAUDECODE \
        ANTHROPIC_BASE_URL="http://localhost:${CURSOR_DAEMON_PORT}" \
        ANTHROPIC_API_KEY="cursor-local" \
        "$CLAUDE_BIN" -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
    *)
      echo "[ccs-smart] Unknown provider '$provider' — falling back to claude-direct" >&2
      env -u CLAUDECODE -u ANTHROPIC_BASE_URL \
        "$CLAUDE_BIN" -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
  esac
}

# ------- Main -------

PROVIDER=$(select_provider)
echo "[ccs-smart] Selected backend: $PROVIDER" >&2

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[ccs-smart] Dry run — would invoke: $PROVIDER"
  # Show daemon status
  if cursor_daemon_running; then
    echo "[ccs-smart] Cursor daemon: running (port ${CURSOR_DAEMON_PORT})"
  else
    echo "[ccs-smart] Cursor daemon: not running"
  fi
  exit 0
fi

invoke_provider "$PROVIDER" "$PROMPT"
