#!/usr/bin/env node

/**
 * AUTONOMOUS WORKER - Bootstrap Loop
 *
 * Minimal implementation to get agents working autonomously.
 * Agents will improve and expand this themselves.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE = path.join(__dirname, '../workspace/tasks/queue.json');
const GATEWAY_URL = 'http://localhost:19000';

class AutonomousWorker {
  constructor(agentId, agentName) {
    this.agentId = agentId;
    this.agentName = agentName;
    this.isRunning = false;
    this.pollInterval = 10000; // Poll every 10 seconds
    this.maxConcurrent = 2; // Max tasks at once
    this.currentTasks = 0;
  }

  /**
   * Start the autonomous loop
   */
  async start() {
    console.log(`\n🤖 ${this.agentName} Autonomous Worker Starting...`);
    console.log(`   Agent ID: ${this.agentId}`);
    console.log(`   Poll interval: ${this.pollInterval}ms`);
    console.log(`   Max concurrent: ${this.maxConcurrent}\n`);

    this.isRunning = true;
    this.autonomousLoop();
  }

  /**
   * Stop the loop
   */
  stop() {
    console.log(`\n🛑 ${this.agentName} stopping...`);
    this.isRunning = false;
  }

  /**
   * Main autonomous loop - like a real employee checking their task board
   */
  async autonomousLoop() {
    while (this.isRunning) {
      try {
        // Check if we have capacity
        if (this.currentTasks < this.maxConcurrent) {
          // Look for work
          const task = await this.findMyNextTask();

          if (task) {
            console.log(`\n✅ ${this.agentName} claimed task: ${task.id}`);
            console.log(`   ${task.title}`);

            // Work on it (don't wait - async execution)
            this.executeTask(task).catch(err => {
              console.error(`❌ Task ${task.id} failed:`, err.message);
              this.markTaskFailed(task.id, err.message);
            });
          }
        }

        // Wait before next poll
        await this.sleep(this.pollInterval);
      } catch (error) {
        console.error(`❌ Loop error:`, error.message);
        await this.sleep(this.pollInterval);
      }
    }
  }

  /**
   * Find next task assigned to this agent
   */
  async findMyNextTask() {
    try {
      const queue = await this.loadQueue();

      // Find tasks assigned to me that are pending
      const myTask = queue.pending.find(task =>
        task.assigned_to && (
          task.assigned_to.includes(this.agentId.toUpperCase()) ||
          task.assigned_to.includes(this.agentId)
        )
      );

      if (myTask) {
        // Claim it - move to in_progress
        await this.claimTask(myTask.id);
        return myTask;
      }

      return null;
    } catch (error) {
      console.error('Error finding task:', error.message);
      return null;
    }
  }

  /**
   * Claim a task
   */
  async claimTask(taskId) {
    const queue = await this.loadQueue();

    const taskIndex = queue.pending.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = queue.pending[taskIndex];
    task.status = 'in_progress';
    task.claimed_by = this.agentId;
    task.claimed_at = new Date().toISOString();

    // Move to in_progress
    queue.pending.splice(taskIndex, 1);
    queue.in_progress.push(task);

    await this.saveQueue(queue);
    this.currentTasks++;
  }

  /**
   * Execute a task
   */
  async executeTask(task) {
    console.log(`\n🔨 ${this.agentName} executing: ${task.id}`);

    try {
      let result;

      // Execute based on task type
      if (task.type === 'code_implementation') {
        result = await this.executeCodeTask(task);
      } else if (task.type === 'issue_resolution') {
        result = await this.resolveIssue(task);
      } else if (task.type === 'research') {
        result = await this.executeResearch(task);
      } else {
        result = await this.executeGenericTask(task);
      }

      // Mark completed
      await this.markTaskCompleted(task.id, result);

      console.log(`✅ ${this.agentName} completed: ${task.id}`);

    } catch (error) {
      console.error(`❌ ${this.agentName} failed task ${task.id}:`, error.message);
      await this.markTaskFailed(task.id, error.message);
    } finally {
      this.currentTasks--;
    }
  }

  /**
   * Execute code implementation task
   */
  async executeCodeTask(task) {
    console.log(`   📝 Implementing: ${task.description}`);

    // Call gateway to get agent to implement
    const response = await fetch(`${GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: this.agentId,
        message: `AUTONOMOUS TASK: ${task.title}\n\n${task.description}\n\nImplement this now and report what you did.`
      })
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      output: result.content,
      model: result.model
    };
  }

  /**
   * Resolve issue task
   */
  async resolveIssue(task) {
    console.log(`   🔧 Resolving issue: ${task.issue_id}`);

    // Use 4-level self-healing protocol
    const steps = [
      '1. Check knowledge base for similar issues',
      '2. If not found, analyze the problem',
      '3. Research solution if needed',
      '4. Implement fix',
      '5. Test the fix',
      '6. Document solution'
    ];

    const message = `ISSUE RESOLUTION TASK: ${task.issue_id}

Issue: ${task.title}
Description: ${task.description}

Use the 4-level self-healing protocol:
${steps.join('\n')}

Per contract: Self-healing is required. Fix this issue autonomously.

Report: What was the root cause and how did you fix it?`;

    // Execute via gateway
    const response = await fetch(`${GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: this.agentId,
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      resolution: result.content,
      model: result.model
    };
  }

  /**
   * Execute research task
   */
  async executeResearch(task) {
    console.log(`   🔍 Researching: ${task.description}`);

    const response = await fetch(`${GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'research',
        message: `RESEARCH TASK: ${task.title}\n\n${task.description}\n\nProvide findings and recommendations.`
      })
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      findings: result.content,
      model: result.model
    };
  }

  /**
   * Execute generic task
   */
  async executeGenericTask(task) {
    console.log(`   ⚙️  Processing: ${task.description}`);

    const response = await fetch(`${GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: this.agentId,
        message: `TASK: ${task.title}\n\n${task.description}\n\nComplete this task and report results.`
      })
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      output: result.content
    };
  }

  /**
   * Mark task completed
   */
  async markTaskCompleted(taskId, result) {
    const queue = await this.loadQueue();

    const taskIndex = queue.in_progress.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = queue.in_progress[taskIndex];
    task.status = 'completed';
    task.completed_by = this.agentId;
    task.completed_at = new Date().toISOString();
    task.result = result;

    // Move to completed
    queue.in_progress.splice(taskIndex, 1);
    queue.completed.push(task);

    await this.saveQueue(queue);
  }

  /**
   * Mark task failed
   */
  async markTaskFailed(taskId, error) {
    const queue = await this.loadQueue();

    const taskIndex = queue.in_progress.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = queue.in_progress[taskIndex];
    task.status = 'failed';
    task.failed_by = this.agentId;
    task.failed_at = new Date().toISOString();
    task.error = error;
    task.retry_count = (task.retry_count || 0) + 1;

    // Move to failed or retry
    queue.in_progress.splice(taskIndex, 1);

    if (task.retry_count < 3) {
      // Retry - put back in pending
      task.status = 'pending';
      queue.pending.push(task);
    } else {
      // Give up
      queue.failed.push(task);
    }

    await this.saveQueue(queue);
  }

  /**
   * Load queue
   */
  async loadQueue() {
    try {
      const data = await fs.readFile(QUEUE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Create default queue
      const defaultQueue = {
        pending: [],
        in_progress: [],
        awaiting_approval: [],
        completed: [],
        failed: []
      };
      await this.saveQueue(defaultQueue);
      return defaultQueue;
    }
  }

  /**
   * Save queue
   */
  async saveQueue(queue) {
    await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use by other modules
export { AutonomousWorker };

// If run directly, start a worker
if (import.meta.url === `file://${process.argv[1]}`) {
  const agentId = process.argv[2] || 'engineering';
  const agentName = process.argv[3] || 'Engineering Agent';

  const worker = new AutonomousWorker(agentId, agentName);

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, shutting down...');
    worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\nReceived SIGTERM, shutting down...');
    worker.stop();
    process.exit(0);
  });

  worker.start().catch(err => {
    console.error('Worker failed:', err);
    process.exit(1);
  });
}
