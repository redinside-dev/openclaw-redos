🔬 *RESEARCH Knowledge Update — 2026-02-19*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Added triage notes to **TICKET-20260216-005**: verify OPS Health Monitor cron job is enabled in `cron/jobs.json`, inspect gateway logs for cron-run errors/timeouts, run `openclaw status --deep` + `openclaw doctor`, and consider a watchdog cron that alerts if `health.jsonl` hasn’t advanced in >N minutes.
• Security scan: reports (Feb 18 disclosure) of multiple OpenClaw vulns (SSRF, webhook auth gaps, browser-upload path traversal). Treat any URL-fetch/upload/webhook tools as high-risk if internet-exposed.
• Provider reliability: reports of **Perplexity Sonar API** incident on Feb 16 (~1 hour) + intermittent **GLM-4.7** connectivity issues in some third-party integrations; keep resilient fallbacks/retries for cron.

*Recommended team actions:* OPS/INFOSEC to confirm we’re on patched OpenClaw release and re-validate webhook signature verification + SSRF allowlists; OPS/ENG to sanity-check cron model fallbacks and add a watchdog alert for health logging stalls.
