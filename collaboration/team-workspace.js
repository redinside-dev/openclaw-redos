#!/usr/bin/env node

/**
 * TEAM WORKSPACE - Agent Collaboration System
 *
 * Simulates real human team collaboration:
 * - Shared workspace where agents post updates
 * - Knowledge sharing between agents
 * - Agent-to-agent communication
 * - Persistent team memory
 * - Natural workflow like real engineers
 */

import { vectorMemory } from '../memory/vector-memory.js';

export class TeamWorkspace {
  constructor() {
    this.workspace = {
      messages: [],      // Agent-to-agent messages
      artifacts: {},     // Shared artifacts (code, documents, etc.)
      tasks: {},         // Active tasks and their assignments
      knowledge: {}      // Shared knowledge base
    };

    this.agents = {
      'ENG': { name: 'Engineering Agent', emoji: '👨‍💻', online: true },
      'OPS': { name: 'DevOps Agent', emoji: '⚙️', online: true },
      'RESEARCH': { name: 'Research Agent', emoji: '🔍', online: true },
      'FINANCE': { name: 'Finance Agent', emoji: '💰', online: true },
      'INFOSEC': { name: 'Security Agent', emoji: '🔒', online: true }
    };

    console.log('\n🏢 Team Workspace: ONLINE');
    console.log('   ✅ Agent-to-agent messaging enabled');
    console.log('   ✅ Shared artifacts system ready');
    console.log('   ✅ Knowledge sharing active');
  }

  /**
   * Agent posts message to workspace (like Slack message)
   */
  async postMessage(fromAgent, message, options = {}) {
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: fromAgent,
      to: options.to || 'all',      // Specific agent or broadcast to all
      message: message,
      type: options.type || 'info', // info, question, result, error
      tags: options.tags || [],
      artifacts: options.artifacts || [], // Attached code, files, etc.
      timestamp: new Date().toISOString(),
      thread: options.threadId || null   // For threaded conversations
    };

    this.workspace.messages.push(msg);

    // Store in vector memory for persistent knowledge
    await vectorMemory.storeConversation({
      agentId: fromAgent,
      userId: 'team-workspace',
      message: message,
      response: `Posted to workspace${msg.to !== 'all' ? ` for ${msg.to}` : ''}`,
      metadata: {
        type: 'agent-communication',
        messageId: msg.id,
        recipients: msg.to,
        tags: msg.tags
      }
    });

    // Log like real Slack notification
    const agent = this.agents[fromAgent];
    const recipient = msg.to === 'all' ? '@channel' : `@${msg.to}`;

    console.log(`\n${agent.emoji} ${agent.name} → ${recipient}`);
    console.log(`   ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

    if (msg.artifacts.length > 0) {
      console.log(`   📎 ${msg.artifacts.length} attachment(s)`);
    }

    return msg.id;
  }

  /**
   * Agent reads messages addressed to them (like checking Slack)
   */
  async getMessagesFor(agentId, options = {}) {
    const unreadMessages = this.workspace.messages.filter(msg =>
      (msg.to === agentId || msg.to === 'all') &&
      msg.from !== agentId &&
      (!options.since || new Date(msg.timestamp) > new Date(options.since))
    );

    if (unreadMessages.length > 0) {
      console.log(`\n📬 ${this.agents[agentId].name} has ${unreadMessages.length} new message(s)`);
    }

    return unreadMessages;
  }

  /**
   * Agent shares artifact (code, document, etc.) - like posting file in Slack
   */
  async shareArtifact(agentId, artifactType, content, metadata = {}) {
    const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const artifact = {
      id: artifactId,
      type: artifactType,        // 'code', 'document', 'config', 'data'
      createdBy: agentId,
      content: content,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString()
      },
      tags: metadata.tags || [],
      forReviewBy: metadata.reviewBy || null  // Which agent should review this
    };

    this.workspace.artifacts[artifactId] = artifact;

    // Notify team
    const agent = this.agents[agentId];
    console.log(`\n${agent.emoji} ${agent.name} shared ${artifactType}: ${artifactId}`);

    if (artifact.forReviewBy) {
      console.log(`   📋 Requesting review from ${this.agents[artifact.forReviewBy].name}`);

      // Post message to notify reviewer
      await this.postMessage(agentId,
        `I've created ${artifactType} that needs your review`,
        {
          to: artifact.forReviewBy,
          type: 'question',
          artifacts: [artifactId],
          tags: ['review-request', artifactType]
        }
      );
    }

    return artifactId;
  }

  /**
   * Agent retrieves artifact (like downloading file from Slack)
   */
  async getArtifact(artifactId) {
    return this.workspace.artifacts[artifactId];
  }

  /**
   * Agent asks question to another agent (like @mention in Slack)
   */
  async askAgent(fromAgent, toAgent, question, context = {}) {
    console.log(`\n💬 ${this.agents[fromAgent].name} is asking ${this.agents[toAgent].name}...`);

    const threadId = await this.postMessage(fromAgent, question, {
      to: toAgent,
      type: 'question',
      tags: ['question'],
      artifacts: context.artifacts || []
    });

    // Check if target agent has knowledge to answer
    const knowledge = await vectorMemory.shareKnowledgeWith(toAgent, fromAgent, question);

    if (knowledge.length > 0) {
      console.log(`   ✅ ${this.agents[toAgent].name} has ${knowledge.length} relevant past experience(s)`);
      return {
        threadId,
        hasKnowledge: true,
        relevantExperience: knowledge
      };
    } else {
      console.log(`   ℹ️  ${this.agents[toAgent].name} will research this`);
      return {
        threadId,
        hasKnowledge: false
      };
    }
  }

  /**
   * Agent shares knowledge/solution (like posting helpful link)
   */
  async shareKnowledge(agentId, topic, solution, tags = []) {
    const knowledgeId = `knowledge-${Date.now()}`;

    this.workspace.knowledge[knowledgeId] = {
      id: knowledgeId,
      topic: topic,
      solution: solution,
      sharedBy: agentId,
      tags: tags,
      timestamp: new Date().toISOString(),
      usageCount: 0
    };

    // Store in vector memory
    await vectorMemory.storeConversation({
      agentId: agentId,
      userId: 'team-knowledge',
      message: `Knowledge: ${topic}`,
      response: solution,
      metadata: {
        type: 'knowledge-sharing',
        knowledgeId: knowledgeId,
        tags: tags
      }
    });

    console.log(`\n💡 ${this.agents[agentId].name} shared knowledge: ${topic}`);
    console.log(`   📚 Added to team knowledge base`);

    return knowledgeId;
  }

  /**
   * Search team knowledge (like searching Slack or Confluence)
   */
  async searchKnowledge(query, agentId) {
    // Search vector memory for relevant knowledge
    const results = await vectorMemory.retrieveContext(query);

    // Filter for knowledge-sharing type
    const memories = results.memories || [];
    const knowledge = memories.filter(r =>
      r.metadata?.type === 'knowledge-sharing'
    );

    console.log(`\n🔍 ${this.agents[agentId].name} searching knowledge base: "${query}"`);
    console.log(`   Found ${knowledge.length} relevant solution(s)`);

    return knowledge;
  }

  /**
   * Agent marks task as started (like moving card in Jira)
   */
  async startTask(agentId, taskDescription, context = {}) {
    const taskId = `task-${Date.now()}`;

    this.workspace.tasks[taskId] = {
      id: taskId,
      description: taskDescription,
      assignedTo: agentId,
      status: 'in-progress',
      startedAt: new Date().toISOString(),
      context: context
    };

    console.log(`\n🎯 ${this.agents[agentId].name} started task: ${taskId}`);
    console.log(`   ${taskDescription}`);

    return taskId;
  }

  /**
   * Agent completes task and shares result (like completing PR)
   */
  async completeTask(taskId, agentId, result, options = {}) {
    const task = this.workspace.tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = result;

    console.log(`\n✅ ${this.agents[agentId].name} completed task: ${taskId}`);

    // If result needs handoff to another agent
    if (options.handoffTo) {
      console.log(`   🤝 Handing off to ${this.agents[options.handoffTo].name}`);

      await this.postMessage(agentId,
        `Task "${task.description}" is complete. Ready for your review/next steps.`,
        {
          to: options.handoffTo,
          type: 'result',
          artifacts: options.artifacts || [],
          tags: ['handoff', 'task-complete']
        }
      );
    }

    return task;
  }

  /**
   * Get workspace status (like team dashboard)
   */
  getStatus() {
    const activeTasks = Object.values(this.workspace.tasks)
      .filter(t => t.status === 'in-progress');

    const recentMessages = this.workspace.messages.slice(-10);
    const totalArtifacts = Object.keys(this.workspace.artifacts).length;
    const knowledgeItems = Object.keys(this.workspace.knowledge).length;

    return {
      activeTasks: activeTasks.length,
      recentMessages: recentMessages.length,
      totalArtifacts,
      knowledgeItems,
      onlineAgents: Object.values(this.agents).filter(a => a.online).length
    };
  }

  /**
   * Clear old messages (like Slack message retention)
   */
  async cleanup(olderThanDays = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const before = this.workspace.messages.length;
    this.workspace.messages = this.workspace.messages.filter(msg =>
      new Date(msg.timestamp) > cutoffDate
    );
    const after = this.workspace.messages.length;

    if (before > after) {
      console.log(`\n🧹 Cleaned up ${before - after} old messages from workspace`);
    }
  }
}

// Export singleton
export const teamWorkspace = new TeamWorkspace();
