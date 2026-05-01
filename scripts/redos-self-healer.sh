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
# Version pin — update this file to change the locked version, never edit GOOD_VERSION directly
VERSION_LOCK_FILE="$HOME/.openclaw/.openclaw-version-lock"
if [ -f "$VERSION_LOCK_FILE" ]; then
    GOOD_VERSION=$(cat "$VERSION_LOCK_FILE" | tr -d '[:space:]')
else
    GOOD_VERSION="2026.4.26"
    echo "$GOOD_VERSION" > "$VERSION_LOCK_FILE"
fi
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
    # Signal to autonomous-healer: don't also restart gateway/9router for 90s
    date +%s > /tmp/redos-self-healer.recent
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
    # Cascade guard: tell autonomous-healer to skip its 9router check for 90s
    date +%s > /tmp/redos-self-healer.recent
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

# ── FIX 7: Telegram bot health check ─────────────────────────────────────────
telegram_ok=true
tg_tokens=$(python3 -c "
import json
d = json.load(open('$OPENCLAW_DIR/credentials/secrets.json'))
tg = d.get('channels', {}).get('telegram', {}).get('accounts', {})
for name, token in tg.items():
    print(f'{name}={token}')
" 2>/dev/null || echo "")

if [ -n "$tg_tokens" ]; then
    while IFS='=' read -r name token; do
        [ -z "$token" ] && continue
        result=$(curl -s --max-time 5 "https://api.telegram.org/bot${token}/getMe" 2>/dev/null | \
            python3 -c "import json,sys; d=json.load(sys.stdin); print('ok' if d.get('ok') else 'fail')" 2>/dev/null || echo "fail")
        if [ "$result" != "ok" ]; then
            log "TELEGRAM BOT DEAD: $name — token invalid or API unreachable"
            telegram_ok=false
        fi
    done <<< "$tg_tokens"
fi

# Check if gateway log shows failed Telegram sessions in last 10 min
if grep -q "marked interrupted main session failed.*telegram" "$OPENCLAW_DIR/logs/gateway.err.log" 2>/dev/null; then
    recent=$(grep "marked interrupted main session failed.*telegram" "$OPENCLAW_DIR/logs/gateway.err.log" 2>/dev/null | tail -1)
    log_ts=$(echo "$recent" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1)
    if [ -n "$log_ts" ]; then
        log_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$log_ts" "+%s" 2>/dev/null || echo "0")
        now_epoch=$(date +%s)
        age=$(( now_epoch - log_epoch ))
        if [ "$age" -lt 600 ]; then
            log "TELEGRAM SESSION FAILED (within 10 min) — restarting gateway to clear"
            launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" >> "$LOG" 2>&1
            sleep 8
            FIXED="$FIXED telegram-session-recovery"
        fi
    fi
fi

# ── Restart gateway if we fixed anything that requires it ─────────────────────
if echo "$FIXED" | grep -qE 'version-lock|dist-files|usage-format'; then
    log "Reinstalled openclaw — restarting gateway"
    launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" >> "$LOG" 2>&1
    sleep 3
    log "Gateway restarted after version fix"
fi

# ── FIX 8: Session bloat guard ────────────────────────────────────────────────
# OPS runs hourly — sessions accumulate fast. Use 1-day retention for OPS, 3-day for others.
for agent_sessions_dir in "$OPENCLAW_DIR"/agents/*/sessions/; do
    agent_name=$(basename "$(dirname "$agent_sessions_dir")")
    size_mb=$(du -sm "$agent_sessions_dir" 2>/dev/null | awk '{print $1}')
    if [ -n "$size_mb" ] && [ "$size_mb" -gt 150 ]; then
        # OPS generates hourly sessions — 1-day retention; all others use 3-day
        if [ "$agent_name" = "ops" ]; then
            retention_days=1
        else
            retention_days=3
        fi
        log "SESSION BLOAT: $agent_name ${size_mb}MB — clearing sessions >${retention_days} days"
        python3 << PYEOF 2>/dev/null
import os, time
cutoff = time.time() - ($retention_days * 86400)
freed = 0
for fname in os.listdir('$agent_sessions_dir'):
    if fname in ('sessions.json',) or fname.endswith('.lock'):
        continue
    fpath = os.path.join('$agent_sessions_dir', fname)
    try:
        if os.path.getmtime(fpath) < cutoff:
            size = os.path.getsize(fpath)
            os.remove(fpath)
            freed += size
    except:
        pass
print(f'freed {freed//1024//1024}MB from $agent_name')
PYEOF
        FIXED="$FIXED session-bloat-$agent_name"
    fi
done

# ── FIX 9: Stuck openclaw-agent reaper (>20min runtime AND >300MB = stuck cron) ─
killed_agents=0
while IFS= read -r line; do
    [ -z "$line" ] && continue
    pid=$(echo "$line" | awk '{print $2}')
    rss_kb=$(echo "$line" | awk '{print $6}')
    rss_mb=$((rss_kb / 1024))
    etime=$(ps -p "$pid" -o etime= 2>/dev/null | tr -d ' ')
    # Parse elapsed time — kill if >20min (format: MM:SS or HH:MM:SS or DD-HH:MM:SS)
    is_old=false
    if echo "$etime" | grep -qE '^[0-9]+-'; then
        is_old=true  # days old
    elif echo "$etime" | grep -qE '^[0-9]{2}:[0-9]{2}:[0-9]{2}$'; then
        is_old=true  # hours old
    elif echo "$etime" | grep -qE '^[0-9]{2}:[0-9]{2}$'; then
        mins=$(echo "$etime" | cut -d: -f1)
        [ "$mins" -ge 20 ] && is_old=true
    fi
    if $is_old && [ "$rss_mb" -gt 300 ]; then
        log "STUCK AGENT: PID $pid age=$etime rss=${rss_mb}MB — killing"
        kill -9 "$pid" 2>/dev/null || true
        killed_agents=$((killed_agents + 1))
    fi
done < <(ps aux | grep openclaw-agent | grep -v grep)

if [ "$killed_agents" -gt 0 ]; then
    FIXED="$FIXED stuck-agents(${killed_agents}killed)"
    sleep 2
    launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" >> "$LOG" 2>&1
    sleep 8
fi

# ── FIX 10: Missed cron tick recovery for oss-contributor ─────────────────────
# oss-contributor fires at 7 11 * * * (11:07am ET). If the gateway was restarted
# within the last 10 minutes and the last oss-contributor run was >23h ago,
# the tick was likely missed — trigger it now.
OSS_SENTINEL="$OPENCLAW_DIR/logs/oss-contributor-last-run.txt"
now_epoch=$(date +%s)
last_run=0
[ -f "$OSS_SENTINEL" ] && last_run=$(cat "$OSS_SENTINEL" 2>/dev/null || echo 0)
age_since_run=$(( now_epoch - last_run ))
hour_of_day=$(date +%H)
minute_of_day=$(date +%M)

if [ "$age_since_run" -gt 82800 ] && [ "$hour_of_day" -ge 11 ] && [ "$hour_of_day" -lt 13 ] && [ "$minute_of_day" -ge 8 ]; then
    # Gateway restarted within last 10 min? Check gateway log for recent SIGTERM
    recent_restart=$(grep "SIGTERM" "$OPENCLAW_DIR/logs/gateway.log" 2>/dev/null | tail -1)
    restart_ts=$(echo "$recent_restart" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1)
    restart_epoch=0
    [ -n "$restart_ts" ] && restart_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${restart_ts%-*}" "+%s" 2>/dev/null || echo 0)
    restart_age=$(( now_epoch - restart_epoch ))
    if [ "$restart_age" -lt 600 ]; then
        log "MISSED CRON: oss-contributor tick likely missed (gateway restarted ${restart_age}s ago, last run ${age_since_run}s ago) — triggering now"
        # Retry loop: gateway may still be stabilising after restart
        # Wait until port is up before invoking openclaw agent (avoids WS 1006 race)
        GW_READY=0
        for i in 1 2 3 4 5; do
            if nc -z 127.0.0.1 "$GATEWAY_PORT" 2>/dev/null; then
                GW_READY=1
                break
            fi
            log "Waiting for gateway to be ready (attempt $i/5)..."
            sleep 10
        done
        if [ "$GW_READY" -eq 1 ]; then
            # Additional 5s settle time after port is up (WS listener may not be ready yet)
            sleep 5
            "$OPENCLAW_BIN" agent --agent eng -m "CATCHUP TRIGGER: oss-contributor missed its 11am ET cron tick because the gateway restarted. Run today's OSS contribution now — follow oss-contributor-0001 protocol including identity switch and quality gates." >> "$LOG" 2>&1 &
            echo "$now_epoch" > "$OSS_SENTINEL"
            FIXED="$FIXED oss-contributor-catchup"
        else
            log "MISSED CRON: gateway not ready after 50s — catchup skipped, will retry next healer run"
        fi
    fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
if [ -n "$FIXED" ]; then
    log "FIXED:$FIXED"
    send_telegram "✅ RedOS self-healer fixed: $FIXED"
fi
