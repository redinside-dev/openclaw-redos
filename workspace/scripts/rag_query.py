#!/Users/redinside/.openclaw/.venv/bin/python3
"""
rag_query.py — RAG (Retrieval-Augmented Generation) helper for agents.

Agents call this BEFORE answering complex questions to pull relevant
workspace context into their response.

Usage:
  python3 rag_query.py "what is our A2A timeout for ops?"
  python3 rag_query.py "what are our active goals?" --top 3 --json

Returns a formatted context block agents can prepend to their response.
"""

import sys
import json
import argparse
from pathlib import Path

# Add scripts dir to path
sys.path.insert(0, str(Path(__file__).parent))
from memsearch import search


RAG_TEMPLATE = """--- WORKSPACE CONTEXT (RAG) ---
Query: {query}
Retrieved {n} relevant chunks from workspace:

{chunks}
--- END CONTEXT ---

Use the above context to inform your answer. Cite source files when relevant.
"""


def _format_context(query, hits):
    """Format hits into a RAG context block."""
    if not hits:
        return f"--- WORKSPACE CONTEXT ---\nNo relevant context found for: {query}\n---"
    chunks_text = ""
    for h in hits:
        chunks_text += f"[Source: {h['source']}]\n{h['text']}\n\n"
    return RAG_TEMPLATE.format(query=query, n=len(hits), chunks=chunks_text.strip())


def rag_context(query, top_k=4):
    """Return formatted RAG context string for agent injection."""
    hits = search(query, top_k=top_k)
    return _format_context(query, hits)


def main():
    parser = argparse.ArgumentParser(description="RAG context retrieval for agents")
    parser.add_argument("query",         help="Question or topic to retrieve context for")
    parser.add_argument("--top",  type=int, default=4, help="Number of chunks to retrieve")
    parser.add_argument("--json",  action="store_true", help="Return JSON with hits + context")
    args = parser.parse_args()

    # Single search call to avoid double lock acquisition
    hits    = search(args.query, top_k=args.top)
    context = _format_context(args.query, hits)

    if args.json:
        print(json.dumps({"query": args.query, "context": context, "hits": hits}, indent=2))
    else:
        print(context)


if __name__ == "__main__":
    main()
