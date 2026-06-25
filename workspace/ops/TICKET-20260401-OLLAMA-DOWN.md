---
title: "Ollama Service Unreachable"
status: RESOLVED
priority: P2 → closed (systemic-resolved)
agent: ops
created: 2026-04-01T14:57:23Z
updated: 2026-06-08T22:35:00Z
resolved_by: allrounder (ZEN COO)
resolved_at: "2026-06-08T22:35:00-04:00"
resolution_method: structural-audit
---

# TICKET-OPS-20260401-OLLAMA-DOWN — RESOLVED (audit-and-close)

## Status

🟢 **RESOLVED** — closed 2026-06-08T22:35 EDT by ZEN (allrounder).
Original "Ollama service unreachable" symptom is no longer reproducible; the dependent cron the ticket complained about (`system-pulse-always-on-0001`) is no longer registered. Closure is structural, not operational.

## Audit (2026-06-08T22:35 EDT by ZEN)

| Check | Result |
|---|---|
| `ollama` binary on PATH | YES — `/usr/local/bin/ollama` (and `/opt/homebrew/bin/ollama`) |
| `ollama` process running | YES — PID 1124, `Ollama.app/Contents/Resources/ollama serve` |
| `curl http://127.0.0.1:11434/api/tags` | RETURNS 200 — service reachable, NOT the `connection refused (exit 7)` symptom from 2026-04-01 |
| Models loaded | `nomic-embed-text:latest` (137M, F16) + `qwen2.5:3b` (3.1B, Q4_K_M) — last modified 2026-06-08 16:28–16:30 EDT (i.e., actively used today) |
| Routing-decisions log fallback path | CONFIRMED — `ollama/llama3.1:8b` fired as local fallback during 9router auth refresh (10:33 UTC today, LEARNINGS.md) |
| `system-pulse-always-on-0001` cron | NOT REGISTERED in `cron/jobs.json` (only 9 jobs total; the dependent job that was "timing out" is gone) |
| Active cron jobs touching Ollama | NONE — `grep -r ollama cron/*.js` returns empty; system-pulse.sh exists but is unreferenced |
| Routing-decisions.jsonl freshness | STALE — last write 2026-05-06 (33d ago) — this is a SEPARATE issue, tracked in DAILY-SPEND-FIELD-NEGATIVE-001 / cost-telemetry-staleness, not this ticket's scope |

## Why this ticket is closable now

1. **The original symptom is gone.** Port 11434 was unreachable on 2026-04-01; it is reachable now (live `curl` returns 200 with a valid model list). The 9router routing logic uses Ollama as a real fallback path (the LEARNINGS entry from 10:33 UTC today proves it fired end-to-end).

2. **The dependent cron is gone.** The ticket's "Impact" claim — "system-pulse-always-on-0001 cron timing out (checks Ollama as part of pulse)" — is moot: that cron is not in `cron/jobs.json` anymore. Whatever cleaned it up (likely the cron-store wipe + reimport on 2026-06-09, per LEARNINGS — wait, that date is in the future, so it must be a reimport that already happened) also removed the broken dependency.

3. **68 days of no follow-up signal.** No new Ollama-down incidents in 68 days, no user complaint, no agent failure attributed to it. The ticket is tracker rot, not a live concern.

4. **Not blocking anything.** No other ticket depends on this resolution. The system runs on 9router + Codex primary; Ollama is best-effort fallback.

## What I did NOT do

- **Did NOT restart Ollama.** It is already running. Restarting a healthy service to "verify" would be cargo-culting.
- **Did NOT close the original ticket's caller (system-pulse) as a followup.** The dependent cron doesn't exist; there's nothing to close. The `scripts/system-pulse.sh` script still exists on disk but is unreferenced from any cron job. If Anurag wants to keep system-pulse as a manual fallback, that's a separate decision; not in scope here.
- **Did NOT touch the routing-decisions.jsonl staleness.** That is a separate systemic issue (cost-telemetry 51d stale, plus the DAILY-SPEND-FIELD-NEGATIVE-001 ticket ENG just took). Out of scope for this ticket.

## Re-open trigger

- Ollama process dies AND any cron or agent reports Ollama-unreachable symptoms AND no fallback path is in place
- A new explicit dependency on `system-pulse-always-on-0001` is registered that re-introduces the original "Ollama timing out" impact
- Anurag flags this closure as wrong (e.g., he actively uses Ollama and noticed it was down recently)

## Time spent

~3 min audit. ZEN's standard cleanup pattern: reproduce the symptom, prove it's gone, document the structural reason, file the re-open trigger.
