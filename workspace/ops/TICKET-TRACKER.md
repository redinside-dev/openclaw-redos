# Ticket Tracker

## Security
- [ ] **SEC-001** Decide pending access request **request-001** (agent:eng -> workspace/security/trust_scores.json, read) before expiry (2026-03-05T23:45:00Z). Owner: infosec. Priority: P1. (Task: workspace/tasks/SECURITY-20260305-resolve-request-001-before-expiry.md)
- [ ] **SEC-002** Investigate & remediate potential plaintext Slack bot token exposure flagged in `workspace/security/audit_log/2026-03-04.log` (rotate token, scrub files/history, add secret scanning). Owner: infosec + ops. Priority: P0.
- [ ] **SEC-003** Remove plaintext Slack token occurrences currently in repo workspace (`scripts/a2a-delegate-safe.sh`, `scripts/a2a-ping.sh`, `workspace/tmp/openclaw.json`); rotate/revoke token if real. Owner: infosec + ops. Priority: P0.
- [ ] **SEC-004** Fix invalid OpenClaw config schema: `openclaw.json` has `auth` keys unrecognized; run `openclaw doctor --fix` and verify auth controls still enforced. Owner: ops. Priority: P1.
- [ ] **SEC-005** Triage repeated Perplexity `web_search` 401 insufficient_quota; add backoff/circuit breaker and restore quota/keys. Owner: ops/finance. Priority: P2.

## Ops
- [ ] **OPS-001** Network API connectivity failure: `api.openclaw.ai` unreachable (affecting cloud services). Owner: ops. Priority: P1.
- [ ] **OPS-002** Ollama embeddings model support: qwen3.5:4b lacks embeddings capability (breaking search/retrieval). Owner: ops. Priority: P1.
- [ ] **OPS-003** Cron job LLM timeout failures: multiple timeout errors in session:agent:main:cron. Owner: ops. Priority: P2.
- [ ] **OPS-004** Loop detection warnings: exec called 30+ times with identical arguments (potential infinite loops). Owner: ops. Priority: P2.
- [ ] **OPS-005** Missing automated backup verification: no backup from today found (only historical backups). Owner: ops. Priority: P2.
- [ ] **OPS-006** Docker not installed: container runtime unavailable (limiting workflow options). Owner: ops. Priority: P3.
- [ ] **OPS-007** Loop detection warnings: exec called 30+ times with identical arguments (potential infinite loops). Owner: ops. Priority: P2.
- [ ] **OPS-008** P0: Fix 9router port mismatch — service listening on 20128 but health check expects 9999. Reconfigure or adjust health check. Owner: ops. Priority: P0.
- [ ] **OPS-009** P0: Replenish Anthropic API credits or switch to fallback models to restore agent functionality. Owner: ops/finance. Priority: P0.
- [ ] **OPS-010** P0: Set PERPLEXITY_API_KEY environment variable and fix model names (`perplexity/sonar`, `exa/web_search_exa`) in config. Owner: ops. Priority: P0.
- [ ] **OPS-011** P0: Fix LLM model configuration: replace `cursor-agent` with `anthropic/cursor-agent` and correct other unknown model references. Owner: eng/ops. Priority: P0.
- [ ] **OPS-012** P1: Implement automated backup system with daily rotations (cron + retention). Owner: ops. Priority: P1.
- [ ] **OPS-013** P1: Investigate and resolve high memory usage (15GB/16GB) – potential memory leak or insufficient resources. Owner: ops. Priority: P1.
- [ ] **OPS-014** P1: Fix dashboard EADDRINUSE on port 19000 (port conflict). Owner: ops. Priority: P1.
- [ ] **OPS-015** P1: Investigate gateway restart timeouts (30s) – increase drain timeout or kill long-running embedded runs. Owner: ops. Priority: P1.
- [ ] **OPS-016** P1: Fix Slack/Discord delivery failures (`not_in_channel`) – ensure bot is in target channels and has permissions. Owner: ops. Priority: P1.
- [ ] **OPS-017** P1: Create `memory/heartbeat-state.json` file to prevent repeated read errors in gateway. Owner: ops. Priority: P1.
- [ ] **OPS-018** P2: Update n8n from 2.10.3 to 2.10.4. Owner: ops. Priority: P2.
- [ ] **OPS-019** P2: Update outdated Homebrew packages: maven, ollama, uv, ngrok, memo. Owner: ops. Priority: P2.
- [ ] **OPS-020** P2: Apply OpenClaw CLI upgrade to 2026.2.14. Owner: ops. Priority: P2.

## Eng
- [ ] **ENG-001** Loop detection warnings: exec called 30+ times with identical arguments (potential infinite loops). Owner: eng. Priority: P2.
CRITICAL: 9router service running on port 20128 but health check expects port 9999
CRITICAL: A2A delegation timeouts detected in gateway logs (6 timeout errors, 80% success rate)
CRITICAL: No automated backup system found - only manual backups exist
CRITICAL: Gateway restart timeouts (30s) with 8+ operations still active
CRITICAL: LLM model configuration errors - unknown models: cursor-agent, perplexity/sonar, exa/web_search_exa
CRITICAL: High memory usage - 15GB/16GB (94%) - potential memory leak
CRITICAL: Dashboard EADDRINUSE on port 19000 (port conflict)
CRITICAL: Slack/Discord delivery failures - 'not_in_channel' errors
CRITICAL: Missing memory/heartbeat-state.json file causing repeated read errors
CRITICAL: Gateway process restart failures (spawnSync launchctl ETIMEDOUT)
