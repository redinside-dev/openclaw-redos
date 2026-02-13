#!/bin/bash
# AgentOS Mission Control - Startup Script

echo "🦞 Starting AgentOS Mission Control..."
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Check if OpenClaw gateway is running
if ! openclaw status > /dev/null 2>&1; then
    echo "⚠️  OpenClaw gateway not running!"
    echo "   Start it with: openclaw gateway start"
    echo ""
    exit 1
fi

# Kill existing servers if running
pkill -f "python3 -m http.server 8080"
pkill -f "gateway-bridge.py"
sleep 1

# Start Gateway Bridge in background
echo "🔌 Starting Gateway Bridge on port 8081..."
python3 ./gateway-bridge.py > /tmp/gateway-bridge.log 2>&1 &
BRIDGE_PID=$!
sleep 2

# Check if bridge started successfully
if ! kill -0 $BRIDGE_PID 2>/dev/null; then
    echo "❌ Gateway Bridge failed to start"
    echo "   Check logs: tail /tmp/gateway-bridge.log"
    exit 1
fi

# Start web server
echo "🌐 Starting web server on http://127.0.0.1:8080/"
echo ""
echo "✅ Mission Control is ready!"
echo ""
echo "   Dashboard:       http://127.0.0.1:8080/"
echo "   Bridge API:      http://127.0.0.1:8081/api/status"
echo "   OpenClaw UI:     http://127.0.0.1:18789/"
echo ""
echo "   Bridge PID:      $BRIDGE_PID"
echo "   Bridge logs:     tail -f /tmp/gateway-bridge.log"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Trap to cleanup on exit
trap "echo ''; echo '👋 Stopping servers...'; kill $BRIDGE_PID 2>/dev/null; pkill -f 'python3 -m http.server 8080'; echo '✅ Stopped'; exit 0" INT TERM

python3 -m http.server 8080
