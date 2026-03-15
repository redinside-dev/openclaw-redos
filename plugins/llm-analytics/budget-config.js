import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STATE_DIR = "/Users/redinside/.openclaw";
export const GUARDRAILS_PATH = join(STATE_DIR, "workspace", "config", "budget-guardrails.json");

const DEFAULTS = {
  dailyLimit: 12.5,
  warnPct: 70,
  costSaverPct: 90,
  pausePct: 100,
  alertPct: 80,
};

function parseNumber(value) {
  if (value == null) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function envNumber(env, keys) {
  if (!env) return undefined;
  for (const key of keys) {
    const parsed = parseNumber(env[key]);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function clampPct(value, fallback) {
  const num = parseNumber(value);
  if (num === undefined) return fallback;
  if (num < 0) return 0;
  if (num > 999) return 999;
  return num;
}

function normalizeDailyLimit(value) {
  const num = parseNumber(value);
  if (!num || num <= 0) return DEFAULTS.dailyLimit;
  return num;
}

export function buildBudgetThresholds(guardrailsPayload = null, env = process.env) {
  const envDailyLimit = envNumber(env, ["OPENCLAW_BUDGET_DAILY_USD", "COST_BUDGET_DAILY_USD"]);
  const envWarnUsd = envNumber(env, ["OPENCLAW_BUDGET_WARN_USD", "COST_BUDGET_WARN_USD"]);
  const envWarnPct = envNumber(env, ["OPENCLAW_BUDGET_WARN_PCT", "COST_BUDGET_WARN_PCT"]);
  const envCostSaverPct = envNumber(env, ["OPENCLAW_BUDGET_COST_SAVER_PCT", "COST_BUDGET_COST_SAVER_PCT"]);
  const envPausePct = envNumber(env, ["OPENCLAW_BUDGET_PAUSE_PCT", "COST_BUDGET_PAUSE_PCT"]);
  const envAlertPct = envNumber(env, ["OPENCLAW_BUDGET_ALERT_PCT", "COST_BUDGET_ALERT_PCT"]);

  const guardrailsDaily = guardrailsPayload?.variable_spend?.daily_limit_usd;
  const guardrailsWarnPct = guardrailsPayload?.thresholds?.warn_at_pct;

  const rawDailyLimit = envDailyLimit ?? guardrailsDaily;
  const dailyLimit = normalizeDailyLimit(rawDailyLimit);

  let warnPct = envWarnPct ?? guardrailsWarnPct ?? DEFAULTS.warnPct;
  const warnPctSource = envWarnPct !== undefined ? "env" : guardrailsWarnPct !== undefined ? "guardrails" : "default";

  let warnUsd = envWarnUsd ?? (dailyLimit * warnPct) / 100;
  if (envWarnUsd !== undefined && envWarnPct === undefined && guardrailsWarnPct === undefined) {
    warnPct = (warnUsd / dailyLimit) * 100;
  }

  const costSaverPct = envCostSaverPct ?? guardrailsPayload?.thresholds?.auto_cost_saver_at_pct ?? DEFAULTS.costSaverPct;
  const pausePct = envPausePct ?? guardrailsPayload?.thresholds?.pause_payg_at_pct ?? DEFAULTS.pausePct;

  const alertPctFromConfig = guardrailsPayload?.actions?.cost_alert_webhook?.trigger_at_pct;
  const alertPct = clampPct(envAlertPct ?? alertPctFromConfig ?? DEFAULTS.alertPct, DEFAULTS.alertPct);

  const thresholds = {
    warn: {
      pct: warnPct,
      usd: warnUsd,
    },
    costSaver: {
      pct: costSaverPct,
      usd: (dailyLimit * costSaverPct) / 100,
    },
    pause: {
      pct: pausePct,
      usd: (dailyLimit * pausePct) / 100,
    },
  };

  const guardrailsSource = guardrailsPayload ? "guardrails" : "env-default";

  return {
    source: guardrailsSource,
    dailyLimit,
    thresholds,
    alert: {
      pct: alertPct,
      usd: (dailyLimit * alertPct) / 100,
      webhook: guardrailsPayload?.actions?.cost_alert_webhook,
    },
    actions: guardrailsPayload?.actions ?? null,
    guardrails: guardrailsPayload,
    warnPctSource,
  };
}

export function loadGuardrailsPayload() {
  if (!existsSync(GUARDRAILS_PATH)) return null;
  try {
    const raw = readFileSync(GUARDRAILS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function resolveBudgetConfig(logger = null) {
  const guardrails = loadGuardrailsPayload();
  const config = buildBudgetThresholds(guardrails);
  if (guardrails) {
    logger?.info?.(`Budget guardrails loaded from ${GUARDRAILS_PATH}`);
  } else {
    logger?.warn?.("Budget guardrails file missing; falling back to env/default values.");
  }
  return config;
}
