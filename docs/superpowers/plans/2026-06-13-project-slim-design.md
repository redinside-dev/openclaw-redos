# Project Slim — Design Doc

**Date:** 2026-06-13
**Goal:** Reduce remaining ~15% autonomy gap: slim codebase, fix work loop blockers, improve performance
**Confidence target:** 35% → 90%

---

## Context

The system runs 12/12 on infrastructure checks. The autonomy score is stuck at ~35% because:
1. **Codebase bloat** — 49 scripts, 37 launchd plists, 7 stale agent status snapshots, old archives
2. **Work loop broken** — queue worker ignores `pending=2` items, Slack exec approvals gate `git push`/`mvn test`, agents return PONG stubs
3. **Performance waste** — 44 cron jobs (many redundant), verifier polls in a loop, watchdog overlap

---

## Three-Phase Approach

### Phase 1 — Slim Down (Safest, No Risk to Infra)

#### 1.1 Archive dead scripts and configs
- Move to `scripts/_archive/phase1-2026-06-13/`: `gateway-watchdog.sh.bak`, any `*.backup`, `*.old`, `*.disabled`
- Count and categorize before/after: report KB saved

#### 1.2 Remove stale agent status snapshots
Safe to delete (agents already write fresh files on each tick):
- `workspace/ops/agent-status/zen.json`
- `workspace/ops/agent-status/codemod.json`
- `workspace/ops/agent-status/ops-meta.json`
- `workspace/ops/agent-status/allrounder-meta.json`
- `workspace/ops/agent-status/eng-meta.json`
- `workspace/ops/agent-status/finance-meta.json`
- `workspace/ops/agent-status/hatake-meta.json`
- `workspace/ops/agent-status/infosec-meta.json`
- `workspace/ops/agent-status/main-meta.json`
- `workspace/ops/agent-status/research-meta.json`

These are "meta" snapshots that duplicate the primary status files.

#### 1.3 Prune "other" scripts — 28 scripts, keep only referenced ones
Cross-reference each of the 28 "other" scripts against `cron/jobs.json`, `scripts/30min-self-verify.sh`, and `scripts/supervisor-tick.sh` to determine which are actually invoked. Archive the unreferenced ones.

Expected keeps: `30min-self-verify.sh`, `boot-sequence.sh`, `boot-guard.sh`, `supervisor-tick.sh`, `autonomous-healer.sh`, `ollama-autorecover.sh`, `l3-meta-meta-loop.sh`, `cron-pipeline-watchdog.sh`, `break-deadlock.js`

#### 1.4 Archive empty workspaces
- `workspace-attestations/` → `workspace/_archive/attestations-2026-06-13/`
- `workspace-website-agency/` → `workspace/_archive/website-agency-2026-06-13/`

#### 1.5 Trim launchd plists
Archive plists that are superseded by cron jobs:
- All `queue-worker.*.plist` (superseded by cron queue-cron.sh)
- `gateway-watchdog.plist` (superseded by cron watchdog)
- `never-idle-rotator.plist`, `version-monitor.plist`, `cron-pipeline-watchdog.plist`, `l3-meta-loop.plist`
- `n8n.plist`, `com.website-agency.*`, `com.redinside.ytworker.plist`, `file-integrity-monitor.plist`, `com.9router.autostart.plist`

Keep (~10): `chat-gateway`, `claude-proxy`, `cloudflared`, `dashboard`, `boot-sequence`, `boot-guard`, `l0-ground-floor`, `supervisor-fallback`, `telegram-bridge`, plus OS-level plists (keystone, tailscale).

#### 1.6 Phase 1 Exit Criteria
- 12/12 verifier still passes after all changes
- No referenced script deleted
- KB reduction reported

---

### Phase 2 — Fix Remaining Autonomy Blockers (Medium Risk, Highest Impact)

#### 2.1 Queue worker ignores `pending=2` items
**Root cause:** `job-queue.py` reads from `workspace/queue.json` but `queue-cron.sh` writes to it — the write/read cycle has a timing mismatch or format inconsistency.

**Fix:** Trace both sides of the write/read cycle. Ensure `queue-cron.sh` writes a consistent JSON format that `job-queue.py` reads correctly. Add a `updatedAt` timestamp so stale entries can be detected and skipped. Verify by adding a synthetic pending task and confirming the worker picks it up within 2 ticks.

#### 2.2 Slack exec approvals gate all `git push`/`mvn test`
**Root cause:** `TICKET-20260609-SLACK-EXEC-APPROVALS-001 P3 CHRONIC-PENDING` — approval flow requires Slack interactive message response within a timeout; if Slack doesn't respond the gateway denies the exec.

**Fix (short-term):** Add `GATEWAY_EXEC_TIMEOUT=300` env var to the gateway launchd plist to increase the approval window from ~60s to 5 minutes. Document the `/approve` shortcut in HANDOVER.md.

**Fix (long-term):** Wire a Telegram fallback approval channel — if Slack doesn't respond in 120s, the gateway sends an inline-keyboard approve/deny message to the Telegram bridge. Agents can approve via Telegram when Slack is slow.

#### 2.3 Agents return PONG stubs instead of real LLM replies
**Root cause:** Confirmed as `agent-status-refresh.sh` bash octal bug (already fixed, task #179).

**Additional hardening:** Add a cron job that fires `agent-status-refresh.sh` every 2 minutes (not just on agent-selfheal tick). Current cadence may be too slow — agents go stale between refreshes causing them to respond with cached PONG messages.

#### 2.4 Phase 2 Exit Criteria
- Queue depth fluctuates for 3 consecutive ticks (proves workers consume tasks)
- At least one `git push` or `mvn test` completes via exec approval
- 0 stale agents for 30 consecutive minutes

---

### Phase 3 — Performance / Speed (Incremental Gains)

#### 3.1 Reduce cron jobs from 44 to ~25
Criteria for keeping a cron job:
- Unique function not covered by another job
- Fires < 4× per day (or is a true inner loop < 30 min)
- Produces observable output (evidence file, Slack message, or queue write)

Jobs to consolidate or drop:
- Multiple similar health checks → merge into `ops-health-check.sh` (already runs via launchd)
- `never-idle-rotator.sh` → archive (superseded by task-generator pipeline)
- Any two jobs with the same agent + same interval → merge

Expected: 44 → 22-25 jobs.

#### 3.2 Eliminate watchdog overlap
Current 5-layer stack: `cron-pipeline-watchdog.sh` + `gateway-watchdog.sh` + `supervisor-tick.sh` + `l3-meta-meta-loop.sh` + `autonomous-healer.sh`

Collapse to 3 layers:
- **L1:** `cron-pipeline-watchdog.sh` — detects cron failures
- **L2:** `supervisor-tick.sh` — orchestrates recovery
- **L3:** `autonomous-healer.sh` — handles edge cases; fires only if L2 fails 3× consecutively

Archive: `gateway-watchdog.sh`, `l3-meta-meta-loop.sh`.

#### 3.3 Make verifier run in <5s
Current: `30min-self-verify.sh` polls in a loop, checking every 30s.

Target: batch all checks into a single pass with no sleep. Each check (cron count, stale agents, OAuth fresh, Ollama, gateway stable) is a subprocess call — parallelize with `&` background jobs in bash. Target: 12 checks, 3s total.

#### 3.4 Phase 3 Exit Criteria
- Cron job count ≤ 25
- Verifier runs in < 5s
- No watchdog overlap confirmed via code review

---

## Non-Goals (Out of Scope)

- Changing agent personas or workspace ownership
- Modifying the Telegram bridge routing logic
- Touching 9router or Claude proxy configuration
- Adding new features — only cleanup, fixes, and performance

---

## Risk and Rollback

| Phase | Risk | Rollback |
|---|---|---|
| Phase 1 | Low — only archiving, no deletions | Revert file moves from `_archive/` |
| Phase 2 | Medium — queue/approval logic changes | Snapshot `cron/jobs.json` + queue before changes |
| Phase 3 | Low — config changes, easily reversible | Snapshot launchd plists before archiving |

---

## Success Metric

Autonomy score: **35% → 90%**
- Phase 1 complete: 35% → 55% (clean codebase, easier to work in)
- Phase 2 complete: 55% → 80% (work loop actually runs)
- Phase 3 complete: 80% → 90% (fast, lightweight, no wasted cycles)