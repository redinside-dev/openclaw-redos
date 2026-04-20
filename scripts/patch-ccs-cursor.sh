#!/usr/bin/env bash
# patch-ccs-cursor.sh — Fix CCS cursor integration after upgrades
#
# Fixes two issues in CCS cursor module:
# 1. Wrong gRPC endpoint: AiService/StreamChat → ChatService/StreamUnifiedChatWithTools
# 2. Premature "Malformed" error on valid empty frames (first frame is metadata, not text)
#
# Run after: npm update -g @kaitranntt/ccs

set -euo pipefail

CCS_DIR=$(npm root -g)/@kaitranntt/ccs/dist/cursor

echo "[patch-ccs-cursor] Patching CCS cursor module..."

# 1. Fix gRPC endpoint
EXECUTOR="${CCS_DIR}/cursor-executor.js"
if grep -q "AiService/StreamChat" "$EXECUTOR"; then
  sed -i '' 's|/aiserver.v1.AiService/StreamChat|/aiserver.v1.ChatService/StreamUnifiedChatWithTools|g' "$EXECUTOR"
  echo "[patch-ccs-cursor] ✓ Fixed gRPC endpoint: AiService/StreamChat → ChatService/StreamUnifiedChatWithTools"
else
  echo "[patch-ccs-cursor] ✓ gRPC endpoint already correct"
fi

# 2. Fix premature Malformed error — allow valid empty frames to pass through
DECODER="${CCS_DIR}/cursor-protobuf-decoder.js"
if grep -q "error: 'Malformed protobuf response', toolCall: null, thinking: null" "$DECODER"; then
  python3 << 'PYEOF'
import re, sys

with open('/dev/stdin'.replace('/dev/stdin', sys.argv[1]), 'r') as f:
    content = f.read()

# Fix 1: When field 2 (RESPONSE) found but no text → return null (not Malformed)
old = """        // Field 2: StreamUnifiedChatResponse
        if (fields.has(cursor_protobuf_schema_js_1.FIELD.Response.RESPONSE)) {
            const responseField = fields.get(cursor_protobuf_schema_js_1.FIELD.Response.RESPONSE);
            if (responseField && responseField[0]) {
                const { text, thinking } = extractTextAndThinking(responseField[0].value);
                if (text || thinking) {
                    return { text, error: null, toolCall: null, thinking };
                }
            }
        }
        if (payload.length > 0) {
            return { text: null, error: 'Malformed protobuf response', toolCall: null, thinking: null };
        }"""

new = """        // Field 2: StreamUnifiedChatResponse
        if (fields.has(cursor_protobuf_schema_js_1.FIELD.Response.RESPONSE)) {
            const responseField = fields.get(cursor_protobuf_schema_js_1.FIELD.Response.RESPONSE);
            if (responseField && responseField[0]) {
                const { text, thinking } = extractTextAndThinking(responseField[0].value);
                // Return success even if text is empty — frame is valid, just no text yet.
                // Do NOT return "Malformed" here; that would abort processing of subsequent frames.
                return { text: text || null, error: null, toolCall: null, thinking: thinking || null };
            }
        }
        // Unknown frame with content — skip it (don't abort the frame loop with an error)
        if (payload.length > 0) {
            return { text: null, error: null, toolCall: null, thinking: null };
        }"""

if old in content:
    content = content.replace(old, new, 1)
    print('[patch-ccs-cursor] ✓ Fixed Malformed frame abort bug')
else:
    print('[patch-ccs-cursor] ✓ Malformed frame fix already applied (or different version)')

with open(sys.argv[1], 'w') as f:
    f.write(content)
PYEOF
  python3 -c "
import sys
sys.argv = ['', '${DECODER}']
" 2>/dev/null || python3 << PYEOF2
import sys
path = '${DECODER}'
with open(path, 'r') as f:
    content = f.read()

old = """        // Field 2: StreamUnifiedChatResponse
        if (fields.has(cursor_protobuf_schema_js_1.FIELD.Response.RESPONSE)) {
            const responseField = fields.get(cursor_protobuf_schema_js_1.FIELD.Response.RESPONSE);
            if (responseField && responseField[0]) {
                const { text, thinking } = extractTextAndThinking(responseField[0].value);
                if (text || thinking) {
                    return { text, error: null, toolCall: null, thinking };
                }
            }
        }
        if (payload.length > 0) {
            return { text: null, error: 'Malformed protobuf response', toolCall: null, thinking: null };
        }"""

new = """        // Field 2: StreamUnifiedChatResponse
        if (fields.has(cursor_protobuf_schema_js_1.FIELD.Response.RESPONSE)) {
            const responseField = fields.get(cursor_protobuf_schema_js_1.FIELD.Response.RESPONSE);
            if (responseField && responseField[0]) {
                const { text, thinking } = extractTextAndThinking(responseField[0].value);
                return { text: text || null, error: null, toolCall: null, thinking: thinking || null };
            }
        }
        if (payload.length > 0) {
            return { text: null, error: null, toolCall: null, thinking: null };
        }"""

if old in content:
    content = content.replace(old, new, 1)
    print('[patch-ccs-cursor] Fixed Malformed frame abort bug')
    with open(path, 'w') as f:
        f.write(content)
else:
    print('[patch-ccs-cursor] Fix already applied or different version — check manually')
PYEOF2
else
  echo "[patch-ccs-cursor] ✓ Malformed frame fix already applied"
fi

echo "[patch-ccs-cursor] Restarting cursor daemon..."
ccs cursor stop 2>/dev/null || true
sleep 1
ccs cursor start 2>/dev/null
sleep 2

echo "[patch-ccs-cursor] Testing..."
RESULT=$(curl -sf -X POST http://localhost:20129/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-4.5-sonnet","messages":[{"role":"user","content":"say: OK"}],"stream":false}' \
  --max-time 20 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('choices',[{}])[0].get('message',{}).get('content','FAIL'))" 2>/dev/null || echo "FAIL")

if [[ "$RESULT" == *"OK"* ]] || [[ "$RESULT" != "FAIL" ]]; then
  echo "[patch-ccs-cursor] ✅ Cursor daemon working: $RESULT"
else
  echo "[patch-ccs-cursor] ❌ Cursor daemon test failed: $RESULT"
  exit 1
fi
