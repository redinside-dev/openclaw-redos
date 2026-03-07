#!/usr/bin/env bash
set -euo pipefail

# CI-friendly secret scan wrapper.
# - Runs forbid-sensitive-files against tracked files
# - Runs gitleaks with repo config

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[ci_secret_scan] Checking forbidden files..."
python3 scripts/secret_scan/forbid_sensitive_files.py $(git ls-files)

echo "[ci_secret_scan] Running gitleaks..."
gitleaks detect --config .gitleaks.toml --no-banner
