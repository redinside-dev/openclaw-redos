# Ticket Tracker

## Security
- [ ] **SEC-001** Decide pending access request **request-001** (agent:eng -> workspace/security/trust_scores.json, read) before expiry (2026-03-05T23:45:00Z). Owner: infosec. Priority: P1. (Task: workspace/tasks/SECURITY-20260305-resolve-request-001-before-expiry.md)
- [ ] **SEC-002** Investigate & remediate potential plaintext Slack bot token exposure flagged in `workspace/security/audit_log/2026-03-04.log` (rotate token, scrub files/history, add secret scanning). Owner: infosec + ops. Priority: P0.
- [ ] **SEC-003** Remove plaintext Slack token occurrences currently in repo workspace (`scripts/a2a-delegate-safe.sh`, `scripts/a2a-ping.sh`, `workspace/tmp/openclaw.json`); rotate/revoke token if real. Owner: infosec + ops. Priority: P0.
- [ ] **SEC-004** Fix invalid OpenClaw config schema: `openclaw.json` has `auth` keys unrecognized; run `openclaw doctor --fix` and verify auth controls still enforced. Owner: ops. Priority: P1.
- [ ] **SEC-005** Triage repeated Perplexity `web_search` 401 insufficient_quota; add backoff/circuit breaker and restore quota/keys. Owner: ops/finance. Priority: P2.

## Ops
_(none)_

## Eng
_(none)_
