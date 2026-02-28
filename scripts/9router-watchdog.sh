#!/usr/bin/env bash
# 9router-watchdog.sh
#
# Reads ~/.9router/db.json directly (no API call, no LLM).
# Outputs a Telegram-ready alert string if action is needed; silent on success.
#
# Checks:
#   1. Service reachability (port 20128)
#   2. Expired connections  → disables them in db.json + alerts
#   3. Connections expiring within WARN_HOURS → alerts with countdown
#   4. Auth errors (errorCode 401/403) on high-priority (< 90) connections
#   5. Auto-normalizes ugly OAuth account names (google-oauth2|user_...)
#
# Usage:
#   bash scripts/9router-watchdog.sh         # normal run
#   bash scripts/9router-watchdog.sh --fix   # also auto-disable expired accounts

set -euo pipefail
DB="${HOME}/.9router/db.json"
WARN_HOURS="${WARN_HOURS:-6}"      # alert this many hours before expiry
FIX="${1:-}"                       # pass --fix to auto-disable expired accounts

# ── Service reachability ────────────────────────────────────────────────────
if ! curl -sf --connect-timeout 3 --max-time 5 http://127.0.0.1:20128/v1/models > /dev/null 2>&1; then
    echo "🚨 9ROUTER DOWN — port 20128 not responding"
    echo "Fix: launchctl kickstart -k gui/\$(id -u)/com.9router.autostart"
    exit 0
fi

[[ -f "$DB" ]] || { echo "9Router db.json not found at $DB"; exit 1; }

# ── Python analysis ─────────────────────────────────────────────────────────
python3 - "$DB" "$WARN_HOURS" "${FIX}" <<'PYEOF'
import json, sys
from datetime import datetime, timezone

db_path   = sys.argv[1]
warn_hrs  = float(sys.argv[2])
do_fix    = sys.argv[3] == '--fix'
now       = datetime.now(timezone.utc)

data = json.load(open(db_path))
alerts = []
names_fixed = []

# ── 1. Normalize ugly OAuth account names ─────────────────────────────────
# Counts per provider for sequential numbering
provider_counts = {}
for conn in data['providerConnections']:
    provider = conn.get('provider', 'unknown')
    raw_name = conn.get('name', '')
    # Ugly name patterns: oauth2 subjects, pipe chars, long hex IDs
    is_ugly = ('|' in raw_name or
               raw_name.startswith('google-oauth2') or
               (len(raw_name) > 30 and raw_name.replace('-','').replace('_','').isalnum()))
    if is_ugly:
        provider_counts[provider] = provider_counts.get(provider, 0) + 1
        n = provider_counts[provider]
        friendly_names = {
            'cursor':    f'Cursor Pro #{n}',
            'claude':    f'Claude.ai #{n}',
            'kiro':      f'Kiro #{n}',
            'iflow':     f'iFlow #{n}',
            'codex':     f'Codex Plus #{n}',
            'openrouter':f'OpenRouter #{n}',
            'gemini':    f'Gemini #{n}',
        }
        new_name = friendly_names.get(provider, f'{provider.title()} #{n}')
        conn['name'] = new_name
        names_fixed.append(f"  {provider}: '{raw_name[:30]}...' → '{new_name}'")

# ── 2. Check all connections ───────────────────────────────────────────────
expired_fixed = []
expiring_soon = []
auth_errors   = []

for conn in data['providerConnections']:
    name     = conn.get('name', '?')
    provider = conn.get('provider', '?')
    is_active = conn.get('isActive', False)
    priority  = conn.get('priority', 99)
    expires   = conn.get('expiresAt')
    err_code  = conn.get('errorCode')
    label     = f"[{provider}] {name}"

    if expires:
        try:
            exp_dt = datetime.fromisoformat(expires.replace('Z', '+00:00'))
            delta_h = (exp_dt - now).total_seconds() / 3600

            if delta_h < 0 and is_active:
                # Expired — disable
                if do_fix:
                    conn['isActive'] = False
                    expired_fixed.append(f"  Auto-disabled: {label} (expired {abs(int(delta_h))}h ago)")
                else:
                    expired_fixed.append(f"  {label} EXPIRED {abs(int(delta_h))}h ago (still active)")

            elif 0 <= delta_h < warn_hrs and is_active:
                # These providers are auto-refreshed by 9router-token-refresh.js every 4 min
                # (kiro: AWS OIDC refresh, claude: 9Router /test refresh)
                # Skip them to avoid permanent false-positive alerts
                if provider in ('kiro', 'claude'):
                    pass
                else:
                    m = int((delta_h % 1) * 60)
                    h = int(delta_h)
                    expiring_soon.append(f"  {label} → expires in {h}h {m}m ⚠️")

        except Exception as e:
            pass

    # Auth errors on important (non-OpenRouter) connections
    if err_code in (401, 403, '401', '403') and is_active and priority < 90:
        auth_errors.append(f"  {label} — error {err_code}")

# ── 3. Write db.json if anything changed ─────────────────────────────────
if names_fixed or (do_fix and expired_fixed):
    with open(db_path, 'w') as f:
        json.dump(data, f, indent=2)
    if names_fixed:
        for l in names_fixed:
            print(f"[auto-rename] {l}", file=sys.stderr)

# ── 4. Build alert output ─────────────────────────────────────────────────
lines = []

if expired_fixed:
    lines.append("⛔ EXPIRED CONNECTIONS (need re-auth):")
    lines.extend(expired_fixed)
    lines.append("→ Open http://localhost:20128 and re-authenticate")

if expiring_soon:
    lines.append("⏰ EXPIRING SOON (within 6h — re-auth before crons break):")
    lines.extend(expiring_soon)
    lines.append("→ http://localhost:20128 → Providers → reconnect each")

if auth_errors:
    lines.append("⚠️ AUTH ERRORS on active connections:")
    lines.extend(auth_errors)

if lines:
    print("🔑 9ROUTER AUTH ALERT\n" + "\n".join(lines))

PYEOF
