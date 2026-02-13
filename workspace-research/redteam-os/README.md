# Smart Routing + Model Pipeline PoC (Ollama vs GLM)

Goal: deterministic, auditable routing across:
- **Ollama** (localhost-only)
- **Z.AI GLM** (via OpenClaw provider; baseline: `zai/glm-4.7-flashx`)
- **Web search** (Perplexity) for citations/best practices (research only)

## Security posture (required)
- Ollama must bind to **127.0.0.1 only** (no LAN/WAN exposure).
- No secrets in repo. Use env vars / OpenClaw config.

## Quickstart (local Ollama)
1) Verify localhost bind:
```bash
/usr/sbin/lsof -nP -iTCP:11434 -sTCP:LISTEN
```
Expected: `127.0.0.1:11434 (LISTEN)`.

2) Run benchmark (Ollama only):
```bash
python3 runners/bench_ollama.py --model llama3.1:8b --prompt-set bench/prompts/poc_v1.jsonl --out results/ollama_poc_v1.json
```

## Status
- Phase 1: CLI benchmark runner + prompt sets + schemas + results artifacts.
- Phase 2: optional MCP wrapper.
