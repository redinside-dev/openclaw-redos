#!/bin/bash
# Start All AgentOS Services
# Starts Gateway, Mission Control, Autonomous Daemon, and Security Monitoring

echo "🚀 Starting AgentOS v3 Services..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directories
WORKSPACE="$HOME/.openclaw/workspace"
MISSION_CONTROL="$WORKSPACE/mission-control"

# Check if gateway is running
echo ""
echo "1️⃣ Checking OpenClaw Gateway..."
if openclaw status &>/dev/null; then
    echo -e "${GREEN}✅ Gateway is running${NC}"
else
    echo -e "${YELLOW}⚠️  Gateway not running, starting...${NC}"
    openclaw gateway start
    sleep 3
    
    if openclaw status &>/dev/null; then
        echo -e "${GREEN}✅ Gateway started${NC}"
    else
        echo -e "${RED}❌ Failed to start gateway${NC}"
        exit 1
    fi
fi

# Start Mission Control
echo ""
echo "2️⃣ Starting Mission Control..."
cd "$MISSION_CONTROL" || exit 1

# Check if already running
if pgrep -f "gateway-bridge.py" > /dev/null; then
    echo -e "${YELLOW}⚠️  Mission Control already running${NC}"
else
    ./start.sh &
    sleep 3
    
    if pgrep -f "gateway-bridge.py" > /dev/null; then
        echo -e "${GREEN}✅ Mission Control started${NC}"
        echo "   📊 Dashboard: http://127.0.0.1:8080/"
        echo "   📡 API: http://127.0.0.1:8081/api/status"
    else
        echo -e "${RED}❌ Failed to start Mission Control${NC}"
    fi
fi

# Start Autonomous Daemon
echo ""
echo "3️⃣ Starting Autonomous Task Daemon..."

PID_FILE="$WORKSPACE/autonomous_daemon.pid"

if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Autonomous daemon already running (PID $OLD_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Removing stale PID file${NC}"
        rm "$PID_FILE"
    fi
fi

if [ ! -f "$PID_FILE" ]; then
    nohup python3 "$WORKSPACE/autonomous_daemon.py" > "$WORKSPACE/logs/autonomous_daemon.out" 2>&1 &
    DAEMON_PID=$!
    sleep 2
    
    if ps -p "$DAEMON_PID" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Autonomous daemon started (PID $DAEMON_PID)${NC}"
        echo "   📝 Logs: tail -f $WORKSPACE/logs/autonomous_daemon.log"
    else
        echo -e "${RED}❌ Failed to start autonomous daemon${NC}"
    fi
fi

# Start Security Monitoring Daemon
echo ""
echo "4. Starting Security Monitoring Daemon..."

SEC_PID_FILE="$WORKSPACE/security/monitoring_daemon.pid"

if [ -f "$SEC_PID_FILE" ]; then
    SEC_OLD_PID=$(cat "$SEC_PID_FILE")
    if ps -p "$SEC_OLD_PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}  Security monitor already running (PID $SEC_OLD_PID)${NC}"
    else
        echo -e "${YELLOW}  Removing stale PID file${NC}"
        rm "$SEC_PID_FILE"
    fi
fi

if [ ! -f "$SEC_PID_FILE" ]; then
    nohup python3 "$WORKSPACE/security/monitoring_daemon.py" > "$WORKSPACE/logs/monitoring_daemon.out" 2>&1 &
    SEC_DAEMON_PID=$!
    sleep 2

    if ps -p "$SEC_DAEMON_PID" > /dev/null 2>&1; then
        echo -e "${GREEN}  Security monitor started (PID $SEC_DAEMON_PID)${NC}"
        echo "   Logs: tail -f $WORKSPACE/security/monitoring_daemon.log"
    else
        echo -e "${RED}  Failed to start security monitor${NC}"
    fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}AgentOS v3 Services Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Mission Control: http://127.0.0.1:8080/"
echo "API Endpoint:    http://127.0.0.1:8081/api/status"
echo "Security API:    http://127.0.0.1:8081/api/security"
echo "Agents:          8 configured (RED, ZEN, RESEARCH, ENG, FINANCE, OPS, HATAKE, INFOSEC)"
echo "Autonomous:      Active (scan intervals: 5m to 24h)"
echo "Security:        Monitoring every 5 minutes"
echo ""
echo "Commands:"
echo "  Status:         openclaw status"
echo "  Daemon logs:    tail -f $WORKSPACE/logs/autonomous_daemon.log"
echo "  Security logs:  tail -f $WORKSPACE/security/monitoring_daemon.log"
echo "  Security scan:  python3 $WORKSPACE/security/monitoring_daemon.py scan"
echo "  Access wrapper: python3 $WORKSPACE/security/access_wrapper.py <agent> <cmd> <reason>"
echo "  Stop All:       $WORKSPACE/stop_all.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
