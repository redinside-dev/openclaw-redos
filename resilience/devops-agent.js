#!/usr/bin/env node

/**
 * DevOps Sub-Agent - Monitors system health and auto-fixes issues
 * Runs 24/7, keeps everything working
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEALTH_LOG = path.join(__dirname, '../logs/health.jsonl');

class DevOpsAgent {
  constructor() {
    this.name = 'DevOps-Agent';
    this.checks = [];
    this.fixes = [];
    this.healthHistory = [];
    this.autoFixEnabled = true;
    this.checkInterval = 30000; // Check every 30s
    this.isRunning = false;
  }

  /**
   * Start monitoring
   */
  async start() {
    console.log('\n🔧 DevOps Agent Starting...\n');
    console.log('Monitoring:');
    console.log('  ✅ Gateway health');
    console.log('  ✅ Model availability');
    console.log('  ✅ Cost tracking');
    console.log('  ✅ Error rates');
    console.log('  ✅ Response times\n');

    this.isRunning = true;
    this.monitorLoop();
  }

  /**
   * Main monitoring loop
   */
  async monitorLoop() {
    while (this.isRunning) {
      try {
        await this.runHealthChecks();
        await this.sleep(this.checkInterval);
      } catch (error) {
        console.error('❌ Monitor error:', error.message);
        await this.sleep(this.checkInterval);
      }
    }
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check gateway
    results.checks.gateway = await this.checkGateway();

    // Check Ollama
    results.checks.ollama = await this.checkOllama();

    // Check error rates
    results.checks.errorRate = await this.checkErrorRate();

    // Check response times
    results.checks.responseTimes = await this.checkResponseTimes();

    // Auto-fix if needed
    if (this.autoFixEnabled) {
      await this.autoFix(results);
    }

    // Log results
    await this.logHealth(results);

    // Store in history
    this.healthHistory.push(results);
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift();
    }

    // Print status
    this.printStatus(results);
  }

  /**
   * Check gateway health
   */
  async checkGateway() {
    try {
      const response = await fetch('http://localhost:19000/health', {
        timeout: 5000
      });

      if (!response.ok) {
        return {
          status: 'degraded',
          message: `HTTP ${response.status}`,
          fix: 'restart-gateway'
        };
      }

      const data = await response.json();
      return {
        status: 'healthy',
        uptime: data.uptime,
        cost: data.cost.today.total
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
        fix: 'restart-gateway'
      };
    }
  }

  /**
   * Check Ollama availability
   */
  async checkOllama() {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        timeout: 5000
      });

      if (!response.ok) {
        return {
          status: 'down',
          error: 'Ollama not responding',
          fix: 'restart-ollama'
        };
      }

      const data = await response.json();
      return {
        status: 'healthy',
        models: data.models?.length || 0
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
        fix: 'restart-ollama'
      };
    }
  }

  /**
   * Check error rate
   */
  async checkErrorRate() {
    try {
      const errorLog = path.join(__dirname, '../logs/errors.jsonl');
      const data = await fs.readFile(errorLog, 'utf8');
      const errors = data.trim().split('\n').filter(Boolean);

      // Count errors in last 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentErrors = errors.filter(line => {
        try {
          const entry = JSON.parse(line);
          return new Date(entry.timestamp).getTime() > fiveMinutesAgo;
        } catch {
          return false;
        }
      });

      const rate = recentErrors.length / 5; // Errors per minute

      if (rate > 5) {
        return {
          status: 'critical',
          errorsPerMinute: rate.toFixed(2),
          fix: 'investigate-errors'
        };
      } else if (rate > 2) {
        return {
          status: 'warning',
          errorsPerMinute: rate.toFixed(2)
        };
      } else {
        return {
          status: 'healthy',
          errorsPerMinute: rate.toFixed(2)
        };
      }
    } catch (error) {
      return {
        status: 'unknown',
        error: 'Cannot read error log'
      };
    }
  }

  /**
   * Check response times
   */
  async checkResponseTimes() {
    try {
      const start = Date.now();
      const response = await fetch('http://localhost:19000/api/status', {
        timeout: 10000
      });
      const latency = Date.now() - start;

      if (latency > 5000) {
        return {
          status: 'slow',
          latency: latency,
          fix: 'optimize-performance'
        };
      } else if (latency > 2000) {
        return {
          status: 'acceptable',
          latency: latency
        };
      } else {
        return {
          status: 'fast',
          latency: latency
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Auto-fix issues
   */
  async autoFix(results) {
    const fixes = [];

    // Fix gateway if down
    if (results.checks.gateway.status === 'down') {
      console.log('\n🔧 Auto-fixing: Gateway is down');
      fixes.push(this.restartGateway());
    }

    // Fix Ollama if down
    if (results.checks.ollama.status === 'down') {
      console.log('\n🔧 Auto-fixing: Ollama is down');
      fixes.push(this.restartOllama());
    }

    // Wait for all fixes
    if (fixes.length > 0) {
      await Promise.allSettled(fixes);
      console.log('✅ Auto-fix complete\n');
    }
  }

  /**
   * Restart gateway
   */
  async restartGateway() {
    try {
      console.log('  → Killing old gateway process...');
      await execAsync('pkill -f "gateway/server.js"');
      await this.sleep(2000);

      console.log('  → Starting new gateway...');
      await execAsync('cd ~/.openclaw && node gateway/server.js > /tmp/openclaw-gateway.log 2>&1 &');
      await this.sleep(5000);

      console.log('  ✅ Gateway restarted');
      return true;
    } catch (error) {
      console.error('  ❌ Failed to restart gateway:', error.message);
      return false;
    }
  }

  /**
   * Restart Ollama
   */
  async restartOllama() {
    try {
      console.log('  → Restarting Ollama...');
      await execAsync('ollama serve > /tmp/ollama.log 2>&1 &');
      await this.sleep(5000);

      console.log('  ✅ Ollama restarted');
      return true;
    } catch (error) {
      console.error('  ❌ Failed to restart Ollama:', error.message);
      return false;
    }
  }

  /**
   * Log health status
   */
  async logHealth(results) {
    try {
      await fs.appendFile(HEALTH_LOG, JSON.stringify(results) + '\n');
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Print status
   */
  printStatus(results) {
    const statusEmoji = {
      healthy: '✅',
      down: '❌',
      degraded: '⚠️',
      warning: '⚠️',
      critical: '🚨',
      slow: '🐌',
      acceptable: '✅',
      fast: '⚡',
      unknown: '❓'
    };

    console.log(`\n[${new Date().toLocaleTimeString()}] System Health:`);
    console.log(`  Gateway:      ${statusEmoji[results.checks.gateway.status]} ${results.checks.gateway.status}`);
    console.log(`  Ollama:       ${statusEmoji[results.checks.ollama.status]} ${results.checks.ollama.status}`);
    console.log(`  Error Rate:   ${statusEmoji[results.checks.errorRate.status]} ${results.checks.errorRate.errorsPerMinute}/min`);
    console.log(`  Response:     ${statusEmoji[results.checks.responseTimes.status]} ${results.checks.responseTimes.latency}ms`);
  }

  /**
   * Get health summary
   */
  getSummary() {
    if (this.healthHistory.length === 0) {
      return { status: 'no-data' };
    }

    const latest = this.healthHistory[this.healthHistory.length - 1];
    const uptime = this.healthHistory.length * (this.checkInterval / 1000);

    return {
      status: 'monitoring',
      uptime: uptime,
      checks: latest.checks,
      history: this.healthHistory.length
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop monitoring
   */
  stop() {
    console.log('\n👋 DevOps Agent stopping...\n');
    this.isRunning = false;
  }
}

// Export singleton
export const devopsAgent = new DevOpsAgent();

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  devopsAgent.start().catch(error => {
    console.error('❌ DevOps Agent crashed:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => devopsAgent.stop());
  process.on('SIGINT', () => devopsAgent.stop());
}
