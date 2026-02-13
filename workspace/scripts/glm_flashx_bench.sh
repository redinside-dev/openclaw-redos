#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="${1:?prompt file}"
MODEL="zai/glm-4.7-flashx"

# We measure end-to-end wall time for a single agent turn.
# Note: OpenClaw agent call includes some gateway overhead; that's fine as long as it's consistent.

START=$(python3 - <<'PY'
import time
print(time.time())
PY
)

OUT_JSON=$(openclaw agent --agent ops --json --message "[BENCH][$MODEL] $(cat "$PROMPT_FILE")" 2>/dev/null)

END=$(python3 - <<'PY'
import time
print(time.time())
PY
)

python3 - <<PY
import json
j=json.loads('''$OUT_JSON''')
print('elapsed_sec', round($END-$START,3))
# best-effort extraction
usage=j.get('usage') or {}
provider=j.get('provider')
model=j.get('model')
print('provider',provider)
print('model',model)
print('usage',usage)
print('text_preview', (j.get('text') or '')[:120].replace('\n',' '))
PY
