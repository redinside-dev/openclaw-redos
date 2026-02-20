#!/usr/bin/env bash
# ccs-smart.sh — Quota-aware backend selector for Claude Code
#
# Claude Code is always the coding agent. This script selects which
# subscription backend (Anthropic, Cursor, Gemini, Codex, iFlow) Claude Code
# will use, based on live quota data from provider-quota.json.
#
# Usage:
#   bash scripts/ccs-smart.sh -p "build me a REST API"
#   bash scripts/ccs-smart.sh -p "refactor auth.ts" --project myproject
#   bash scripts/ccs-smart.sh --provider cursor -p "..."  # force a specific backend

set -euo pipefail

QUOTA_FILE="${OPENCLAW_HOME:-$HOME/.openclaw}/workspace/tmp/provider-quota.json"
QUOTA_STALE_SECONDS=3600  # 1 hour
PROMPT=""
PROJECT=""
FORCE_PROVIDER=""
DRY_RUN=false

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--prompt)    PROMPT="$2";    shift 2 ;;
    --project)      PROJECT="$2";   shift 2 ;;
    --provider)     FORCE_PROVIDER="$2"; shift 2 ;;
    --dry-run)      DRY_RUN=true;   shift ;;
    *)              PROMPT="$1";    shift ;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  echo "Usage: $0 -p <prompt> [--project <id>] [--provider <name>] [--dry-run]"
  exit 1
fi

# ------- Quota helpers -------

is_quota_fresh() {
  if [[ ! -f "$QUOTA_FILE" ]]; then return 1; fi
  local updated
  updated=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(d.get('updated',''))" 2>/dev/null || echo "")
  if [[ -z "$updated" ]]; then return 1; fi
  local age
  age=$(python3 -c "
from datetime import datetime, timezone
import sys
try:
    ts = datetime.fromisoformat('$updated'.replace('Z','+00:00'))
    now = datetime.now(timezone.utc)
    print(int((now - ts).total_seconds()))
except:
    print(9999)
")
  [[ "$age" -lt "$QUOTA_STALE_SECONDS" ]]
}

provider_available() {
  local provider="$1"
  if ! is_quota_fresh; then return 0; fi  # fail-open if stale
  python3 -c "
import json, sys
try:
    d = json.load(open('$QUOTA_FILE'))
    p = d.get('$provider', {})
    avail = p.get('available', True) if isinstance(p, dict) else bool(p)
    sys.exit(0 if avail else 1)
except:
    sys.exit(0)  # fail-open
"
}

nine_router_running() {
  if ! is_quota_fresh; then
    curl -sf http://localhost:20128/health > /dev/null 2>&1
    return $?
  fi
  python3 -c "
import json, sys
d = json.load(open('$QUOTA_FILE'))
sys.exit(0 if d.get('9router_running', False) else 1)
" 2>/dev/null
}

# ------- Provider selection -------

select_provider() {
  if [[ -n "$FORCE_PROVIDER" ]]; then
    echo "$FORCE_PROVIDER"
    return
  fi

  # Tier 5a: Anthropic Claude Code (direct)
  if provider_available "claude-code"; then
    echo "claude-direct"
    return
  fi

  # Tier 5b: Cursor Pro backend via CCS
  if provider_available "cursor"; then
    echo "cursor"
    return
  fi

  # Tier 5c–5e: 9Router (Gemini → Codex → iFlow/Qwen)
  if nine_router_running; then
    # 9Router auto-selects the best available provider internally
    echo "9router"
    return
  fi

  # Last resort: try native claude anyway (may hit rate limit)
  echo "claude-direct"
}

# ------- Invocation -------

invoke_provider() {
  local provider="$1"
  local prompt="$2"

  case "$provider" in
    claude-direct)
      echo "[ccs-smart] Backend: Anthropic Claude Code (direct)" >&2
      claude -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
    cursor)
      echo "[ccs-smart] Backend: Cursor Pro (via CCS)" >&2
      ccs cursor -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
    9router)
      echo "[ccs-smart] Backend: 9Router (auto-selects Gemini/Codex/iFlow)" >&2
      ccs 9router -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
    gemini)
      echo "[ccs-smart] Backend: Gemini OAuth (via 9Router)" >&2
      ccs 9router --provider gemini -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
    codex)
      echo "[ccs-smart] Backend: Codex / ChatGPT Plus (via 9Router)" >&2
      ccs 9router --provider codex -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
    iflow|qwen)
      echo "[ccs-smart] Backend: $provider (via 9Router)" >&2
      ccs 9router --provider "$provider" -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
    *)
      echo "[ccs-smart] Unknown provider: $provider — falling back to claude-direct" >&2
      claude -p "$prompt" ${PROJECT:+--project "$PROJECT"}
      ;;
  esac
}

# ------- Main -------

PROVIDER=$(select_provider)
echo "[ccs-smart] Selected backend: $PROVIDER" >&2

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[ccs-smart] Dry run — would invoke provider: $PROVIDER"
  exit 0
fi

invoke_provider "$PROVIDER" "$PROMPT"
