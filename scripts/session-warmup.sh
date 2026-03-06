#!/bin/bash

# Simple session warmup script to prevent "no session found" A2A failures
# This pings the OpenClaw gateway to keep sessions alive

echo "Starting session warmup at $(date)"

# Get current sessions to keep them alive
openclaw sessions

# Also ping the gateway status to ensure it's responsive
openclaw gateway status

echo "Session warmup completed at $(date)"