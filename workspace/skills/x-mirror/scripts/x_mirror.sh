#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  x_mirror.sh --url  <x_url>      # print mirrored URL
  x_mirror.sh --fetch <x_url>     # fetch mirrored content as text

If <x_url> is omitted, the script reads a URL from stdin.

Examples:
  bash x_mirror.sh --url "https://x.com/user/status/123"
  bash x_mirror.sh --fetch "https://x.com/user/status/123"
  echo "https://x.com/user/status/123" | bash x_mirror.sh --fetch
USAGE
}

read_url_arg_or_stdin() {
  local url="${1:-}"
  if [[ -z "${url}" ]]; then
    # read first non-empty line
    while IFS= read -r line; do
      line="${line//$'\r'/}"
      [[ -n "${line}" ]] || continue
      url="${line}"
      break
    done
  fi
  if [[ -z "${url}" ]]; then
    echo "ERROR: no URL provided" >&2
    usage >&2
    exit 2
  fi
  echo "${url}"
}

mirror_url() {
  local url="$1"
  url="${url/https:\/\/twitter.com/https:\/\/x.com}"
  url="${url/http:\/\/twitter.com/https:\/\/x.com}"
  url="${url/http:\/\/x.com/https:\/\/x.com}"
  echo "https://r.jina.ai/${url}"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || $# -eq 0 ]]; then
  usage
  exit 0
fi

mode="$1"; shift || true

case "$mode" in
  --url)
    u=$(read_url_arg_or_stdin "${1:-}")
    mirror_url "$u"
    ;;
  --fetch)
    u=$(read_url_arg_or_stdin "${1:-}")
    mu=$(mirror_url "$u")
    # Fetch as plain text. Keep it simple and robust.
    curl -sSL -m 20 -H 'User-Agent: Mozilla/5.0' "$mu"
    ;;
  *)
    echo "ERROR: unknown mode: $mode" >&2
    usage >&2
    exit 2
    ;;
esac
