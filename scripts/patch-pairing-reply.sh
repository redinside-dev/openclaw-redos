#!/usr/bin/env bash
set -euo pipefail

# Patch the DM pairing reply text so unknown senders do NOT see internal product naming.
# This edits the installed OpenClaw dist bundle(s). Upgrades may overwrite it.

TARGETS=(
  "/opt/homebrew/lib/node_modules/openclaw/dist/pi-embedded-CAmQsy9D.js"
  "/opt/homebrew/lib/node_modules/openclaw/dist/pi-embedded-DqgaE1xK.js"
  "/opt/homebrew/lib/node_modules/openclaw/dist/reply-B2UJINPw.js"
  "/opt/homebrew/lib/node_modules/openclaw/dist/plugin-sdk/reply-CqKtVq5t.js"
  "/opt/homebrew/lib/node_modules/openclaw/dist/subagent-registry-Bdm_X-N1.js"
)

for f in "${TARGETS[@]}"; do
  [[ -f "$f" ]] || continue

  if grep -q "OpenClaw: access not configured" "$f"; then
    # Replace the whole buildPairingReply return block (exact match from upstream dist)
    perl -0777 -i -pe 's/\treturn \[\n\t\t"OpenClaw: access not configured\.",\n\t\t"",\n\t\tidLine,\n\t\t"",\n\t\t`Pairing code: \$\{code\}`,\n\t\t"",\n\t\t"Ask the bot owner to approve with:",\n\t\tformatCliCommand\(`openclaw pairing approve \$\{channel\} \$\{code\}`\)\n\t\]\.join\("\\n"\);/\treturn [\n\t\t"This is Anurag\x{2019}s virtual assistant and it is private.",\n\t\t"",
\t\tidLine,\n\t\t"",\n\t\t`Pairing code: ${code}`,\n\t\t"",\n\t\t"If you want access, please pair with this code.",\n\t\t"Anurag will approve it when he\x{2019}s back.",\n\t\t"Thanks for reaching out — we\x{2019}ll get back to you."\n\t]\.join("\\n");/gs' "$f"
  fi

done

# Verify: no upstream string remains
if grep -RIn "OpenClaw: access not configured" /opt/homebrew/lib/node_modules/openclaw/dist >/dev/null 2>&1; then
  echo "Patch incomplete: found remaining upstream pairing string." >&2
  exit 2
fi

echo "OK: pairing reply patched."
