# Backlog Freshness Audit — 2026-06-09 12:18Z

**Auditor:** ENG (auto-wakeup sweep, post 1st deferral of #28)
**Source:** `workspace/projects/backlog.md` (sweep of all 48 numbered items, #1-#48)
**Mode:** Read-only (exec blocked by TICKET-20260609-SLACK-EXEC-APPROVALS-001)
**Purpose:** Single-pass audit to surface the highest-priority read-only work, the truly-stale items, and the items that are dormant but not actionable in this state. Replaces the need for a "what should I pick up next?" agent sweep on every heartbeat.

---

## Tally (48 items total)

| Status | Count | Notes |
|--------|------:|-------|
| ✅ DONE / RESOLVED | 33 | Items #6, #8-22, #23-26, #27, #29, #30, #32, #35-36, #38-39, #43-45, #47-48 (plus a few interleaved). |
| 🟢 PR OPEN (awaiting upstream / review) | 4 | #21, #22, #35, #45 — all have real PR URLs. |
| 🟡 CODE STAGED (waiting on Anurag / human) | 2 | #37 (ChatOptions merge), #40 (MCP error codes). |
| ⚠️ STALE PR (awaiting Anurag decision) | 1 | #31 (McpClientListener, PR #11 46d old). |
| ⚪ DEFERRED (exec-blocked) | 1 | #28 (ModerationModel.toText) — full spec preserved. |
| 🟡 STALE-PENDING (51d) | 2 | #33 (slash model paths), #34 (ANTLR4 monitor). |
| ❌ MISSING FROM SWEEP | 1 | #7 not in scan range — verify separately. |

---

## Health findings (the actually-useful bits)

### 1. The 4 truly-actionable items
- **#28** (ModerationModel.toText) — DEFERRED this session. Spec preserved. Block: exec.
- **#33** (slash model paths) — VIABLE, clean fresh-pickup target. Upstream #5413 still OPEN, no PRs. Block: exec.
- **#34** (ANTLR4 shading) — VIABLE but should be **monitor-only**: community PR #5752 is 50d stalled but still alive. The right play is to wait for #5752 to either land or be formally closed; if it dies past 60d, open a competing focused-shadng PR. No action needed this session.
- **#31** (McpClientListener) — STALE PR, awaits Anurag decision (close / rebase / leave). Already documented in ticket-tracker. Block: Anurag.

### 2. The 4 PR-OPEN items
- **#21** spring-ai #5818 (ChatClient toolCalls) — awaiting CI / maintainer.
- **#22** langchain4j (MissingArgumentException) — PR URL field is literally `<fill in PR URL>`. **Action: read fork state to fill in the URL, or note that the PR was never actually opened.**
- **#35** spring-ai-graph PR #1 — open on fork, awaiting first review.
- **#45** spring-ai #6345 (streamable-http GET probe) — ENG's own PR from 06:48Z, has an `isStatelessOk` helper + `WebClientStreamableHttpGetProbeIT`. Awaiting upstream CI.

### 3. The 2 CODE STAGED items (Anurag-gated)
- **#37** spring-ai #5821 (ChatClient.defaultOptions merge) — non-breaking design change. Local commit `f699c9698` pushed but no PR opened. ENG-1780973407 noted: "DID NOT open PR (non-breaking design change)." Awaiting Anurag maintainer call.
- **#40** spring-ai #5812 (MCP error codes -32602→-32603) — full code shipped, 1356 tests green, but PR not opened because prior PR #5828 was self-closed with a "going forward all contributions will go through proper human review" note. ENG holding for Anurag.

### 4. The 1 missing item
- **#7** — Not in the scan window. Probably DONE from a prior session. Quick read pass to confirm.

### 5. Systemic rot
- **#31, #32** are both "Anurag decision" / "Anurag re-decision" tickets that have been waiting > 30 days. These are NOT in the morning-decisions packet (per the ticket-tracker header). They should probably be added to a future packet, or rotated out of the backlog as "DECIDED: leave as-is" if Anurag has implicitly chosen inaction.
- **#22** has a placeholder PR URL field — quality rot, should be filled in or marked "PR never opened."

### 6. What the next ENG session should do (read-only, no exec)
1. Fill in #22 PR URL (read fork state) OR mark it as "PR never opened, see commit ___."
2. Confirm #7 status.
3. Add a one-line decision-needed note to #31 and #32 pointing to Anurag's morning-decision style.
4. If exec is still blocked: pick up **#33** (slash model paths) once exec is back, OR claim **#28** if Anurag wants the ModerationModel refactor prioritized.
5. Continue the 3-step upstream-PR-check pattern (web-search before claiming; this session caught 2 dupes in the first sweep — #43, #44 — before any work was started).

---

## Why this audit is read-only-safe
- All actions above are read/parse/edit on backlog.md, no `gh` / `git` / `mvn` invocations.
- No public-facing side effects.
- Improves the state of the workspace for any future ENG sweep (next cron wakeup will hit a cleaner backlog).
- Cost to write: 1 file. Cost to verify: 1 read.

---

## Cross-references
- `workspace/ops/TICKET-TRACKER.md` — 2 OPEN tickets remain (GMAIL-OAUTH-002 P1, 9ROUTER-PR-PAUSE-STALE-001 P3).
- `workspace/AUTONOMOUS.md` — 0 PENDING ENG tasks. ENG-1781002232 / ENG-1780985406 / ENG-1780973407 in past.
- `workspace-eng/memory/working-eng.json` — lastAction updated with the deferral at 12:10Z; now updated with this audit at 12:18Z.

---

_End of audit. ENG will touch the heartbeat and return to idle._
