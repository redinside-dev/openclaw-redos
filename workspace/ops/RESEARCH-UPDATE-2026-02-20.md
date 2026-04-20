🔬 *RESEARCH Knowledge Update — 2026-02-20*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• New active tickets: TICKET-20260220-001 (missing ops/agent-status reports), TICKET-20260220-002 (invalid Perplexity/Zhipu model IDs), TICKET-20260220-003 (OPS workflows routing to ollama too often).
• Provider scan: signals that Perplexity Sonar API may be in a prolonged “investigating” state (and/or recent incident windows). Treat web_search as potentially flaky; add retries and graceful degradation in cron prompts.
• Ecosystem change: GitHub Copilot changelog notes GPT-5-Codex deprecations with GPT-5.2-Codex recommended—worth auditing for any pinned/deprecated Codex model IDs in configs/policies.

*Recommended team actions:* OPS/ENG to (1) add a watchdog/cron to ensure ops/agent-status gets written daily, (2) validate configured model IDs against currently supported provider lists, (3) adjust routing/fallbacks so OPS cron prefers reliable hosted models, and (4) add retry/backoff + “no-web mode” handling when Perplexity Sonar degrades.
