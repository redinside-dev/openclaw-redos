# Awesome-OpenClaw Use Cases vs RedOS — Mapping

Single source of truth for the agent: compare each use case to RedOS, then implement only approved enhancements. No custom hacks; stay within OpenClaw + existing skills/crons.

**References:**
- [awesome-openclaw-usecases/usecases](https://github.com/hesamsheikh/awesome-openclaw-usecases/tree/main/usecases)
- [OpenClaw docs](https://docs.openclaw.ai)
- [OpenClaw showcase](https://openclaw.ai/showcase)

---

## Status key

| Status | Meaning |
|--------|--------|
| **Have** | RedOS fully or largely covers the use case |
| **Partial** | Partially covered; enhancement or doc update possible |
| **Missing** | Not implemented; candidate for future work |

---

## Full use-case table

| Use case | Status | RedOS location | Enhancement notes |
|----------|--------|----------------|-------------------|
| [autonomous-game-dev-pipeline](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/autonomous-game-dev-pipeline.md) | Missing | — | Optional: pipeline crons (ENG + RESEARCH) for game-asset flow. Low priority. |
| [autonomous-project-management](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/autonomous-project-management.md) | Have | STATE.yaml, AUTONOMOUS.md, sessions_spawn/send, thin RED | None. |
| [content-factory](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/content-factory.md) | Partial | research-pipeline, RESEARCH→ENG | Use case: Research → Writing → Thumbnail chained agents. Consider writing/thumbnail chain later. |
| [custom-morning-brief](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/custom-morning-brief.md) | Have | Daily brief cron (tasks + AI-recommended), RUNBOOK | Ensure AI-recommended tasks are added to AUTONOMOUS.md and assigned (see SOUL). |
| [daily-reddit-digest](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/daily-reddit-digest.md) | Missing | — | Optional: RESEARCH cron with web_search/Reddit; or ClawHub skill if available. |
| [daily-youtube-digest](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/daily-youtube-digest.md) | Missing | — | Optional: RESEARCH cron for YouTube summaries. |
| [dynamic-dashboard](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/dynamic-dashboard.md) | Partial | Mission Control dashboard, threshold alerts cron | Use case: spawn sub-agent per data source. Document or add spawn-per-source pattern for key panels. |
| [earnings-tracker](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/earnings-tracker.md) | Have | workspace/skills/earnings-tracker, earnings-tracker-weekly cron | None. |
| [event-guest-confirmation](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/event-guest-confirmation.md) | Missing | — | Optional: n8n webhook + calendar/email; add if events are needed. |
| [family-calendar-household-assistant](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/family-calendar-household-assistant.md) | Missing | — | Optional: calendar integration via n8n. |
| [habit-tracker-accountability-coach](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/habit-tracker-accountability-coach.md) | Have | workspace/skills/habit-tracker, habit-check-in-daily cron | None. |
| [health-symptom-tracker](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/health-symptom-tracker.md) | Missing | — | Optional: personal health logging; low priority for company OS. |
| [inbox-declutter](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/inbox-declutter.md) | Missing | — | Self-healing breadth: document email triage cron (see RUNBOOK). |
| [knowledge-base-rag](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/knowledge-base-rag.md) | Have | semantic-memory, rag-url-ingestion, Qdrant/bge, memsearch.py | None. |
| [market-research-product-factory](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/market-research-product-factory.md) | Partial | competitive-intelligence, research pipeline | Add explicit flow: research pain points → opportunities → add to AUTONOMOUS → ENG build MVP. Document in SOUL or skill. |
| [meeting-notes-action-items](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/meeting-notes-action-items.md) | Missing | — | Optional: meeting ingest → action items to AUTONOMOUS. |
| [multi-agent-team](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/multi-agent-team.md) | Have | 8 agents, STATE.yaml, GOALS.md, DECISIONS.md, standups, Telegram+Slack | None. |
| [multi-channel-assistant](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/multi-channel-assistant.md) | Have | Telegram + Slack, ORG.md channel IDs | None. |
| [multi-channel-customer-service](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/multi-channel-customer-service.md) | Partial | Same channels; no dedicated “customer” routing | Optional: bindings for customer-facing flows. |
| [multi-source-tech-news-digest](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/multi-source-tech-news-digest.md) | Partial | Research weekly digest, competitive-intel | Consider [ClawHub tech-news-digest](https://clawhub.ai/skills/tech-news-digest) or RESEARCH cron with web_search aggregation. |
| [n8n-workflow-orchestration](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/n8n-workflow-orchestration.md) | Have | workspace/skills/n8n-webhooks, credential isolation | None. |
| [overnight-mini-app-builder](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/overnight-mini-app-builder.md) | Missing | — | Optional: ENG cron for “build small app from spec” overnight. |
| [personal-crm](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/personal-crm.md) | Missing | — | Optional: contact/relationship tracking. |
| [phone-based-personal-assistant](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/phone-based-personal-assistant.md) | Partial | Telegram DMs, same agents | Use case often implies voice; we have text. |
| [podcast-production-pipeline](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/podcast-production-pipeline.md) | Missing | — | Optional: content pipeline for audio. |
| [polymarket-autopilot](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/polymarket-autopilot.md) | Missing | — | Optional: market/prediction monitoring via n8n. |
| [pre-build-idea-validator](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/pre-build-idea-validator.md) | Partial | workspace/skills/idea-validator (web_search + grep) | Optional: add [idea-reality-mcp](https://github.com/mnemox-ai/idea-reality-mcp) to MCP allowlist; reference in idea-validator SKILL. |
| [project-state-management](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/project-state-management.md) | Partial | STATE.yaml, TICKET-TRACKER, STANDUP-LOG | Optional: file-based events (e.g. workspace/logs/project-events.jsonl) for “why did we decide X” and standup-from-events. |
| [second-brain](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/second-brain.md) | Partial | RAG, semantic-memory, habit-log | No dedicated “second brain” capture topic/channel or Cmd+K UI. Optional. |
| [self-healing-home-server](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/self-healing-home-server.md) | Have | system-pulse cron, self-healing-auto, self-healing-protocol, OPS launchctl | Extend: document email triage, knowledge extraction into RAG, daily security audit (RUNBOOK/OPENCLAW-STANDARDS). |
| [semantic-memory-search](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/semantic-memory-search.md) | Have | ~/.openclaw/.memsearch/qdrant/, memsearch.py, rag_query.py, reindex 3am | None. |
| [todoist-task-manager](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/todoist-task-manager.md) | Missing | — | Optional: Todoist integration via n8n; tasks sync to AUTONOMOUS. |
| [x-account-analysis](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/x-account-analysis.md) | Missing | — | Optional: RESEARCH cron for X/Twitter analytics. |
| [youtube-content-pipeline](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/youtube-content-pipeline.md) | Missing | — | Optional: content pipeline for YouTube. |

---

## Optional: event-driven project state and tech digest

- **Event-driven state:** To support “why did we decide X” and standup-from-events, log progress/blocker/decision to a file (e.g. `workspace/logs/project-events.jsonl`). One sentence in SOUL/RUNBOOK; no DB required for first version.
- **Tech digest:** Multi-source tech news: consider ClawHub tech-news-digest or RESEARCH cron with web_search aggregation. Implement only if product owner approves.

---

*Last updated: 2026-03-01 — feature/awesome-openclaw-usecases*
