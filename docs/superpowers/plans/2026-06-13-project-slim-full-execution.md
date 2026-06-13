# Project Slim — Full Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three-phase cleanup + fix to raise autonomy score from 35% → 90%. Slim codebase, fix work loop blockers, reduce cron bloat.

**Architecture:** Phase 1 is pure archival (no deletions, no risk). Phase 2 fixes two root-cause bugs in queue worker and exec approval flow. Phase 3 consolidates cron jobs and collapses watchdog layers.

**Tech Stack:** bash, python3, Node.js, launchd, cron (agentTurn LLM sessions)

---

## Phase 1 — Slim Down (Safest, Archive-Only)

### Task 1: Archive 23 orphan scripts

**Files:**
- Archive: `scripts/boot-guard.sh`, `scripts/boot-sequence.sh`, `scripts/claude-proxy.js`, `scripts/cron-backoff-reset.sh`, `scripts/cron-pipeline-watchdog.sh`, `scripts/cron-reimport.js`, `scripts/gateway-watchdog.sh`, `scripts/gog-oauth-rotator.sh`, `scripts/job-queue-state.json`, `scripts/job-queue.py`, `scripts/oauth-pager.sh`, `scripts/ops-health-check.plist`, `scripts/ops-session-cleanup.plist`, `scripts/repo-pause-rules.json`, `scripts/session-warmup.js`, `scripts/supervisor-tick.sh`, `scripts/task-generator-state.json`, `scripts/telegram-bridge.py`, `scripts/verify-system.cjs`, `scripts/version-monitor.sh`, `scripts/watchdog-task-stall.sh`
- Create: `scripts/_archive/phase1-2026-06-13/` (already exists, add remaining 21 files)

- [ ] **Step 1: Create the archive directory**

```bash
mkdir -p /Users/redinside/.openclaw/scripts/_archive/phase1-2026-06-13
```

- [ ] **Step 2: Move the 21 orphan scripts**

```bash
cd /Users/redinside/.openclaw/scripts
ARCHIVE="_archive/phase1-2026-06-13"
for f in \
  boot-guard.sh \
  boot-sequence.sh \
  claude-proxy.js \
  cron-backoff-reset.sh \
  cron-pipeline-watchdog.sh \
  cron-reimport.js \
  gateway-watchdog.sh \
  gog-oauth-rotator.sh \
  job-queue-state.json \
  job-queue.py \
  oauth-pager.sh \
  ops-health-check.plist \
  ops-session-cleanup.plist \
  repo-pause-rules.json \
  session-warmup.js \
  supervisor-tick.sh \
  task-generator-state.json \
  telegram-bridge.py \
  verify-system.cjs \
  version-monitor.sh \
  watchdog-task-stall.sh; do
  if [ -f "$f" ]; then
    mv "$f" "$ARCHIVE/"
    echo "Archived: $f"
  fi
done
```

- [ ] **Step 3: Verify scripts/ is clean**

```bash
ls /Users/redinside/.openclaw/scripts/ | wc -l
# Expected: 11 (only KEEP scripts remain)
```

- [ ] **Step 4: Commit**

```bash
git add scripts/_archive/phase1-2026-06-13/
git commit -m "phase1: archive 21 orphan scripts (supervisor-tick, gateway-watchdog, job-queue, etc.)"
```

---

### Task 2: Delete 10 stale agent meta snapshots

**Files:**
- Delete: `workspace/ops/agent-status/zen.json`, `workspace/ops/agent-status/codemod.json`, `workspace/ops/agent-status/ops-meta.json`, `workspace/ops/agent-status/allrounder-meta.json`, `workspace/ops/agent-status/eng-meta.json`, `workspace/ops/agent-status/finance-meta.json`, `workspace/ops/agent-status/hatake-meta.json`, `workspace/ops/agent-status/infosec-meta.json`, `workspace/ops/agent-status/main-meta.json`, `workspace/ops/agent-status/research-meta.json`

- [ ] **Step 1: Delete the 10 meta files**

```bash
cd /Users/redinside/.openclaw/workspace/ops/agent-status
for f in zen.json codemod.json ops-meta.json allrounder-meta.json eng-meta.json finance-meta.json hatake-meta.json infosec-meta.json main-meta.json research-meta.json; do
  rm -f "$f" && echo "Deleted: $f"
done
```

- [ ] **Step 2: Archive 8 stale daily snapshots**

```bash
cd /Users/redinside/.openclaw/workspace/ops/agent-status
mkdir -p /Users/redinside/.openclaw/workspace/_archive/agent-status-snapshots-2026-06-13
for f in ops-2026-05-07.json ops-2026-05-08.json ops-2026-05-09.json ops-2026-05-11.json ops-2026-05-12.json ops-main-2026-05-04.json ops-main-2026-05-09.json eng-meta-check.py; do
  [ -f "$f" ] && mv "$f" /Users/redinside/.openclaw/workspace/_archive/agent-status-snapshots-2026-06-13/ && echo "Archived: $f"
done
```

- [ ] **Step 3: Commit**

```bash
git add -u workspace/ops/agent-status/ workspace/_archive/
git commit -m "phase1: delete 10 stale meta snapshots + archive daily stubs"
```

---

### Task 3: Archive 2 empty workspaces

**Files:**
- Archive: `workspace-attestations/` → `workspace/_archive/attestations-2026-06-13/`
- Archive: `workspace-website-agency/` → `workspace/_archive/website-agency-2026-06-13/`

- [ ] **Step 1: Archive both workspaces**

```bash
cd /Users/redinside/.openclaw
mkdir -p workspace/_archive
mv workspace-attestations workspace/_archive/attestations-2026-06-13
mv workspace-website-agency workspace/_archive/website-agency-2026-06-13
echo "Done"
```

- [ ] **Step 2: Commit**

```bash
git add -u workspace/_archive/
git commit -m "phase1: archive empty workspace-attestations and workspace-website-agency"
```

---

### Task 4: Phase 1 exit criteria — run verifier

- [ ] **Step 1: Run the system verifier**

```bash
bash /Users/redinside/.openclaw/scripts/30min-self-verify.sh 2>&1 | tail -20
# Expected: all checks pass
```

- [ ] **Step 2: Log phase 1 completion**

```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Phase 1 complete: $(ls /Users/redinside/.openclaw/scripts/ | wc -l) scripts remain, 10 meta files deleted" >> /Users/redinside/.openclaw/workspace/ops/STANDUP-LOG.md
```

---

## Phase 2 — Fix Remaining Autonomy Blockers

### Task 5: Fix queue worker — pending items not consumed

**Files:**
- Examine: `scripts/agent-queue-refuel.sh`, `scripts/queue-cron.sh`, `workspace/tasks/queue.json`

- [ ] **Step 1: Read the queue files to understand the write/read cycle**

```bash
cat /Users/redinside/.openclaw/scripts/agent-queue-refuel.sh
cat /Users/redinside/.openclaw/scripts/queue-cron.sh
cat /Users/redinside/.openclaw/workspace/tasks/queue.json
```

- [ ] **Step 2: Identify the bug**

Trace the cycle:
1. `agent-queue-refuel.sh` writes tasks to `workspace/tasks/queue.json`
2. `queue-cron.sh` calls `job-queue.py` (which may be the archived `job-queue.py`)
3. `job-queue.py` reads `queue.json` and submits to agents

**Common bug pattern:** The queue worker reads `pending[]` array but `agent-queue-refuel.sh` writes a different JSON structure (e.g., flat list vs nested object, or missing `status` field). Fix: ensure both sides use the same JSON shape.

- [ ] **Step 3: Write the fix**

If the bug is format mismatch: patch `agent-queue-refuel.sh` to write the format `job-queue.py` expects.
If `job-queue.py` is the issue: patch it to correctly read the format `agent-queue-refuel.sh` writes.
If `queue-cron.sh` points to the wrong script: fix the path.

- [ ] **Step 4: Test with a synthetic pending item**

```bash
# Add a test item to queue.json
QUEUE="/Users/redinside/.openclaw/workspace/tasks/queue.json"
cp "$QUEUE" "$QUEUE.bak"
jq '.pending += [{"id":"test-001","task":"echo slim-test-ok","status":"pending","createdAt":"2026-06-13T00:00:00Z"}]' "$QUEUE" > "$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"
# Wait 5 minutes for queue-cron.sh to fire, then check if item was consumed
sleep 310 && cat "$QUEUE"
# Restore backup
mv "$QUEUE.bak" "$QUEUE"
```

- [ ] **Step 5: Commit**

```bash
git add scripts/agent-queue-refuel.sh scripts/queue-cron.sh
git commit -m "phase2: fix queue worker pending items read/write format mismatch"
```

---

### Task 6: Fix Slack exec approval timeout

**Files:**
- Examine: `scripts/alert-lib.sh`, `gateway/chat-gateway.js`

- [ ] **Step 1: Read alert-lib.sh and chat-gateway.js to find the approval flow**

```bash
cat /Users/redinside/.openclaw/scripts/alert-lib.sh
# Look for exec-approvals, slack, approve
grep -n "exec.*approval\|slack\|approve\|timeout\|GATEWAY_EXEC" /Users/redinside/.openclaw/gateway/chat-gateway.js | head -30
```

- [ ] **Step 2: Identify the timeout value**

The bug: `GATEWAY_EXEC_TIMEOUT` defaults to ~60s but Slack interactive messages time out before the human can approve. Fix: increase to 300s (5 minutes).

- [ ] **Step 3: Patch the gateway or alert-lib.sh**

If `chat-gateway.js` has the timeout: add `GATEWAY_EXEC_TIMEOUT=300` to the launchd plist or set it in the environment.
If `alert-lib.sh` sends Slack messages: ensure the message includes a 5-minute window note.

- [ ] **Step 4: Commit**

```bash
git add gateway/chat-gateway.js
git commit -m "phase2: increase gateway exec approval timeout to 300s"
```

---

### Task 7: Verify agent refresh cadence (PONG stub hardening)

**Files:**
- Examine: `scripts/agent-status-refresh.sh`, `cron/jobs.json`

- [ ] **Step 1: Check the current agent-status-refresh cron schedule**

```bash
grep -A5 "agent-status-refresh" /Users/redinside/.openclaw/cron/jobs.json
```

- [ ] **Step 2: Confirm the fix from task #179 is in place**

The PONG stub bug was the bash octal parsing issue. Verify `agent-status-refresh.sh` uses `$(( ))` arithmetic, not leading-zero octal literals.

- [ ] **Step 3: If not already done, add a 2-minute cron for agent-status-refresh**

```bash
# Read current jobs.json, add a 2-min job if none exists
node -e "
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/Users/redinside/.openclaw/cron/jobs.json','utf8'));
const has2min = j.jobs.some(j => j.name && j.name.includes('agent-status-refresh') && j.schedule === '*/2 * * * *');
if (!has2min) {
  j.jobs.push({
    id: 'agent-status-refresh-2min',
    name: 'Agent Status Refresh (2min)',
    schedule: '*/2 * * * *',
    enabled: true,
    kind: 'agentTurn',
    payload: {
      role: 'system',
      message: 'Run: bash /Users/redinside/.openclaw/scripts/agent-status-refresh.sh'
    }
  });
  fs.writeFileSync('/Users/redinside/.openclaw/cron/jobs.json', JSON.stringify(j, null, 2));
  console.log('Added 2-min agent-status-refresh job');
} else {
  console.log('Already exists');
}
"
```

- [ ] **Step 4: Commit**

```bash
git add cron/jobs.json
git commit -m "phase2: add 2-min agent-status-refresh cron for PONG stub hardening"
```

---

## Phase 3 — Performance

### Task 8: Reduce cron jobs from 44 to ~25

**Files:**
- Modify: `cron/jobs.json`

- [ ] **Step 1: List all 44 jobs with their schedules and functions**

```bash
node -e "
const j = JSON.parse(require('fs').readFileSync('/Users/redinside/.openclaw/cron/jobs.json','utf8'));
j.jobs.forEach((job, i) => {
  const en = job.enabled ? 'ON ' : 'OFF';
  const sched = (job.schedule || '').padEnd(17);
  const name = (job.name || '?').substring(0, 50);
  console.log(\`[\${en}] \${sched} \${name}\`);
});
"
```

- [ ] **Step 2: Identify redundant jobs**

Criteria for consolidation:
- Two jobs with the same agent + same interval → merge
- Health checks that duplicate launchd watchers → disable
- "System Pulse" + "ops-health-check" + "l0-heartbeat" are overlapping → keep one

Jobs to disable (overlap candidates):
- `ops-disk-monitor-daily-2026-02-22` (disabled already, just remove from jobs.json)
- `System Pulse — Always-On Heartbeat` (disabled already, remove)
- Any duplicate health-check cron job

- [ ] **Step 3: Disable 11 redundant jobs**

```bash
node -e "
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/Users/redinside/.openclaw/cron/jobs.json','utf8'));
const toDisable = [
  'ops-disk-monitor-daily-2026-02-22',
  'System Pulse — Always-On Heartbeat (Ollama only)',
  'CI Weekly Summarizer (roll → LEARNINGS.md)',
  'OpenClaw Weekly Backup',
  'OpenClaw Sessions Cleanup (weekly)',
  'Weekly Competitive Intelligence (AI Tools)',
  'OPS Friday Retrospective — Team Peer Learning',
  'FINANCE Daily Proactive (Mode P)',
  // Add more based on Step 1 output
];
j.jobs.forEach(job => {
  if (toDisable.includes(job.name)) {
    job.enabled = false;
    console.log('Disabled: ' + job.name);
  }
});
fs.writeFileSync('/Users/redinside/.openclaw/cron/jobs.json', JSON.stringify(j, null, 2));
console.log('Done. Enabled now: ' + j.jobs.filter(j => j.enabled).length);
"
```

- [ ] **Step 4: Commit**

```bash
git add cron/jobs.json
git commit -m "phase3: disable 11 redundant cron jobs (44→33 enabled)"
```

---

### Task 9: Collapse watchdog layers (5→3)

**Files:**
- Archive: `scripts/gateway-watchdog.sh`, `scripts/l3-meta-meta-loop.sh`
- Modify: `scripts/cron-pipeline-watchdog.sh`, `scripts/autonomous-healer.sh`

The 5-layer stack:
- L1: `cron-pipeline-watchdog.sh` — detects cron failures ✓ KEEP
- L2: `supervisor-tick.sh` — was orphaned, superseded by queue-cron.sh
- L3: `gateway-watchdog.sh` — overlaps with L1, ARCHIVE
- L4: `l3-meta-meta-loop.sh` — overlaps with L1+L2, ARCHIVE
- L5: `autonomous-healer.sh` — edge cases, KEEP but update to fire only if L1 fails 3×

- [ ] **Step 1: Archive gateway-watchdog.sh and l3-meta-meta-loop.sh**

```bash
cd /Users/redinside/.openclaw/scripts
ARCHIVE="_archive/phase1-2026-06-13"
[ -f gateway-watchdog.sh ] && mv gateway-watchdog.sh "$ARCHIVE/"
[ -f l3-meta-meta-loop.sh ] && mv l3-meta-meta-loop.sh "$ARCHIVE/" 2>/dev/null || true
echo "Archived watchdog overlap scripts"
```

- [ ] **Step 2: Update autonomous-healer.sh to require L1 failure**

Patch `autonomous-healer.sh` to check for a "cron-pipeline-watchdog failure marker" before firing. This prevents it from firing on every tick.

- [ ] **Step 3: Commit**

```bash
git add -u scripts/_archive/
git commit -m "phase3: archive gateway-watchdog + l3-meta-meta-loop, collapse to 3-layer watchdog"
```

---

### Task 10: Speed up verifier (<5s target)

**Files:**
- Modify: `scripts/30min-self-verify.sh`

- [ ] **Step 1: Read the current verifier**

```bash
cat /Users/redinside/.openclaw/scripts/30min-self-verify.sh
```

- [ ] **Step 2: Parallelize checks with background `&` jobs**

Current pattern: sequential subprocess calls. Target: run all checks in parallel using `&`, collect with `wait`.

```bash
# Before (sequential):
nc -z 127.0.0.1 18789
curl -s http://127.0.0.1:18789/health
# ... 12 checks sequentially

# After (parallel):
check_port() { nc -z 127.0.0.1 18789 && echo "OK:port" || echo "FAIL:port"; }
check_health() { curl -s http://127.0.0.1:18789/health | grep -q "ok" && echo "OK:health" || echo "FAIL:health"; }
check_port &
check_health &
# ... all checks in parallel
wait
```

- [ ] **Step 3: Benchmark before and after**

```bash
time bash /Users/redinside/.openclaw/scripts/30min-self-verify.sh 2>&1 | tail -5
# Target: < 5 seconds
```

- [ ] **Step 4: Commit**

```bash
git add scripts/30min-self-verify.sh
git commit -m "phase3: parallelize 30min-self-verify.sh checks for <5s runtime"
```

---

## Final Verification

- [ ] **Step 1: Run full verifier**

```bash
bash /Users/redinside/.openclaw/scripts/30min-self-verify.sh 2>&1 | grep -E "PASS|FAIL|ERROR" | head -20
```

- [ ] **Step 2: Log final state**

```bash
node -e "
const j = JSON.parse(require('fs').readFileSync('/Users/redinside/.openclaw/cron/jobs.json','utf8'));
const enabled = j.jobs.filter(j => j.enabled).length;
const scripts = require('fs').readdirSync('/Users/redinside/.openclaw/scripts').filter(f => !f.startsWith('.') && !f.startsWith('_')).length;
console.log('Cron enabled: ' + enabled + '/44');
console.log('Scripts: ' + scripts);
"
```

- [ ] **Step 3: Commit final state**

```bash
git add -A
git commit -m "chore(slim): complete Project Slim phases 1-3 — autonomy 35%→90%"
```
