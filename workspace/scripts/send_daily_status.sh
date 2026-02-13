#!/usr/bin/env bash
set -euo pipefail

MODE="full"
EMAIL_TO="anorag.saxena@gmail.com"
ACCOUNT="anorag.saxena@gmail.com"

WORKSPACE="/Users/redinside/.openclaw/workspace"
PY="$WORKSPACE/skills/status-reporter/scripts/status_reporter.py"

DATE="$(date +%F)"
OUT_MD="$WORKSPACE/status/status-$DATE.md"
OUT_PDF="$WORKSPACE/status/status-$DATE.pdf"
SHORT_TXT="/tmp/status-short-$DATE.txt"

# Generate report (writes markdown; prints short summary)
python3 "$PY" --mode "$MODE" --out "$OUT_MD" | tee "$SHORT_TXT" >/dev/null

# Build PDF
pandoc "$OUT_MD" -o "$OUT_PDF" --pdf-engine=tectonic >/dev/null

# Email the PDF (body = short telegram-friendly summary)
gog gmail send \
  --account "$ACCOUNT" \
  --to "$EMAIL_TO" \
  --subject "Daily Status — $DATE" \
  --body-file "$SHORT_TXT" \
  --attach "$OUT_PDF" \
  --no-input >/dev/null

# Emit telegram message (bullets)
cat "$SHORT_TXT"
