#!/usr/bin/env node

/**
 * Extract Secrets from openclaw.json
 * Creates a .env file with all sensitive information
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🔐 OpenClaw Security Migration Tool');
console.log('═'.repeat(60));

// Paths
const configPath = path.join(__dirname, '..', 'openclaw.json');
const envPath = path.join(__dirname, '..', '.env');
const backupPath = path.join(__dirname, '..', '.env.backup');

// Check if openclaw.json exists
if (!fs.existsSync(configPath)) {
  console.error('\n❌ Error: openclaw.json not found!');
  console.log('   Make sure you are in the correct directory.\n');
  process.exit(1);
}

// Load current config
console.log('\n📂 Loading openclaw.json...');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Extract secrets
const secrets = {
  telegram: {},
  api: {},
  gateway: {}
};

// Extract Telegram bot tokens
console.log('\n🤖 Extracting Telegram bot tokens...');
if (config.agents) {
  config.agents.forEach(agent => {
    if (agent.telegram && agent.telegram.botToken) {
      const key = agent.id === 'main' ? 'default' : agent.id;
      secrets.telegram[key] = agent.telegram.botToken;
      console.log(`   ✓ Found token for: ${agent.name}`);
    }
  });
}

// Extract API keys
console.log('\n🔑 Extracting API keys...');
if (config.thirdParty) {
  if (config.thirdParty.zai && config.thirdParty.zai.apiKey) {
    secrets.api.zai = config.thirdParty.zai.apiKey;
    console.log('   ✓ Found ZAI API key');
  }
  if (config.thirdParty.perplexity && config.thirdParty.perplexity.apiKey) {
    secrets.api.perplexity = config.thirdParty.perplexity.apiKey;
    console.log('   ✓ Found Perplexity API key');
  }
}

// Extract gateway token
console.log('\n🌐 Extracting gateway configuration...');
if (config.gateway && config.gateway.authToken) {
  secrets.gateway.authToken = config.gateway.authToken;
  console.log('   ✓ Found gateway auth token');
}

// Generate .env content
console.log('\n✨ Generating .env file...');

let envContent = `# OpenClaw Configuration
# Generated: ${new Date().toISOString()}
# WARNING: Keep this file secure and never commit to Git!

# ==========================================
# TELEGRAM BOT TOKENS
# ==========================================
`;

// Add Telegram tokens
for (const [key, token] of Object.entries(secrets.telegram)) {
  const envKey = key === 'default' ? 'DEFAULT' : key.toUpperCase();
  envContent += `TELEGRAM_BOT_TOKEN_${envKey}=${token}\n`;
}

envContent += `
# ==========================================
# THIRD-PARTY API KEYS
# ==========================================
`;

// Add API keys
if (secrets.api.zai) {
  envContent += `ZAI_API_KEY=${secrets.api.zai}\n`;
}
if (secrets.api.perplexity) {
  envContent += `PERPLEXITY_API_KEY=${secrets.api.perplexity}\n`;
}

envContent += `
# ==========================================
# GATEWAY CONFIGURATION
# ==========================================
`;

// Add gateway config
if (secrets.gateway.authToken) {
  envContent += `GATEWAY_AUTH_TOKEN=${secrets.gateway.authToken}\n`;
}
envContent += `GATEWAY_PORT=${config.gateway?.port || 19000}\n`;

envContent += `
# ==========================================
# OLLAMA CONFIGURATION
# ==========================================
OLLAMA_HOST=${config.ollama?.baseUrl || 'http://localhost:11434'}

# ==========================================
# BUDGET LIMITS
# ==========================================
DAILY_BUDGET=${config.budget?.daily || 5}
HOURLY_BUDGET=${config.budget?.hourly || 1}

# ==========================================
# DEVELOPER SETTINGS
# ==========================================
NODE_ENV=development
LOG_LEVEL=info
`;

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('\n⚠️  .env file already exists!');
  console.log('   Creating backup as .env.backup');
  fs.copyFileSync(envPath, backupPath);
}

// Write .env file
fs.writeFileSync(envPath, envContent);
console.log('\n✅ .env file created successfully!');

// Generate summary
console.log('\n📊 Extraction Summary:');
console.log('─'.repeat(60));
console.log(`   Telegram tokens: ${Object.keys(secrets.telegram).length}`);
console.log(`   API keys: ${Object.keys(secrets.api).length}`);
console.log(`   Gateway tokens: ${secrets.gateway.authToken ? 1 : 0}`);
console.log('─'.repeat(60));

// Security recommendations
console.log('\n🔒 Security Recommendations:');
console.log('─'.repeat(60));
console.log('1. ✅ .env file created with your secrets');
console.log('2. ⚠️  DELETE openclaw.json (contains secrets)');
console.log('3. ⚠️  DELETE all backup files (openclaw.json.bak*)');
console.log('4. ✅ Use openclaw.template.json as base config');
console.log('5. ✅ .gitignore will prevent .env from being committed');
console.log('6. 🔄 ROTATE all tokens before going to production');
console.log('─'.repeat(60));

// Next steps
console.log('\n📝 Next Steps:');
console.log('─'.repeat(60));
console.log('1. Review the generated .env file');
console.log('2. Delete openclaw.json and all backups:');
console.log('   rm openclaw.json openclaw.json.bak*');
console.log('3. Copy template config:');
console.log('   cp openclaw.template.json openclaw.json');
console.log('4. Update code to use env-loader.js');
console.log('5. Test the system');
console.log('6. Ready to push to GitHub! 🚀');
console.log('─'.repeat(60));

console.log('\n✅ Migration complete!\n');
