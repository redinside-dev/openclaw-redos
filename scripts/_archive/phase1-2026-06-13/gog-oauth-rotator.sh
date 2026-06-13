#!/usr/bin/env bash
# scripts/gog-oauth-rotator.sh
#
# Proactively rotates the gog OAuth refresh token for anorag.saxena@gmail.com.
#
# Design goals:
#   - Run every 5 days, NOT on failure. Prevents the 6-month-revocation cliff
#     before Google issues it.
#   - Two-step `gog auth add --remote` flow (the only thing that actually
#     works in gog v0.12.0). Earlier scripts called `gog auth refresh` which
#     does NOT exist.
#   - When run non-interactively (cron), writes the step-1 auth URL to a
#     sentinel file and pages the user via oauth-pager.sh. Step 2 will be
#     picked up on the next cron tick when the user pastes the redirect URL
#     into workspace-finance/ops/gog-oauth-callback.txt.
#   - When run interactively with --confirm-redirect <url>, completes step 2
#     inline.
#
# Usage:
#   gog-oauth-rotator.sh                # probe + decide; rotate if >5d old
#   gog-oauth-rotator.sh --force        # rotate regardless of age
#   gog-oauth-rotator.sh --confirm-redirect <URL>  # complete a pending step 2
#
# State files (all in workspace-finance/ops/):
#   gog-oauth-last-rotation.txt         # ISO timestamp of last successful rotation
#   gog-oauth-pending-step1.json        # step-1 auth_url + state, waiting for step 2
#   gog-oauth-callback.txt              # where the user pastes the redirect URL
#
# Exit codes:
#   0 = nothing to do OR step 2 succeeded
#   1 = probe failed (gog call itself broken, not OAuth)
#   2 = needs human re-auth (page sent, waiting for callback)
#   3 = step 2 ran but gog rejected the code (token still broken)
#   4 = prereq missing (no `gog` binary, no email arg, etc.)

set -euo pipefail

ACCOUNT="anorag.saxena@gmail.com"
SERVICES="gmail,calendar,chat,classroom,drive,docs,slides,contacts,tasks,sheets,people,forms,appscript"
STATE_DIR="workspace-finance/ops"
ROTATION_INTERVAL_DAYS=5
LAST_ROTATION_FILE="$STATE_DIR/gog-oauth-last-rotation.txt"
PENDING_FILE="$STATE_DIR/gog-oauth-pending-step1.json"
CALLBACK_FILE="$STATE_DIR/gog-oauth-callback.txt"

mkdir -p "$STATE_DIR"

# --- arg parsing ---
FORCE=0
REDIRECT_URL=""
while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=1; shift ;;
    --confirm-redirect) REDIRECT_URL="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,30p' "$0" | sed 's/^# //;s/^#//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 4 ;;
  esac
done

# --- prereq check ---
if ! command -v gog >/dev/null 2>&1; then
  echo "ERROR: gog not in PATH" >&2
  exit 4
fi

# ============================================================
# MODE 1: --confirm-redirect <URL> → run step 2
# ============================================================
if [ -n "$REDIRECT_URL" ]; then
  if [ ! -s "$PENDING_FILE" ]; then
    echo "ERROR: --confirm-redirect given but no pending step 1 in $PENDING_FILE" >&2
    exit 4
  fi
  echo "[rotator] running step 2 with redirect URL..."
  set +e
  OUT=$(gog auth add "$ACCOUNT" \
    --remote --step 2 \
    --auth-url "$REDIRECT_URL" \
    --services "$SERVICES" 2>&1)
  RC=$?
  set -e
  echo "$OUT"
  if [ $RC -ne 0 ]; then
    echo "[rotator] step 2 failed (rc=$RC)" >&2
    exit 3
  fi
  # Verify it actually works
  if gog gmail labels list --account "$ACCOUNT" >/dev/null 2>&1; then
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LAST_ROTATION_FILE"
    rm -f "$PENDING_FILE" "$CALLBACK_FILE"
    echo "[rotator] step 2 SUCCESS — refresh token rotated and verified"
    exit 0
  else
    echo "[rotator] step 2 reported success but gog probe still fails" >&2
    exit 3
  fi
fi

# ============================================================
# MODE 2: no redirect URL → probe + decide
# ============================================================

# 1) Probe: is the current token good?
PROBE_OK=0
if gog gmail labels list --account "$ACCOUNT" >/dev/null 2>&1; then
  PROBE_OK=1
fi

# 2) Age check: how old is the last rotation?
NEEDS_ROTATION=0
REASON=""
if [ $PROBE_OK -eq 0 ]; then
  NEEDS_ROTATION=1
  REASON="probe-failed"
elif [ $FORCE -eq 1 ]; then
  NEEDS_ROTATION=1
  REASON="force"
elif [ ! -s "$LAST_ROTATION_FILE" ]; then
  NEEDS_ROTATION=1
  REASON="never-rotated"
else
  LAST=$(cat "$LAST_ROTATION_FILE" 2>/dev/null || echo "1970-01-01T00:00:00Z")
  LAST_EPOCH=$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$LAST" +%s 2>/dev/null || date -u -d "$LAST" +%s 2>/dev/null || echo 0)
  NOW_EPOCH=$(date -u +%s)
  AGE_DAYS=$(( (NOW_EPOCH - LAST_EPOCH) / 86400 ))
  if [ "$AGE_DAYS" -ge "$ROTATION_INTERVAL_DAYS" ]; then
    NEEDS_ROTATION=1
    REASON="age-${AGE_DAYS}d"
  else
    echo "[rotator] token age ${AGE_DAYS}d (< ${ROTATION_INTERVAL_DAYS}d threshold), probe OK, no rotation needed"
    exit 0
  fi
fi

# 3) Check if a step 1 is already pending (cron may have fired previously)
if [ -s "$PENDING_FILE" ]; then
  PENDING_TS=$(python3 -c "import json,sys; d=json.load(open('$PENDING_FILE')); print(d.get('created_at',''))" 2>/dev/null || echo "")
  echo "[rotator] reason=$REASON but a step 1 is already pending (created $PENDING_TS); not starting a new one"
  exit 2
fi

# 4) Start step 1
echo "[rotator] starting rotation, reason=$REASON"
STEP1_OUT=$(gog auth add "$ACCOUNT" --remote --step 1 --no-input 2>&1) || {
  echo "ERROR: gog step 1 failed:" >&2
  echo "$STEP1_OUT" >&2
  exit 1
}

# 5) Parse auth_url from step 1 output. gog v0.12.0 prints TSV (key\tvalue\n...)
#    on stdout when --no-input is set, e.g.:
#      auth_url\thttps://accounts.google.com/...
#      state_reused\tfalse
#      <hint line>
#    Older versions may print JSON; support both.
AUTH_URL=$(printf '%s\n' "$STEP1_OUT" | python3 -c "
import sys, re
out = sys.stdin.read()

# Try JSON first
try:
    import json
    d = json.loads(out)
    if 'auth_url' in d:
        print(d['auth_url'])
        sys.exit(0)
except Exception:
    pass

# Fall back to TSV: first occurrence of 'auth_url\t<value>' on a line by itself
m = re.search(r'(?m)^auth_url\t(\S+)$', out)
if m:
    print(m.group(1))
    sys.exit(0)

# Last resort: any line starting with https://accounts.google.com/o/oauth2/
m = re.search(r'(https://accounts\.google\.com/o/oauth2/[^\s]+)', out)
if m:
    print(m.group(1))
    sys.exit(0)

sys.exit(1)
" 2>/dev/null) || AUTH_URL=""

if [ -z "$AUTH_URL" ]; then
  echo "ERROR: could not parse auth_url from gog step 1 output" >&2
  echo "----- raw gog output -----" >&2
  printf '%s\n' "$STEP1_OUT" >&2
  echo "----- end raw output -----" >&2
  exit 1
fi

# 6) Persist state for cron-survivable step-2 pickup
cat > "$PENDING_FILE" <<EOF
{
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "account": "$ACCOUNT",
  "auth_url": "$AUTH_URL",
  "reason": "$REASON"
}
EOF
chmod 600 "$PENDING_FILE"

# 7) Page the user (this is what oauth-pager.sh reads)
cat > "$CALLBACK_FILE" <<EOF
# PENDING: gog OAuth re-auth required (reason: $REASON)
#
# 1. Open this URL in any browser:
#    $AUTH_URL
#
# 2. Sign in as $ACCOUNT, click Allow
#
# 3. Browser will redirect to http://127.0.0.1:52962/... and fail to load.
#    THAT'S EXPECTED. Copy the FULL URL from the address bar.
#
# 4. Paste the full URL back. It will be picked up on the next 5-min cron tick.
#    OR run manually:
#      scripts/gog-oauth-rotator.sh --confirm-redirect "<paste-here>"
#
# Filed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# To cancel this rotation: rm $PENDING_FILE
EOF
chmod 600 "$CALLBACK_FILE"

echo "[rotator] step 1 done; auth URL written to $CALLBACK_FILE"
echo "[rotator] awaiting user callback via $CALLBACK_FILE or --confirm-redirect"
exit 2
