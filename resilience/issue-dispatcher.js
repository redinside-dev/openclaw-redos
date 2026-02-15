#!/usr/bin/env node

/**
 * ISSUE-TO-TASK DISPATCHER
 *
 * Converts logged issues into actionable tasks for autonomous agents.
 * Bridges: Issue Tracker → Task Queue → Autonomous Workers
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ISSUES_DB = path.join(__dirname, '../data/issues/issues.jsonl');
const QUEUE_FILE = path.join(__dirname, '../workspace/tasks/queue.json');

class IssueDispatcher {
  constructor() {
    this.processedIssues = new Set();
  }

  /**
   * Start monitoring issues and dispatching tasks
   */
  async start() {
    console.log('🚀 Issue Dispatcher: ONLINE');
    console.log('   Converting issues → tasks for autonomous agents\n');

    // Process existing issues first
    await this.processExistingIssues();

    // Then monitor for new ones
    this.monitorLoop();
  }

  /**
   * Process all existing unresolved issues
   */
  async processExistingIssues() {
    const issues = await this.loadIssues();
    const openIssues = issues.filter(i => i.status === 'OPEN');

    console.log(`📋 Found ${openIssues.length} open issues to dispatch`);

    for (const issue of openIssues) {
      if (!this.processedIssues.has(issue.id)) {
        await this.dispatchIssue(issue);
        this.processedIssues.add(issue.id);
      }
    }
  }

  /**
   * Monitor for new issues
   */
  async monitorLoop() {
    setInterval(async () => {
      try {
        const issues = await this.loadIssues();
        const newIssues = issues.filter(i =>
          i.status === 'OPEN' && !this.processedIssues.has(i.id)
        );

        for (const issue of newIssues) {
          await this.dispatchIssue(issue);
          this.processedIssues.add(issue.id);
        }
      } catch (error) {
        console.error('❌ Monitor error:', error.message);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Dispatch an issue as a task
   */
  async dispatchIssue(issue) {
    console.log(`\n📤 Dispatching issue: ${issue.id}`);
    console.log(`   ${issue.title}`);
    console.log(`   Severity: ${issue.severity}`);
    console.log(`   Assigned to: ${issue.assigned_to.join(', ')}`);

    // Determine task type based on issue
    const taskType = this.determineTaskType(issue);

    // Create task
    const task = {
      id: `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      title: issue.title,
      description: this.buildTaskDescription(issue),
      type: taskType,
      priority: this.mapSeverityToPriority(issue.severity),
      assigned_to: issue.assigned_to,
      issue_id: issue.id,
      created_at: new Date().toISOString(),
      created_by: 'issue-dispatcher',
      status: 'pending',
      requires_approval: issue.severity === 'CRITICAL' && issue.tags.includes('deployment'),
      estimated_time: this.estimateTime(issue),
      tags: issue.tags,
      retry_count: 0
    };

    // Add to queue
    await this.addToQueue(task);

    console.log(`✅ Task created: ${task.id}`);
    console.log(`   Type: ${task.type}`);
    console.log(`   Priority: ${task.priority}`);
  }

  /**
   * Determine task type from issue
   */
  determineTaskType(issue) {
    const text = `${issue.title} ${issue.description}`.toLowerCase();

    if (text.includes('implement') || text.includes('create') || text.includes('build')) {
      return 'code_implementation';
    }

    if (text.includes('fix') || text.includes('error') || text.includes('bug')) {
      return 'issue_resolution';
    }

    if (text.includes('research') || text.includes('investigate') || text.includes('analyze')) {
      return 'research';
    }

    if (text.includes('deploy') || text.includes('restart') || text.includes('scale')) {
      return 'ops_task';
    }

    if (text.includes('security') || text.includes('vulnerability') || text.includes('breach')) {
      return 'security_task';
    }

    return 'issue_resolution'; // Default
  }

  /**
   * Build task description
   */
  buildTaskDescription(issue) {
    let desc = `${issue.description}\n\n`;

    desc += `**Issue Details:**\n`;
    desc += `- Issue ID: ${issue.id}\n`;
    desc += `- Severity: ${issue.severity}\n`;
    desc += `- Reporter: ${issue.reporter}\n`;
    desc += `- Created: ${issue.created_at}\n`;

    if (issue.client_impacted) {
      desc += `- ⚠️ CLIENT IMPACTED - HIGH PRIORITY\n`;
    }

    if (issue.revenue_impact) {
      desc += `- 💰 REVENUE IMPACT - CRITICAL\n`;
    }

    desc += `\n**Expected Actions:**\n`;

    if (issue.auto_actions && issue.auto_actions.length > 0) {
      desc += `Auto-actions already attempted:\n`;
      issue.auto_actions.forEach(action => {
        desc += `- ${action.type} ${action.target}: ${action.reason}\n`;
      });
      desc += `\nThese didn't resolve the issue. You need to investigate deeper.\n`;
    }

    desc += `\n**Self-Healing Protocol:**\n`;
    desc += `1. Check knowledge base for similar issues\n`;
    desc += `2. If not found, ask team for help\n`;
    desc += `3. If team doesn't know, research online\n`;
    desc += `4. Document the solution for future\n`;

    desc += `\n**Success Criteria:**\n`;
    desc += `- Root cause identified\n`;
    desc += `- Issue resolved\n`;
    desc += `- Solution tested\n`;
    desc += `- Knowledge base updated\n`;

    return desc;
  }

  /**
   * Map severity to priority
   */
  mapSeverityToPriority(severity) {
    const mapping = {
      'CRITICAL': 'critical',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low'
    };
    return mapping[severity] || 'medium';
  }

  /**
   * Estimate time based on issue complexity
   */
  estimateTime(issue) {
    if (issue.severity === 'CRITICAL') return '1h';
    if (issue.severity === 'HIGH') return '4h';
    if (issue.severity === 'MEDIUM') return '1d';
    return '1w';
  }

  /**
   * Add task to queue
   */
  async addToQueue(task) {
    const queue = await this.loadQueue();

    // Add to pending
    queue.pending.push(task);

    // Sort by priority
    queue.pending.sort((a, b) => {
      const priorities = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorities[a.priority] - priorities[b.priority];
    });

    await this.saveQueue(queue);
  }

  /**
   * Load issues
   */
  async loadIssues() {
    try {
      const data = await fs.readFile(ISSUES_DB, 'utf8');
      return data.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
    } catch {
      return [];
    }
  }

  /**
   * Load queue
   */
  async loadQueue() {
    try {
      const data = await fs.readFile(QUEUE_FILE, 'utf8');
      return JSON.parse(data);
    } catch {
      return {
        pending: [],
        in_progress: [],
        awaiting_approval: [],
        completed: [],
        failed: []
      };
    }
  }

  /**
   * Save queue
   */
  async saveQueue(queue) {
    await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  }
}

// Export
export { IssueDispatcher };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dispatcher = new IssueDispatcher();

  process.on('SIGINT', () => {
    console.log('\n\nShutting down dispatcher...');
    process.exit(0);
  });

  dispatcher.start().catch(err => {
    console.error('Dispatcher failed:', err);
    process.exit(1);
  });
}
