#!/usr/bin/env node

/**
 * CEO AUTONOMOUS WORKER - Ultimate Authority
 *
 * Powers:
 * - HIRE: Start workers when needed
 * - FIRE: Stop underperforming workers
 * - OVERRIDE: Forcefully reassign stuck tasks
 * - MONITOR: Watch entire system health
 */

import { AutonomousWorker } from './autonomous-worker.js';
import fs from 'fs/promises';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class CEOWorker extends AutonomousWorker {
  constructor() {
    super('ceo', 'CEO');
    this.monitorInterval = 60000; // Check every 1 minute
    this.taskStuckThreshold = 120000; // 2 minutes
    this.workerStartAttempts = new Map(); // Track start attempts
    this.workerPerformance = new Map(); // workerId -> { tasks, successes, failures, avgLatency, lastActive }
    this.fireThresholds = {
      minTasks: 3,            // Minimum tasks before evaluating
      maxFailureRate: 0.6,    // Fire if >60% failure rate
      maxAvgLatency: 180000,  // Fire if avg latency >3 minutes
      inactiveTimeout: 300000 // Fire if inactive >5 minutes
    };
    this.hireFireLog = [];    // Audit trail of all hire/fire actions
  }

  async start() {
    console.log('\n👔 CEO WORKER - Ultimate Authority');
    console.log('   Powers: HIRE, FIRE, OVERRIDE, MONITOR\n');

    // Start base autonomous worker
    super.start();

    // Also run CEO-specific monitoring
    this.ceoMonitoringLoop();
  }

  /**
   * CEO monitoring loop - watches for stuck tasks
   */
  async ceoMonitoringLoop() {
    while (this.isRunning) {
      try {
        await this.monitorStuckTasks();
        await this.monitorWorkerHealth();
        await this.sleep(this.monitorInterval);
      } catch (error) {
        console.error('❌ CEO monitoring error:', error.message);
        await this.sleep(this.monitorInterval);
      }
    }
  }

  /**
   * Monitor for stuck tasks and forcefully reassign
   */
  async monitorStuckTasks() {
    const queue = await this.loadQueue();
    const now = Date.now();

    for (const task of queue.pending) {
      const taskAge = now - new Date(task.created_at).getTime();

      if (taskAge > this.taskStuckThreshold) {
        console.log(`\n⚠️  CEO DETECTED: Task stuck for ${Math.round(taskAge / 1000)}s`);
        console.log(`   Task: ${task.id} - ${task.title}`);
        console.log(`   Assigned to: ${task.assigned_to.join(', ')}`);

        // Check if assigned workers are active
        const activeWorkers = await this.getActiveWorkers();
        const assignedActive = task.assigned_to.some(a =>
          activeWorkers.includes(a.toLowerCase())
        );

        if (!assignedActive) {
          console.log(`   🚨 NONE of assigned workers are active!`);
          await this.ceoOverrideReassign(task, activeWorkers);
        } else {
          console.log(`   ℹ️  Some workers active but task still stuck`);
          console.log(`   CEO will wait one more cycle before intervening`);
        }
      }
    }
  }

  /**
   * CEO OVERRIDE: Forcefully reassign task
   */
  async ceoOverrideReassign(task, activeWorkers) {
    console.log(`\n👔 CEO EXERCISING OVERRIDE AUTHORITY`);

    // Try to HIRE the missing worker first
    const missingWorkers = task.assigned_to.filter(a =>
      !activeWorkers.includes(a.toLowerCase())
    );

    console.log(`   Missing workers: ${missingWorkers.join(', ')}`);

    for (const workerType of missingWorkers) {
      const hired = await this.hireWorker(workerType.toLowerCase());
      if (hired) {
        console.log(`   ✅ CEO HIRED ${workerType} worker`);
        console.log(`   Task will be picked up by new hire within 10s`);
        return; // Worker hired, task will be handled
      }
    }

    // If can't hire, FORCEFULLY REASSIGN to available workers
    console.log(`\n   Could not hire workers, proceeding with FORCED REASSIGNMENT`);

    const queue = await this.loadQueue();
    const taskIndex = queue.pending.findIndex(t => t.id === task.id);

    if (taskIndex !== -1) {
      const oldAssignment = [...queue.pending[taskIndex].assigned_to];

      // Reassign to all active workers (distribute widely)
      queue.pending[taskIndex].assigned_to = activeWorkers.map(w => w.toUpperCase());

      // Log CEO override
      queue.pending[taskIndex].ceo_override = {
        timestamp: new Date().toISOString(),
        original_assignment: oldAssignment,
        new_assignment: queue.pending[taskIndex].assigned_to,
        reason: 'Original workers unavailable - CEO forced reassignment',
        authority: 'CEO'
      };

      await this.saveQueue(queue);

      console.log(`   ✅ CEO FORCEFULLY REASSIGNED:`);
      console.log(`      FROM: ${oldAssignment.join(', ')}`);
      console.log(`      TO: ${queue.pending[taskIndex].assigned_to.join(', ')}`);
      console.log(`   📢 Active workers will pick this up immediately`);
    }
  }

  /**
   * HIRE: Start a new autonomous worker
   */
  async hireWorker(workerType) {
    const workerId = workerType.toLowerCase();
    const attemptKey = `${workerId}-${Date.now()}`;

    // Check if already tried recently
    if (this.workerStartAttempts.has(workerId)) {
      const lastAttempt = this.workerStartAttempts.get(workerId);
      if (Date.now() - lastAttempt < 300000) { // 5 minutes
        console.log(`   ⏸️  Already tried hiring ${workerId} recently`);
        return false;
      }
    }

    console.log(`\n💼 CEO HIRING: Starting ${workerId} worker...`);

    try {
      // Spawn autonomous worker process
      const child = spawn('node', [
        'agents/autonomous-worker.js',
        workerId,
        `${workerId.charAt(0).toUpperCase() + workerId.slice(1)} Agent`
      ], {
        detached: true,
        stdio: 'ignore',
        cwd: process.cwd()
      });

      child.unref();

      this.workerStartAttempts.set(workerId, Date.now());

      // Wait and verify worker started
      await this.sleep(3000);

      const activeWorkers = await this.getActiveWorkers();
      if (activeWorkers.includes(workerId)) {
        console.log(`   ✅ ${workerId} worker successfully hired and active`);
        return true;
      } else {
        console.log(`   ❌ ${workerId} worker failed to start`);
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Failed to hire ${workerId}:`, error.message);
      return false;
    }
  }

  /**
   * Get list of active autonomous workers
   */
  async getActiveWorkers() {
    try {
      const { stdout } = await execAsync('ps aux | grep "autonomous-worker" | grep -v grep');
      const lines = stdout.trim().split('\n');

      const workers = lines
        .map(line => {
          const match = line.match(/autonomous-worker\.js\s+(\w+)/);
          return match ? match[1].toLowerCase() : null;
        })
        .filter(w => w);

      return workers;
    } catch {
      return [];
    }
  }

  /**
   * Monitor worker health and FIRE underperformers
   */
  async monitorWorkerHealth() {
    const activeWorkers = await this.getActiveWorkers();

    // Update last-seen for active workers
    for (const wid of activeWorkers) {
      if (!this.workerPerformance.has(wid)) {
        this.workerPerformance.set(wid, { tasks: 0, successes: 0, failures: 0, totalLatency: 0, lastActive: Date.now() });
      }
      this.workerPerformance.get(wid).lastActive = Date.now();
    }

    // Load completed/failed task counts from queue
    try {
      const queue = await this.loadQueue();
      const completed = queue.completed || [];
      const failed = queue.failed || [];

      // Tally per-worker stats from recent tasks (last hour)
      const oneHourAgo = Date.now() - 3600000;
      for (const t of completed) {
        if (new Date(t.completed_at || 0).getTime() < oneHourAgo) continue;
        const wid = (t.claimed_by || '').toLowerCase();
        if (!wid) continue;
        if (!this.workerPerformance.has(wid)) {
          this.workerPerformance.set(wid, { tasks: 0, successes: 0, failures: 0, totalLatency: 0, lastActive: Date.now() });
        }
        const perf = this.workerPerformance.get(wid);
        // Avoid double-counting by checking task id
        if (!perf._counted) perf._counted = new Set();
        if (perf._counted.has(t.id)) continue;
        perf._counted.add(t.id);
        perf.tasks++;
        perf.successes++;
        if (t.completed_at && t.claimed_at) {
          perf.totalLatency += new Date(t.completed_at).getTime() - new Date(t.claimed_at).getTime();
        }
      }
      for (const t of failed) {
        if (new Date(t.failed_at || 0).getTime() < oneHourAgo) continue;
        const wid = (t.claimed_by || '').toLowerCase();
        if (!wid) continue;
        if (!this.workerPerformance.has(wid)) {
          this.workerPerformance.set(wid, { tasks: 0, successes: 0, failures: 0, totalLatency: 0, lastActive: Date.now() });
        }
        const perf = this.workerPerformance.get(wid);
        if (!perf._counted) perf._counted = new Set();
        if (perf._counted.has(t.id)) continue;
        perf._counted.add(t.id);
        perf.tasks++;
        perf.failures++;
      }
    } catch (e) {
      // Queue might not have completed/failed arrays yet
    }

    // Evaluate each tracked worker
    const now = Date.now();
    for (const [wid, perf] of this.workerPerformance.entries()) {
      // Skip CEO itself
      if (wid === 'ceo') continue;

      const failureRate = perf.tasks > 0 ? perf.failures / perf.tasks : 0;
      const avgLatency = perf.successes > 0 ? perf.totalLatency / perf.successes : 0;
      const inactive = now - perf.lastActive;

      let fireReason = null;

      if (perf.tasks >= this.fireThresholds.minTasks && failureRate > this.fireThresholds.maxFailureRate) {
        fireReason = `High failure rate: ${(failureRate * 100).toFixed(0)}% (${perf.failures}/${perf.tasks} tasks failed)`;
      } else if (perf.successes >= this.fireThresholds.minTasks && avgLatency > this.fireThresholds.maxAvgLatency) {
        fireReason = `Slow performance: avg ${Math.round(avgLatency / 1000)}s per task (threshold: ${this.fireThresholds.maxAvgLatency / 1000}s)`;
      } else if (inactive > this.fireThresholds.inactiveTimeout && activeWorkers.includes(wid)) {
        fireReason = `Inactive for ${Math.round(inactive / 1000)}s while still running`;
      }

      if (fireReason) {
        console.log(`\n🔥 CEO FIRING ${wid}: ${fireReason}`);
        await this.fireWorker(wid, fireReason);
      }
    }
  }

  /**
   * FIRE: Stop an underperforming worker
   */
  async fireWorker(workerId, reason) {
    const logEntry = {
      action: 'FIRE',
      workerId,
      reason,
      timestamp: new Date().toISOString(),
      performance: this.workerPerformance.get(workerId) || {}
    };

    try {
      // Kill the worker process
      await execAsync(`pkill -f "autonomous-worker.js ${workerId}"`);
      logEntry.success = true;
      console.log(`   ✅ Worker ${workerId} terminated`);

      // Reassign any in-progress tasks from this worker
      const queue = await this.loadQueue();
      const inProgress = queue.in_progress || [];
      let reassigned = 0;

      for (let i = inProgress.length - 1; i >= 0; i--) {
        if ((inProgress[i].claimed_by || '').toLowerCase() === workerId) {
          const task = inProgress.splice(i, 1)[0];
          task.status = 'pending';
          task.claimed_by = null;
          task.ceo_override = {
            timestamp: new Date().toISOString(),
            reason: `Worker ${workerId} fired: ${reason}`,
            authority: 'CEO'
          };
          queue.pending.push(task);
          reassigned++;
        }
      }

      if (reassigned > 0) {
        await this.saveQueue(queue);
        console.log(`   📋 Reassigned ${reassigned} task(s) back to pending queue`);
        logEntry.tasksReassigned = reassigned;
      }

      // Clear performance data
      this.workerPerformance.delete(workerId);

    } catch (error) {
      logEntry.success = false;
      logEntry.error = error.message;
      console.log(`   ⚠️  Could not kill ${workerId}: ${error.message} (may already be stopped)`);
    }

    this.hireFireLog.push(logEntry);

    // Persist log to disk
    await this.persistHireFireLog();

    return logEntry;
  }

  /**
   * Record worker activity (called externally via API)
   */
  recordWorkerActivity(workerId, taskId, success, latencyMs) {
    if (!this.workerPerformance.has(workerId)) {
      this.workerPerformance.set(workerId, { tasks: 0, successes: 0, failures: 0, totalLatency: 0, lastActive: Date.now() });
    }
    const perf = this.workerPerformance.get(workerId);
    perf.tasks++;
    if (success) {
      perf.successes++;
      perf.totalLatency += latencyMs || 0;
    } else {
      perf.failures++;
    }
    perf.lastActive = Date.now();
  }

  /**
   * Get full worker status for dashboard/API
   */
  getWorkerStatus() {
    const workers = [];
    for (const [wid, perf] of this.workerPerformance.entries()) {
      const failureRate = perf.tasks > 0 ? perf.failures / perf.tasks : 0;
      const avgLatency = perf.successes > 0 ? Math.round(perf.totalLatency / perf.successes) : 0;
      workers.push({
        id: wid,
        tasks: perf.tasks,
        successes: perf.successes,
        failures: perf.failures,
        failureRate: Math.round(failureRate * 100),
        avgLatencyMs: avgLatency,
        lastActive: perf.lastActive,
        status: failureRate > this.fireThresholds.maxFailureRate ? 'at_risk' :
                (Date.now() - perf.lastActive > this.fireThresholds.inactiveTimeout ? 'inactive' : 'healthy')
      });
    }
    return {
      workers,
      thresholds: this.fireThresholds,
      hireFireLog: this.hireFireLog.slice(-20),
      stats: {
        totalHires: this.hireFireLog.filter(l => l.action === 'HIRE').length,
        totalFires: this.hireFireLog.filter(l => l.action === 'FIRE').length,
      }
    };
  }

  /**
   * Persist hire/fire log to disk
   */
  async persistHireFireLog() {
    try {
      const logPath = `${process.cwd()}/workspace/ops/ceo-hire-fire-log.json`;
      await fs.writeFile(logPath, JSON.stringify(this.hireFireLog, null, 2));
    } catch (e) {
      console.error('Failed to persist hire/fire log:', e.message);
    }
  }
}

// Singleton for API access
let ceoWorkerInstance = null;

// Start CEO worker if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ceoWorkerInstance = new CEOWorker();

  process.on('SIGINT', () => {
    console.log('\n👔 CEO shutting down gracefully...');
    ceoWorkerInstance.stop();
    process.exit(0);
  });

  ceoWorkerInstance.start().catch(err => {
    console.error('CEO worker failed:', err);
    process.exit(1);
  });
}

export { CEOWorker, ceoWorkerInstance };
