# New skills to enable (World-Class Plan)

Add these to `openclaw.json` under `skills.entries` so the gateway loads them (or confirm they are already present):

```json
"semantic-memory": { "enabled": true },
"rag-url-ingestion": { "enabled": true },
"habit-tracker": { "enabled": true },
"earnings-tracker": { "enabled": true }
```

- **semantic-memory:** RAG over workspace (memsearch/rag_query). Assign to agents that answer policy/feature questions.
- **rag-url-ingestion:** Save URL/article → workspace/kb/*.md → reindex RAG. Assign to main, allrounder.
- **habit-tracker:** Daily habit check-in; record to workspace/habits/habit-log.md. Assign to main.
- **earnings-tracker:** Upcoming earnings (web_search); FINANCE posts weekly to Slack + Telegram. Assign to finance.

After adding, run `openclaw doctor` and `bash ~/.openclaw/scripts/redos-restart.sh` if needed.
