#!/usr/bin/env node

/**
 * Automatic Ticket System
 * Creates internal tickets for every error (not shown to user)
 * Auto-assigns to appropriate team member
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TICKETS_FILE = path.join(__dirname, '../logs/tickets.jsonl');

class TicketSystem {
  constructor() {
    this.tickets = [];
    this.ticketCounter = 0;
    this.teamAssignments = {
      'GATEWAY_ERROR': 'devops',
      'OLLAMA_ERROR': 'devops',
      'ANTHROPIC_CREDIT': 'finance',
      'RATE_LIMIT': 'devops',
      'TIMEOUT': 'performance',
      'MARKDOWN_ERROR': 'frontend',
      'TELEGRAM_ERROR': 'integration',
      'UNKNOWN': 'engineering'
    };
  }

  /**
   * Create ticket for an error (internal only, not shown to user)
   */
  async createTicket(error, context = {}) {
    this.ticketCounter++;

    const ticket = {
      id: `TICKET-${this.ticketCounter}`,
      timestamp: new Date().toISOString(),
      status: 'open',
      priority: this.determinePriority(error, context),
      error: {
        type: this.classifyError(error),
        message: error.message,
        stack: error.stack
      },
      context: {
        agentId: context.agentId,
        userId: context.userId,
        message: context.message?.substring(0, 100),
        attempt: context.attempt,
        platform: context.platform
      },
      assignedTo: this.autoAssign(error),
      tags: this.generateTags(error, context),
      internalOnly: true, // Never show to user
      createdBy: 'auto-system',
      notes: []
    };

    // Store ticket
    this.tickets.push(ticket);
    await this.saveTicket(ticket);

    // Log ticket creation (internal only)
    console.log(`🎫 Created ticket: ${ticket.id} → Assigned to: ${ticket.assignedTo}`);

    return ticket;
  }

  /**
   * Classify error type
   */
  classifyError(error) {
    const message = error.message || String(error);

    if (message.includes('Gateway')) return 'GATEWAY_ERROR';
    if (message.includes('Ollama') || message.includes('ollama')) return 'OLLAMA_ERROR';
    if (message.includes('Anthropic') || message.includes('credit')) return 'ANTHROPIC_CREDIT';
    if (message.includes('rate limit')) return 'RATE_LIMIT';
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) return 'TIMEOUT';
    if (message.includes('Markdown') || message.includes('parse entities')) return 'MARKDOWN_ERROR';
    if (message.includes('Telegram') || message.includes('ETELEGRAM')) return 'TELEGRAM_ERROR';

    return 'UNKNOWN';
  }

  /**
   * Auto-assign to team member
   */
  autoAssign(error) {
    const errorType = this.classifyError(error);
    return this.teamAssignments[errorType] || 'engineering';
  }

  /**
   * Determine priority
   */
  determinePriority(error, context) {
    const errorType = this.classifyError(error);
    const attempt = context.attempt || 1;

    // Critical if:
    // - Gateway down
    // - Multiple failed attempts
    // - Affecting multiple users
    if (errorType === 'GATEWAY_ERROR') return 'critical';
    if (attempt >= 3) return 'high';
    if (errorType === 'OLLAMA_ERROR') return 'high';

    // High if:
    // - Service integration issues
    // - Rate limits
    if (errorType === 'RATE_LIMIT') return 'high';
    if (errorType === 'TELEGRAM_ERROR') return 'high';

    // Medium if:
    // - API credit issues
    // - Timeouts
    if (errorType === 'ANTHROPIC_CREDIT') return 'medium';
    if (errorType === 'TIMEOUT') return 'medium';

    // Low otherwise
    return 'low';
  }

  /**
   * Generate tags
   */
  generateTags(error, context) {
    const tags = [];

    tags.push(this.classifyError(error));

    if (context.agentId) tags.push(`agent:${context.agentId}`);
    if (context.platform) tags.push(`platform:${context.platform}`);
    if (context.attempt && context.attempt > 1) tags.push('retry');

    return tags;
  }

  /**
   * Save ticket to disk
   */
  async saveTicket(ticket) {
    try {
      await fs.appendFile(TICKETS_FILE, JSON.stringify(ticket) + '\n');
    } catch (error) {
      console.error('Failed to save ticket:', error.message);
    }
  }

  /**
   * Get open tickets
   */
  getOpenTickets() {
    return this.tickets.filter(t => t.status === 'open');
  }

  /**
   * Get tickets by assignee
   */
  getTicketsByAssignee(assignee) {
    return this.tickets.filter(t => t.assignedTo === assignee && t.status === 'open');
  }

  /**
   * Get tickets by priority
   */
  getTicketsByPriority(priority) {
    return this.tickets.filter(t => t.priority === priority && t.status === 'open');
  }

  /**
   * Update ticket status
   */
  async updateTicket(ticketId, updates) {
    const ticket = this.tickets.find(t => t.id === ticketId);

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    Object.assign(ticket, updates);
    ticket.updatedAt = new Date().toISOString();

    await this.saveTicket(ticket);

    return ticket;
  }

  /**
   * Add note to ticket
   */
  async addNote(ticketId, note) {
    const ticket = this.tickets.find(t => t.id === ticketId);

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    ticket.notes.push({
      timestamp: new Date().toISOString(),
      note: note,
      author: 'auto-system'
    });

    await this.saveTicket(ticket);

    return ticket;
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId, resolution) {
    return await this.updateTicket(ticketId, {
      status: 'closed',
      resolution: resolution,
      closedAt: new Date().toISOString()
    });
  }

  /**
   * Get ticket statistics
   */
  getStats() {
    const open = this.tickets.filter(t => t.status === 'open');
    const closed = this.tickets.filter(t => t.status === 'closed');

    const byPriority = {
      critical: open.filter(t => t.priority === 'critical').length,
      high: open.filter(t => t.priority === 'high').length,
      medium: open.filter(t => t.priority === 'medium').length,
      low: open.filter(t => t.priority === 'low').length
    };

    const byAssignee = {};
    open.forEach(ticket => {
      byAssignee[ticket.assignedTo] = (byAssignee[ticket.assignedTo] || 0) + 1;
    });

    return {
      total: this.tickets.length,
      open: open.length,
      closed: closed.length,
      byPriority,
      byAssignee
    };
  }

  /**
   * Load tickets from disk
   */
  async loadTickets() {
    try {
      const data = await fs.readFile(TICKETS_FILE, 'utf8');
      const lines = data.trim().split('\n').filter(Boolean);

      this.tickets = lines.map(line => JSON.parse(line));
      this.ticketCounter = this.tickets.length;

      console.log(`📂 Loaded ${this.tickets.length} tickets from disk`);
    } catch (error) {
      // No tickets file yet
      this.tickets = [];
      this.ticketCounter = 0;
    }
  }
}

// Export singleton
export const ticketSystem = new TicketSystem();
