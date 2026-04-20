# OpenClaw RedOS Audit — 2026-03-15

**Framework Version:** OpenClaw 2026.3.13 (61d171a)
**Auditor:** Claude Code (automated)
**Scope:** Gap analysis against framework capabilities

---

## A) Framework Version & Status

- Running **2026.3.13** (latest stable channel = 2026.3.12 on npm; local build is 1 version ahead — OK)
- Node 25.8.0 on macOS arm64
- Gateway active, reachable in 7ms; 376 sessions; 8 agents configured

---

## B) What Is Configured and Working Well

| Area | Status |
|---|---|
| 8 agents registered, 7 bootstrap files present | Good |
| A2A: sessions_spawn + sessions_send enabled | Good |
| Maker-Checker L0–L5 fully documented and wired | Good |
| memory-core plugin active, LanceDB vector + FTS ready | Good |
| 9Router fallback chain: free-unlimited → heartbeat-cheap | Good |
| 48 skills configured in openclaw.json | Good |
| Cron: 73/74 enabled, no hardcoded model fields | Good (compliant) |
| AUTONOMOUS.md task queue wired to agent SOUL.md | Good |
| Event-driven architecture complete (GOAL-005 done) | Good |
| Budget guardrails defined with PAYG pause at 100% | Good |
| 5 agent knowledge bases exist (eng/research/ops/finance/infosec) | Good |
| Working memory files present for all 8 agents | Good |
| Loop detection configured | Good |
| n8n on port 5678 with GitHub + Slack webhooks live | Good |

---

## C) Gaps — Framework Features NOT Being Used

### C1. Sandbox (Docker isolation) — NOT ACTIVE
- `tools.sandbox` is configured but `agents.defaults.sandbox.mode` is not set to `"all"` or any mode.
- Framework supports full Docker-based sandbox per session (`openclaw sandbox list/explain/recreate`).
- **Impact:** CRITICAL per `openclaw doctor` — small models (ollama/qwen3.5:4b in OPS fallback) running with web tools (web_search, web_fetch, browser) and sandbox=off. This is a security violation flagged by doctor as 8 critical issues.
- **Fix:** Set `agents.defaults.sandbox.mode = "all"` OR remove qwen3.5:4b from fallback chains and add it only to heartbeat crons with `tools.deny=["group:web","browser"]`.

### C2. Tailscale + DNS Wide-Area Discovery — NOT ACTIVE
- `gateway.tailscale = off`, `openclaw dns setup` never run.
- Framework supports Tailscale + CoreDNS for multi-device agent discovery.
- **Impact:** Agents are loopback-only; no cross-machine A2A or mobile access without Cloudflare Tunnel.
- **Recommendation:** Low priority if single-machine. Enable if you want mobile device or second Mac connectivity without Cloudflare dependency.

### C3. Backup System — NOT USED
- `openclaw backup create/verify` commands exist but no cron or LaunchAgent runs them.
- **Impact:** identity/device.json, sessions (376 active), credentials — all unprotected against disk failure.
- **Fix:** Add a weekly cron job (L1 — auto-approve) calling `openclaw backup create` and write to an external volume.

### C4. OpenTelemetry / Diagnostics Plugin — NOT ACTIVE
- `diagnostics-otel` plugin is installed but `disabled`.
- Framework supports exporting traces/metrics to OTEL collectors (Grafana, Datadog, etc.).
- **Impact:** No structured observability beyond workspace/logs/*.jsonl.
- **Recommendation:** Enable for GOAL-002 (Zero Silent Failures) — provides automatic span traces on all LLM calls.

### C5. `diffs` Plugin — NOT ACTIVE
- Read-only diff viewer plugin for agents is disabled.
- Agents currently use raw exec `git diff` for code review tasks.
- **Fix:** Enable `diffs` plugin to give agents structured file diff access without exec elevation.

### C6. LanceDB Plugin — DISABLED (memory-lancedb)
- `memory-lancedb: enabled: false` in plugins.entries.
- `memory-core` is active but LanceDB plugin (which provides the vector store backend) is disabled.
- **Note:** `openclaw doctor` shows `vector ready` — verify whether memory-core bundles its own vector or depends on the disabled plugin. If memory-core works independently, this is a non-issue.

### C7. `openclaw tui` — Not used in any automation
- Terminal UI exists but no agent or cron uses it.
- Minor gap — informational only.

### C8. `openclaw update auto` — Not confirmed
- `update.auto` key exists in openclaw.json but value unknown. Framework supports auto-updates.
- Confirm this is set to watch `stable` channel with auto-apply enabled to stay current.

### C9. 9 Skills in directory NOT in openclaw.json (inactive)
The following skills exist as SKILL.md files but are NOT listed in `skills.entries` and are therefore not injected into any agent session:

| Skill | Purpose |
|---|---|
| `autonomous-a2a` | Extended A2A autonomy patterns |
| `context-window-policy` | Mandatory 70% flush policy |
| `cost-optimization` | Cost reduction playbook |
| `event-driven-patterns` | Event vs cron decision guide |
| `lead-gen-maps` | Lead generation workflows |
| `outreach-automation` | Outreach automation |
| `policy-gate` | Policy enforcement layer |
| `website-auditor` | Website audit workflows |
| `website-builder` | Website build workflows |

**High-priority gaps:** `context-window-policy` and `cost-optimization` are company-wide mandates referenced in SOUL.md but not injected via skills.entries — agents must read them manually each session. `policy-gate` and `autonomous-a2a` are also relevant to GOAL-001.

### C10. Heartbeats disabled on 7 of 8 agents
- Only `main` has a 30-minute heartbeat. All others (allrounder, eng, finance, hatake, infosec, ops, research) show `disabled`.
- These agents rely entirely on cron-triggered `sa-*-checkin-*` jobs (which are present and enabled).
- **Gap:** If a cron misses or errors, there is no heartbeat fallback to keep the agent warm.
- **Fix:** Enable heartbeat at minimum for eng and ops (highest task throughput agents).

### C11. Missing 1 agent bootstrap file
- Doctor shows "7 bootstrap files present" for 8 agents — one agent is missing its bootstrap.
- Identify which agent via `openclaw agents list` and regenerate.

### C12. `openclaw sessions cleanup` — not scheduled
- 2180 orphan transcript files detected by doctor in agents/main/sessions/.
- Maintenance cron for session cleanup (`openclaw sessions cleanup`) is not wired.
- **Fix:** Add a weekly L1 cron: `openclaw sessions cleanup`.

### C13. Multiple state directories
- Doctor flagged: `/Users/openclaw-ops/.openclaw` detected alongside `~/.openclaw`.
- This can split session history and cause confusion.
- **Fix:** Consolidate or explicitly ignore the ops user's state dir.

### C14. Legacy session keys
- Doctor flagged: "canonicalize legacy keys in agents/main/sessions/sessions.json"
- Run `openclaw doctor --fix` or manually run the canonicalize step to resolve.

---

## D) Misconfigurations / Suboptimal Settings

| Issue | Severity | Detail |
|---|---|---|
| Sandbox off + small model with web tools | CRITICAL | ollama/qwen3.5:4b in OPS fallback has web_search/web_fetch/browser enabled. Doctor flags 8 critical. |
| Telegram dmPolicy="open" on 7 bots | CRITICAL | All 7 agent Telegram accounts accept DMs from anyone. Should restrict to owner allowlist or pairing. |
| Sessions running on llama3.1:8b | HIGH | Live sessions show `model: llama3.1:8b` (a removed Ollama model per commit 87ed883). These are stale sessions — Ollama was removed to free 3.5GB RAM but old sessions still reference it. Run `openclaw sessions cleanup`. |
| Finance cron `consecutiveErrors: 6` | HIGH | Daily Portfolio cron has 6 consecutive errors — likely model routing failure after Ollama removal. Fix model reference. |
| 1 session lock file | MEDIUM | Active lock on session 780af61b (pid 83773, age 10s at doctor time) — normal if active, stale if not. |
| working-allrounder.json stale (2026-02-28) | MEDIUM | ZEN last updated 15 days ago. Agent may be idle or stuck. |
| working-finance.json stale (2026-02-24) | MEDIUM | FINANCE memory not updated in 19 days. |
| AUTONOMOUS.md has 5 PENDING/IN_PROGRESS tasks | INFO | RED-2026-0313-001 (morning pulse) and RED-2026-0314-001 (L3 review) both PENDING for RED — not picked up. |

---

## E) Recommendations for 100% Autonomous Operation

Priority order:

1. **Fix Finance cron errors (consecutiveErrors: 6)** — identify which cron is failing, update model reference from removed Ollama model to `9router/free-unlimited`.

2. **Add `context-window-policy` and `cost-optimization` to skills.entries** — these are company-wide mandates that should be injected automatically, not read on-demand.

3. **Add `autonomous-a2a` and `policy-gate` to skills.entries** — directly support GOAL-001 autonomous operation.

4. **Fix Telegram dmPolicy** — change all 7 bots to `allowFrom: ["1012034994"]` (owner only). Open DMs are a prompt injection attack surface.

5. **Remove qwen3.5:4b from OPS fallback chain** — Ollama was removed. Update OPS agent fallbacks to `["9router/heartbeat-cheap"]` only.

6. **Add backup cron** — weekly `openclaw backup create` to protect identity/device.json and sessions.

7. **Add `openclaw sessions cleanup` cron** — weekly, L1 auto-approve, to clear 2180+ orphan transcripts.

8. **Enable heartbeat for ENG and OPS** — add 60-minute heartbeat to prevent cold starts under high load.

9. **Enable `diffs` plugin** — reduces agent dependency on `exec git diff` for code review (lowers L-tier from L2 to L0).

10. **Investigate missing bootstrap file** — run `openclaw agents list` and regenerate the missing one.

11. **Canonicalize legacy session keys** — run `openclaw doctor --fix` to resolve legacy state warnings.

12. **Consolidate state directories** — `/Users/openclaw-ops/.openclaw` should be cleared or explicitly managed.

---

## Appendix: Skills Gap Table

| Skill in directory | Configured | Notes |
|---|---|---|
| autonomous-a2a | NO | Add — supports GOAL-001 |
| context-window-policy | NO | Add — mandatory company policy |
| cost-optimization | NO | Add — GOAL-004 |
| event-driven-patterns | NO | Lower priority — GOAL-005 complete |
| lead-gen-maps | NO | Add if FINANCE/RESEARCH needs it |
| outreach-automation | NO | Add if ZEN outreach is active |
| policy-gate | NO | Add — supports L0–L5 automation |
| website-auditor | NO | Add if website agency work active |
| website-builder | NO | Add if website agency work active |

All 48 currently configured skills are present in the directory (no phantom entries).
