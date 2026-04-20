# Quick Setup Guide for redinside.dev

## You need to run these commands (as redinside):

### Step 1: Create the repos on GitHub
```bash
gh repo create redinside/codebase-onboarding-agent --public --description "Understand any codebase in minutes with AI-powered analysis"

gh repo create redinside/smart-worker-suspension --public --description "Eliminate 96% waste in AI agent systems with exponential backoff"
```

### Step 2: Push the code
```bash
# Push codebase-onboarding-agent
cd /Users/redinside/.openclaw/workspace/projects/codebase-onboarding-agent
git remote set-url origin https://github.com/redinside/codebase-onboarding-agent.git
git push -u origin main

# Push smart-worker-suspension  
cd /tmp/smart-worker-suspension
git remote set-url origin https://github.com/redinside/smart-worker-suspension.git
git push -u origin main
```

### Step 3: Add collaborator
```bash
gh api repos/redinside/codebase-onboarding-agent/collaborators/anuragg-saxenaa -X PUT
gh api repos/redinside/smart-worker-suspension/collaborators/anuragg-saxenaa -X PUT
```

## That's it!

Your repos will be live at:
- https://github.com/redinside/codebase-onboarding-agent
- https://github.com/redinside/smart-worker-suspension

Then you can:
1. Post on HackerNews (text ready in docs/hackernews-post-final.txt)
2. Tweet announcement (text ready in docs/twitter-announcement.txt)
3. Deploy landing page: `cd projects/codebase-onboarding-agent/landing && vercel`

---

**Everything is ready. Just need you to create the repos under your account.**
