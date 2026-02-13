import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    // Load saved state
    this.load().catch(() => console.log('No previous state found'));

    // Save every minute
    setInterval(() => this.save(), 60 * 1000);

    // Reset daily at midnight
    this.scheduleReset();
  }

  async recordRequest(agentId, model, tokens, cost) {
    // Ensure types are correct
    cost = Number(cost) || 0;
    this.state.today.total = Number(this.state.today.total) || 0;

    this.state.today.total += cost;
    this.state.today.requests += 1;

    // By model
    if (!this.state.today.byModel[model]) {
      this.state.today.byModel[model] = { cost: 0, requests: 0, tokens: 0 };
    }
    this.state.today.byModel[model].cost = Number(this.state.today.byModel[model].cost) || 0;
    this.state.today.byModel[model].cost += cost;
    this.state.today.byModel[model].requests += 1;
    this.state.today.byModel[model].tokens += (tokens.input + tokens.output);

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

    console.log(`💰 Cost: $${cost.toFixed(6)} | Total today: $${this.state.today.total.toFixed(4)}`);
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
}

// Singleton instance
export const costMonitor = new CostMonitor();
