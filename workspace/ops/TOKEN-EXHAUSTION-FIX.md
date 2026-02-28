# Token / Model Exhaustion — Why Nothing Works & How to Fix

**Last updated:** 2026-02-26

## Status: FULLY APPLIED (2026-02-27)

All fixes below have been applied. System is healthy. Key changes made:
- All 8 agents: primary=`ollama/llama3.1:8b` (hatake: `qwen2.5-coder:7b`)
- Fallback chain: `9router/free-unlimited` → `openai-codex/gpt-5.2` → `zai/glm-4.7-flashx`
- `9router/openrouter/auto` and `9router/always-on-premium` REMOVED from all fallbacks
- 5 cron jobs with `model:"mini"` fixed to `ollama/llama3.1:8b`
- Ollama LaunchAgent: added `KEEP_ALIVE=-1`, `NUM_PARALLEL=2`, `MAX_LOADED_MODELS=2`, `MAX_QUEUE=512`
- Script used: `scripts/fix-model-config-2026-02-27.js`

---

## One-time apply (get to 100% working)

Run these in order from the repo root (`~/.openclaw`):

```bash
# 1. Allow Ollama for ALL agents (whole company works on Ollama when detached)
node scripts/ensure-ollama-allowed-in-openclaw.js

# 1b. (If Telegram/cron still fail: "All models failed" or 9router 403) Use Ollama as primary
#     for main + ops so runtime tries Ollama first; then restart.
PREFER_OLLAMA_FOR_MAIN=1 PREFER_OLLAMA_FOR_OPS=1 node scripts/ensure-ollama-allowed-in-openclaw.js

# 2. Validate config and restart stack
openclaw doctor
bash scripts/redos-restart.sh

# 3. (Optional) Keep llama warm every 4 min — load the LaunchAgent once
cp scripts/com.openclaw.ollama-warmup.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.openclaw.ollama-warmup.plist
```

- **Policy:** Whole AI company must keep working when external providers are detached. Every agent has `ollama/llama3.1:8b` in primary or fallbacks so the system always has a local fallback.
- **cron/jobs.json** has already been updated: all jobs that used `9router/openrouter/auto` now use `ollama/llama3.1:8b`.
- **health_snapshot_ticket.py** now skips payloadless/unknown/short signatures to reduce ticket noise.
- After step 2, all agents can use Ollama; ensure Ollama is running (`brew services start ollama` if needed) and optionally warm up: `OLLAMA_WARMUP_MODELS="llama3.1:8b" bash scripts/ollama-warmup.sh`.

---

## What’s going wrong

Three things are happening at once:

1. **OpenRouter (9router) exhausted**  
   Many cron jobs use `"model": "9router/openrouter/auto"`. OpenRouter is returning:
   - **403** — “Key limit exceeded (total limit)”
   - **Billing** — “API key has run out of credits or has an insufficient balance”

2. **openai-codex timeouts**  
   When jobs use `openai-codex/gpt-5.2` as primary, they often get **HTTP 500 / timeout**. When the fallback is 9router, both can fail → “All models failed”.

3. **“model not allowed: ollama/llama3.1:8b”**  
   Some jobs explicitly request `"model": "ollama/llama3.1:8b"` (e.g. Telegram Approval Monitor, System Pulse, Cron Watchdog). The OpenClaw runtime only allows models that are configured for that agent in `openclaw.json`. If `main` or `ops` don’t have `ollama/llama3.1:8b` in their **primary or fallbacks**, the runtime rejects the request with “model not allowed”.

So: paid/remote providers are over limit or timing out, and the local fallback (Ollama) is often not allowed for the agent in config.

---

## Fixes (in order)

### 1. Allow Ollama for cron agents in `openclaw.json` (required for “model not allowed”)

So that jobs that request `ollama/llama3.1:8b` can run:

1. Open `openclaw.json` (at `~/.openclaw/openclaw.json` or the path your stack uses).
2. For each agent that runs cron jobs that use Ollama (**main**, **ops**, and any other that has `"model": "ollama/llama3.1:8b"` in `cron/jobs.json`):
   - Ensure **model.primary** or **model.fallbacks** includes `ollama/llama3.1:8b`.
   - If the schema has an explicit “allowed models” or “cron models” list for an agent, add `ollama/llama3.1:8b` there.
3. Run:
   ```bash
   openclaw doctor
   ```
4. Restart the stack so config is picked up:
   ```bash
   bash ~/.openclaw/scripts/redos-restart.sh
   ```

After this, jobs that already have `"model": "ollama/llama3.1:8b"` should stop failing with “model not allowed”.

### 2. Stop depending on 9router for cron (avoid 403 / billing)

Until OpenRouter limits/credits are fixed, move cron jobs off `9router/openrouter/auto` onto a model that’s allowed and working:

- **Preferred:** set `"model": "ollama/llama3.1:8b"` for jobs that don’t need heavy reasoning (monitoring, pulse, approval monitor, cron watchdog, etc.).
- Only do this for agents that now have `ollama/llama3.1:8b` allowed (after step 1).

Jobs that currently use `9router/openrouter/auto` are in `cron/jobs.json`; search for `"model": "9router/openrouter/auto"` and change to `"model": "ollama/llama3.1:8b"` where appropriate. High-value or complex jobs (e.g. daily briefs, portfolio review) you may leave on 9router and fix limits/credits separately, or point them to another provider you control.

**Bulk change (optional):** Only after step 1 is done (Ollama allowed in `openclaw.json`). Backup first, then from repo root:
```bash
cp cron/jobs.json cron/jobs.json.bak-$(date +%Y%m%d)-pre-ollama-switch
# Replace every 9router/openrouter/auto with ollama/llama3.1:8b in cron/jobs.json:
sed -i '' 's/"model": "9router\/openrouter\/auto"/"model": "ollama\/llama3.1:8b"/g' cron/jobs.json
```
Then run `openclaw doctor` (if it validates cron) and restart. To revert: `mv cron/jobs.json.bak-YYYYMMDD-pre-ollama-switch cron/jobs.json`.

### 3. OpenRouter limits and credits (optional, for jobs that must use 9router)

- **403 “Key limit exceeded”**  
  Check [OpenRouter key/settings](https://openrouter.ai/settings/keys). Limits often reset after the indicated time (e.g. “reset after 1m 57s”). Reduce request rate or wait for reset.

- **Billing / credits**  
  Top up or attach a valid payment method in the OpenRouter billing dashboard so the key has credits/balance.

### 4. openai-codex timeouts

- If **openai-codex** is timing out (HTTP 500), that’s often rate limiting or overload. Using Ollama for cron (steps 1–2) reduces load on codex.
- Ensure in `openclaw.json` that agents that need a fallback have **ollama/llama3.1:8b** in **model.fallbacks** so that when codex fails, the runtime can fall back to Ollama.

---

## Quick checklist

- [ ] In `openclaw.json`, **main** and **ops** (and any other cron agent using Ollama) have `ollama/llama3.1:8b` in primary or fallbacks (or in allowed/cron model list if your schema has it).
- [ ] Run `openclaw doctor` and fix any errors.
- [ ] Restart stack: `bash ~/.openclaw/scripts/redos-restart.sh`.
- [ ] In `cron/jobs.json`, switch cron jobs that don’t need 9router from `"model": "9router/openrouter/auto"` to `"model": "ollama/llama3.1:8b"` (after step 1 so “model not allowed” is fixed).
- [ ] (Optional) Fix OpenRouter key limit and billing so jobs that must use 9router work again.

---

## References

- `workspace/ops/LEARNINGS.md` — LEARNING-20260225-005 (rate limit spreading), LEARNING-20260225-006 (9Router auth), LEARNING-20260224-008 (cron timeout).
- `workspace/config/model-registry.json` — agentModelMap and fallbacks.
- `workspace/tmp/provider-quota.json` — 9router status (quota endpoint may be “not available on this build”).
- `KNOWLEDGEBASE.md` §20 — “model not allowed” fix was to remove `model` key so agent default is used; here we instead allow Ollama in config so jobs can explicitly request it.
