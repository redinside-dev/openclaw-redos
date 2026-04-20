#!/usr/bin/env node

/**
 * AGENT ORCHESTRATOR
 *
 * Handles multi-agent collaboration and delegation
 * - Detects intent (coding, research, ops, etc.)
 * - Delegates to specialized agents
 * - Coordinates agent-to-agent communication
 * - Provides unified response to user
 */

export class AgentOrchestrator {
  constructor() {
    // Available specialized agents
    this.agents = {
      engineering: {
        name: 'Engineering Agent',
        capabilities: ['coding', 'app-creation', 'debugging', 'refactoring'],
        emoji: '👨‍💻',
        priority: 'high-quality'
      },
      research: {
        name: 'Research Agent',
        capabilities: ['internet-search', 'news', 'documentation', 'current-events'],
        emoji: '🔍',
        priority: 'accuracy'
      },
      devops: {
        name: 'DevOps Agent',
        capabilities: ['deployment', 'monitoring', 'infrastructure', 'automation'],
        emoji: '⚙️',
        priority: 'reliability'
      },
      finance: {
        name: 'Finance Agent',
        capabilities: ['cost-tracking', 'budgets', 'analysis', 'reporting'],
        emoji: '💰',
        priority: 'precision'
      },
      infosec: {
        name: 'Security Agent',
        capabilities: ['security', 'vulnerabilities', 'compliance', 'audits'],
        emoji: '🔒',
        priority: 'security'
      }
    };

    this.delegationHistory = [];
  }

  /**
   * Analyze intent and determine which agent(s) to use
   */
  async analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Coding/Creation intents
    const isCoding = /\b(create|build|make|develop|code|write|generate|implement|design|program)\b.*\b(app|application|website|page|script|function|api|service|tool|program|software)\b/.test(lowerMessage);

    // Research/Internet intents
    const isResearch = /\b(search|find|latest|news|current|today|what is|tell me about|look up|research)\b/.test(lowerMessage);

    // DevOps intents
    const isDevOps = /\b(deploy|restart|monitor|status|health|upgrade|backup|restore)\b/.test(lowerMessage);

    // Finance intents
    const isFinance = /\b(cost|budget|spend|expense|price|billing)\b/.test(lowerMessage);

    // Security intents
    const isSecurity = /\b(security|vulnerability|audit|compliance|encrypt|hack)\b/.test(lowerMessage);

    // Determine primary and supporting agents
    const agents = [];

    if (isCoding) {
      agents.push({ agent: 'engineering', role: 'primary', reason: 'App/code creation request' });

      // Check if also needs deployment
      if (/\b(deploy|launch|publish|host)\b/.test(lowerMessage)) {
        agents.push({ agent: 'devops', role: 'supporting', reason: 'Deployment needed' });
      }
    }

    if (isResearch) {
      agents.push({ agent: 'research', role: isCoding ? 'supporting' : 'primary', reason: 'Internet/research needed' });
    }

    if (isDevOps) {
      agents.push({ agent: 'devops', role: 'primary', reason: 'DevOps operation requested' });
    }

    if (isFinance) {
      agents.push({ agent: 'finance', role: 'primary', reason: 'Financial query' });
    }

    if (isSecurity) {
      agents.push({ agent: 'infosec', role: 'primary', reason: 'Security concern' });
    }

    // Default to main bot if no specialized agent needed
    if (agents.length === 0) {
      return {
        requiresDelegation: false,
        primaryAgent: null,
        supportingAgents: [],
        reason: 'Simple query - main bot can handle'
      };
    }

    const primary = agents.find(a => a.role === 'primary');
    const supporting = agents.filter(a => a.role === 'supporting');

    return {
      requiresDelegation: true,
      primaryAgent: primary.agent,
      supportingAgents: supporting.map(s => s.agent),
      reason: primary.reason,
      agents: agents
    };
  }

  /**
   * Delegate request to specialized agent(s)
   */
  async delegate(message, intent, context = {}) {
    const delegationId = `delegation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Record delegation
    this.delegationHistory.push({
      id: delegationId,
      timestamp: new Date().toISOString(),
      message: message,
      primaryAgent: intent.primaryAgent,
      supportingAgents: intent.supportingAgents,
      status: 'in-progress'
    });

    console.log('\n🎯 AGENT DELEGATION');
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`📋 Request: "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"`);
    console.log(`🎯 Primary Agent: ${this.agents[intent.primaryAgent].emoji} ${this.agents[intent.primaryAgent].name}`);

    if (intent.supportingAgents.length > 0) {
      console.log(`🤝 Supporting Agents:`);
      intent.supportingAgents.forEach(agentId => {
        console.log(`   - ${this.agents[agentId].emoji} ${this.agents[agentId].name}`);
      });
    }

    console.log(`💡 Reason: ${intent.reason}`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    return {
      delegationId,
      acknowledgment: this.getAcknowledgment(intent),
      primaryAgent: intent.primaryAgent,
      supportingAgents: intent.supportingAgents
    };
  }

  /**
   * Generate user-facing acknowledgment message
   */
  getAcknowledgment(intent) {
    const primaryAgent = this.agents[intent.primaryAgent];

    let message = `${primaryAgent.emoji} **Processing your request...**\n\n`;
    message += `Delegating to: **${primaryAgent.name}**\n`;

    if (intent.supportingAgents.length > 0) {
      message += `Collaborating with: `;
      message += intent.supportingAgents.map(id => this.agents[id].name).join(', ');
      message += '\n';
    }

    message += `\n⏳ Working on it...`;

    return message;
  }

  /**
   * Get agent configuration for routing
   */
  getAgentConfig(agentId) {
    const agent = this.agents[agentId];
    if (!agent) return null;

    // Map agent to model configuration
    const modelMapping = {
      engineering: {
        provider: 'ollama',
        model: 'qwen2.5-coder:7b',
        systemPrompt: 'You are an expert software engineer. Create high-quality, production-ready code. Always provide complete, working solutions.'
      },
      research: {
        provider: 'perplexity',
        model: 'sonar-pro',
        systemPrompt: 'You are a research assistant. Provide accurate, up-to-date information with citations.'
      },
      devops: {
        provider: 'ollama',
        model: 'llama3.1:8b',
        systemPrompt: 'You are a DevOps engineer. Focus on reliability, monitoring, and automation.'
      },
      finance: {
        provider: 'ollama',
        model: 'llama3.1:8b',
        systemPrompt: 'You are a financial analyst. Provide accurate cost analysis and budgeting insights.'
      },
      infosec: {
        provider: 'ollama',
        model: 'llama3.1:8b',
        systemPrompt: 'You are a security expert. Identify vulnerabilities and recommend secure solutions.'
      }
    };

    return {
      ...agent,
      ...modelMapping[agentId]
    };
  }

  /**
   * Get delegation statistics
   */
  getStats() {
    const total = this.delegationHistory.length;
    const byAgent = {};

    this.delegationHistory.forEach(d => {
      byAgent[d.primaryAgent] = (byAgent[d.primaryAgent] || 0) + 1;
    });

    return {
      total,
      byAgent,
      recent: this.delegationHistory.slice(-5)
    };
  }
}

// Export singleton
export const agentOrchestrator = new AgentOrchestrator();
