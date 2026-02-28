# Skill: semantic-memory

**Semantic search + RAG over all workspace files.**

Agents use this to find relevant context before answering questions,
implementing features, or making decisions. No hallucination about what's
in the workspace — retrieve it first.

---

## Tools

### 1. Semantic search — find relevant files/sections
```
exec: python3 ~/.openclaw/workspace/scripts/memsearch.py "your query" --top 5
```
Returns ranked results with source file + excerpt. Use for:
- "What did we decide about X?"
- "Find all mentions of timeout values"
- "What skills handle security reviews?"

### 2. RAG context — get formatted context block for your answer
```
exec: python3 ~/.openclaw/workspace/scripts/rag_query.py "your question" --top 4
```
Returns a formatted context block. Prepend this to your reasoning when answering
questions that involve workspace knowledge.

### 3. Rebuild index (OPS runs this daily)
```
exec: python3 ~/.openclaw/workspace/scripts/memsearch.py index
```

---

## When to use RAG (MANDATORY for these cases)

| Situation | Action |
|-----------|--------|
| Answering "what is our policy on X?" | Run `rag_query.py "policy on X"` first |
| Before implementing a feature | Run `memsearch.py "feature name"` to check if it exists |
| Before creating a new skill | Run `memsearch.py "skill purpose"` to avoid duplicates |
| Debugging an A2A timeout | Run `rag_query.py "A2A timeout settings"` |
| Any question about config/settings | Run `rag_query.py "config topic"` |

---

## Index coverage

Indexes all `.md`, `.yaml`, `.yml` files in `workspace/` (excluding logs, backups).
Chunks: 800 chars with 100-char overlap.
Embeddings: `all-MiniLM-L6-v2` (22MB, local, no API calls).
Index location: `~/.openclaw/.memsearch/chroma/`
Re-indexed: daily at 3am by `semantic-memory-reindex-0001` cron.

---

## Example agent usage

```
# ENG before implementing a new webhook integration:
exec: python3 ~/.openclaw/workspace/scripts/memsearch.py "webhook" --top 5
# → Finds n8n-webhooks/SKILL.md, sees pattern already exists, builds on it

# OPS debugging a session timeout:
exec: python3 ~/.openclaw/workspace/scripts/rag_query.py "sessions_send timeout" --top 3
# → Returns SOUL.md timeout values, a2a-verify SKILL.md context

# INFOSEC before approving a change:
exec: python3 ~/.openclaw/workspace/scripts/rag_query.py "security policy exec commands"
# → Returns command-catalog, maker-checker, tool-call-validator context
```

---

## Dashboard search

The workspace semantic search is also available on the Mission Control dashboard:
`http://127.0.0.1:19000` → Search tab (powered by this skill's index)
