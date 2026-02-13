import { EnhancedHandler } from '../gateway/enhanced-handler.js';
import { costMonitor } from '../cost-monitor/monitor.js';

/**
 * CEO Agent - Spawns and manages secretary sub-agents
 * Monitors progress, pushes work, and ensures tasks get done
 */
export class CEOAgent {
  constructor() {
    this.handler = new EnhancedHandler();
    this.secretaries = new Map(); // secretary_id -> Secretary instance
    this.tasks = new Map(); // task_id -> Task object
    this.workRounds = []; // Track work round history
  }

  /**
   * Spawn a secretary sub-agent for a specific task
   */
  spawnSecretary(task, config = {}) {
    const secretaryId = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const secretary = {
      id: secretaryId,
      task: task,
      role: config.role || 'monitor', // monitor, executor, researcher
      status: 'active',
      createdAt: new Date(),
      roundsCompleted: 0,
      maxRounds: config.maxRounds || 10,
      checkInterval: config.checkInterval || 60000, // 1 minute
      lastCheck: null,
      results: []
    };

    this.secretaries.set(secretaryId, secretary);

    console.log(`👔 CEO spawned secretary ${secretaryId} for task: ${task.title}`);
    console.log(`   Role: ${secretary.role}, Max rounds: ${secretary.maxRounds}`);

    // Start the secretary's work cycle
    this.runSecretaryRound(secretaryId);

    return secretaryId;
  }

  /**
   * Secretary work round - check status, push work, report back
   */
  async runSecretaryRound(secretaryId) {
    const secretary = this.secretaries.get(secretaryId);
    if (!secretary || secretary.status !== 'active') return;

    secretary.roundsCompleted++;
    secretary.lastCheck = new Date();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Secretary ${secretaryId} - Round ${secretary.roundsCompleted}/${secretary.maxRounds}`);
    console.log(`📋 Task: ${secretary.task.title}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      let action;

      switch (secretary.role) {
        case 'monitor':
          action = await this.monitorTask(secretary);
          break;
        case 'executor':
          action = await this.executeTask(secretary);
          break;
        case 'researcher':
          action = await this.researchTask(secretary);
          break;
        default:
          action = { type: 'unknown', status: 'error' };
      }

      secretary.results.push({
        round: secretary.roundsCompleted,
        timestamp: new Date(),
        action: action
      });

      // Check if task is complete or max rounds reached
      if (action.taskComplete || secretary.roundsCompleted >= secretary.maxRounds) {
        this.completeSecretary(secretaryId, action.taskComplete ? 'success' : 'max_rounds');
        return;
      }

      // Schedule next round
      setTimeout(() => {
        this.runSecretaryRound(secretaryId);
      }, secretary.checkInterval);

    } catch (error) {
      console.error(`❌ Secretary ${secretaryId} error:`, error.message);
      secretary.results.push({
        round: secretary.roundsCompleted,
        timestamp: new Date(),
        error: error.message
      });

      // Retry or complete based on error
      if (secretary.roundsCompleted < secretary.maxRounds) {
        setTimeout(() => {
          this.runSecretaryRound(secretaryId);
        }, secretary.checkInterval * 2); // Double interval on error
      } else {
        this.completeSecretary(secretaryId, 'error');
      }
    }
  }

  /**
   * Monitor role - Check task status and push if blocked
   */
  async monitorTask(secretary) {
    const task = secretary.task;

    // Ask AI to analyze task status
    const statusCheck = await this.handler.handleMessage('ceo',
      `Analyze task status: "${task.title}".
       Description: ${task.description}
       Current status: ${task.status}
       Assigned to: ${task.assignee || 'unassigned'}

       Is this task progressing? Is it blocked? What action should I take?
       Respond in JSON format: {"progressing": true/false, "blocked": true/false, "action": "string", "taskComplete": true/false}`,
      { priority: 'high' }
    );

    let analysis;
    try {
      // Try to parse JSON from response
      const jsonMatch = statusCheck.content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        progressing: true,
        blocked: false,
        action: 'continue monitoring',
        taskComplete: false
      };
    } catch (e) {
      analysis = {
        progressing: true,
        blocked: false,
        action: statusCheck.content.substring(0, 100),
        taskComplete: false
      };
    }

    console.log(`📊 Status: ${analysis.progressing ? '✅ Progressing' : '⚠️ Stalled'}`);
    console.log(`🚧 Blocked: ${analysis.blocked ? 'YES' : 'NO'}`);
    console.log(`💡 Action: ${analysis.action}`);

    // If blocked, push the work
    if (analysis.blocked) {
      await this.pushWork(task, analysis.action);
    }

    return {
      type: 'monitor',
      analysis: analysis,
      taskComplete: analysis.taskComplete || false
    };
  }

  /**
   * Executor role - Actually do the work
   */
  async executeTask(secretary) {
    const task = secretary.task;

    console.log(`⚙️  Executing task: ${task.title}`);

    const result = await this.handler.handleMessage('eng',
      `Execute this task: ${task.title}
       Description: ${task.description}

       Provide concrete progress or completion status.`,
      { priority: 'normal' }
    );

    console.log(`✅ Execution result: ${result.content.substring(0, 200)}...`);

    return {
      type: 'execute',
      result: result.content,
      taskComplete: result.content.toLowerCase().includes('complete')
    };
  }

  /**
   * Researcher role - Gather information
   */
  async researchTask(secretary) {
    const task = secretary.task;

    console.log(`🔍 Researching: ${task.title}`);

    const research = await this.handler.handleMessage('zen',
      `Research this topic: ${task.title}
       Focus: ${task.description}

       Provide key findings and recommendations.`,
      { priority: 'normal' }
    );

    console.log(`📚 Research complete: ${research.content.substring(0, 200)}...`);

    return {
      type: 'research',
      findings: research.content,
      taskComplete: false // Research doesn't complete tasks, just informs
    };
  }

  /**
   * Push work - Notify assignee or escalate
   */
  async pushWork(task, action) {
    console.log(`\n🚨 PUSHING WORK ON TASK: ${task.title}`);
    console.log(`   Assignee: ${task.assignee || 'UNASSIGNED'}`);
    console.log(`   Action: ${action}`);

    // Log push event
    this.workRounds.push({
      timestamp: new Date(),
      task: task.title,
      action: action,
      assignee: task.assignee
    });

    // In a real system, this would send notifications, create alerts, etc.
    return {
      pushed: true,
      action: action
    };
  }

  /**
   * Complete a secretary's work
   */
  completeSecretary(secretaryId, reason) {
    const secretary = this.secretaries.get(secretaryId);
    if (!secretary) return;

    secretary.status = 'completed';
    secretary.completedAt = new Date();
    secretary.completionReason = reason;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Secretary ${secretaryId} completed`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Rounds: ${secretary.roundsCompleted}/${secretary.maxRounds}`);
    console.log(`   Duration: ${Math.round((secretary.completedAt - secretary.createdAt) / 1000)}s`);
    console.log(`${'='.repeat(60)}\n`);

    // Generate summary report
    this.generateSecretaryReport(secretaryId);
  }

  /**
   * Generate summary report for secretary's work
   */
  generateSecretaryReport(secretaryId) {
    const secretary = this.secretaries.get(secretaryId);
    if (!secretary) return null;

    const report = {
      secretaryId: secretary.id,
      task: secretary.task.title,
      role: secretary.role,
      status: secretary.status,
      roundsCompleted: secretary.roundsCompleted,
      duration: secretary.completedAt - secretary.createdAt,
      results: secretary.results,
      completionReason: secretary.completionReason
    };

    console.log('\n📊 SECRETARY REPORT:');
    console.log(JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Create a new task
   */
  createTask(title, description, config = {}) {
    const taskId = `task-${Date.now()}`;

    const task = {
      id: taskId,
      title: title,
      description: description,
      status: config.status || 'todo',
      priority: config.priority || 'normal',
      assignee: config.assignee || null,
      createdAt: new Date(),
      dueDate: config.dueDate || null,
      tags: config.tags || []
    };

    this.tasks.set(taskId, task);

    console.log(`✨ CEO created task: ${title}`);

    return taskId;
  }

  /**
   * Assign task to agent
   */
  assignTask(taskId, agentId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`Task ${taskId} not found`);
      return false;
    }

    task.assignee = agentId;
    task.assignedAt = new Date();

    console.log(`📌 Task "${task.title}" assigned to ${agentId}`);

    return true;
  }

  /**
   * Get all active secretaries
   */
  getActiveSecretaries() {
    return Array.from(this.secretaries.values())
      .filter(s => s.status === 'active');
  }

  /**
   * Get all tasks
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get CEO dashboard stats
   */
  getDashboard() {
    const activeSecretaries = this.getActiveSecretaries();
    const allTasks = this.getAllTasks();

    return {
      secretaries: {
        total: this.secretaries.size,
        active: activeSecretaries.length,
        completed: this.secretaries.size - activeSecretaries.length
      },
      tasks: {
        total: allTasks.length,
        todo: allTasks.filter(t => t.status === 'todo').length,
        inProgress: allTasks.filter(t => t.status === 'in_progress').length,
        completed: allTasks.filter(t => t.status === 'completed').length
      },
      workRounds: this.workRounds.length,
      budget: costMonitor.getBudgetRemaining()
    };
  }
}

// Export singleton instance
export const ceoAgent = new CEOAgent();
