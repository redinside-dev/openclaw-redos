#!/usr/bin/env bash
# cron-backoff-reset.sh
# Resets consecutive_errors=0 for any cron job whose last run was successful
# (last_run_status='ok') within the last 30 minutes. Pure runtime fix — does
# not patch the openclaw binary; the next read in the gateway will see the
# cleared value. Wired as `cron-backoff-reset-0001` (every 10 min).
set -euo pipefail

ROOT="${OPENCLAW_ROOT:-/Users/redinside/.openclaw}"
DB="$ROOT/state/openclaw.sqlite"
EVIDENCE_DIR="$ROOT/workspace/ops/evidence/cron-backoff"
mkdir -p "$EVIDENCE_DIR"

ts=$(date -u +%Y-%m-%dT%H-%M-%SZ)
window_min=30
window_ms=$((window_min * 60 * 1000))
now_ms=$(($(date +%s) * 1000))
cutoff_ms=$((now_ms - window_ms))

if [[ ! -f "$DB" ]]; then
  echo "{\"ts\":\"$ts\",\"ok\":false,\"reason\":\"db_missing\",\"db\":\"$DB\"}" > "$EVIDENCE_DIR/$ts.json"
  exit 1
fi

# Read candidates: consecutive_errors > 0 AND last_run_status='ok' AND last_run_at_ms within window.
# Include store_key so the UPDATE matches the exact row (store_key varies — e.g. jobs.json path).
candidate_count=0
reset_count=0
detail_lines=""
first=1
while IFS='|' read -r jstore jid jname jagent jerr jlast_ms jlasterr; do
  [ -z "$jid" ] && continue
  candidate_count=$((candidate_count + 1))
  jid_esc=$(printf %s "$jid" | sed "s/'/''/g")
  jstore_esc=$(printf %s "$jstore" | sed "s/'/''/g")
  jname_esc=$(printf %s "$jname" | sed 's/"/\\"/g')
  # Use a single statement that returns the actual rowcount via "changes()" so we
  # don't lie about the reset count when WHERE doesn't match.
  changes=$(sqlite3 "$DB" "
UPDATE cron_jobs
SET consecutive_errors = 0,
    schedule_error_count = MAX(schedule_error_count - 1, 0),
    runtime_updated_at_ms = $now_ms
WHERE store_key = '$jstore_esc' AND job_id = '$jid_esc';
SELECT changes();" 2>/dev/null | tail -n1)
  if [[ "$changes" =~ ^[0-9]+$ ]] && [ "$changes" -gt 0 ]; then
    reset_count=$((reset_count + 1))
    if [ $first -eq 0 ]; then detail_lines="$detail_lines,"; fi
    first=0
    detail_lines="$detail_lines{\"job_id\":\"$jid\",\"name\":\"$jname_esc\",\"agent\":\"$jagent\",\"prev_errors\":$jerr}"
  fi
done < <(sqlite3 -separator '|' "$DB" "
SELECT store_key, job_id, name, agent_id, consecutive_errors, last_run_at_ms, last_error
FROM cron_jobs
WHERE consecutive_errors > 0
  AND last_run_status = 'ok'
  AND last_run_at_ms IS NOT NULL
  AND last_run_at_ms >= $cutoff_ms;
")

cat > "$EVIDENCE_DIR/$ts.json" <<EOF
{
  "ts": "$ts",
  "ok": true,
  "window_minutes": $window_min,
  "candidates": $candidate_count,
  "reset_count": $reset_count,
  "details": [$detail_lines]
}
EOF

echo "cron-backoff-reset: scanned $candidate_count jobs, reset $reset_count at $ts"
