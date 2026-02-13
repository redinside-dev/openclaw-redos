# 🚀 OpenClaw Setup Guide

Complete guide to setting up OpenClaw for development and production.

---

## 📋 Prerequisites

- **Node.js** 18+ installed
- **Ollama** installed and running (http://localhost:11434)
- **Telegram Bot Tokens** (create bots via [@BotFather](https://t.me/botfather))
- **Git** installed

---

## 🔐 Security-First Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/openclaw.git
cd openclaw
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

**Copy the template:**
```bash
cp .env.example .env
```

**Edit .env with your actual values:**
```bash
nano .env  # or use any text editor
```

**Required configuration:**
```env
# Telegram Bot Tokens (get from @BotFather)
TELEGRAM_BOT_TOKEN_DEFAULT=your_bot_token_here
TELEGRAM_BOT_TOKEN_ENG=your_eng_bot_token
# ... add more as needed

# Optional: Third-party APIs
ZAI_API_KEY=your_zai_key
PERPLEXITY_API_KEY=your_perplexity_key

# Gateway
GATEWAY_AUTH_TOKEN=your_secure_token
GATEWAY_PORT=19000

# Ollama
OLLAMA_HOST=http://localhost:11434
```

### Step 4: Verify Configuration

```bash
node config/env-loader.js
```

You should see a configuration summary showing all configured services.

---

## 🎯 Quick Start

### Start the Gateway

```bash
node gateway/server.js
```

### Start Telegram Bridge

```bash
node telegram/telegram-bridge.js
```

### Access Mission Control

Open in browser:
```
http://localhost:19000/mission-control.html
```

---

## 🏗️ Architecture

### Components

1. **HATAKE Parser** - Intelligent message analysis & prompt engineering
2. **Track Router** - Routes to Fast or Orchestrated track
3. **ED/RED Orchestrator** - Multi-agent coordination
4. **Mission Control** - Real-time dashboard
5. **Resilience Layer** - Error handling, DevOps, monitoring

### Data Flow

```
Telegram → Gateway → HATAKE → Track Router
                                    ↓
                              ┌─────┴─────┐
                              ↓           ↓
                           Fast      Orchestrated
                          Track      (ED/RED)
                            ↓           ↓
                         Ollama    Multi-agent
                                      ↓
                                  Response
```

---

## 🧪 Testing

### Test HATAKE Prompt Engineering

```bash
node test-hatake-prompts.js
```

### Test API Endpoints

**Simple Query (Fast Track):**
```bash
curl -X POST http://localhost:19000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"main","message":"What is 2+2?"}'
```

**Complex Query (Orchestrated Track):**
```bash
curl -X POST http://localhost:19000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"eng","message":"Build a Python REST API with authentication"}'
```

### Health Check

```bash
curl http://localhost:19000/health
```

---

## 🔒 Security Best Practices

### Never Commit These Files:

- `.env` - Your actual secrets
- `openclaw.json` (if it contains secrets)
- `*.bak` - Backup files
- `logs/*.jsonl` - May contain sensitive data

### Safe to Commit:

- `.env.example` - Template file
- `openclaw.template.json` - Template config
- All `.js` code files
- `README.md` and documentation
- `.gitignore` - Protects secrets

### Token Rotation

**Before production:**
1. Generate new bot tokens via @BotFather
2. Update `.env` with new tokens
3. Restart all services
4. Test thoroughly

---

## 📁 Project Structure

```
openclaw/
├── .env                      # Your secrets (NOT in Git)
├── .env.example              # Template (safe for Git)
├── .gitignore                # Prevents secret leaks
├── openclaw.template.json    # Config template (safe)
├── config/
│   └── env-loader.js         # Loads secrets from .env
├── agents/
│   ├── hatake-parser.js      # Message intelligence + prompt engineering
│   └── ed-red-orchestrator.js # Multi-agent coordination
├── gateway/
│   ├── server.js             # Main API gateway
│   ├── track-router.js       # Fast/Orchestrated routing
│   └── resilient-handler.js  # Error handling
├── telegram/
│   └── telegram-bridge.js    # Telegram bot integration
├── dashboard/
│   ├── mission-control.html  # Real-time dashboard UI
│   └── mission-control.js    # Dashboard logic
├── resilience/
│   ├── error-handler.js      # Error recovery
│   ├── devops-agent.js       # Auto-monitoring
│   └── ticket-system.js      # Issue tracking
└── logs/
    └── *.jsonl               # Runtime logs (NOT in Git)
```

---

## 🚀 Deployment

### Environment Variables

Set these in your production environment:

```bash
export TELEGRAM_BOT_TOKEN_DEFAULT="your_token"
export GATEWAY_PORT=19000
export NODE_ENV=production
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["node", "gateway/server.js"]
```

### PM2 (Process Manager)

```bash
pm2 start gateway/server.js --name openclaw-gateway
pm2 start telegram/telegram-bridge.js --name openclaw-telegram
pm2 save
```

---

## 🐛 Troubleshooting

### "Configuration validation failed"
- Check that `.env` file exists
- Verify all required tokens are set
- Run `node config/env-loader.js` to see what's missing

### "Cannot connect to Ollama"
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check `OLLAMA_HOST` in `.env`
- Install required models: `ollama pull llama3.1:8b`

### "Telegram bot not responding"
- Verify bot token is correct in `.env`
- Check bot is started: `node telegram/telegram-bridge.js`
- Test with `/start` command in Telegram

---

## 📚 Documentation

- **Architecture Analysis:** `ARCHITECTURE_ANALYSIS.md`
- **Phase 1 & 2 Complete:** `PHASE_1_2_COMPLETE.md`
- **HATAKE Prompt Engineering:** `HATAKE_PROMPT_ENGINEERING.md`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

**Never include secrets in pull requests!**

---

## 📄 License

[Add your license here]

---

## 💬 Support

- GitHub Issues: [Your repo URL]/issues
- Documentation: Check the `/docs` folder

---

## 🎉 Credits

Built with:
- Node.js & Express
- Ollama (local LLM)
- WebSocket for real-time updates
- Telegram Bot API

---

**🔐 Remember: Keep your `.env` file secure and never commit secrets to Git!**
