# Recovery Dashboard — 2026-03-13

_Last updated: 2026-03-13 (ET)_

## 1) A2A Timeout Cluster (Primary Blocker)

### Snapshot
- **Primary timeout log file:** `logs/audit.jsonl`
- **Total timeout-like entries in `audit.jsonl`:** **710**
- **`session_warmup + timeout` events:** **710**
- **Last-24h window (relative to latest timeout ts in file):** **101 events**
- **Timeout config on these events:** `timeout_seconds=120`

### Last-24h Hourly Spike Buckets (UTC)
- 2026-03-12T01:00:00Z → **14**
- 2026-03-11T22:00:00Z → **13**
- 2026-03-12T16:00:00Z → **12**
- 2026-03-12T00:00:00Z → **10**

### Failed-Agent Mentions Across timeout records
- `ops` → **125**
- `eng` → **82**
- `research` → **81**
- `infosec` → **79**

### Additional timeout-bearing logs
- `logs/llm-analytics.jsonl` → **112** timeout-like entries
- `logs/routing-decisions.jsonl` → **19** timeout-like entries
- `logs/a2a-events.jsonl` → **1** timeout-like entry

---

## 2) Cron Failure Analysis

### Primary cron failure source
- **File:** `ops/ci/ci-log.jsonl`
- **Observed pattern:** concentrated cron failures with recurring job IDs and repeated root causes

### Critical services called out by OPS
- `telegram-approval-monitor-0001`
  - **Errors:** 77
  - **OK runs:** 424
  - **Top root causes:**
    - `Unknown (no summary)` → 72
    - `⚠️ ✉️ Message failed` → 4
    - `400 No credentials for provider: openai` → 1

- `system-pulse-always-on-0001`
  - **Errors:** 78
  - **OK runs:** 247
  - **Top root causes:**
    - `Unknown (no summary)` → 77
    - `400 No credentials for provider: openai` → 1

### Other notable recurring cron failures
- `9router-auth-watchdog-0001` → 90 errors
- `9router-keepfresh-0001` → 72 errors
- `9router-quota-sync-0001` → 51 errors
- Multiple failures involve write/edit operations and intermittent message send failures.

---

## 3) Confirmed Ticket Correlation

From `ops/TICKET-TRACKER.md` and health artifacts:
- **TICKET-20260313-002 (P0):** Perplexity/web_search quota exhausted (401 insufficient_quota)
- **TICKET-20260313-001 (P0):** Recursive consultant stall loop
- **TICKET-20260313-006/007 (P1):** `ollama/llama3.1:8b` model not found
- **TICKET-20260313-008/010 (P1):** minimax auth failures

---

## 4) Triage Order (Actionable)

1. **Stop timeout amplification loop**
   - Gate/slow `session_warmup` fan-out while core dependencies are degraded.
2. **Restore search dependency path**
   - Resolve Perplexity quota or switch fallback provider route.
3. **Unblock model dependency**
   - Pull `llama3.1:8b` and verify runtime routing.
4. **Fix auth surfaces**
   - Validate minimax + openai credential paths in cron/runtime contexts.
5. **Address unknown-root-cause blind spot**
   - Require cron error summarization (replace `Unknown (no summary)` with structured code/path).

---

## 5) Live Monitoring Commands

```bash
# Timeout volume by log file
for f in ~/ .openclaw/workspace/logs/*.jsonl; do
  c=$(grep -Eci 'timeout|timed out' "$f" || true)
  printf "%5d %s\n" "$c" "$f"
done | sort -nr

# Top cron jobs by error count
python3 - <<'PY'
import json,collections
p='~/ .openclaw/workspace/ops/ci/ci-log.jsonl'
errs=collections.Counter(); oks=collections.Counter()
for l in open(p.replace('~','/Users/redinside')):
    try:o=json.loads(l)
    except: continue
    if o.get('source')!='cron': continue
    j=o.get('jobId') or 'unknown'
    s=(o.get('status') or '').lower()
    if s=='error': errs[j]+=1
    elif s=='ok': oks[j]+=1
for j,c in errs.most_common(20):
    print(c,j,'ok=',oks.get(j,0))
PY
```

> NOTE: command block uses local path conventions; adjust if run from a different home/workspace root.

---

## 6) Evidence Locations

- `logs/audit.jsonl`
- `logs/llm-analytics.jsonl`
- `logs/routing-decisions.jsonl`
- `logs/a2a-events.jsonl`
- `ops/ci/ci-log.jsonl`
- `ops/TICKET-TRACKER.md`
- `ops/HEALTH-REPORT-20260313.md`

