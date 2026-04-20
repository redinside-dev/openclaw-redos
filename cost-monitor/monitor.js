import { EventEmitter } from 'events';
import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENCLAW_DIR = path.resolve(__dirname, '..');
const COST_EVENTS_JSONL = path.join(OPENCLAW_DIR, 'workspace', 'logs', 'cost-events.jsonl');

// Rebuild today's totals from the authoritative cost-events.jsonl written by the LLM analytics plugin.
// This ensures state.json (read by cron guardrail + agents) always reflects real native-gateway traffic.
function buildTodayFromJsonl() {
  const today = new Date().toISOString().slice(0, 10);
  const result = { total: 0, byModel: {}, byAgent: {}, requests: 0 };
  try {
    if (!existsSync(COST_EVENTS_JSONL)) return result;
    const lines = readFileSync(COST_EVENTS_JSONL, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if (!e.ts || !e.ts.startsWith(today)) continue;
        const cost = Number(e.cost_usd);
        if (!Number.isFinite(cost) || cost < 0) continue;
        result.total += cost;
        result.requests += 1;
        const m = e.model || 'unknown';
        const a = e.agent || 'unknown';
        if (!result.byModel[m]) result.byModel[m] = { cost: 0, requests: 0, tokens: 0 };
        result.byModel[m].cost += cost;
        result.byModel[m].requests += 1;
        result.byModel[m].tokens += (Number(e.tokens?.input) || 0) + (Number(e.tokens?.output) || 0);
        if (!result.byAgent[a]) result.byAgent[a] = { cost: 0, requests: 0 };
        result.byAgent[a].cost += cost;
        result.byAgent[a].requests += 1;
      } catch {}
    }
  } catch {}
  result.total = Math.round(result.total * 1000000) / 1000000;
  return result;
}

export class CostMonitor extends EventEmitter {
  constructor() {
    super();
    this.state = {
      today: {
        total: 0,
        byModel: {},
        byAgent: {},
        requests: 0
      },
      budget: {
        daily: 5.00,
        hourly: 1.00
      }
    };

    // Load saved state, then sync from authoritative JSONL
    this.load().catch(() => {}).finally(() => this.syncFromJsonl());

    // Re-sync from JSONL every 5 minutes to stay current with native gateway traffic
    setInterval(() => this.syncFromJsonl(), 5 * 60 * 1000);

    // Save every minute
    setInterval(() => this.save(), 60 * 1000);

    // Reset daily at midnight
    this.scheduleReset();
  }

  async recordRequest(agentId, model, tokens, cost) {
    // Ensure types are correct (recordRequest must never throw)
    cost = Number(cost);
    if (!Number.isFinite(cost)) cost = 0;

    this.state.today.total = Number(this.state.today.total);
    if (!Number.isFinite(this.state.today.total)) this.state.today.total = 0;

    const tIn = Number(tokens?.input);
    const tOut = Number(tokens?.output);
    const safeTokensIn = Number.isFinite(tIn) ? tIn : 0;
    const safeTokensOut = Number.isFinite(tOut) ? tOut : 0;

    this.state.today.total += cost;
    this.state.today.requests += 1;

    // By model
    if (!this.state.today.byModel[model]) {
      this.state.today.byModel[model] = { cost: 0, requests: 0, tokens: 0 };
    }
    this.state.today.byModel[model].cost = Number(this.state.today.byModel[model].cost) || 0;
    this.state.today.byModel[model].cost += cost;
    this.state.today.byModel[model].requests += 1;
    this.state.today.byModel[model].tokens += (safeTokensIn + safeTokensOut);

    // By agent
    if (!this.state.today.byAgent[agentId]) {
      this.state.today.byAgent[agentId] = { cost: 0, requests: 0 };
    }
    this.state.today.byAgent[agentId].cost = Number(this.state.today.byAgent[agentId].cost) || 0;
    this.state.today.byAgent[agentId].cost += cost;
    this.state.today.byAgent[agentId].requests += 1;

    // Check budget
    if (this.state.today.total > this.state.budget.daily) {
      console.error('🚨 DAILY BUDGET EXCEEDED: $' + this.state.today.total.toFixed(2));
      this.emit('budget-exceeded', 'daily');
    }

    // Emit update for dashboard
    this.emit('cost-update', this.state);

    const costStr = Number.isFinite(cost) ? cost.toFixed(6) : '0.000000';
    const totalStr = Number.isFinite(this.state.today.total) ? this.state.today.total.toFixed(4) : '0.0000';
    console.log(`💰 Cost: $${costStr} | Total today: $${totalStr}`);
  }

  getBudgetRemaining() {
    return Math.max(0, this.state.budget.daily - this.state.today.total);
  }

  getState() {
    return {
      ...this.state,
      remaining: this.getBudgetRemaining(),
      percentage: (this.state.today.total / this.state.budget.daily) * 100
    };
  }

  async load() {
    const stateFile = path.join(__dirname, 'state.json');
    const data = await fs.readFile(stateFile, 'utf8');
    const loaded = JSON.parse(data);

    // Check if it's still today
    const today = new Date().toISOString().split('T')[0];
    if (loaded.date === today) {
      this.state.today = loaded.today;
      console.log('✅ Loaded cost state from disk');
    }
  }

  async save() {
    const stateFile = path.join(__dirname, 'state.json');
    const data = {
      date: new Date().toISOString().split('T')[0],
      today: this.state.today,
      savedAt: new Date().toISOString()
    };

    try {
      await fs.writeFile(stateFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save cost state:', error.message);
    }
  }

  scheduleReset() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow - now;

    setTimeout(() => {
      this.resetDaily();
      // Then reset every 24 hours
      setInterval(() => this.resetDaily(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  resetDaily() {
    console.log('🌅 New day! Resetting cost counters...');
    this.state.today = {
      total: 0,
      byModel: {},
      byAgent: {},
      requests: 0
    };
    this.save();
  }

  syncFromJsonl() {
    try {
      const fresh = buildTodayFromJsonl();
      // Only update if JSONL has more data than in-memory state
      if (fresh.requests >= this.state.today.requests) {
        this.state.today = fresh;
        this.save().catch(() => {});
        console.log(`✅ Synced cost state from JSONL — today: $${fresh.total.toFixed(4)}, ${fresh.requests} requests`);
      }
    } catch (e) {
      console.error('CostMonitor syncFromJsonl error:', e.message);
    }
  }
}

// Singleton instance
export const costMonitor = new CostMonitor();
