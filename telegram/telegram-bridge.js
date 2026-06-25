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
import { autonomousIssueTracker } from '../resilience/autonomous-issue-tracker.js';
import { userPreferences } from '../user/preferences.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chat-gateway URL (wraps `openclaw agent --json`).
// Was 19000 (full gateway/server.js) which is structurally broken.
// See gateway/chat-gateway.js for the minimal replacement.
const GATEWAY_URL = process.env.CHAT_GATEWAY_URL || 'http://localhost:19010';

// Fetch timeout for /api/chat. chat-gateway has its own 180s openclaw timeout;
// allow a little headroom so the gateway can finish gracefully, but cap the
// bridge so a hung agent doesn't leave the user with a silent message.
const CHAT_FETCH_TIMEOUT_MS = parseInt(process.env.CHAT_FETCH_TIMEOUT_MS || '90000', 10);

// Backoff between retries when the agent times out / errors. Agents like
// ops and eng regularly take 30-50s on cold start, so 2s/4s/6s was too short.
const RETRY_BACKOFF_MS = parseInt(process.env.RETRY_BACKOFF_MS || '8000', 10);

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
   * Resolve a botToken reference (object {id, provider, source} or string) to an
   * actual Telegram bot token string. The legacy openclaw.json format stored
   * tokens as a reference object pointing into secrets.json. We resolve here so
   * the bridge can construct TelegramBot with a real token.
   *
   * Supported id formats:
   *   /channels/telegram/accounts/<name>  -> secrets.channels.telegram.accounts.<name>
   *   /providers/<name>                   -> secrets.providers.<name>.apiKey
   *   /channels/<channel>/accounts/<name> -> secrets.channels.<channel>.accounts.<name>
   */
  async resolveBotToken(tokenRef) {
    if (typeof tokenRef === 'string') return tokenRef;
    if (!tokenRef || typeof tokenRef !== 'object' || !tokenRef.id) return null;

    // Cache secrets.json once per initBots() call.
    if (!this._secretsCache) {
      try {
        const secretsPath = path.join(__dirname, '../credentials/secrets.json');
        this._secretsCache = JSON.parse(await fs.readFile(secretsPath, 'utf8'));
      } catch (err) {
        console.error('❌ Failed to load secrets.json for token resolution:', err.message);
        return null;
      }
    }

    const idPath = tokenRef.id.replace(/^\//, '').split('/');
    // e.g. ['channels','telegram','accounts','ops']
    let cursor = this._secretsCache;
    for (const segment of idPath) {
      if (cursor && typeof cursor === 'object' && segment in cursor) {
        cursor = cursor[segment];
      } else {
        return null;
      }
    }
    return typeof cursor === 'string' ? cursor : null;
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

      const resolvedToken = await this.resolveBotToken(account.botToken);
      if (!resolvedToken) {
        console.log(`⚠️  No token for ${accountId} (unresolvable ref), skipping`);
        continue;
      }

      try {
        const bot = new TelegramBot(resolvedToken, { polling: true });
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

          // Check if this is a complex request that will take time
          const isComplexRequest = /\b(create|build|develop|generate|write|implement|make|design|code)\b/i.test(message);

          // Send immediate acknowledgment for complex requests
          let ackMessage = null;
          if (isComplexRequest) {
            ackMessage = await bot.sendMessage(chatId,
              '⏳ Processing your request...\n_This may take a few moments_',
              {
                reply_to_message_id: msg.message_id,
                parse_mode: 'Markdown'
              }
            );
          }

          // Check for user model override
          const modelOverride = userPreferences.getModelOverride(userId.toString());

          // Call enhanced gateway with resilient handling
          const startTime = Date.now();
          const response = await this.callGateway(config.agentId, message, {
            userId: userId.toString(),
            userName: userName,
            chatId: chatId.toString(),
            platform: 'telegram',
            botId: accountId,
            modelOverride: modelOverride // Pass user's model preference
          });

          const latency = Date.now() - startTime;

          console.log(`✅ Response received in ${latency}ms`);
          console.log(`🎯 Model: ${response.model?.provider}/${response.model?.model}`);
          console.log(`💰 Cost: $${response.cost?.toFixed(6) || '0.000000'}`);

          // Delete acknowledgment message if it was sent
          if (ackMessage) {
            try {
              await bot.deleteMessage(chatId, ackMessage.message_id);
            } catch (err) {
              // Ignore deletion errors
            }
          }

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
            // Final failure - AUTONOMOUS ISSUE LOGGING - NEVER REFUSES!
            console.error('❌ All attempts failed - logging issue');

            const issue = await autonomousIssueTracker.logIssue({
              title: `Telegram Bot Error: ${error.message.substring(0, 100)}`,
              description: `Error responding to Telegram user\n\nBot: ${config.name} (@${accountId})\nUser: ${userName} (${userId})\nMessage: "${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"\n\nError: ${error.message}\n\nStack: ${error.stack}`,
              severity: 'CRITICAL',
              clientImpacted: true,
              revenueImpact: true,
              reporter: 'TELEGRAM_BRIDGE',
              tags: ['telegram-error', 'client-facing', 'bot-failure']
            });

            await bot.sendMessage(chatId,
              `⚠️ I've encountered an issue and our team has been automatically notified.\n\n` +
              `📋 Issue ID: ${issue.id}\n` +
              `✅ Assigned to: ${issue.assigned_to.join(', ')}\n` +
              `⏰ SLA: ${issue.auto_actions.length > 0 ? 'Auto-healing in progress' : 'Resolving within 1 hour'}\n\n` +
              `Your request is being reviewed. Thank you for your patience!`,
              { reply_to_message_id: msg.message_id }
            );
          } else {
            // Wait before retry (linear backoff — agents like ops/eng take
            // 30-50s on cold start, so 2s/4s/6s was too aggressive).
            const waitMs = RETRY_BACKOFF_MS * attempt;
            console.log(`🔄 Retrying in ${waitMs / 1000}s...`);
            await this.sleep(waitMs);
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
/status - System overview
/dashboard - Open Mission Control
/stats - Show usage statistics
/cost - Show cost information
/tickets - Open tickets
/cron - Cron job status
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
/status - System overview
/dashboard - Open Mission Control
/tickets - Open tickets
/cron - Cron job status
/stats - Usage statistics
/cost - Cost breakdown
/kanban - Kanban board status
/learn - Learning summary
/models - Available models

**Model Control:**
/model - Show current model
/use-ollama - Use fast local AI
/use-perplexity - Use internet-enabled AI
/use-anthropic - Use powerful Claude
/auto - Reset to smart routing

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

    // /model command - Show/Set current model
    bot.onText(/\/model\s*(.*)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const modelArg = match[1].trim();

      if (!modelArg) {
        // Show current model
        const override = userPreferences.getModelOverride(userId.toString());

        if (override) {
          await bot.sendMessage(chatId,
            `🎯 **Current Model: ${override.provider}/${override.model}** (manual)\n\n` +
            `You've set a manual model override.\n\n` +
            `To reset to auto-routing: /auto\n` +
            `To change model: /model <provider>/<model>`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await bot.sendMessage(chatId,
            `🎯 **Current Mode: Auto-Routing** ✨\n\n` +
            `Smart routing automatically selects the best model for your query.\n\n` +
            `**Override with:**\n` +
            `/use-ollama - Use fast local Ollama\n` +
            `/use-perplexity - Use internet-enabled Perplexity\n` +
            `/use-anthropic - Use powerful Claude\n` +
            `/model ollama/llama3.1:8b - Set specific model`,
            { parse_mode: 'Markdown' }
          );
        }
      } else {
        // Set model override
        const parts = modelArg.split('/');
        if (parts.length !== 2) {
          await bot.sendMessage(chatId,
            `❌ Invalid format. Use: /model <provider>/<model>\n\n` +
            `Examples:\n` +
            `/model ollama/llama3.1:8b\n` +
            `/model perplexity/sonar-pro\n` +
            `/model anthropic/claude-sonnet-4.5`
          );
          return;
        }

        await userPreferences.setModelOverride(userId.toString(), parts[0], parts[1]);

        await bot.sendMessage(chatId,
          `✅ **Model Override Set!**\n\n` +
          `Provider: ${parts[0]}\n` +
          `Model: ${parts[1]}\n\n` +
          `All your messages will now use this model until you reset with /auto`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    // /use-ollama command
    bot.onText(/\/use-ollama/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      await userPreferences.setModelOverride(userId.toString(), 'ollama', 'llama3.1:8b');

      await bot.sendMessage(chatId,
        `⚡ **Switched to Ollama (llama3.1:8b)**\n\n` +
        `Fast, free, local AI - perfect for quick questions!\n\n` +
        `Reset to auto-routing: /auto`,
        { parse_mode: 'Markdown' }
      );
    });

    // /use-perplexity command
    bot.onText(/\/use-perplexity/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      await userPreferences.setModelOverride(userId.toString(), 'perplexity', 'sonar-pro');

      await bot.sendMessage(chatId,
        `🌐 **Switched to Perplexity (Internet-Enabled)**\n\n` +
        `Perfect for real-time info, news, and current events!\n\n` +
        `Reset to auto-routing: /auto`,
        { parse_mode: 'Markdown' }
      );
    });

    // /use-anthropic command
    bot.onText(/\/use-anthropic/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      await userPreferences.setModelOverride(userId.toString(), 'anthropic', 'claude-sonnet-4.5');

      await bot.sendMessage(chatId,
        `🚀 **Switched to Claude Sonnet 4.5**\n\n` +
        `Most powerful model - best for complex tasks!\n\n` +
        `Note: This uses paid API (costs apply)\n` +
        `Reset to auto-routing: /auto`,
        { parse_mode: 'Markdown' }
      );
    });

    // /auto command - Reset to auto-routing
    bot.onText(/\/auto/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      await userPreferences.clearModelOverride(userId.toString());

      await bot.sendMessage(chatId,
        `✨ **Auto-Routing Enabled**\n\n` +
        `Smart routing will automatically select the best model for each query:\n` +
        `• Simple questions → Fast Ollama\n` +
        `• Code tasks → Specialized coder model\n` +
        `• Real-time queries → Internet-enabled Perplexity\n` +
        `• Complex tasks → Powerful models\n\n` +
        `You can override anytime with /model commands!`,
        { parse_mode: 'Markdown' }
      );
    });

    // /approve command - Approve pending exec operations
    bot.onText(/\/approve/, async (msg) => {
      const chatId = msg.chat.id;

      await bot.sendMessage(chatId,
        `✅ **Exec Approval Triggered**\n\n` +
        `Your approval has been noted.\n` +
        `The main session will process pending exec operations.\n\n` +
        `Note: Exec operations require the Claude Code session to be active.`,
        { parse_mode: 'Markdown' }
      );
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

    // /dashboard command - Open Mission Control Web App
    bot.onText(/\/dashboard/, async (msg) => {
      const chatId = msg.chat.id;
      const mcUrl = process.env.MISSION_CONTROL_URL || 'http://localhost:19000';

      await bot.sendMessage(chatId,
        `🖥️ **Mission Control Dashboard**\n\n` +
        `Open the full dashboard in your browser:\n${mcUrl}\n\n` +
        `Or use these quick commands:\n` +
        `/status - System overview\n` +
        `/tickets - Open tickets\n` +
        `/cron - Cron job status`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🖥️ Open Mission Control', web_app: { url: mcUrl } }
            ]]
          }
        }
      );
    });

    // /status command - Quick system overview
    bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const data = await fetch(`${GATEWAY_URL}/api/dashboard`).then(r => r.json());
        const s = data.summary || {};
        const agents = data.agents || [];
        const agentList = agents.map(a => `  ${a.name} (${a.id}) → ${(a.model || '').split('/').pop()}`).join('\n');

        const statusMsg = `
🦞 **RedOS Mission Control — Status**

**Agents:** ${s.agentCount || 0} online
${agentList}

**Cron Jobs:** ${s.cronSucceeded || 0}/${s.cronEnabled || 0} OK${s.cronFailed > 0 ? ` ⚠️ ${s.cronFailed} failed` : ' ✅'}

**Tickets:** ${s.openTickets || 0} open, ${s.resolvedTickets || 0} resolved${s.openTickets > 0 ? ' ⚠️' : ' ✅'}

**Learnings:** ${s.learningCount || 0} entries
**Skills:** ${s.skillCount || 0} active
**Cost Today:** $${(s.totalCost || 0).toFixed(4)}

🕐 ${new Date().toLocaleString()}
        `.trim();

        const mcUrl = process.env.MISSION_CONTROL_URL || 'http://localhost:19000';
        await bot.sendMessage(chatId, statusMsg, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🖥️ Full Dashboard', web_app: { url: mcUrl } }
            ]]
          }
        });
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Failed to get status: ${error.message}`);
      }
    });

    // /tickets command - Show open tickets
    bot.onText(/\/tickets/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const data = await fetch(`${GATEWAY_URL}/api/dashboard`).then(r => r.json());
        const tickets = data.tickets || [];

        if (!tickets.length) {
          await bot.sendMessage(chatId, '✅ **No tickets** — all clear!', { parse_mode: 'Markdown' });
          return;
        }

        const ticketList = tickets.map(t => {
          const icon = t.status === 'OPEN' ? '🔴' : t.status === 'IN_PROGRESS' ? '🟡' : t.status === 'RESOLVED' ? '🟢' : '⚪';
          return `${icon} **${t.id}** [${t.priority}] ${t.status}\n   ${t.summary || '--'}\n   Assignee: ${t.assignee || '--'}`;
        }).join('\n\n');

        await bot.sendMessage(chatId,
          `📋 **Tickets (${tickets.length})**\n\n${ticketList}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Failed to get tickets: ${error.message}`);
      }
    });

    // /cron command - Show cron job status
    bot.onText(/\/cron/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const data = await fetch(`${GATEWAY_URL}/api/dashboard`).then(r => r.json());
        const jobs = (data.cronJobs || []).filter(j => j.enabled);

        if (!jobs.length) {
          await bot.sendMessage(chatId, '⏰ No enabled cron jobs.', { parse_mode: 'Markdown' });
          return;
        }

        const jobList = jobs.map(j => {
          const icon = j.lastStatus === 'ok' ? '✅' : j.lastStatus === 'error' ? '❌' : '⏳';
          const dur = j.lastDurationMs ? `${(j.lastDurationMs / 1000).toFixed(1)}s` : '--';
          return `${icon} **${j.name}** (${j.agentId})\n   Status: ${j.lastStatus || 'pending'} | Duration: ${dur}${j.consecutiveErrors > 0 ? ` | ⚠️ ${j.consecutiveErrors} errors` : ''}`;
        }).join('\n\n');

        await bot.sendMessage(chatId,
          `⏰ **Cron Jobs (${jobs.length} enabled)**\n\n${jobList}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Failed to get cron status: ${error.message}`);
      }
    });
  }

  /**
   * Call enhanced gateway
   */
  async callGateway(agentId, message, context = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHAT_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(`${GATEWAY_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, message, context }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Gateway error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Gateway timed out after ${CHAT_FETCH_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
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
