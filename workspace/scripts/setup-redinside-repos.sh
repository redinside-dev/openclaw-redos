#!/bin/bash
# Setup script for redinside.dev repos

echo "🚀 Setting up repos under redinside account"
echo ""
echo "Run these commands as redinside:"
echo ""

echo "# 1. Create codebase-onboarding-agent repo"
echo "gh repo create redinside/codebase-onboarding-agent --public --description 'Understand any codebase in minutes with AI-powered analysis'"
echo ""

echo "# 2. Create smart-worker-suspension repo"
echo "gh repo create redinside/smart-worker-suspension --public --description 'Eliminate 96% waste in AI agent systems with exponential backoff'"
echo ""

echo "# 3. Push codebase-onboarding-agent"
echo "cd projects/codebase-onboarding-agent"
echo "git remote set-url origin https://github.com/redinside/codebase-onboarding-agent.git"
echo "git push -u origin main"
echo ""

echo "# 4. Push smart-worker-suspension"
echo "cd /tmp/smart-worker-suspension"
echo "git remote set-url origin https://github.com/redinside/smart-worker-suspension.git"
echo "git push -u origin main"
echo ""

echo "# 5. Add anuragg-saxenaa as collaborator"
echo "gh repo edit redinside/codebase-onboarding-agent --add-collaborator anuragg-saxenaa"
echo "gh repo edit redinside/smart-worker-suspension --add-collaborator anuragg-saxenaa"
echo ""

echo "✅ Done! Repos will be live at:"
echo "   https://github.com/redinside/codebase-onboarding-agent"
echo "   https://github.com/redinside/smart-worker-suspension"
