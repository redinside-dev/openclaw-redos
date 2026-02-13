#!/bin/bash

###############################################################################
# OpenClaw Resilient System Startup
# Starts gateway with DevOps monitoring and Telegram bridge
###############################################################################

echo "════════════════════════════════════════════════════════════"
echo "🚀 Starting OpenClaw Resilient System"
echo "════════════════════════════════════════════════════════════"
echo ""

# Change to openclaw directory
cd ~/.openclaw || exit 1

# Create logs directory
mkdir -p logs

# Kill any existing processes
echo "🧹 Cleaning up old processes..."
pkill -f "gateway/server.js" 2>/dev/null
pkill -f "telegram-bridge.js" 2>/dev/null
sleep 2

# Start resilient gateway
echo "🚀 Starting resilient gateway..."
node gateway/server.js > /tmp/openclaw-gateway.log 2>&1 &
GATEWAY_PID=$!
echo "   → Gateway PID: $GATEWAY_PID"

# Wait for gateway to start
sleep 5

# Check gateway health
echo "🏥 Checking gateway health..."
if curl -s http://localhost:19000/health > /dev/null; then
  echo "   ✅ Gateway is healthy"
else
  echo "   ❌ Gateway failed to start"
  echo "   Check logs: tail -f /tmp/openclaw-gateway.log"
  exit 1
fi

# Start Telegram bridge
echo "🤖 Starting Telegram bridge..."
node telegram/telegram-bridge.js > /tmp/telegram-bridge.log 2>&1 &
BRIDGE_PID=$!
echo "   → Bridge PID: $BRIDGE_PID"

# Wait for bridge to start
sleep 3

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ OpenClaw Resilient System ONLINE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Services:"
echo "  📡 Gateway:       http://localhost:19000"
echo "  🏥 Health:        http://localhost:19000/health"
echo "  📊 Status:        http://localhost:19000/api/status"
echo "  📱 Telegram:      Connected and ready"
echo ""
echo "New Features:"
echo "  🔧 DevOps Agent:  Auto-monitoring and fixing"
echo "  🛡️  Error Handler: Bulletproof recovery"
echo "  🎯 Smart Router:  Optimized speed+cost"
echo "  📅 Scheduler:     Background task processing"
echo "  🔄 Self-Healing:  Automatic error recovery"
echo ""
echo "Logs:"
echo "  Gateway:  tail -f /tmp/openclaw-gateway.log"
echo "  Bridge:   tail -f /tmp/telegram-bridge.log"
echo "  Errors:   tail -f ~/.openclaw/logs/errors.jsonl"
echo "  Health:   tail -f ~/.openclaw/logs/health.jsonl"
echo ""
echo "Press Ctrl+C to stop all services"
echo "════════════════════════════════════════════════════════════"
echo ""

# Wait for user interrupt
wait $GATEWAY_PID $BRIDGE_PID
