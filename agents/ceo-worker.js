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
   * Monitor worker health (for future FIRE capability)
   */
  async monitorWorkerHealth() {
    // TODO: Track worker performance
    // - Tasks completed per hour
    // - Success rate
    // - Response time
    // CEO can FIRE underperforming workers
  }
}

// Start CEO worker if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const ceo = new CEOWorker();

  process.on('SIGINT', () => {
    console.log('\n👔 CEO shutting down gracefully...');
    ceo.stop();
    process.exit(0);
  });

  ceo.start().catch(err => {
    console.error('CEO worker failed:', err);
    process.exit(1);
  });
}

export { CEOWorker };
