# RedOS Autonomy Roadmap — 95-100% OpenClaw Standard

**Current version:** OpenClaw `2026.2.23`
**Current score:** ~65-70% (CEO self-assessment, confirmed accurate)
**Target:** 95% (operational reliability) → 100% (full autonomous loop closure)

---

## What's Done ✅

| Pillar | Evidence |
|---|---|
| Org + roles (8 agents) | RED/ZEN/ENG/OPS/INFOSEC/RESEARCH/FINANCE/HATAKE — all defined |
| Cognitive architecture | goals/state/working memory in every workspace |
| Heartbeat loop (30m) | All 8 agents on autonomous 30m heartbeat |
| A2A messaging | `sessions_send`/`sessions_spawn` enabled + logging required |
| Approval gates | High-risk actions gated in every SOUL.md |
| Ticket/SLA system | TICKET-TRACKER.md + SLA policy (P0=30m, P1=2h, P2=8h, P3=48h) |
| Cron jobs (8 active) | Finance (portfolio, trading, QQQ), ENG (GitHub, daily), OPS (health), RESEARCH (AI trends) |
| Slack + Telegram | All 8 bots live, all channel IDs mapped in ORG.md |
| Lobster workflows | eng-coding-factory + red-daily-ops with approval gates |
| Config errors fixed | 4 openclaw.json validation errors resolved, gateway clean |

---

## What's Pending ❌ (blocking 95%+)

| Gap | Root Cause | Impact |
|---|---|---|
| **Rate-limit bursts** | QQQ watch `*/2`, ENG status `*/10 *`, multiple jobs at `:00` same hour | Provider throttles → cascading failures |
| **ENG status cron stale** | `*/10 * * * *` runs 24/7 with hardcoded "in progress" message from Feb 2026 | Noise, wastes tokens, misleads |
| **No autonomy scorecard** | No job computes % runs without human, delivery success rate, MTTR | Can't measure progress toward 95% |
| **No config CI gate** | `openclaw doctor` not enforced before config reload | Schema drift lands silently |
| **Delivery lint** | Agents send Telegram inline from Slack-bound sessions | Cross-channel delivery failures |
| **Cron sandbox paths** | Some cron messages reference `workspace/` paths that may not resolve | Silent read failures in isolated sessions |

---

## Implementation Plan (ordered by impact)

### Phase 1 — Stop the bleeding (Day 1) 🔴

**P1.1 — Disable stale ENG status cron**
- Job: `35169d6a` "Implementation Status Updates (temp, every 10 min)"
- Action: Disable it — it was marked "temp" in Feb 2026, still running 24/7
- Impact: Eliminates 144 unnecessary agent runs/day

**P1.2 — Rate-limit shaping**
- QQQ watcher `*/2 12-15`: change to `*/5 12-15` (every 5 min, still responsive)
- Stagger jobs that fire at `:00`: offset by 2-5 min each
- Current `:00` collisions: GitHub (10,13,16,19), Market Leads (10,12,14,15), Trading Brief (0,30 8-15), Health Watch (*/30)
- Fix: shift each by 2-3 min offset

**P1.3 — Fix cron workspace path references**
- Crons use `workspace/` paths in isolated sessions — verify these resolve
- Standard: use paths relative to agent workspace root (no `../` needed in cron payloads)

### Phase 2 — Close the loop (Day 2) 🟡

**P2.1 — Autonomy scorecard cron (daily)**
- New job: `ops` agent, runs at `0 9 * * 1-5`
- Reads: `cron/jobs.json` state, `workspace/logs/a2a-delegations.jsonl`, `workspace/ops/TICKET-TRACKER.md`
- Computes: % cron runs OK (last 24h), A2A activity count, open ticket count, delivery success rate
- Posts to Slack `#redos-mission-control` + Telegram DM

**P2.2 — Config CI gate skill**
- New skill: `workspace/skills/config-ci-gate/SKILL.md`
- Instruction: before any `openclaw.json` edit, run `openclaw doctor` first
- If errors found: open a ticket, do not proceed

**P2.3 — Delivery lint rule in SOUL.md**
- Add to shared `workspace/SOUL.md`: explicit rule that `message(send)` MUST include `channel` + `target`
- Slack posts only from Slack-bound sessions/crons
- Telegram DMs only to known user IDs

### Phase 3 — Measure and prove (Week 1) 🟢

**P3.1 — Autonomy KPIs (tracked weekly)**
- % cron runs completed without error (target: >95%)
- % A2A interactions logged per day (target: >10/day)
- Mean time to ticket close (target: P1 < 2h, P2 < 8h)
- Delivery success rate (target: >98%)
- Rate-limit incidents per week (target: 0)

**P3.2 — Weekly autonomy score report**
- FINANCE or OPS computes the score every Monday
- Posts to `#redos-mission-control`: "Autonomy Score: X/10 — here's why"

---

## Score Projection

| After | Score | What changes |
|---|---|---|
| Now | 6.5/10 | Baseline |
| After Phase 1 | 7.5/10 | No more burst failures, no stale cron noise |
| After Phase 2 | 8.5/10 | Measurable autonomy, config safety, delivery reliability |
| After Phase 3 | 9.0/10 | Proven, tracked, self-reporting system |
| Full 10/10 | 10/10 | Requires: zero human interventions for 7 days straight, all KPIs green |

---

*Last updated: 2026-02-24 by Cascade audit*
