#!/usr/bin/env node

/**
 * Environment Configuration Loader
 * Loads sensitive configuration from environment variables
 * Falls back to .env file if not set
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnvLoader {
  constructor() {
    this.config = {};
    this.loadEnvFile();
    this.loadEnvironmentVariables();
  }

  /**
   * Load .env file if it exists
   */
  loadEnvFile() {
    const envPath = path.join(__dirname, '..', '.env');

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) {
          continue;
        }

        // Parse KEY=VALUE
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim()
            .replace(/^["']|["']$/g, ''); // Remove quotes

          // Only set if not already in process.env
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }

      console.log('✅ Loaded configuration from .env file');
    } else {
      console.log('⚠️  No .env file found - using environment variables only');
      console.log('   Copy .env.example to .env and configure your secrets');
    }
  }

  /**
   * Load all configuration from environment variables
   */
  loadEnvironmentVariables() {
    this.config = {
      // Telegram Bot Tokens
      telegram: {
        default: process.env.TELEGRAM_BOT_TOKEN_DEFAULT || '',
        allrounder: process.env.TELEGRAM_BOT_TOKEN_ALLROUNDER || '',
        eng: process.env.TELEGRAM_BOT_TOKEN_ENG || '',
        research: process.env.TELEGRAM_BOT_TOKEN_RESEARCH || '',
        finance: process.env.TELEGRAM_BOT_TOKEN_FINANCE || '',
        ops: process.env.TELEGRAM_BOT_TOKEN_OPS || '',
        infosec: process.env.TELEGRAM_BOT_TOKEN_INFOSEC || ''
      },

      // Third-party API Keys
      api: {
        zai: process.env.ZAI_API_KEY || '',
        perplexity: process.env.PERPLEXITY_API_KEY || ''
      },

      // Gateway Configuration
      gateway: {
        authToken: process.env.GATEWAY_AUTH_TOKEN || this.generateAuthToken(),
        port: parseInt(process.env.GATEWAY_PORT || '19000'),
        host: process.env.GATEWAY_HOST || 'localhost'
      },

      // Ollama Configuration
      ollama: {
        host: process.env.OLLAMA_HOST || 'http://localhost:11434'
      },

      // Budget Limits
      budget: {
        daily: parseFloat(process.env.DAILY_BUDGET || '5'),
        hourly: parseFloat(process.env.HOURLY_BUDGET || '1')
      },

      // Developer Settings
      dev: {
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info'
      }
    };
  }

  /**
   * Generate a random auth token if none provided
   */
  generateAuthToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 48; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Get configuration object
   */
  getConfig() {
    return this.config;
  }

  /**
   * Validate required configuration
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Check Telegram tokens
    const telegramTokens = Object.entries(this.config.telegram);
    const emptyTokens = telegramTokens.filter(([key, value]) => !value);

    if (emptyTokens.length === telegramTokens.length) {
      errors.push('No Telegram bot tokens configured');
    } else if (emptyTokens.length > 0) {
      warnings.push(`${emptyTokens.length} Telegram bot(s) not configured: ${emptyTokens.map(([k]) => k).join(', ')}`);
    }

    // Check API keys (optional)
    if (!this.config.api.zai) {
      warnings.push('ZAI API key not configured');
    }
    if (!this.config.api.perplexity) {
      warnings.push('Perplexity API key not configured');
    }

    // Display results
    if (errors.length > 0) {
      console.error('\n❌ Configuration Errors:');
      errors.forEach(err => console.error(`   - ${err}`));
      return false;
    }

    if (warnings.length > 0) {
      console.warn('\n⚠️  Configuration Warnings:');
      warnings.forEach(warn => console.warn(`   - ${warn}`));
    }

    return true;
  }

  /**
   * Display configuration summary (without secrets)
   */
  displaySummary() {
    console.log('\n📋 Configuration Summary:');
    console.log('─'.repeat(50));

    // Telegram bots
    const telegramBots = Object.entries(this.config.telegram)
      .filter(([_, token]) => token)
      .map(([name]) => name);

    console.log(`✅ Telegram bots: ${telegramBots.length} configured`);
    telegramBots.forEach(name => console.log(`   - ${name}`));

    // API keys
    console.log(`\n🔑 API Keys:`);
    console.log(`   - ZAI: ${this.config.api.zai ? '✅ configured' : '❌ missing'}`);
    console.log(`   - Perplexity: ${this.config.api.perplexity ? '✅ configured' : '❌ missing'}`);

    // Gateway
    console.log(`\n🌐 Gateway:`);
    console.log(`   - Port: ${this.config.gateway.port}`);
    console.log(`   - Auth: ${this.config.gateway.authToken ? '✅ configured' : '❌ missing'}`);

    // Ollama
    console.log(`\n🤖 Ollama:`);
    console.log(`   - Host: ${this.config.ollama.host}`);

    // Budget
    console.log(`\n💰 Budget:`);
    console.log(`   - Daily: $${this.config.budget.daily}`);
    console.log(`   - Hourly: $${this.config.budget.hourly}`);

    console.log('─'.repeat(50));
  }
}

// Export singleton instance
export const envLoader = new EnvLoader();
export const config = envLoader.getConfig();

// Validate and display on import
if (process.env.NODE_ENV !== 'test') {
  if (envLoader.validate()) {
    envLoader.displaySummary();
  } else {
    console.error('\n❌ Configuration validation failed!');
    console.error('   Please check your .env file and environment variables.\n');
    process.exit(1);
  }
}
