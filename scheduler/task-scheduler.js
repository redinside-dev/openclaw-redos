#!/usr/bin/env node

/**
 * Task Scheduler - Runs background tasks using slower/cheaper models
 * Perfect for cron jobs, email processing, non-urgent tasks
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASK_QUEUE = path.join(__dirname, '../logs/task-queue.jsonl');
const GATEWAY_URL = 'http://localhost:19000';

class TaskScheduler {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 3;
    this.currentTasks = 0;
    this.completedTasks = 0;
    this.failedTasks = 0;
  }

  /**
   * Schedule a task
   */
  async scheduleTask(task) {
    const scheduledTask = {
      id: this.generateId(),
      ...task,
      scheduledAt: new Date().toISOString(),
      status: 'pending',
      priority: task.priority || 'normal',
      useSlowModel: task.useSlowModel !== false, // Default to slow models
      retries: 0,
      maxRetries: task.maxRetries || 3
    };

    this.queue.push(scheduledTask);
    await this.saveQueue();

    console.log(`📅 Scheduled task: ${scheduledTask.id} - ${scheduledTask.description}`);

    if (!this.processing) {
      this.startProcessing();
    }

    return scheduledTask.id;
  }

  /**
   * Schedule recurring task (cron-style)
   */
  scheduleRecurring(task, schedule) {
    // Parse schedule
    const interval = this.parseSchedule(schedule);

    const run = async () => {
      await this.scheduleTask(task);
      setTimeout(run, interval);
    };

    console.log(`🔄 Scheduled recurring task: ${task.description} (every ${interval}ms)`);
    setTimeout(run, interval);
  }

  /**
   * Parse schedule string
   */
  parseSchedule(schedule) {
    const patterns = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };

    return patterns[schedule] || 60 * 60 * 1000; // Default 1h
  }

  /**
   * Start processing queue
   */
  async startProcessing() {
    this.processing = true;
    console.log('🚀 Task processor started');

    while (this.processing) {
      // Get next tasks
      const tasks = this.getNextTasks();

      if (tasks.length === 0) {
        await this.sleep(5000); // Wait 5s
        continue;
      }

      // Process tasks in parallel
      const promises = tasks.map(task => this.processTask(task));
      await Promise.allSettled(promises);

      await this.sleep(1000);
    }
  }

  /**
   * Get next tasks to process
   */
  getNextTasks() {
    const available = this.maxConcurrent - this.currentTasks;
    if (available <= 0) return [];

    // Sort by priority
    const priorityMap = { urgent: 3, high: 2, normal: 1, low: 0 };
    const sorted = this.queue
      .filter(t => t.status === 'pending')
      .sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);

    return sorted.slice(0, available);
  }

  /**
   * Process a task
   */
  async processTask(task) {
    this.currentTasks++;
    task.status = 'processing';
    task.startedAt = new Date().toISOString();

    console.log(`\n▶️  Processing: ${task.id} - ${task.description}`);

    try {
      // Call gateway with background flag
      const response = await fetch(`${GATEWAY_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: task.agentId || 'main',
          message: task.message,
          context: {
            ...task.context,
            background: true,
            scheduled: true,
            taskId: task.id
          }
        }),
        timeout: 600000 // 10 minute timeout for slow models
      });

      if (!response.ok) {
        throw new Error(`Gateway error: ${response.statusText}`);
      }

      const result = await response.json();

      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result;

      this.completedTasks++;
      console.log(`✅ Completed: ${task.id}`);

      // Remove from queue
      this.queue = this.queue.filter(t => t.id !== task.id);

      // Call callback if provided
      if (task.callback) {
        try {
          await fetch(task.callback, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.id, result })
          });
        } catch (callbackError) {
          console.error('❌ Callback failed:', callbackError.message);
        }
      }

    } catch (error) {
      console.error(`❌ Task failed: ${task.id} - ${error.message}`);

      task.retries++;
      if (task.retries < task.maxRetries) {
        task.status = 'pending';
        console.log(`🔄 Retrying ${task.id} (${task.retries}/${task.maxRetries})`);
      } else {
        task.status = 'failed';
        task.error = error.message;
        this.failedTasks++;
        this.queue = this.queue.filter(t => t.id !== task.id);
      }
    } finally {
      this.currentTasks--;
      await this.saveQueue();
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.currentTasks,
      completed: this.completedTasks,
      failed: this.failedTasks,
      tasks: this.queue.map(t => ({
        id: t.id,
        description: t.description,
        status: t.status,
        priority: t.priority,
        retries: t.retries
      }))
    };
  }

  /**
   * Save queue to disk
   */
  async saveQueue() {
    try {
      const data = JSON.stringify(this.queue, null, 2);
      await fs.writeFile(TASK_QUEUE, data);
    } catch (error) {
      console.error('Failed to save queue:', error.message);
    }
  }

  /**
   * Load queue from disk
   */
  async loadQueue() {
    try {
      const data = await fs.readFile(TASK_QUEUE, 'utf8');
      this.queue = JSON.parse(data);
      console.log(`📂 Loaded ${this.queue.length} tasks from disk`);
    } catch (error) {
      // No queue file yet
      this.queue = [];
    }
  }

  /**
   * Generate task ID
   */
  generateId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop processing
   */
  stop() {
    console.log('\n👋 Task scheduler stopping...');
    this.processing = false;
  }
}

// Export singleton
export const taskScheduler = new TaskScheduler();

// Example scheduled tasks
export const scheduledTasks = {
  // Check email every 15 minutes
  emailCheck: {
    description: 'Check and summarize new emails',
    message: 'Check my email and give me a summary of new messages',
    agentId: 'main',
    priority: 'low',
    useSlowModel: true
  },

  // Daily summary at 9 AM
  dailySummary: {
    description: 'Generate daily summary',
    message: 'Give me a summary of tasks, emails, and priorities for today',
    agentId: 'main',
    priority: 'normal',
    useSlowModel: true
  },

  // System health check every hour
  healthCheck: {
    description: 'System health check',
    message: 'Check system status and report any issues',
    agentId: 'ops',
    priority: 'high',
    useSlowModel: false
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n📅 Task Scheduler Starting...\n');

  // Load queue
  await taskScheduler.loadQueue();

  // Start processing
  taskScheduler.startProcessing();

  // Setup example scheduled tasks
  taskScheduler.scheduleRecurring(scheduledTasks.emailCheck, '15m');
  taskScheduler.scheduleRecurring(scheduledTasks.healthCheck, '1h');

  // Graceful shutdown
  process.on('SIGTERM', () => taskScheduler.stop());
  process.on('SIGINT', () => taskScheduler.stop());
}
