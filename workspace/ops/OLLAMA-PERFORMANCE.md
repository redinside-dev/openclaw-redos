# Ollama Performance Tuning — Fast, Free Cron Backend

**Goal:** Make Ollama fast enough for cron jobs so direct calls don’t time out, using only free, local settings on this machine.

## Why Ollama Feels Slow Here

1. **Cold start** — Your model registry notes **~58s cold start** for `llama3.1:8b`. The first request after idle loads the model into RAM/VRAM; until then, requests wait or hit the 60s gateway SLA.
2. **Default unload** — Ollama unloads models after **5 minutes** of inactivity, so cron jobs that run every 5–15 minutes often hit a cold start.
3. **Large context** — Default or large context windows use more memory and can slow inference; cron tasks usually need only a few thousand tokens.

## Fixes That Work (Free, No New Hardware)

### 1. Keep models loaded (eliminate cold start)

**Option A — Server default (recommended)**  
Set Ollama to keep models in memory indefinitely so cron never pays the 58s load cost.

**On macOS (Homebrew Ollama):**

```bash
# Set before starting Ollama (session survives until reboot)
launchctl setenv OLLAMA_KEEP_ALIVE "-1"

# Restart Ollama so it picks up the variable
brew services restart ollama
```

After reboot, `launchctl setenv` is lost. To make it persistent on macOS you can:

- Run the same two lines from a login hook or a script that runs at login, or  
- Use a custom LaunchAgent that sets `EnvironmentVariables` then runs `ollama serve` (see “Persistent env on macOS” below).

**Option B — Preload before cron runs**  
If you don’t want to keep models loaded 24/7, preload the cron model shortly before the first job:

```bash
# Preload llama3.1:8b (and optionally qwen2.5-coder:7b) so next request is fast
curl -s http://127.0.0.1:11434/api/generate -d '{"model": "llama3.1:8b", "prompt": "", "stream": false}' > /dev/null
```

Run this from a cron job that runs **once at boot or a few minutes before** your first Ollama-using cron (e.g. System Pulse). The script `scripts/ollama-warmup.sh` below does this.

### 2. Smaller context for cron (faster, less memory)

Cron tasks (pulse, approval monitor, watchdog) rarely need 128K context. Smaller context = faster inference and less memory.

- **Global default:** set when starting the server:
  ```bash
  launchctl setenv OLLAMA_CONTEXT_LENGTH "8192"
  brew services restart ollama
  ```
- **Per request (API):** when calling the API, pass `"options": { "num_ctx": 4096 }` (or 8192). Your gateway or OpenClaw may support a way to pass this for Ollama calls; if not, reducing the server default above still helps.

### 3. CPU threads (if inference is CPU-bound)

On Macs without a strong GPU, inference can be CPU-bound. Let Ollama use more cores:

```bash
# Example: use 8 threads (adjust to your CPU; avoid more than physical cores)
launchctl setenv OLLAMA_NUM_THREAD "8"
brew services restart ollama
```

Check with `ollama ps` whether the model is on GPU or CPU; if it’s 100% CPU, tuning `OLLAMA_NUM_THREAD` can help.

### 4. Optional: Flash Attention (memory/speed)

If your Ollama build supports it, Flash Attention can reduce memory use and sometimes improve speed:

```bash
launchctl setenv OLLAMA_FLASH_ATTENTION "1"
brew services restart ollama
```

### 5. Model choice for cron

- **llama3.1:8b** — Good balance for OPS/FINANCE/INFOSEC standups and monitoring; keep it warm.
- **qwen2.5-coder:7b** — Faster for simple parsing/formatting (e.g. HATAKE). Preload if used by cron.
- Avoid **gpt-oss:20b** for production cron; the registry notes it’s unstable and can time out.

## Persistent env on macOS (survives reboot)

Homebrew’s `brew services` doesn’t read `launchctl setenv`. To have `OLLAMA_KEEP_ALIVE=-1` (and optionally `OLLAMA_CONTEXT_LENGTH`, `OLLAMA_NUM_THREAD`) applied every time Ollama starts:

1. **Option 1 — Wrapper script**  
   Create a script that exports the variables and runs `ollama serve`, then point a LaunchAgent at that script instead of `ollama serve` directly (and disable “Start Ollama at login” in the Ollama app so it doesn’t double-start).

2. **Option 2 — User LaunchAgent override**  
   Copy the Homebrew plist to `~/Library/LaunchAgents/`, add an `EnvironmentVariables` dictionary (e.g. `OLLAMA_KEEP_ALIVE` = `-1`), and load that plist instead of the Homebrew one. After `brew upgrade ollama`, re-check the plist.

Example snippet for a LaunchAgent (do not use as a full plist without the rest of the required keys):

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OLLAMA_KEEP_ALIVE</key>
  <string>-1</string>
  <key>OLLAMA_CONTEXT_LENGTH</key>
  <string>8192</string>
  <key>OLLAMA_NUM_THREAD</key>
  <string>8</string>
</dict>
```

## Quick checklist

- [x] **APPLIED 2026-02-27** — `OLLAMA_KEEP_ALIVE=-1` (models never unload from unified memory)
- [x] **APPLIED 2026-02-27** — `OLLAMA_NUM_PARALLEL=2` (2 concurrent requests on same model; safe for 16GB)
- [x] **APPLIED 2026-02-27** — `OLLAMA_MAX_LOADED_MODELS=1` (16GB only: llama3.1:8b alone = ~5.5GB loaded; 2 models = ~11GB+ causing swap)
- [x] **APPLIED 2026-02-27** — `OLLAMA_MAX_QUEUE=512` (absorbs cron burst without rejection)
- [x] **APPLIED 2026-02-27** — `OLLAMA_CONTEXT_LENGTH=4096` (server default; cuts KV cache from ~6.2GB → ~140MB; response time 36s→5.7s)
- [x] `OLLAMA_FLASH_ATTENTION=1` already set
- [x] `OLLAMA_KV_CACHE_TYPE=q8_0` already set

**Benchmarked 2026-02-27:** llama3.1:8b, 4096 ctx, model warm, NUM_PARALLEL=2
- Simple 2-token response: **5.7s end-to-end** (vs 36s+ before — 6x improvement)
- Prompt eval: ~1.8s | Token gen: ~85ms

**Important 16GB RAM note:**
- llama3.1:8b runtime size with 131072 ctx = ~11.2 GB (KV cache dominates)
- With 4096 ctx = ~5.5 GB — fits comfortably with ~10 GB headroom
- MAX_LOADED_MODELS=1 because only llama3.1:8b fits + macOS overhead (~3-4 GB)
- hatake uses qwen2.5-coder:7b — incurs ~20s cold start when hatake cron runs after a llama run
  (qwen runs rarely so this is acceptable; increase RAM to 32GB+ to keep both warm)

**To verify models are staying warm:**
```bash
ollama ps  # shows loaded models + GPU VRAM vs CPU
```

## References

- Official: [Ollama FAQ — context size, keep_alive, configure server](https://docs.ollama.com/faq)
- `workspace/config/model-registry.json` — coldStartSeconds for llama3.1:8b (58s), qwen2.5-coder:7b
- `gateway/server.js` — 60s SLA timeout; fast responses need model already loaded
