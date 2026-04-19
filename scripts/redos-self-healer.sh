#!/bin/bash
# redos-self-healer.sh — RedOS autonomous self-healing watchdog
# Runs every 5 minutes via LaunchD (ai.openclaw.redos-self-healer)
# Completely external to OpenClaw — survives openclaw breakage
# Fixes: wrong openclaw version, missing dist files, dead MiniMax key,
#        dead gateway, dead 9router, session bloat

set -uo pipefail

OPENCLAW_DIR="$HOME/.openclaw"
OPENCLAW_BIN="/opt/homebrew/bin/openclaw"
NPM_BIN="/opt/homebrew/bin/npm"
NODE_BIN="/opt/homebrew/bin/node"
GOOD_VERSION="2026.4.11"
GATEWAY_PORT="18789"
ROUTER_PORT="20128"
ROUTER_BIN="/opt/homebrew/lib/node_modules/9router/cli.js"
LOG="$OPENCLAW_DIR/logs/redos-self-healer.log"
LOCK="/tmp/redos-self-healer.lock"
TELEGRAM_ALERT_COOLDOWN=3600  # 1 hour between repeated alerts

mkdir -p "$OPENCLAW_DIR/logs"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }
alert_file="/tmp/redos-healer-last-alert"

send_telegram() {
    local msg="$1"
    local now; now=$(date +%s)
    local last=0
    [ -f "$alert_file" ] && last=$(cat "$alert_file")
    if (( now - last > TELEGRAM_ALERT_COOLDOWN )); then
        local token
        token=$(python3 -c "import json; d=json.load(open('$OPENCLAW_DIR/openclaw.json')); conns=d.get('integrations',{}).get('telegram',{}); print(list(conns.values())[0] if conns else '')" 2>/dev/null || echo "")
        if [ -n "$token" ]; then
            local chat_id; chat_id=$(python3 -c "import json; d=json.load(open('$OPENCLAW_DIR/openclaw.json')); agents=d.get('agents',{}).get('list',[]); main=next((a for a in agents if a.get('id')=='main'),{}); tg=main.get('channels',{}).get('telegram',{}); print(tg.get('chatId',''))" 2>/dev/null || echo "")
            if [ -n "$chat_id" ]; then
                curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" \
                    -d "chat_id=${chat_id}&text=${msg}&parse_mode=Markdown" >/dev/null 2>&1
                echo "$now" > "$alert_file"
            fi
        fi
    fi
}

# ── Lock: only one instance at a time ─────────────────────────────────────────
if [ -e "$LOCK" ]; then
    pid=$(cat "$LOCK" 2>/dev/null)
    if kill -0 "$pid" 2>/dev/null; then exit 0; fi
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

FIXED=""

# ── FIX 1: openclaw version lock ──────────────────────────────────────────────
current_version=$("$OPENCLAW_BIN" --version 2>/dev/null | grep -oE '[0-9]{4}\.[0-9]+\.[0-9]+' | head -1)
if [ "$current_version" != "$GOOD_VERSION" ]; then
    log "VERSION DRIFT: got $current_version, need $GOOD_VERSION — fixing"
    "$NPM_BIN" install -g "openclaw@$GOOD_VERSION" --force >> "$LOG" 2>&1
    sleep 2
    FIXED="$FIXED version-lock"
fi

# ── FIX 2: dist file integrity ────────────────────────────────────────────────
DIST_DIR="/opt/homebrew/lib/node_modules/openclaw/dist"
missing=0
for required in "subagent-registry.runtime.js"; do
    if [ ! -f "$DIST_DIR/$required" ]; then
        log "MISSING DIST: $required — reinstalling $GOOD_VERSION"
        "$NPM_BIN" install -g "openclaw@$GOOD_VERSION" --force >> "$LOG" 2>&1
        sleep 2
        missing=1
        FIXED="$FIXED dist-files"
        break
    fi
done
usage_count=$(ls "$DIST_DIR"/usage-format-*.js 2>/dev/null | wc -l | tr -d ' ')
if [ "$usage_count" -eq 0 ]; then
    log "MISSING DIST: usage-format-*.js — reinstalling $GOOD_VERSION"
    "$NPM_BIN" install -g "openclaw@$GOOD_VERSION" --force >> "$LOG" 2>&1
    sleep 2
    missing=1
    FIXED="$FIXED usage-format"
fi

# ── FIX 3: gateway health ─────────────────────────────────────────────────────
# Use TCP port check — same method as gateway-watchdog.sh
if ! nc -z 127.0.0.1 "$GATEWAY_PORT" 2>/dev/null; then
    log "GATEWAY DOWN (port $GATEWAY_PORT not listening) — restarting"
    launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" >> "$LOG" 2>&1
    sleep 5
    if ! nc -z 127.0.0.1 "$GATEWAY_PORT" 2>/dev/null; then
        log "GATEWAY STILL DOWN after restart — alerting"
        send_telegram "⚠️ RedOS self-healer: gateway port $GATEWAY_PORT still down after restart."
    else
        FIXED="$FIXED gateway"
    fi
fi

# ── FIX 4: 9router health ─────────────────────────────────────────────────────
router_up=$(curl -s --max-time 3 "http://127.0.0.1:${ROUTER_PORT}/v1/models" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('ok' if d.get('data') else 'empty')" 2>/dev/null || echo "down")
if [ "$router_up" != "ok" ]; then
    log "9ROUTER DOWN — restarting"
    pkill -f "9router/cli.js" 2>/dev/null || true
    sleep 2
    nohup "$NODE_BIN" "$ROUTER_BIN" --tray --skip-update >> "$OPENCLAW_DIR/logs/9router.log" 2>&1 &
    sleep 5
    router_up=$(curl -s --max-time 3 "http://127.0.0.1:${ROUTER_PORT}/v1/models" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('ok' if d.get('data') else 'empty')" 2>/dev/null || echo "down")
    if [ "$router_up" = "ok" ]; then
        FIXED="$FIXED 9router"
    else
        log "9ROUTER STILL DOWN — alerting"
        send_telegram "⚠️ RedOS: 9router on port $ROUTER_PORT is DOWN and not recovering."
    fi
fi

# ── FIX 5: MiniMax API key sync (env.vars → 9router db.json) ─────────────────
mm_env_key=$(python3 -c "import json; d=json.load(open('$OPENCLAW_DIR/openclaw.json')); print(d.get('env',{}).get('vars',{}).get('MINIMAX_API_KEY',''))" 2>/dev/null || echo "")
if [ -n "$mm_env_key" ]; then
    # Test the env key
    mm_test=$(curl -s --max-time 10 -X POST 'https://api.minimax.io/v1/chat/completions' \
        -H "Authorization: Bearer $mm_env_key" \
        -H 'Content-Type: application/json' \
        -d '{"model":"MiniMax-M2.5","messages":[{"role":"user","content":"hi"}],"max_tokens":1}' 2>/dev/null | \
        python3 -c "import json,sys; d=json.load(sys.stdin); print('ok' if d.get('choices') else d.get('error',{}).get('type','fail'))" 2>/dev/null || echo "fail")

    if [ "$mm_test" = "ok" ]; then
        # Sync to 9router db.json if different
        python3 << PYEOF 2>/dev/null
import json

db_path = '/Users/redinside/.9router/db.json'
env_key = '$mm_env_key'

d = json.load(open(db_path))
updated = False
for c in d.get('providerConnections', []):
    if c.get('provider') == 'minimax' and c.get('apiKey', '') != env_key:
        c['apiKey'] = env_key
        for k in ['errorCode', 'lastError', 'lastErrorAt', 'testStatus', 'backoffLevel']:
            c.pop(k, None)
        for k in list(c.keys()):
            if 'Lock' in k:
                c.pop(k, None)
        updated = True

if updated:
    with open(db_path, 'w') as f:
        json.dump(d, f, indent=2)
    print('minimax-key-synced')
PYEOF
        FIXED="$FIXED minimax-sync"
    fi
fi

# ── FIX 6: auto-update guard ──────────────────────────────────────────────────
auto_enabled=$(python3 -c "import json; d=json.load(open('$OPENCLAW_DIR/openclaw.json')); print(d.get('update',{}).get('auto',{}).get('enabled','?'))" 2>/dev/null || echo "?")
if [ "$auto_enabled" = "True" ] || [ "$auto_enabled" = "true" ]; then
    log "AUTO-UPDATE WAS RE-ENABLED — disabling"
    python3 << PYEOF 2>/dev/null
import json
path = '$OPENCLAW_DIR/openclaw.json'
d = json.load(open(path))
d.setdefault('update', {}).setdefault('auto', {})['enabled'] = False
json.dump(d, open(path, 'w'), indent=2)
PYEOF
    FIXED="$FIXED auto-update-guard"
fi

# ── Restart gateway if we fixed anything that requires it ─────────────────────
if echo "$FIXED" | grep -qE 'version-lock|dist-files|usage-format'; then
    log "Reinstalled openclaw — restarting gateway"
    launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" >> "$LOG" 2>&1
    sleep 3
    log "Gateway restarted after version fix"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
if [ -n "$FIXED" ]; then
    log "FIXED:$FIXED"
    send_telegram "✅ RedOS self-healer fixed: $FIXED"
fi
