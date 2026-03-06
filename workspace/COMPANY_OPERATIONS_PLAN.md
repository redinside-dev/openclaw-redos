# RedOS Autonomous Tech Company — Operation Plan

**Vision:** A 24/7 autonomous tech company that identifies problems, researches solutions, builds products, and deploys them to the world — without human intervention.

---

## 1. Current State Assessment

### What's Working
- ✅ Gateway running (all 8 agents responsive)
- ✅ n8n running (port 5678)
- ✅ 9Router running with MiniMax fallbacks
- ✅ Autonomous daemon generating tasks
- ✅ Health watchdog monitoring every 5 min
- ✅ Task pipeline: RESEARCH → ENG → OPS

### What's Not Working
- ⚠️ ENG is idle (no projects in backlog)
- ⚠️ No website/landing page
- ⚠️ No GitHub PR contributions workflow
- ⚠️ No deployment pipeline

---

## 2. Department Workflows

### RESEARCH Team (Research Agent)
**Mission:** Continuously scan the tech landscape, identify opportunities, create specs.

**Tasks:**
1. **Trend Monitoring (every 6 hours)**
   - Search: "AI agents trends 2026", "agentic AI news", "LLM orchestration"
   - Check Hacker News, Reddit r/LocalLLaMA, r/AIagents
   - Document findings in `workspace/research/trends/`

2. **Project Discovery (daily)**
   - Check open issues in popular OSS AI repos
   - Identify gaps in existing tools
   - Evaluate feasibility of new projects
   - Add to `workspace/projects/backlog.md`

3. **Competitive Analysis (weekly)**
   - Analyze competitors' new features
   - Document in `workspace/research/competitive/`

### CODE FACTORY (Eng Agent)
**Mission:** Build production-ready OSS projects from specs.

**Tasks:**
1. **Project Implementation**
   - Read SPEC.md from backlog
   - Create GitHub repo
   - Implement MVP
   - Open PR with proper documentation

2. **Code Review (when PRs found)**
   - Clone target repo
   - Understand codebase
   - Implement fix
   - Submit PR

3. **Quality Assurance**
   - Write tests
   - Ensure CI passes
   - Update documentation

### OPS Team (Ops Agent)
**Mission:** Keep infrastructure running, deploy products.

**Tasks:**
1. **Infrastructure Monitoring**
   - Health checks every 5 min
   - Alert on failures
   - Auto-recover when possible

2. **Deployment Pipeline**
   - Set up Vercel/Render deployments
   - Configure CI/CD
   - Manage environment variables

3. **Website Management**
   - Maintain company landing page
   - Update with new projects
   - Analytics tracking

### HATAKE (Marketing & CI)
**Mission:** External intelligence, competitive analysis.

**Tasks:**
1. **Market Intelligence**
   - Monitor competitor announcements
   - Track industry news
   - Report to CEO

2. **Developer Relations**
   - Engage with community
   - Respond to issues
   - Announce new projects

---

## 3. Implementation — Updated Autonomy System

### A. Enhanced Research Tasks

```
TASK: RESEARCH-TRENDS-YYYYMMDD
Agent: research
Frequency: Every 6 hours

Steps:
1. Run web_search for "AI agents trends March 2026"
2. Run web_search for "agentic AI frameworks 2026"
3. Check r/LocalLLaMA, r/AIagents for top discussions
4. Document top 5 trends in workspace/research/trends/YYYY-MM-DD.md
5. If any trend maps to an existing backlog item → update priority
6. If new opportunity found → add to workspace/projects/backlog.md
7. Return summary of findings
```

```
TASK: RESEARCH-PROJECT-YYYYMMDD
Agent: research
Frequency: Daily at 09:00

Steps:
1. Read workspace/projects/backlog.md
2. For each PENDING item → research feasibility
3. Search GitHub for existing solutions
4. Score: market_need (1-5), feasibility (1-5), uniqueness (1-5)
5. If score >= 12 → mark as READY
6. Create/update SPEC.md for READY items
7. Add implementation task to AUTONOMOUS.md
```

### B. Enhanced Code Factory Tasks

```
TASK: ENG-IMPLEMENT-PROJECT
Agent: eng
Frequency: When PRJ- task in AUTONOMOUS.md

Steps:
1. Read workspace/projects/backlog.md for READY items
2. Pick first READY project
3. Run: bash scripts/create-project-repo.sh <slug> "<description>"
4. Clone and implement MVP
5. Write README.md, CONTRIBUTING.md, LICENSE
6. Open PR with title "feat: <project-name> MVP"
7. Add to workspace/projects/pr-log.md
8. Report completion
```

```
TASK: ENG-GITHUB-CONTRIB
Agent: eng
Frequency: Weekly

Steps:
1. Search GitHub for issues labeled "good first issue" in target repos
2. Filter by: AI agents, LLM, automation topics
3. Pick one issue that can be solved in 2-4 hours
4. Fork repo, implement fix
5. Open PR with "fix: <issue-description>"
6. Log to workspace/projects/pr-log.md
```

### C. Website Project (NEW)

```
TASK: OPS-WEBSITE-LAUNCH
Agent: ops
Priority: P0

Steps:
1. Create workspace/projects/redos-website/SPEC.md
2. Content:
   - Hero: "AI-Powered Development at Scale"
   - Projects showcase (from pr-log.md)
   - Team section (8 agents)
   - GitHub link
   - Contact
3. Create Next.js/Vercel project
4. Deploy to redinside.dev
5. Add to company assets
```

### D. GitHub Contribution Workflow

```
TASK: ENG-FIND-PR-OPPORTUNITIES
Agent: eng
Frequency: Twice weekly

Search targets:
- anthropic/claude-code
- openai/openai-python
- langchain-ai/langchain
- crewai/crewai
- automata-lang/automata
- significant-gravitas/auto-gen

Filter:
- Issues with "good first issue"
- Issues with "help wanted"
- Bugs in agent-related code

Action:
- Comment on issue: "I can work on this"
- Assign to self
- Implement
- Submit PR
```

---

## 4. Immediate Action Items

| Priority | Task | Agent | Deadline |
|----------|------|-------|----------|
| P0 | Launch company website | ops | 24h |
| P1 | Resume backlog research | research | 12h |
| P1 | Start first ENG project | eng | 24h |
| P2 | Find first GitHub PR | eng | 48h |
| P2 | Deploy first project | ops | 72h |

---

## 5. Metrics & KPIs

| Metric | Target |
|--------|--------|
| Projects shipped/month | 3 |
| GitHub PRs merged | 5/month |
| Website traffic | 100 visitors/day |
| Uptime | 99.9% |
| Agent productivity | 80% |

---

## 6. Files to Create/Update

1. `workspace/research/trends/.gitkeep` - Trend tracking folder
2. `workspace/projects/redos-website/SPEC.md` - Website spec
3. `workspace/scripts/github-scraper.py` - Find PR opportunities
4. `workspace/ops/DEPLOYMENT.md` - Deployment runbook

---

## 7. Next 24 Hours

1. **Now:** Restart autonomous daemon to pick up new tasks
2. **In 1 hour:** Check if RESEARCH started trend monitoring
3. **In 6 hours:** Verify backlog has new READY projects
4. **In 24 hours:** Verify website project started

---

**Status:** Ready to execute. Waiting for CEO approval to begin.
