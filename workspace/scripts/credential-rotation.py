#!/usr/bin/env python3

"""Auto-rotate credentials for Perplexity and GitHub tokens.

GOAL-006 Deliverable 1: Credential rotation with auto-rotation logic

Features:
- Detects expired/expiring tokens (401/403 errors)
- Auto-rotates from credential pool
- Updates openclaw.json with new credentials
- Logs rotation events
- Sends alerts only on rotation failure

Credential Pool:
- ~/.openclaw/secrets/perplexity-tokens.json
- ~/.openclaw/secrets/github-tokens.json

Format:
{
  "tokens": [
    {"key": "pplx-xxx", "created": "2026-03-01", "status": "active"},
    {"key": "pplx-yyy", "created": "2026-03-02", "status": "backup"}
  ]
}
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# Paths
OPENCLAW_CONFIG = Path.home() / ".openclaw/openclaw.json"
SECRETS_DIR = Path.home() / ".openclaw/secrets"
PERPLEXITY_TOKENS = SECRETS_DIR / "perplexity-tokens.json"
GITHUB_TOKENS = SECRETS_DIR / "github-tokens.json"
STATE_FILE = Path.home() / ".openclaw/workspace/tmp/credential-rotation-state.json"
LOG_FILE = Path.home() / ".openclaw/logs/credential-rotation.log"

# Rotation thresholds
TOKEN_AGE_WARNING_DAYS = 60
TOKEN_AGE_ROTATE_DAYS = 90


def log(msg: str):
    """Log to file and stdout."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    log_msg = f"[{timestamp}] {msg}"
    print(log_msg)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(log_msg + "\n")


def load_json(path: Path) -> Optional[Dict]:
    """Load JSON file, return None if missing."""
    if not path.exists():
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        log(f"ERROR: Failed to load {path}: {e}")
        return None


def save_json(path: Path, data: Dict):
    """Save JSON file with backup."""
    path.parent.mkdir(parents=True, exist_ok=True)
    
    # Backup existing file
    if path.exists():
        backup = path.with_suffix(path.suffix + ".backup")
        path.rename(backup)
    
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def check_perplexity_health() -> bool:
    """Test current Perplexity token with API call."""
    try:
        result = subprocess.run(
            ["openclaw", "web_search", "--query", "test", "--count", "1"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Check for auth errors
        if "401" in result.stderr or "403" in result.stderr or "unauthorized" in result.stderr.lower():
            log("⚠️  Perplexity token auth failure detected")
            return False
        
        if result.returncode == 0:
            log("✅ Perplexity token healthy")
            return True
        
        log(f"⚠️  Perplexity check failed: {result.stderr[:200]}")
        return False
        
    except Exception as e:
        log(f"ERROR: Perplexity health check failed: {e}")
        return False


def check_github_health() -> bool:
    """Test current GitHub token with API call."""
    config = load_json(OPENCLAW_CONFIG)
    if not config:
        return True  # No config, skip check
    
    github_token = None
    for provider in config.get("llm", {}).get("providers", []):
        if provider.get("id") == "github":
            github_token = provider.get("apiKey")
            break
    
    if not github_token:
        log("ℹ️  No GitHub token configured, skipping health check")
        return True
    
    try:
        result = subprocess.run(
            ["curl", "-s", "-H", f"Authorization: Bearer {github_token}",
             "https://api.github.com/user"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if "401" in result.stdout or "Bad credentials" in result.stdout:
            log("⚠️  GitHub token auth failure detected")
            return False
        
        log("✅ GitHub token healthy")
        return True
        
    except Exception as e:
        log(f"ERROR: GitHub health check failed: {e}")
        return False


def rotate_perplexity_token() -> bool:
    """Rotate Perplexity token from pool."""
    log("🔄 Starting Perplexity token rotation...")
    
    # Load token pool
    pool = load_json(PERPLEXITY_TOKENS)
    if not pool or not pool.get("tokens"):
        log("❌ No Perplexity token pool found")
        return False
    
    # Find next available token
    tokens = pool["tokens"]
    current_token = None
    next_token = None
    
    for token in tokens:
        if token.get("status") == "active":
            current_token = token
        elif token.get("status") == "backup" and not next_token:
            next_token = token
    
    if not next_token:
        log("❌ No backup Perplexity token available")
        return False
    
    # Update openclaw.json
    config = load_json(OPENCLAW_CONFIG)
    if not config:
        log("❌ Failed to load openclaw.json")
        return False
    
    # Find and update Perplexity provider
    updated = False
    
    # Check web_search config
    if "web_search" in config and "perplexity" in config["web_search"]:
        config["web_search"]["perplexity"]["apiKey"] = next_token["key"]
        updated = True
    
    # Also check env vars
    if "env" in config and "PERPLEXITY_API_KEY" in config["env"]:
        config["env"]["PERPLEXITY_API_KEY"] = next_token["key"]
        updated = True
    
    if not updated:
        log("❌ Perplexity provider not found in openclaw.json")
        return False
    
    # Save updated config
    save_json(OPENCLAW_CONFIG, config)
    
    # Update token pool status
    if current_token:
        current_token["status"] = "rotated"
        current_token["rotated_at"] = datetime.utcnow().isoformat() + "Z"
    next_token["status"] = "active"
    next_token["activated_at"] = datetime.utcnow().isoformat() + "Z"
    
    save_json(PERPLEXITY_TOKENS, pool)
    
    log(f"✅ Perplexity token rotated: {next_token['key'][:15]}...")
    log("⚠️  RESTART REQUIRED: Run 'openclaw stack restart' to apply new token")
    
    return True


def rotate_github_token() -> bool:
    """Rotate GitHub token from pool."""
    log("🔄 Starting GitHub token rotation...")
    
    # Load token pool
    pool = load_json(GITHUB_TOKENS)
    if not pool or not pool.get("tokens"):
        log("❌ No GitHub token pool found")
        return False
    
    # Find next available token
    tokens = pool["tokens"]
    next_token = None
    
    for token in tokens:
        if token.get("status") == "backup" and not next_token:
            next_token = token
    
    if not next_token:
        log("❌ No backup GitHub token available")
        return False
    
    # Update openclaw.json
    config = load_json(OPENCLAW_CONFIG)
    if not config:
        log("❌ Failed to load openclaw.json")
        return False
    
    # Find and update GitHub provider
    updated = False
    for provider in config.get("llm", {}).get("providers", []):
        if provider.get("id") == "github":
            provider["apiKey"] = next_token["key"]
            updated = True
            break
    
    if not updated:
        log("❌ GitHub provider not found in openclaw.json")
        return False
    
    # Save updated config
    save_json(OPENCLAW_CONFIG, config)
    
    # Update token pool status
    for token in tokens:
        if token.get("status") == "active":
            token["status"] = "rotated"
            token["rotated_at"] = datetime.utcnow().isoformat() + "Z"
    
    next_token["status"] = "active"
    next_token["activated_at"] = datetime.utcnow().isoformat() + "Z"
    
    save_json(GITHUB_TOKENS, pool)
    
    log(f"✅ GitHub token rotated: {next_token['key'][:15]}...")
    log("⚠️  RESTART REQUIRED: Run 'openclaw stack restart' to apply new token")
    
    return True


def main():
    """Main credential rotation logic."""
    log("=" * 60)
    log("Credential Rotation Check")
    log("=" * 60)
    
    # Check Perplexity health
    perplexity_healthy = check_perplexity_health()
    if not perplexity_healthy:
        if rotate_perplexity_token():
            log("✅ Perplexity token auto-rotated")
        else:
            log("❌ Perplexity token rotation FAILED - manual intervention required")
            sys.exit(1)
    
    # Check GitHub health
    github_healthy = check_github_health()
    if not github_healthy:
        if rotate_github_token():
            log("✅ GitHub token auto-rotated")
        else:
            log("❌ GitHub token rotation FAILED - manual intervention required")
            sys.exit(1)
    
    log("✅ All credentials healthy")
    print("NO_ALERT")


if __name__ == "__main__":
    main()
