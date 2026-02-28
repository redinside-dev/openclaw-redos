#!/Users/redinside/.openclaw/.venv/bin/python3
"""
memsearch.py — Semantic search over RedOS workspace files.
Uses qdrant-client (in-memory/local) + fastembed for local embeddings.
Python 3.14 compatible.

Usage:
  memsearch.py index              # Build/rebuild the index
  memsearch.py "query"            # Search
  memsearch.py "query" --top 10  # Top N results
  memsearch.py "query" --json    # JSON output for agents
"""

import sys, os, json, argparse, hashlib, uuid
from pathlib import Path
from datetime import datetime, timezone

WORKSPACE  = Path.home() / ".openclaw" / "workspace"
INDEX_DIR  = Path.home() / ".openclaw" / ".memsearch"
HASH_FILE  = INDEX_DIR / "file-hashes.json"
INDEX_FILE = INDEX_DIR / "index.json"   # flat JSON store for offline fallback

COLLECTION = "workspace"
CHUNK_SIZE   = 600
CHUNK_OVERLAP = 80
EXCLUDE_DIRS = {".git", "__pycache__", "node_modules", ".memsearch",
                "logs", "backups", "sessions", "delivery-queue"}

def get_files():
    seen, files = set(), []
    for pattern in ("**/*.md", "**/*.yaml", "**/*.yml"):
        for p in WORKSPACE.glob(pattern):
            if any(ex in p.parts for ex in EXCLUDE_DIRS):
                continue
            if p.is_file() and p.stat().st_size < 300_000 and str(p) not in seen:
                seen.add(str(p)); files.append(p)
    return files

def file_hash(p):
    return hashlib.md5(p.read_bytes()).hexdigest()

def chunk_text(text, src):
    chunks, start, i = [], 0, 0
    while start < len(text):
        end   = min(start + CHUNK_SIZE, len(text))
        chunk = text[start:end].strip()
        if len(chunk) > 40:
            chunks.append({"text": chunk, "source": src, "idx": i})
        start += CHUNK_SIZE - CHUNK_OVERLAP
        i     += 1
    return chunks

def get_client_and_collection():
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    client = QdrantClient(path=str(INDEX_DIR / "qdrant"))
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION not in collections:
        client.create_collection(
            COLLECTION,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
    return client

def embed(texts):
    from fastembed import TextEmbedding
    model = TextEmbedding("BAAI/bge-small-en-v1.5")
    return list(model.embed(texts))

def build_index(force=False):
    from qdrant_client.models import PointStruct
    client = get_client_and_collection()
    hashes = json.loads(HASH_FILE.read_text()) if HASH_FILE.exists() else {}

    files = get_files()
    added = skipped = total = 0

    for path in files:
        h   = file_hash(path)
        key = str(path)
        if not force and hashes.get(key) == h:
            skipped += 1; continue

        src    = str(path.relative_to(WORKSPACE))
        text   = path.read_text(errors="ignore")
        chunks = chunk_text(text, src)
        if not chunks:
            hashes[key] = h; continue

        # Delete old points for this file
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        client.delete(COLLECTION,
                      points_selector=Filter(
                          must=[FieldCondition(key="source",
                                              match=MatchValue(value=src))]))

        vecs = embed([c["text"] for c in chunks])
        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=list(map(float, v)),
                payload={"source": c["source"], "text": c["text"], "idx": c["idx"]},
            )
            for v, c in zip(vecs, chunks)
        ]
        client.upsert(COLLECTION, points)
        total   += len(points)
        hashes[key] = h
        added   += 1

    HASH_FILE.write_text(json.dumps(hashes, indent=2))
    return {"indexed": added, "skipped": skipped, "chunks": total, "files": len(files)}

def search(query, top_k=5):
    client = get_client_and_collection()
    info = client.get_collection(COLLECTION)
    if info.points_count == 0:
        build_index()
    vecs = embed([query])
    result = client.query_points(COLLECTION, query=list(map(float, vecs[0])), limit=top_k)
    hits = result.points
    return [{"rank": i+1, "text": h.payload["text"],
             "source": h.payload["source"], "score": round(h.score, 4)}
            for i, h in enumerate(hits)]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query", nargs="?")
    ap.add_argument("--top",   type=int, default=5)
    ap.add_argument("--json",  action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    if args.query == "index" or args.query is None:
        print("Indexing workspace files...")
        r = build_index(force=args.force)
        out = f"Indexed {r['indexed']} files ({r['skipped']} unchanged) -> {r['chunks']} chunks"
        print(json.dumps(r) if args.json else f"✓ {out}")
        return

    hits = search(args.query, top_k=args.top)
    if args.json:
        print(json.dumps(hits, indent=2))
    else:
        print(f"\n🔍 \"{args.query}\"\n")
        for h in hits:
            print(f"[{h['rank']}] {h['source']}  score={h['score']}")
            print(f"    {h['text'][:220].replace(chr(10),' ')}\n")

if __name__ == "__main__":
    main()
