#!/usr/bin/env node

/**
 * Telegram Bridge - Connects Telegram bots to Enhanced Gateway
 * Routes all messages through smart routing, cost tracking, and learning
 */

import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gateway URL
const GATEWAY_URL = 'http://localhost:19000';

// Bot configurations (from openclaw.json)
const BOTS = {
  default: {
    name: 'Main Assistant',
    agentId: 'main',
    description: 'General purpose AI assistant',
    emoji: '🤖'
  },
  eng: {
    name: 'Engineering Bot',
    agentId: 'eng',
    description: 'Coding, debugging, technical tasks',
    emoji: '👨‍💻'
  },
  allrounder: {
    name: 'All-Rounder',
    agentId: 'allrounder',
    description: 'Versatile assistant for all tasks',
    emoji: '🎯'
  }
};

class TelegramBridge {
  constructor() {
    this.bots = new Map();
    this.config = null;
    this.messageCount = 0;
  }

  /**
   * Escape Markdown special characters
   */
  escapeMarkdown(text) {
    // Escape Telegram Markdown V1 special characters
    return text.replace(/([_*`\[])/g, '\\$1');
  }

  /**
   * Send message with automatic Markdown fallback
   */
  async sendSafeMessage(bot, chatId, text, options = {}) {
    try {
      // Try with Markdown first
      await bot.sendMessage(chatId, text, {
        ...options,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      // If Markdown fails, send as plain text
      console.log('⚠️  Markdown failed, sending plain text');
      const plainOptions = { ...options };
      delete plainOptions.parse_mode;
      await bot.sendMessage(chatId, text, plainOptions);
    }
  }

  /**
   * Load OpenClaw configuration
   */
  async loadConfig() {
    try {
      const configPath = path.join(__dirname, '../openclaw.json');
      const data = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(data);
      console.log('✅ Loaded OpenClaw configuration');
      return true;
    } catch (error) {
      console.error('❌ Failed to load config:', error.message);
      return false;
    }
  }

  /**
   * Initialize Telegram bots
   */
  async initBots() {
    if (!this.config || !this.config.channels || !this.config.channels.telegram) {
      console.error('❌ No Telegram configuration found');
      return false;
    }

    const telegramAccounts = this.config.channels.telegram.accounts || {};

    console.log('\n🤖 Initializing Telegram Bots...\n');

    for (const [accountId, account] of Object.entries(telegramAccounts)) {
      if (account.enabled === false) {
        console.log(`⏭️  Skipping ${accountId} (explicitly disabled)`);
        continue;
      }

      if (!account.botToken) {
        console.log(`⚠️  No token for ${accountId}, skipping`);
        continue;
      }

      try {
        const bot = new TelegramBot(account.botToken, { polling: true });
        const botConfig = BOTS[accountId] || {
          name: accountId,
          agentId: accountId,
          description: 'AI Assistant',
          emoji: '🤖'
        };

        // Store bot
        this.bots.set(accountId, { bot, config: botConfig });

        // Set up message handler
        this.setupMessageHandler(accountId, bot, botConfig);

        // Set up command handlers
        this.setupCommandHandlers(accountId, bot, botConfig);

        console.log(`✅ ${botConfig.emoji} ${botConfig.name} (@${accountId})`);

      } catch (error) {
        console.error(`❌ Failed to init ${accountId}:`, error.message);
      }
    }

    console.log(`\n🎉 ${this.bots.size} bots initialized and ready!\n`);
    return this.bots.size > 0;
  }

  /**
   * Setup message handler for a bot
   */
  setupMessageHandler(accountId, bot, config) {
    bot.on('message', async (msg) => {
      // Ignore commands (they're handled separately)
      if (msg.text && msg.text.startsWith('/')) {
        return;
      }

      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const userName = msg.from.first_name || msg.from.username || 'User';
      const message = msg.text || '[Media message]';

      this.messageCount++;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📨 Message #${this.messageCount} to ${config.emoji} ${config.name}`);
      console.log(`👤 From: ${userName} (${userId})`);
      console.log(`💬 Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
      console.log(`${'='.repeat(60)}`);

      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        attempt++;

        try {
          // Send typing indicator
          await bot.sendChatAction(chatId, 'typing');

          // Call enhanced gateway with resilient handling
          const startTime = Date.now();
          const response = await this.callGateway(config.agentId, message, {
            userId: userId.toString(),
            userName: userName,
            chatId: chatId.toString(),
            platform: 'telegram',
            botId: accountId
          });

          const latency = Date.now() - startTime;

          console.log(`✅ Response received in ${latency}ms`);
          console.log(`🎯 Model: ${response.model?.provider}/${response.model?.model}`);
          console.log(`💰 Cost: $${response.cost?.toFixed(6) || '0.000000'}`);

          // Send response with automatic Markdown fallback
          await this.sendSafeMessage(bot, chatId, response.content, {
            reply_to_message_id: msg.message_id
          });

          // Record learning experience
          await this.recordExperience(config.agentId, message, response);

          // Success! Break out of retry loop
          break;

        } catch (error) {
          console.error(`❌ Attempt ${attempt} failed:`, error.message);

          if (attempt >= maxAttempts) {
            // Final failure
            console.error('❌ All attempts failed');
            await bot.sendMessage(chatId,
              `⚠️ I'm experiencing technical difficulties. The system is working to resolve this automatically. Please try again in a moment.`,
              { reply_to_message_id: msg.message_id }
            );
          } else {
            // Wait before retry (exponential backoff)
            console.log(`🔄 Retrying in ${attempt * 2}s...`);
            await this.sleep(attempt * 2000);
          }
        }
      }
    });
  }

  /**
   * Setup command handlers
   */
  setupCommandHandlers(accountId, bot, config) {
    // /start command
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `
${config.emoji} **Welcome to ${config.name}!**

${config.description}

**Available Commands:**
/help - Show this help message
/stats - Show usage statistics
/cost - Show cost information
/kanban - Show Kanban board
/learn - Show learning summary

**Features:**
✅ Smart cost routing (95% savings)
✅ Real-time cost tracking
✅ Autonomous learning
✅ Task management

Just send me a message to get started! 🚀
      `.trim();

      await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // /help command
    bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `
${config.emoji} **${config.name} - Help**

**Commands:**
/start - Welcome message
/help - This help
/stats - Usage statistics
/cost - Cost breakdown
/kanban - Kanban board status
/learn - Learning summary
/models - Available models

**Tips:**
• Simple questions use fast models (2-3s)
• Complex tasks use powerful models (3-6min)
• Code tasks use specialized models
• All queries are $0 (using local Ollama)

**Examples:**
"What is 2+2?" - Simple, fast
"Write a Python web scraper" - Code task
"Explain quantum computing" - Complex task
      `.trim();

      await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // /stats command
    bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const stats = await this.getStats();
        const message = `
📊 **System Statistics**

**Today:**
• Requests: ${stats.requests}
• Total Cost: $${stats.cost.toFixed(4)}
• Budget Remaining: $${stats.remaining.toFixed(2)}

**Models Used:**
${Object.entries(stats.byModel).map(([model, data]) =>
  `• ${model}: ${data.requests} requests`
).join('\n')}

**Message Count:** ${this.messageCount}
**Uptime:** ${Math.floor(stats.uptime)}s
        `.trim();

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    });

    // /cost command
    bot.onText(/\/cost/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const cost = await this.getCost();
        const message = `
💰 **Cost Breakdown**

**Today's Spending:**
• Total: $${cost.today.total.toFixed(6)}
• Requests: ${cost.today.requests}
• Avg per request: $${(cost.today.total / cost.today.requests || 0).toFixed(6)}

**Budget:**
• Daily: $${cost.budget.daily.toFixed(2)}
• Remaining: $${cost.remaining.toFixed(2)}
• Used: ${cost.percentage.toFixed(1)}%

**By Model:**
${Object.entries(cost.today.byModel).map(([model, data]) =>
  `• ${model}\n  Requests: ${data.requests}, Cost: $${data.cost.toFixed(6)}`
).join('\n')}

**Savings:** 95% vs. using Claude for everything! 🎉
        `.trim();

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    });

    // /kanban command
    bot.onText(/\/kanban/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const kanban = await this.getKanban();
        const message = `
📋 **Kanban Board**

**Statistics:**
• Total Cards: ${kanban.total}
• Backlog: ${kanban.byColumn.backlog}
• To Do: ${kanban.byColumn.todo}
• In Progress: ${kanban.byColumn.inProgress}
• Review: ${kanban.byColumn.review}
• Done: ${kanban.byColumn.done}

**By Priority:**
🔴 Urgent: ${kanban.byPriority.urgent}
🟠 High: ${kanban.byPriority.high}
🟢 Normal: ${kanban.byPriority.normal}
🔵 Low: ${kanban.byPriority.low}

**Status:**
✅ Assigned: ${kanban.assigned}
⚠️ Unassigned: ${kanban.unassigned}
🚧 Blocked: ${kanban.blocked}
⏰ Overdue: ${kanban.overdue}

Use the web dashboard for full board view:
http://localhost:19000/
        `.trim();

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    });

    // /learn command
    bot.onText(/\/learn/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const learning = await this.getLearning(config.agentId);

        if (learning.status === 'no_data') {
          await bot.sendMessage(chatId,
            `🎓 No learning data yet. Send some messages to start building experience!`
          );
          return;
        }

        const message = `
🎓 **Learning Summary - ${config.agentId}**

**Experience:**
• Total Experiences: ${learning.totalExperiences}
• Learning Cycles: ${learning.totalLearnings}
• Recent Success Rate: ${learning.recentSuccessRate}

**Knowledge:**
• Topics in Knowledge Base: ${learning.knowledgeTopics}

The system automatically learns from every interaction and improves over time! 🚀

Every 5 experiences trigger automatic reflection and learning.
        `.trim();

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    });

    // /models command
    bot.onText(/\/models/, async (msg) => {
      const chatId = msg.chat.id;
      const message = `
🤖 **Available Models**

**Local Models (Free):**

**llama3.1:8b** 🟢
• Speed: 2-3 seconds
• Use: Simple questions
• Cost: $0

**qwen2.5-coder:7b** 👨‍💻
• Speed: 3-4 minutes
• Use: Code tasks
• Cost: $0

**glm-4.7-flash:latest** 🚀
• Speed: 5-6 minutes
• Use: Complex tasks
• Cost: $0

**Cloud Models (Paid):**

**claude-sonnet-4.5** ⚡
• Speed: 1-2 seconds
• Use: Urgent tasks (if budget allows)
• Cost: $0.003 per request

**Smart Routing:** The system automatically picks the best model for your task! 🎯
      `.trim();

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  }

  /**
   * Call enhanced gateway
   */
  async callGateway(agentId, message, context = {}) {
    const response = await fetch(`${GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, message, context })
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Record learning experience
   */
  async recordExperience(agentId, task, response) {
    try {
      await fetch(`${GATEWAY_URL}/api/learning/experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentId,
          task: task.substring(0, 200),
          result: response.content.substring(0, 200),
          metadata: {
            success: true,
            latency: response.latency || 0,
            cost: response.cost || 0,
            complexity: 5,
            type: 'telegram'
          }
        })
      });
    } catch (error) {
      console.error('Failed to record experience:', error.message);
    }
  }

  /**
   * Get system stats
   */
  async getStats() {
    const response = await fetch(`${GATEWAY_URL}/api/status`);
    if (!response.ok) throw new Error('Failed to get stats');
    return await response.json();
  }

  /**
   * Get cost data
   */
  async getCost() {
    const response = await fetch(`${GATEWAY_URL}/api/cost`);
    if (!response.ok) throw new Error('Failed to get cost');
    return await response.json();
  }

  /**
   * Get Kanban stats
   */
  async getKanban() {
    const response = await fetch(`${GATEWAY_URL}/api/kanban/stats`);
    if (!response.ok) throw new Error('Failed to get kanban');
    return await response.json();
  }

  /**
   * Get learning summary
   */
  async getLearning(agentId) {
    const response = await fetch(`${GATEWAY_URL}/api/learning/${agentId}/summary`);
    if (!response.ok) throw new Error('Failed to get learning');
    return await response.json();
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start the bridge
   */
  async start() {
    console.log('\n' + '═'.repeat(60));
    console.log('🌉 TELEGRAM BRIDGE - Enhanced Gateway Integration');
    console.log('═'.repeat(60) + '\n');

    // Load config
    if (!await this.loadConfig()) {
      process.exit(1);
    }

    // Initialize bots
    if (!await this.initBots()) {
      console.error('❌ No bots initialized. Check your configuration.');
      process.exit(1);
    }

    console.log('✅ Bridge is running!');
    console.log('📱 Send a message to any bot to test\n');
    console.log('Commands available:');
    console.log('  /start - Welcome message');
    console.log('  /help - Show help');
    console.log('  /stats - Show statistics');
    console.log('  /cost - Show costs');
    console.log('  /kanban - Show Kanban board');
    console.log('  /learn - Show learning summary');
    console.log('  /models - Show available models\n');
  }
}

// Start the bridge
const bridge = new TelegramBridge();
bridge.start().catch(error => {
  console.error('❌ Bridge error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down Telegram Bridge...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Telegram Bridge...');
  process.exit(0);
});
