#!/usr/bin/env bash
# ollama-warmup.sh — Preload cron models so the next request doesn't hit cold start (~58s).
# Run at boot or a few minutes before the first Ollama cron (e.g. System Pulse).
# Optional if you set OLLAMA_KEEP_ALIVE=-1 on the Ollama server.

set -euo pipefail

OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
MODELS="${OLLAMA_WARMUP_MODELS:-llama3.1:8b qwen2.5-coder:7b}"

if ! curl -sf --connect-timeout 2 --max-time 5 "$OLLAMA_HOST/api/tags" > /dev/null 2>&1; then
  echo "Ollama not responding at $OLLAMA_HOST — skip warmup."
  exit 0
fi

for model in $MODELS; do
  echo "Warming up $model..."
  curl -s --max-time 120 "$OLLAMA_HOST/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"$model\", \"prompt\": \"\", \"stream\": false}" > /dev/null 2>&1 || true
done

echo "Ollama warmup done."
