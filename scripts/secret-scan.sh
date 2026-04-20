#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/Users/redinside/.openclaw}"

# Fast, local secret scan (heuristics). Intentionally noisy.
# Exit non-zero if a likely secret is found.

PATTERNS=(
  "xoxb-[0-9A-Za-z-]{10,}"
  "xapp-[0-9A-Za-z-]{10,}"
  "ghp_[0-9A-Za-z]{20,}"
  "sk-[0-9A-Za-z]{20,}"
  "AKIA[0-9A-Z]{16}"
  "Bearer[[:space:]]+[0-9A-Za-z._-]{10,}"
  "-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----"
)

# Directories we never want to scan (high-churn / binaries)
EXCLUDES=(
  "--glob" "!.git/**"
  "--glob" "!node_modules/**"
  "--glob" "!sandboxes/**"
  "--glob" "!workspace/**"
  "--glob" "!logs/**"
  "--glob" "!data/**"
  "--glob" "!cache/**"
  "--glob" "!media/**"
  "--glob" "!browser/**"
  "--glob" "!openclaw.json"  # primary config (contains secrets by design; handled separately)
)

found=0
for pat in "${PATTERNS[@]}"; do
  if rg -n --hidden --no-ignore-vcs "${EXCLUDES[@]}" -S "$pat" "$ROOT" >/tmp/openclaw-secret-scan.$$ 2>/dev/null; then
    echo "[SECRET-SCAN] Potential secret match for pattern: $pat"
    head -n 50 /tmp/openclaw-secret-scan.$$
    found=1
  fi
done
rm -f /tmp/openclaw-secret-scan.$$ || true

if [[ $found -eq 1 ]]; then
  echo "[SECRET-SCAN] FAIL: potential secrets detected"
  exit 2
fi

echo "[SECRET-SCAN] OK: no matches in scanned paths"
