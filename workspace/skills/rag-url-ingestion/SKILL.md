# Skill: rag-url-ingestion

**Save a URL or article into the workspace knowledge base and add it to semantic search (RAG).**

Use when the user says: "save this URL", "index this link", "add this article to the knowledge base", "remember this page", or pastes a URL to store for later search.

---

## When to use

- User sends a URL and asks to save/index/remember it.
- User wants a web page or article content to be searchable via RAG (memsearch/rag_query).

---

## Steps (run in order)

### 1. Check URL allowlist

Before fetching any URL, check `workspace/config/security/outbound-url-allowlist.json`.
- If the URL's domain is in `allow`: proceed.
- If the domain is in `deny`: do not fetch; reply that the domain is not allowed and suggest the user request approval.
- If the domain is not listed: do not fetch by default; reply that the URL must be allowlisted first, and open a ticket (TICKET-TRACKER.md) with rationale so OPS/Anurag can add it if appropriate.

### 2. Fetch content

- Use `web_fetch` (or approved fetch tool) to retrieve the URL.
- Extract main text content (strip navigation, ads, scripts). Prefer readable article body; if the response is HTML, extract text from article-like containers or use the first 50k chars of text.

### 3. Write to workspace knowledge base

- Directory: `workspace/kb/` (create if missing).
- Filename: `YYYY-MM-DD-<slug>.md` where `<slug>` is a short lowercase slug from the page title or URL (e.g. `2026-03-01-openclaw-subagents.md`). If the same slug exists, append `-2`, `-3`, etc.
- File format:
```markdown
# <page title or URL>

**Source:** <URL>
**Saved:** <ISO date>

<extracted text content>
```

- Write the file (one file per URL).

### 4. Reindex RAG

Run so the new file is searchable:

```
exec: ~/.openclaw/.venv/bin/python3 ~/.openclaw/workspace/scripts/memsearch.py index
```

This updates the vector index under `~/.openclaw/.memsearch/qdrant/`. The semantic-memory skill indexes `workspace/` including `workspace/kb/`.

### 5. Confirm to user

Reply briefly: "Saved to workspace/kb/<filename>. RAG index updated. You can search for this via semantic-memory (rag_query) or the Mission Control Search tab."

---

## Optional: trigger phrases

- "Save this URL"
- "Index this link"
- "Add this to the knowledge base"
- "Remember this article"
- "Store this page for search"

---

## Dependencies

- **semantic-memory** skill: same index and scripts; this skill adds the "save URL → file → reindex" workflow.
- **Outbound URL allowlist:** must include the domain or user must get it allowlisted first.

---

## Enabling

Add to `openclaw.json` under `skills.entries`: `"rag-url-ingestion": { "enabled": true }`. Assign to agents that handle user messages (e.g. main, allrounder).
