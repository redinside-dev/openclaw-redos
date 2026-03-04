#!/bin/bash
# GitHub Repository Setup Script

echo "🚀 Setting up GitHub repositories for OpenClaw open source launch"

# 1. Create main organization repo
echo "📦 Creating openclaw/codebase-onboarding-agent..."
gh repo create openclaw/codebase-onboarding-agent \
  --public \
  --description "Understand any codebase in minutes with AI-powered analysis" \
  --homepage "https://openclaw.ai" \
  || echo "Repo might already exist, continuing..."

# 2. Create smart-worker-suspension repo
echo "📦 Creating openclaw/smart-worker-suspension..."
gh repo create openclaw/smart-worker-suspension \
  --public \
  --description "Eliminate 96% waste in AI agent systems with exponential backoff" \
  || echo "Repo might already exist, continuing..."

# 3. Push codebase-onboarding-agent
echo "⬆️  Pushing codebase-onboarding-agent..."
cd projects/codebase-onboarding-agent
git init
git add .
git commit -m "Initial commit: Python analyzer with dependency graphs"
git branch -M main
git remote add origin https://github.com/openclaw/codebase-onboarding-agent.git
git push -u origin main

# 4. Create releases
echo "🏷️  Creating v0.1.0 release..."
gh release create v0.1.0 \
  --title "v0.1.0 - Initial Release" \
  --notes "First public release with Python support and dependency analysis"

echo "✅ GitHub setup complete!"
echo ""
echo "Next steps:"
echo "1. Update README badges with actual repo URLs"
echo "2. Enable GitHub Discussions"
echo "3. Set up GitHub Actions for CI"
echo "4. Create Discord server"
echo "5. Write HackerNews post"
