import { appendFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const STATE_DIR = "/Users/redinside/.openclaw";
const LOGS_DIR = join(STATE_DIR, "workspace", "logs");
const COST_LOG = join(LOGS_DIR, "cost-events.jsonl");
const ROUTING_LOG = join(LOGS_DIR, "routing-decisions.jsonl");
const ANALYTICS_LOG = join(LOGS_DIR, "llm-analytics.jsonl");

const MODEL_COSTS = {
  // Rates are USD per 1M tokens. Prefer provider-reported cost when available (usage.cost.total).
  "openai-codex/gpt-5.2":    { input: 2.00, output: 8.00, cached: 0.50 },
  "zai/glm-4.7":             { input: 0.50, output: 1.50, cached: 0.10 },
  "zai/glm-4.7-flashx":      { input: 0.10, output: 0.30, cached: 0.02 },
  "ollama/qwen2.5-coder:7b": { input: 0,    output: 0,    cached: 0 },
  "ollama/llama3.1:8b":       { input: 0,    output: 0,    cached: 0 },
  "ollama/gpt-oss:20b":       { input: 0,    output: 0,    cached: 0 },
  "perplexity/sonar-pro":     { input: 3.00, output: 15.00, cached: 0 },
};

const BUDGET_DAILY_USD = Number(process.env.OPENCLAW_BUDGET_DAILY_USD ?? process.env.COST_BUDGET_DAILY_USD ?? 12.5);
const BUDGET_WARN_USD = Number(process.env.OPENCLAW_BUDGET_WARN_USD ?? process.env.COST_BUDGET_WARN_USD ?? 10);
const ALERTS_LOG = join(LOGS_DIR, "budget-alerts.jsonl");

let lastBudgetAlertDay = null;
let lastBudgetAlertLevel = null;

function getCostPer1M(provider, model) {
  const key = `${provider}/${model}`;
  return MODEL_COSTS[key] || { input: 1.00, output: 4.00, cached: 0.10 };
}

function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;

  // OpenClaw internal usage (observed): { input, output, cacheRead, cacheWrite, totalTokens, cost?: { total, ... } }
  // OpenAI-like: { prompt_tokens, completion_tokens, total_tokens }
  // Some providers: { input_tokens, output_tokens, total_tokens }
  const input =
    Number(usage.input ?? usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokens ?? 0) || 0;
  const output =
    Number(usage.output ?? usage.output_tokens ?? usage.completion_tokens ?? usage.completionTokens ?? 0) || 0;
  const cacheRead = Number(usage.cacheRead ?? usage.cache_read ?? usage.cached_tokens ?? 0) || 0;
  const cacheWrite = Number(usage.cacheWrite ?? usage.cache_write ?? 0) || 0;

  // Prefer explicit total fields if present, otherwise derive.
  const total =
    Number(
      usage.total ??
        usage.totalTokens ??
        usage.total_tokens ??
        usage.totalTokensUsed ??
        (input + output)
    ) ||
    (input + output);

  // Provider-reported cost — only accept finite non-negative values
  const rawCost =
    (usage.cost && typeof usage.cost === 'object')
      ? Number(usage.cost.total)
      : (typeof usage.cost === 'number' ? usage.cost : NaN);
  const costUsd = (Number.isFinite(rawCost) && rawCost >= 0) ? rawCost : null;

  return { input, output, cacheRead, cacheWrite, total, costUsd };
}

function estimateCost(provider, model, usage) {
  const u = normalizeUsage(usage);
  if (!u) return 0;

  // If provider already supplied a cost, trust it.
  if (typeof u.costUsd === 'number' && Number.isFinite(u.costUsd) && u.costUsd >= 0) {
    return u.costUsd;
  }

  const rates = getCostPer1M(provider, model);
  // cacheRead is generally a subset of input; guard against negative billable input.
  const billableInput = Math.max(0, u.input - u.cacheRead);

  return (
    (billableInput / 1_000_000) * rates.input +
    (u.cacheRead / 1_000_000) * rates.cached +
    (u.output / 1_000_000) * rates.output
  );
}

function appendJsonl(filePath, data) {
  try {
    appendFileSync(filePath, JSON.stringify(data) + "\n", "utf8");
  } catch (err) {
    // Silently fail — plugin must never crash the gateway
  }
}

function getDailySpend() {
  try {
    if (!existsSync(COST_LOG)) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const lines = readFileSync(COST_LOG, "utf8").split("\n").filter(Boolean);
    let total = 0;
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.ts && entry.ts.startsWith(today) && typeof entry.cost_usd === "number" && entry.cost_usd > 0) {
          total += entry.cost_usd;
        }
      } catch {}
    }
    return Math.round(Math.max(0, total) * 10000) / 10000;
  } catch {
    return 0;
  }
}

const pendingInputs = new Map();

export default {
  id: "llm-analytics",
  name: "LLM Analytics",
  description: "Tracks cost, routing, latency, and usage patterns for all LLM calls. Writes to cost-events.jsonl and routing-decisions.jsonl.",
  version: "1.0.0",

  register(api) {
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true });
    }

    api.on("llm_input", (event, ctx) => {
      const ts = new Date().toISOString();
      const key = event.runId || `${ctx.sessionId}-${Date.now()}`;
      const promptText = event.prompt || "";
      // Capture last 600 chars of prompt — system prompt is at the top,
      // so the tail contains the actual user message/task.
      const promptTail = promptText.length > 600 ? promptText.slice(-600) : promptText;

      pendingInputs.set(key, {
        ts,
        startMs: Date.now(),
        provider: event.provider,
        model: event.model,
        agentId: ctx.agentId || "unknown",
        sessionKey: ctx.sessionKey || ctx.sessionId || "unknown",
        promptLength: promptText.length,
        promptTail,
        historyCount: (event.historyMessages || []).length,
        imagesCount: event.imagesCount || 0,
      });

      appendJsonl(ROUTING_LOG, {
        ts,
        agent: ctx.agentId || "unknown",
        session_key: ctx.sessionKey || ctx.sessionId,
        run_id: event.runId || null,
        selected_model: `${event.provider}/${event.model}`,
        provider: event.provider,
        model: event.model,
        prompt_length: promptText.length,
        prompt_tail: promptTail,
        history_messages: (event.historyMessages || []).length,
        images_count: event.imagesCount || 0,
        daily_spend_so_far: getDailySpend(),
      });
    });

    api.on("llm_output", (event, ctx) => {
      const ts = new Date().toISOString();
      const key = event.runId || "";
      const inputData = pendingInputs.get(key);
      const latencyMs = inputData ? Date.now() - inputData.startMs : 0;

      if (inputData) {
        pendingInputs.delete(key);
      }

      const provider = event.provider || (inputData && inputData.provider) || "unknown";
      const model = event.model || (inputData && inputData.model) || "unknown";

      const usageNorm = normalizeUsage(event.usage);
      const costUsd = estimateCost(provider, model, event.usage);

      const isLocal = provider === "ollama";
      const tier = isLocal ? "local-free" : "cloud-paid";

      const costRounded = Math.round(costUsd * 1_000_000) / 1_000_000;

      appendJsonl(COST_LOG, {
        ts,
        agent: ctx.agentId || (inputData && inputData.agentId) || "unknown",
        session_key: ctx.sessionKey || ctx.sessionId || "unknown",
        model: `${provider}/${model}`,
        provider,
        tier,
        billing_type: isLocal ? "free" : "payg",
        tokens: {
          input: usageNorm?.input || 0,
          output: usageNorm?.output || 0,
          cache_read: usageNorm?.cacheRead || 0,
          cache_write: usageNorm?.cacheWrite || 0,
          total: usageNorm?.total || 0,
        },
        cost_usd: costRounded,
        latency_ms: latencyMs,
        success: true,
        response_count: (event.assistantTexts || []).length,
        cost_source: usageNorm?.costUsd != null ? "provider" : "estimated",
      });

      // Budget alerts (best-effort; logs only)
      try {
        const today = ts.slice(0, 10);
        const spend = getDailySpend();

        // Reset daily alert memory.
        if (lastBudgetAlertDay !== today) {
          lastBudgetAlertDay = today;
          lastBudgetAlertLevel = null;
        }

        const level =
          spend >= BUDGET_DAILY_USD ? "exceeded" :
          spend >= BUDGET_WARN_USD ? "warning" :
          null;

        if (level && level !== lastBudgetAlertLevel) {
          lastBudgetAlertLevel = level;
          const alert = {
            ts,
            level,
            daily_spend_usd: spend,
            warn_usd: BUDGET_WARN_USD,
            budget_usd: BUDGET_DAILY_USD,
            last_event: { provider, model, agent: ctx.agentId || "unknown", cost_usd: costRounded },
          };
          appendJsonl(ALERTS_LOG, alert);
          const msg = `[BUDGET ${level.toUpperCase()}] Daily spend $${spend.toFixed(2)} (warn $${BUDGET_WARN_USD}, budget $${BUDGET_DAILY_USD})`;
          if (level === "exceeded") api.logger.error(msg);
          else api.logger.warn(msg);
        }
      } catch {}

      // Extract response preview from assistant texts
      const assistantTexts = event.assistantTexts || [];
      const responseText = assistantTexts.join("\n").trim();
      const responsePreview = responseText.length > 600 ? responseText.slice(0, 600) : responseText;

      appendJsonl(ANALYTICS_LOG, {
        ts,
        type: "llm_call",
        agent: ctx.agentId || (inputData && inputData.agentId) || "unknown",
        provider,
        model: `${provider}/${model}`,
        run_id: event.runId || null,
        session_key: ctx.sessionKey || ctx.sessionId || (inputData && inputData.sessionKey) || null,
        latency_ms: latencyMs,
        tokens_in: usageNorm?.input || 0,
        tokens_out: usageNorm?.output || 0,
        tokens_cached: usageNorm?.cacheRead || 0,
        cost_usd: Math.round(costUsd * 1_000_000) / 1_000_000,
        prompt_length: inputData?.promptLength || 0,
        prompt_tail: inputData?.promptTail || null,
        history_count: inputData?.historyCount || 0,
        response_preview: responsePreview || null,
        response_chars: responseText.length,
      });

      // Clean up stale entries (older than 10 minutes)
      const cutoff = Date.now() - 600_000;
      for (const [k, v] of pendingInputs) {
        if (v.startMs < cutoff) pendingInputs.delete(k);
      }
    });

    api.logger.info("LLM Analytics plugin registered — tracking cost, routing, and latency");
  },
};
