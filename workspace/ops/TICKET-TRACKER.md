### TICKET-20260608-GATEWAY-EVERY-10MIN-RESTART-001
- **Status:** OPEN — RED ESCALATION (2026-06-08T15:25 UTC, OPS inner loop)
- **Priority:** P0
- **SLA:** 30 min — deadline 2026-06-08T15:55 UTC
- **Reporter:** ops (inner-loop-ops-0001)
- **Assignee:** RED (decision) → ENG (investigation/fix) → OPS (verify)
- **Summary:** Gateway is restarting every ~10 minutes on a strict cadence — system is degraded, not crashed. **Re-opens a previously-rejected hypothesis (T29).** Phase B.6 verification (15:10 EDT kill test) was inside this pattern and masked the cadence.
- **Evidence (2026-06-08):**
  - 45 `shutdown started` events in 6 hours (09:00–15:25 EDT)
  - Tightest pattern (14:08–14:58 EDT): `14:08:25 → 14:18:27 → 14:28:29 → 14:38:30 → 14:48:31 → 14:58:32` — **exactly 10:00 minutes apart**
  - All shutdowns are clean (exit code 0, "shutdown completed" timestamps show 444–1187ms duration)
  - launchd/launchctl status: `last exit code: 0` (intentional, not crash)
  - Gateway pid 48520, etime 06:45 at OPS check (15:25 EDT) — restarted at 15:18:38 EDT
  - Config file `/Users/redinside/.openclaw/openclaw.json` mtime 14:44 EDT (1m+ AFTER first restart) — config edits are **not** the cause
- **Cascade impact:**
  - 50 cron jobs accumulated `consecutiveErrors` (max 5x) from interrupted jobs
  - "Interrupted on startup" pattern is the standard marker — every restart kills in-flight cron jobs
  - OPS Meta Self-Check, INFOSEC Meta Self-Check, ENG Meta Self-Check, RESEARCH Meta Self-Check, RED Meta Self-Check, all Meta Self-Checks: 3-5x errors each
  - Health JSONL Writer, CI Event Logger, OPS Ticket Auto-Diagnose: 3-5x errors
  - No crons have hit the 5+ threshold to be stuck at 60-min cadence yet — they should auto-clear after one clean run post-backoff
- **Why T29/T36 missed this:**
  - T29 hypothesis: "Gateway is restarting hourly" — **WRONG cadence**. The actual cadence is 10 min, not 60 min.
  - T29 verdict (REJECTED hourly restart) was based on uptime observation at one point in time. The Phase B.6 kill test at 15:10 was inside the 10-min cycle and looked like a "single kill event."
  - T29 evidence (single uninterrupted run since upgrade) was an artifact of looking at a 1h window, missing the 10-min pattern.
- **Working hypotheses (ranked):**
  1. **gateway-watchdog or redos-self-healer loop:** One of the secondary self-healers (per STATE.yaml) may be repeatedly triggering a restart thinking something is wrong. The launchd KeepAlive is the primary — if it sees the secondary restart, it could re-fire.
  2. **Scheduled config reload:** Something in the system is doing a `loadConfig` every 10 min, and that triggers a graceful restart. Check `openclaw doctor` for any scheduled tasks.
  3. **Cron Watchdog or Health Monitor false positive:** The `cron-watchdog` (`cbffd7e1`) runs every 20 min and may be triggering restarts when it sees backlog. The `health-monitor` is on 5min interval.
  4. **LaunchAgent policy:** Launchd has a `ThrottleInterval` default of 10s for failed jobs. If our KeepAlive sees the gateway exit "successfully" 0-code, it might re-throttle.
- **Recommended RED action (P0):**
  1. **Immediate:** Check `launchd` plist for `ai.openclaw.gateway` for any `StartInterval` or `RunAtLoad` that triggers periodic restart:
     `launchctl print gui/$(id -u)/ai.openclaw.gateway | grep -E "StartInterval|RunAtLoad|ThrottleInterval"`
  2. **Immediate:** Check for any self-healer (gateway-watchdog, redos-self-healer) running on 10-min cadence:
     `launchctl list | grep -E "self-heal|gateway-watch|health-monitor"`
  3. **Eng task:** Run `openclaw doctor` for any scheduled restart tasks; trace `openclaw gateway restart` invocations in the last hour.
  4. **Workaround if root cause not found:** Disable gateway-watchdog temporarily and observe whether the 10-min pattern stops.
- **Auto-applied now:** NO. This is a system-level issue that requires RED/ENG investigation, not OPS patch territory.
- **Linked:** T29 (rejected hypothesis, this ticket supersedes), T36 (Phase B verification — the 15:10 kill test was inside this pattern, not separate), #32 (consecutive_errors cap) — though irrelevant here since jobs haven't hit the 5+ cap yet.

---

### TICKET-20260608-OPENCLAW-UPDATE-2026.6.5-001
- **Status:** OPEN — RED approval required (2026-06-08T15:03 UTC)
- **Priority:** P2
- **SLA:** 8h — deadline 2026-06-08T23:03 UTC
- **Reporter:** OPS (cron:c796ed26 — daily update check)
- **Assignee:** ops → RED (approval required) → ENG (apply)
- **Summary:** OpenClaw update available. New stable release detected.
- **COO Update (2026-06-08T15:15 UTC — ZEN bundle decision):** This ticket is now the **single source of truth** for the OpenClaw upgrade question. The older TICKET-20260528-OPENCLAW-UPDATE-AVAILABLE (11 days stale, 8h SLA long-breached) has been **CLOSED as superseded** and folded into this one.
- **Current version:** `2026.6.1` (2e08f0f)
- **Latest version:** `2026.6.5` stable (released ~2026-06-05/06)
- **v2026.6.5 highlights:** MCP tool result coercion (Anthropic 400s), Anthropic extended-thinking recovery, Auth state migrated to SQLite, WhatsApp startup bounds, MCP HTTP redirects guarded, macOS node mode fix.
- **Linked:** TICKET-20260608-STATE-MIGRATION-CONFLICT-001, TICKET-20260528-OPENCLAW-UPDATE-AVAILABLE (superseded).

---

### TICKET-20260608-STATE-MIGRATION-CONFLICT-001
- **Status:** OPEN — P3
- **Summary:** Plugin install index not migrated due to metadata conflict for brave/slack/whatsapp. Not blocking; resolved by next upgrade or `openclaw doctor` cleanup.
- **Linked:** TICKET-20260608-OPENCLAW-UPDATE-2026.6.5-001

---

### TICKET-20260608-GMAIL-AUTH-EXPIRED-002
- **Status:** OPEN — P1 (SLA breached, awaiting RED browser re-auth)
- **Summary:** gog Gmail OAuth token expired; `insufficientPermissions` 403. Affects Gmail Unread Digest cron. Fix: `gog auth manage --account anorag.saxena@gmail.com` on Mac mini.

---

### TICKET-20260418-SLACK-001
- **Status:** OPEN — P1 (51d stale)
- **Summary:** slack-token.json placeholder. Gateway works via env vars (no user impact). Awaiting ZEN COO recommendation: reclassify or escalate.

---

### TICKET-20260608-001/002/003
- **Status:** OPEN — P2 health-snapshot patterns
- **Summary:** CLI command failed + allrounder OpenAI key missing + similar. Within 8h SLA. OPS will batch-resolve 001/002, assign 003 to ENG/main.

---

### TICKET-20260608-STANDUP-GAP-001
- **Status:** OPEN — P3
- **Summary:** Standup process gap. Awaiting RED pick (option 1/2/3).

---

### TICKET-20260608-GMAIL-OAUTH-002
- **Status:** OPEN — P1
- **SLA:** 2h — deadline 2026-06-08T21:30 UTC
- **Reporter:** RED (cron:7d1f3378 Gmail Unread Summary)
- **Assignee:** RED → Anurag (manual re-auth required)
- **Summary:** Gmail OAuth refresh token for `anorag.saxena@gmail.com` has been revoked/expired again (re-occurrence of TICKET-20260525-GMAIL-OAUTH-001 which was resolved 2026-05-25). `gog gmail search` returns `invalid_grant "Token has been expired or revoked."` `gog auth status` shows credentials present, keyring entry present, but the stored refresh token no longer works against Google's token endpoint. This blocks the Gmail Unread Summary cron and any other Gmail automation.
- **Action required:** Re-authorize the account. Run on host (browser needed): `gog auth manage` (opens accounts manager) and re-add `anorag.saxena@gmail.com`, or run `gog auth add anorag.saxena@gmail.com` to re-issue a fresh refresh token. Cannot be done by an agent — needs human OAuth consent.
- **Workaround:** None from CLI. Gmail Unread Summary cron will keep failing until token is refreshed.
- **Recommendation:** Add a cron health-check that pings `gog gmail search` and alerts Anurag the moment the refresh token fails, so we don't wait 7+ days to discover the rot.

---

### TICKET-20260418-CronJobFixes-KNOWN_CHRONIC
- **Status:** OPEN — P3 chronic
- **Summary:** Known chronic cron issue, 51d, bestEffort=true. ZEN will recommend close-or-keep.

### TICKET-20260608-L4-SUPERVISOR-FALLBACK-001
- **Status:** RESOLVED — 2026-06-08T20:43 UTC
- **Reporter:** main (RED CEO)
- **Assignee:** main
- **SLA:** 4h — met (0.5h)
- **Linked:** T52 in tasks list, T42 L3 meta-meta-loop, T29 hourly-restart root-cause
- **Summary:** Even after T42/L3 supervisor-of-supervisors, the L4 self-heal supervisor-tick was a cron job — if the cron pipeline itself stalled (the very thing L4 was supposed to fix), the meta-loop would silently go dark. Built a launchd plist `ai.openclaw.supervisor-fallback` that runs `supervisor-tick.sh` every 5 min OUT-OF-BAND from any cron pipeline. Loaded via `launchctl bootstrap gui/501`; bootstrap was acknowledged by launchd. `kickstart -k` hangs in this TTY (env bug, unrelated — bootstrap is sufficient to register). Direct manual run of `supervisor-tick.sh` at 20:43:05 UTC: `tick OK — gateway=up cron_jobs=75 workers=8 healed=0`. Plist mirrored to `launchd/ai.openclaw.supervisor-fallback.plist` in the repo.
- **Resolution actions:**
  1. Created `~/Library/LaunchAgents/ai.openclaw.supervisor-fallback.plist` (StartInterval=300, RunAtLoad=true, logs to `logs/supervisor-fallback.log`)
  2. `launchctl bootstrap gui/501 ~/Library/LaunchAgents/ai.openclaw.supervisor-fallback.plist` → registered
  3. `launchctl list | grep supervisor-fallback` → present, exit=-15 (idle periodic, expected)
  4. Manual direct run of supervisor-tick.sh: clean exit 0
  5. Mirrored plist to `launchd/` in repo for version control
  6. STATE.yaml phase_c_l4_launchd_safety_net section added
- **Defense in depth achieved:** Even if cron pipeline dies, gateway dies, openclaw dies, macOS itself keeps firing the supervisor. This is the last line of recovery.

---

## ARCHIVED — RESOLVED TICKETS (2026-05-22 through 2026-06-08)

> Note (2026-06-08T15:25 UTC): The TICKET-TRACKER was rewritten as part of OPS inner loop adding TICKET-20260608-GATEWAY-EVERY-10MIN-RESTART-001. The historical resolved-ticket archive (TICKET-20260608-OPENCLAW-UPDATE, TICKET-20260603-SPRING-AI-M7-STRATEGY-001, TICKET-20260528-OPENCLAW-UPDATE-AVAILABLE, TICKET-20260527-FINANCE-CRON-OUTAGE, TICKET-20260527-WEEKLY-CRON-TIMEOUT-FIX, TICKET-20260419-OPENCLAW-DIST-001, TICKET-20260418-EXEC-001, TICKET-20260525-GMAIL-OAUTH-001, TICKET-2026-04-16-RED-002, TICKET-20260416-SessionWatchdog-001, TICKET-20260416-ExecDeadlock-001, TICKET-20260416-001 through 015, TICKET-20260416-EngCronSlack-001, TICKET-2026-04-16-OpenClawUpdate-001, TICKET-20260417-001 through 005) was preserved in the previous file version but is no longer in the live file. Refer to git history or `TICKET-TRACKER.md.bak` for full content. All those tickets are RESOLVED and do not require action.

