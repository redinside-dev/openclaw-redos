import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Kanban Board - Visual task management
 * Tracks tasks across: Backlog → Todo → In Progress → Review → Done
 */
export class KanbanBoard {
  constructor() {
    this.columns = {
      backlog: { name: 'Backlog', cards: [] },
      todo: { name: 'To Do', cards: [] },
      inProgress: { name: 'In Progress', cards: [] },
      review: { name: 'Review', cards: [] },
      done: { name: 'Done', cards: [] }
    };

    this.cards = new Map(); // card_id -> Card object
    this.history = []; // Move history
    this.stateFile = path.join(__dirname, 'board-state.json');

    // Load persisted state
    this.load().catch(() => console.log('No previous board state'));
  }

  /**
   * Create a new card
   */
  createCard(title, description, config = {}) {
    const cardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const card = {
      id: cardId,
      title: title,
      description: description,
      column: config.column || 'backlog',
      priority: config.priority || 'normal', // low, normal, high, urgent
      assignee: config.assignee || null,
      tags: config.tags || [],
      dueDate: config.dueDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimate: config.estimate || null, // Story points or hours
      blockedBy: config.blockedBy || [],
      comments: []
    };

    this.cards.set(cardId, card);
    this.columns[card.column].cards.push(cardId);

    this.history.push({
      timestamp: new Date(),
      action: 'create',
      cardId: cardId,
      title: title,
      column: card.column
    });

    this.save();

    console.log(`✨ Created card: ${title} [${card.column}]`);

    return cardId;
  }

  /**
   * Move card to different column
   */
  moveCard(cardId, toColumn) {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    if (!this.columns[toColumn]) {
      throw new Error(`Column ${toColumn} does not exist`);
    }

    const fromColumn = card.column;

    // Remove from old column
    const oldColumnCards = this.columns[fromColumn].cards;
    const index = oldColumnCards.indexOf(cardId);
    if (index > -1) {
      oldColumnCards.splice(index, 1);
    }

    // Add to new column
    this.columns[toColumn].cards.push(cardId);

    // Update card
    card.column = toColumn;
    card.updatedAt = new Date();

    // Record history
    this.history.push({
      timestamp: new Date(),
      action: 'move',
      cardId: cardId,
      from: fromColumn,
      to: toColumn
    });

    this.save();

    console.log(`🔄 Moved card "${card.title}": ${fromColumn} → ${toColumn}`);

    return card;
  }

  /**
   * Update card details
   */
  updateCard(cardId, updates) {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    Object.assign(card, updates);
    card.updatedAt = new Date();

    this.history.push({
      timestamp: new Date(),
      action: 'update',
      cardId: cardId,
      updates: updates
    });

    this.save();

    console.log(`📝 Updated card: ${card.title}`);

    return card;
  }

  /**
   * Add comment to card
   */
  addComment(cardId, author, text) {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    const comment = {
      id: `comment-${Date.now()}`,
      author: author,
      text: text,
      timestamp: new Date()
    };

    card.comments.push(comment);
    card.updatedAt = new Date();

    this.save();

    console.log(`💬 Comment added to "${card.title}" by ${author}`);

    return comment;
  }

  /**
   * Get card by ID
   */
  getCard(cardId) {
    return this.cards.get(cardId);
  }

  /**
   * Get all cards in a column
   */
  getColumn(columnName) {
    const column = this.columns[columnName];
    if (!column) return null;

    return {
      ...column,
      cards: column.cards.map(id => this.cards.get(id))
    };
  }

  /**
   * Get full board state
   */
  getBoard() {
    const board = {};

    for (const [key, column] of Object.entries(this.columns)) {
      board[key] = {
        name: column.name,
        cards: column.cards.map(id => this.cards.get(id))
      };
    }

    return board;
  }

  /**
   * Get board statistics
   */
  getStats() {
    const allCards = Array.from(this.cards.values());

    return {
      total: allCards.length,
      byColumn: {
        backlog: this.columns.backlog.cards.length,
        todo: this.columns.todo.cards.length,
        inProgress: this.columns.inProgress.cards.length,
        review: this.columns.review.cards.length,
        done: this.columns.done.cards.length
      },
      byPriority: {
        urgent: allCards.filter(c => c.priority === 'urgent').length,
        high: allCards.filter(c => c.priority === 'high').length,
        normal: allCards.filter(c => c.priority === 'normal').length,
        low: allCards.filter(c => c.priority === 'low').length
      },
      assigned: allCards.filter(c => c.assignee).length,
      unassigned: allCards.filter(c => !c.assignee).length,
      blocked: allCards.filter(c => c.blockedBy && c.blockedBy.length > 0).length,
      overdue: allCards.filter(c => c.dueDate && new Date(c.dueDate) < new Date()).length
    };
  }

  /**
   * Search cards
   */
  searchCards(query) {
    const allCards = Array.from(this.cards.values());
    const lowerQuery = query.toLowerCase();

    return allCards.filter(card =>
      card.title.toLowerCase().includes(lowerQuery) ||
      card.description.toLowerCase().includes(lowerQuery) ||
      card.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get cards by assignee
   */
  getCardsByAssignee(assignee) {
    return Array.from(this.cards.values())
      .filter(card => card.assignee === assignee);
  }

  /**
   * Get blocked cards
   */
  getBlockedCards() {
    return Array.from(this.cards.values())
      .filter(card => card.blockedBy && card.blockedBy.length > 0);
  }

  /**
   * Get overdue cards
   */
  getOverdueCards() {
    const now = new Date();
    return Array.from(this.cards.values())
      .filter(card => card.dueDate && new Date(card.dueDate) < now && card.column !== 'done');
  }

  /**
   * Generate sprint report
   */
  generateSprintReport(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const sprintCards = Array.from(this.cards.values())
      .filter(card => {
        const created = new Date(card.createdAt);
        return created >= start && created <= end;
      });

    const completed = sprintCards.filter(c => c.column === 'done');
    const inProgress = sprintCards.filter(c => c.column === 'inProgress');
    const blocked = sprintCards.filter(c => c.blockedBy && c.blockedBy.length > 0);

    return {
      sprint: {
        start: start,
        end: end,
        duration: Math.round((end - start) / (1000 * 60 * 60 * 24)) + ' days'
      },
      cards: {
        total: sprintCards.length,
        completed: completed.length,
        inProgress: inProgress.length,
        blocked: blocked.length
      },
      velocity: completed.reduce((sum, card) => sum + (card.estimate || 0), 0),
      completionRate: sprintCards.length > 0
        ? Math.round((completed.length / sprintCards.length) * 100) + '%'
        : '0%'
    };
  }

  /**
   * Archive completed cards
   */
  archiveCompleted() {
    const doneCards = this.columns.done.cards;
    const archived = [];

    for (const cardId of doneCards) {
      const card = this.cards.get(cardId);
      if (card) {
        card.archived = true;
        card.archivedAt = new Date();
        archived.push(card);
      }
    }

    this.columns.done.cards = [];

    this.save();

    console.log(`📦 Archived ${archived.length} completed cards`);

    return archived;
  }

  /**
   * Save board state to disk
   */
  async save() {
    try {
      const state = {
        columns: this.columns,
        cards: Array.from(this.cards.entries()),
        history: this.history.slice(-100), // Keep last 100 history entries
        savedAt: new Date()
      };

      await fs.writeFile(
        this.stateFile,
        JSON.stringify(state, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save board state:', error.message);
    }
  }

  /**
   * Load board state from disk
   */
  async load() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      const state = JSON.parse(data);

      this.columns = state.columns;
      this.cards = new Map(state.cards);
      this.history = state.history || [];

      console.log(`✅ Loaded board state: ${this.cards.size} cards`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load board state:', error.message);
      }
    }
  }

  /**
   * Print board to console (ASCII art)
   */
  printBoard() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                      KANBAN BOARD                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const columnOrder = ['backlog', 'todo', 'inProgress', 'review', 'done'];

    for (const key of columnOrder) {
      const column = this.columns[key];
      console.log(`\n📋 ${column.name.toUpperCase()} (${column.cards.length})`);
      console.log('─'.repeat(60));

      for (const cardId of column.cards) {
        const card = this.cards.get(cardId);
        const priorityIcon = {
          urgent: '🔴',
          high: '🟠',
          normal: '🟢',
          low: '🔵'
        }[card.priority] || '⚪';

        const assigneeText = card.assignee ? `[@${card.assignee}]` : '[unassigned]';
        const blockedText = card.blockedBy && card.blockedBy.length > 0 ? '🚧 BLOCKED' : '';

        console.log(`  ${priorityIcon} ${card.title}`);
        console.log(`     ${assigneeText} ${blockedText}`);
      }
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  }
}

// Export singleton instance
export const kanbanBoard = new KanbanBoard();
