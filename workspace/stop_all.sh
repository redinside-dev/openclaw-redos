#!/bin/bash
# Stop All AgentOS Services
# Stops Autonomous Daemon, Security Monitor, Mission Control, and optionally Gateway

echo "🛑 Stopping AgentOS v3 Services..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directories
WORKSPACE="$HOME/.openclaw/workspace"

# Stop Autonomous Daemon
echo ""
echo "1️⃣ Stopping Autonomous Task Daemon..."
PID_FILE="$WORKSPACE/autonomous_daemon.pid"

if [ -f "$PID_FILE" ]; then
    DAEMON_PID=$(cat "$PID_FILE")
    if ps -p "$DAEMON_PID" > /dev/null 2>&1; then
        kill "$DAEMON_PID"
        sleep 2
        
        if ps -p "$DAEMON_PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Daemon didn't stop, force killing...${NC}"
            kill -9 "$DAEMON_PID"
        fi
        
        echo -e "${GREEN}✅ Autonomous daemon stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Daemon not running (stale PID file)${NC}"
    fi
    rm "$PID_FILE"
else
    echo -e "${YELLOW}⚠️  Autonomous daemon not running${NC}"
fi

# Stop Mission Control
echo ""
echo "2️⃣ Stopping Mission Control..."

if pgrep -f "gateway-bridge.py" > /dev/null; then
    pkill -f "gateway-bridge.py"
    echo -e "${GREEN}✅ Gateway Bridge stopped${NC}"
else
    echo -e "${YELLOW}⚠️  Gateway Bridge not running${NC}"
fi

if pgrep -f "python3 -m http.server 8080" > /dev/null; then
    pkill -f "python3 -m http.server 8080"
    echo -e "${GREEN}✅ HTTP server stopped${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP server not running${NC}"
fi

# Stop Security Monitoring Daemon
echo ""
echo "3️⃣ Stopping Security Monitoring Daemon..."
SEC_PID_FILE="$WORKSPACE/security/monitoring_daemon.pid"

if [ -f "$SEC_PID_FILE" ]; then
    SEC_PID=$(cat "$SEC_PID_FILE")
    if ps -p "$SEC_PID" > /dev/null 2>&1; then
        kill "$SEC_PID"
        sleep 2

        if ps -p "$SEC_PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Security monitor didn't stop, force killing...${NC}"
            kill -9 "$SEC_PID"
        fi

        echo -e "${GREEN}✅ Security monitor stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Security monitor not running (stale PID file)${NC}"
    fi
    rm "$SEC_PID_FILE"
else
    echo -e "${YELLOW}⚠️  Security monitor not running${NC}"
fi

# Ask about gateway
echo ""
echo "4️⃣ OpenClaw Gateway..."
echo -e "${YELLOW}   Gateway is still running (managed by LaunchAgent)${NC}"
echo "   To stop gateway: openclaw gateway stop"
echo "   To restart gateway: openclaw gateway restart"

echo ""
echo -e "${GREEN}✨ All autonomous services stopped${NC}"
