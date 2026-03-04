#!/usr/bin/env bash
# scrapling-fetch.sh — thin wrapper around Scrapling CLI for OpenClaw agents
#
# Usage:
#   scrapling-fetch.sh <mode> <url> [css_selector]
#
# Modes:
#   get       Fast HTTP fetch with fingerprint randomization (no JS)
#   fetch     Full Playwright browser fetch (JS-rendered pages)
#   stealthy  Playwright + Cloudflare bypass (X/Twitter, CF-protected sites)
#
# Output: Markdown content to stdout (pipe-friendly)
# Exit codes: 0 = success, 1 = usage error, 2 = fetch error

set -euo pipefail

SCRAPLING_BIN="${SCRAPLING_BIN:-/Users/redinside/.local/bin/scrapling}"

usage() {
  echo "Usage: $0 <get|fetch|stealthy> <url> [css_selector]" >&2
  exit 1
}

[ $# -lt 2 ] && usage

MODE="$1"
URL="$2"
SELECTOR="${3:-}"

TMPFILE=$(mktemp /tmp/scrapling-XXXXXX.md)
trap 'rm -f "$TMPFILE"' EXIT

case "$MODE" in
  get)
    ARGS=("extract" "get")
    [ -n "$SELECTOR" ] && ARGS+=("-s" "$SELECTOR")
    ARGS+=("$URL" "$TMPFILE")
    ;;
  fetch)
    ARGS=("extract" "fetch")
    [ -n "$SELECTOR" ] && ARGS+=("-s" "$SELECTOR")
    ARGS+=("$URL" "$TMPFILE")
    ;;
  stealthy)
    ARGS=("extract" "stealthy-fetch" "--solve-cloudflare")
    [ -n "$SELECTOR" ] && ARGS+=("-s" "$SELECTOR")
    ARGS+=("$URL" "$TMPFILE")
    ;;
  *)
    echo "Error: unknown mode '$MODE'. Use get|fetch|stealthy" >&2
    exit 1
    ;;
esac

if "$SCRAPLING_BIN" "${ARGS[@]}" >/dev/null 2>&1; then
  cat "$TMPFILE"
else
  echo "Error: scrapling failed for URL: $URL" >&2
  exit 2
fi
