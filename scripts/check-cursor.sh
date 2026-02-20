#!/usr/bin/env bash
# check-cursor.sh — Quick test: is Cursor subscription working?
echo "Testing Cursor daemon..."
curl -s -X POST http://localhost:20129/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-4.5-sonnet","messages":[{"role":"user","content":"say exactly: cursor-ok"}],"stream":false}' \
  --max-time 20 | python3 -c "
import json, sys
d = json.load(sys.stdin)
if 'choices' in d:
    print('✅ CURSOR WORKING —', d['choices'][0]['message']['content'])
    print('   Model:', d.get('model','unknown'))
else:
    print('❌ CURSOR FAILED —', d.get('error',{}).get('message','unknown error'))
"
