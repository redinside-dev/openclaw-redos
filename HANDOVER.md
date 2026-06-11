# OpenClaw Handover — Phase 2-8 Autonomy (2026-06-11)

This file is the one-page operational handover. Read it before touching cron, scripts, or agents.

## What "autonomy" means here

OpenClaw runs without a human in the loop for normal operation. The system pages a human only when
something is **truly stuck** — i.e. auto-recovery has failed three consecutive supervisor ticks
(15 min) on the same failure key. Everything else self-heals.

## The four L0–L4 layers

| Layer | What it does | Where it lives | When it runs |
| --- | --- | --- | --- |
| **L0** | Bash heartbeats: gateway / cron / Ollama / OAuth / agent status | `scripts/heartbeat-*.sh` | every 1–5 min (cron) |
| **L1** | Per-service auto-fixers: ollama-autorecover, oauth-autofix, agent-selfheal | `scripts/{ollama-autorecover,oauth-autofix,agent-selfheal}.sh` | every 5–15 min (cron) |
| **L2** | Watchdog: detects L0/L1 failures and triggers L1 re-runs | `scripts/watchdog.sh` | every 5 min (cron) |
| **L3** | Supervisor: aggregates ticks, decides "healthy" vs "degraded" | `scripts/supervisor-tick.sh` | every 5 min (cron + launchd fallback) |
| **L4** | Escalation: pages human after 3 consecutive failed ticks on same key | inline in `supervisor-tick.sh` | on tick |

L0–L2 **must not page humans**. L3 is the only thing allowed to escalate, and only after 3 strikes.

## The agent fleet (8 agents)

`main`, `ops`, `eng`, `research`, `finance`, `infosec`, `hatake`, `allrounder`.

Each agent has:
- **Queue**: `workspace/scripts/n8n/queues/<id>.json` (list of jobs)
- **Worker**: `queue-worker.py <id>` (consumes queue, calls `openclaw agent --agent <id>`)
- **Refuel task**: enqueued every 5 min by `agent-queue-refuel.sh` if worker is alive + queue empty
- **Status file**: `workspace-main/ops/agent-status/<id>.json` (written by the agent itself)

A worker that is alive but idle **always** gets a refuel task — never-idle is the contract.

## Cron jobs that must stay enabled

`cron/jobs.json` is the source of truth. The 30-min self-verifier checks `cron_jobs_count >= 25`
and fails if too many are disabled. Critical jobs:

- `supervisor-tick-0001` — every 5 min
- `agent-queue-refuel` — every 5 min
- `agent-selfheal-0001` — every 5 min
- `ollama-autorecover-0001` — every 30 min
- `oauth-autofix-0001` — every 10 min
- `ops-30min-verify-0001` — every 30 min (writes to `logs/30min-self-verify.log`)

Plus one-time / daily jobs (daily-standup, health checks, etc).

## Launchd safety nets

`~/Library/LaunchAgents/ai.openclaw.*.plist` covers three failure modes cron can't:
- `supervisor-fallback` — runs `supervisor-tick.sh` every 5 min (cron-already-running guard inside script)
- `30min-verify-fallback` — runs verifier every 30 min
- (Plus a few cleanup plists for log rotation, gateway-restart, etc.)

**Do not** add a launchd plist that duplicates a cron job. Check `cron/jobs.json` first.

## How to verify the system is healthy

```bash
# 30-min evidence-gated self-verifier
bash /Users/redinside/.openclaw/scripts/30min-self-verify.sh

# Latest 5 lines
tail -5 /Users/redinside/.openclaw/logs/30min-self-verify.log

# Should be: verdict=pass, 10/10 invariants
# If 9/10 with agent-status-stale=X → known soft gap, non-critical
```

A single tick: `bash /Users/redinside/.openclaw/scripts/supervisor-tick.sh`

## How to read the existing memory

`~/.ccs/.../memory/MEMORY.md` has the durable rules — read it before deciding anything.
Key ones: never disable heartbeats on a gateway-restart signal, never prompt "resume" on
transient API errors, never do a manual fix without proposing the automation that would
have prevented it.

## Known soft gaps (non-critical)

- `agent-status-stale` for `hatake` (47 days) — that agent's writer is dormant. Add a
  cron-fired self-heal write for missing status files if you want to clear it.
- `slack` token path uses `openclaw.json` not keychain (intentional — fallback works).

## How to add a new cron job

1. Edit `cron/jobs.json` — add a new object with `id`, `agentId`, `kind`, `schedule`.
2. Reimport: `openclaw cron reload` (or restart gateway).
3. The 30-min verifier will pick it up and assert `cron_jobs_count` stays healthy.

## How to add a new agent

1. Register the agent in `openclaw.json` (or the equivalent config).
2. Create `workspace/scripts/n8n/queues/<id>.json` (start with `[]`).
3. Add a refuel template in `agent-queue-refuel.sh` `task_for()`.
4. Add the agent id to `EXPECTED_AGENTS` in `supervisor-tick.sh`.
5. The 30-min verifier will start tracking it.

## What to do if a human gets paged

1. Read the page: it includes `failed=<N> [key1 key2 ...] page-reasons=[key1@3ticks ...]`
2. Run `supervisor-tick.sh` once to see current state.
3. Look at `logs/supervisor.log` for the failure key history.
4. Fix the root cause (e.g. expired token, missing model) — **not** by patching the script.
5. Verify: `bash scripts/30min-self-verify.sh` — should pass with no `agent-status-stale` regression.
6. Append one-paragraph note to `workspace/ops/LEARNINGS.md`.

## What NOT to do

- Do not delete `logs/30min-self-verify.log` — it's the audit trail.
- Do not disable `supervisor-tick` / `agent-queue-refuel` / `agent-selfheal` / `oauth-autofix` /
  `ollama-autorecover` — they form the autonomy loop. Removing any one breaks the chain.
- Do not edit `cron/jobs.json` while gateway is up without reloading — stale state will mask
  the change.
- Do not add a script that "pings" the gateway as a health check — use the existing
  `scripts/heartbeat-gateway.sh` which tests actual port reachability.

## File map (the parts that matter)

```
scripts/
  supervisor-tick.sh           # L3 — every 5 min, L4 page if 3-strike
  watchdog.sh                  # L2
  agent-selfheal.sh            # L1
  ollama-autorecover.sh        # L1
  oauth-autofix.sh             # L1
  agent-queue-refuel.sh        # never-idle contract for workers
  30min-self-verify.sh         # 10-invariant evidence gate
  heartbeat-*.sh               # L0

workspace/scripts/
  job-queue.py                 # queue primitive
  queue-worker.py              # consumer (one per agent)

cron/jobs.json                 # single source of truth for schedules

logs/
  30min-self-verify.log        # audit trail (DO NOT DELETE)
  supervisor.log
  queue-worker-*.log
  ollama-autorecover.log
  oauth-autofix.log

workspace-main/ops/agent-status/*.json  # per-agent status (refuel writes here)
workspace/ops/LEARNINGS.md              # append lessons after every fix
workspace/ops/STANDUP-LOG.md            # daily standup entries
```

## Contacts / context

- `STATE.yaml` — current system state, top of file
- `TICKET-TRACKER.md` — open and recent closed tickets
- `LEARNINGS.md` — accumulated operational knowledge

If you change anything, update one of those three. They're the only "current state" docs.
