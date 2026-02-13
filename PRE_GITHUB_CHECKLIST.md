# ✅ Pre-GitHub Push Security Checklist

**CRITICAL: Complete ALL items before pushing to GitHub!**

---

## 🔴 CRITICAL - Must Do First

### 1. Extract Secrets to .env

```bash
cd /Users/redinside/.openclaw
node scripts/extract-secrets.js
```

**Expected output:**
- ✅ .env file created
- ✅ All tokens extracted
- ✅ Summary displayed

### 2. Delete Files with Secrets

**⚠️ DANGER ZONE - These files contain your bot tokens and API keys!**

```bash
# Backup first (optional)
mkdir -p ~/openclaw-secrets-backup
cp openclaw.json ~/openclaw-secrets-backup/
cp openclaw.json.bak* ~/openclaw-secrets-backup/ 2>/dev/null

# Delete files with secrets
rm openclaw.json
rm openclaw.json.bak*
rm openclaw.json.backup*
rm -rf workspace/backups/
```

### 3. Verify .gitignore is in Place

```bash
cat .gitignore | grep -E "(\.env|openclaw\.json|\.bak)"
```

**Expected output:**
```
.env
.env.*
!.env.example
openclaw.json
openclaw.json.bak*
openclaw.json.backup*
```

---

## 🟡 IMPORTANT - Verify Before Push

### 4. Check for Hardcoded Secrets in Code

```bash
# Search for potential secrets in JavaScript files
grep -r "AAH" --include="*.js" . | grep -v node_modules | grep -v ".bak"
grep -r "7992329203" --include="*.js" . | grep -v node_modules
grep -r "bot.*token" --include="*.js" -i . | grep -v node_modules | grep -v ".bak"
```

**Expected result:** No matches (or only in comments/examples)

### 5. Verify .env is Ignored by Git

```bash
git status
```

**Should NOT see:**
- `.env`
- `openclaw.json`
- Any `.bak` files

**If you see these files, run:**
```bash
git rm --cached .env openclaw.json *.bak 2>/dev/null
```

### 6. Test Configuration Loading

```bash
node config/env-loader.js
```

**Expected output:**
```
✅ Loaded configuration from .env file
📋 Configuration Summary:
✅ Telegram bots: 7 configured
🔑 API Keys: ...
```

---

## 🟢 RECOMMENDED - Best Practices

### 7. Add README.md

```bash
cat > README.md << 'EOF'
# 🦅 OpenClaw

Multi-agent AI orchestration system with intelligent routing and prompt engineering.

## Features

- 🎯 **HATAKE Parser** - World-class prompt engineering
- 🎭 **Multi-Agent System** - ENG, OPS, RESEARCH, FINANCE, INFOSEC
- 🚀 **Two-Track Routing** - Fast & Orchestrated paths
- 🎨 **Mission Control** - Real-time dashboard
- 🔒 **Enterprise Security** - Full error handling & monitoring

## Quick Start

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete setup instructions.

## Documentation

- [Setup Guide](SETUP_GUIDE.md)
- [Architecture](ARCHITECTURE_ANALYSIS.md)
- [HATAKE Prompt Engineering](HATAKE_PROMPT_ENGINEERING.md)

## Security

This project uses environment variables for all sensitive data. See `.env.example` for configuration template.

**Never commit `.env` or `openclaw.json` files!**

## License

[Your license]
EOF
```

### 8. Create Clean Git History

```bash
# Initialize git if not already done
git init

# Add all safe files
git add .

# Verify what will be committed
git status
```

**Review carefully - should NOT include:**
- .env files
- openclaw.json
- *.bak files
- logs/*.jsonl

### 9. Create Initial Commit

```bash
git commit -m "Initial commit: OpenClaw multi-agent orchestration system

Features:
- HATAKE intelligent parser with prompt engineering
- ED/RED multi-agent orchestrator
- Two-track routing (fast/orchestrated)
- Mission Control real-time dashboard
- Enterprise resilience layer
- Telegram bot integration

Security: All secrets managed via environment variables"
```

---

## 🔍 Final Security Scan

### 10. Run Complete Security Check

```bash
echo "🔍 Running security scan..."

# Check for common secret patterns
echo "Checking for tokens..."
git grep -i "token" -- "*.js" | grep -v "USE_ENVIRONMENT" | grep -v "getToken" | grep -v "// " || echo "✅ No hardcoded tokens"

echo "Checking for API keys..."
git grep -i "apikey\|api_key" -- "*.js" | grep -v "USE_ENVIRONMENT" | grep -v "getKey" | grep -v "// " || echo "✅ No hardcoded API keys"

echo "Checking for secrets..."
git grep -i "secret\|password" -- "*.js" | grep -v "USE_ENVIRONMENT" | grep -v "// " || echo "✅ No hardcoded secrets"

echo ""
echo "✅ Security scan complete!"
```

---

## 📦 Ready to Push Checklist

**Before running `git push`, verify ALL boxes are checked:**

- [ ] ✅ Ran `extract-secrets.js` to create .env
- [ ] ✅ Deleted `openclaw.json` (contains secrets)
- [ ] ✅ Deleted all `openclaw.json.bak*` files
- [ ] ✅ Deleted `workspace/backups/` directory
- [ ] ✅ Verified `.gitignore` is in place
- [ ] ✅ Verified `.env` is NOT in git status
- [ ] ✅ Tested configuration with `env-loader.js`
- [ ] ✅ Searched code for hardcoded secrets (none found)
- [ ] ✅ Created README.md
- [ ] ✅ Ran security scan (all clean)
- [ ] ✅ Created initial git commit
- [ ] ✅ Files to commit reviewed (no secrets)

---

## 🚀 Push to GitHub

### Create GitHub Repository

1. Go to GitHub.com
2. Click "New Repository"
3. Name: `openclaw` (or your choice)
4. **Do NOT** initialize with README (you have one)
5. Click "Create Repository"

### Connect and Push

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/openclaw.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 🔒 Post-Push Security

### 11. Rotate All Tokens (CRITICAL!)

**After first push, generate NEW tokens:**

1. **Telegram Bots:**
   - Go to @BotFather
   - For each bot, send `/token`
   - Get new token
   - Update `.env` file

2. **API Keys:**
   - Regenerate ZAI API key
   - Regenerate Perplexity API key
   - Update `.env` file

3. **Gateway Token:**
   - Generate new random token
   - Update `.env` file

**Why?** Even though you didn't commit secrets, it's best practice to rotate after any potential exposure.

---

## ✅ Verification After Push

```bash
# Clone your repo in a different directory
cd /tmp
git clone https://github.com/YOUR_USERNAME/openclaw.git openclaw-test
cd openclaw-test

# Verify no secrets are present
grep -r "AAH" . 2>/dev/null
grep -r "7992329203" . 2>/dev/null

# Should find nothing or only examples
```

---

## 🎉 Success Checklist

**You're ready to share your code when:**

- ✅ Repository is public/private on GitHub
- ✅ No secrets in any committed files
- ✅ `.env.example` is present as a template
- ✅ `SETUP_GUIDE.md` explains how to configure
- ✅ `.gitignore` prevents future secret commits
- ✅ All tokens rotated (post-push)
- ✅ Local `.env` file is secure
- ✅ Tested that others can clone and setup

---

## 📞 Emergency: If Secrets Were Pushed

**If you accidentally pushed secrets to GitHub:**

1. **Immediately rotate ALL tokens/keys**
2. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch openclaw.json" \
     --prune-empty --tag-name-filter cat -- --all

   git push origin --force --all
   ```
3. **Consider the old tokens compromised**
4. **Monitor for unauthorized access**

---

## 🎓 Learning Resources

**Why environment variables?**
- Secrets separate from code
- Different values per environment (dev/staging/prod)
- No accidental commits
- Easy rotation

**Why .gitignore?**
- Prevents accidental commits
- Protects sensitive files
- Keeps repo clean

**Why token rotation?**
- Limits exposure window
- Best practice in security
- Cheap insurance

---

## ✨ Congratulations!

If you've completed all items, your OpenClaw project is:

- 🔒 **Secure** - No secrets in Git
- 📦 **Portable** - Easy to setup anywhere
- 🚀 **Production-ready** - Professional security practices
- 🤝 **Shareable** - Safe to open-source

**Happy coding! 🎉**
