# AgentOS v3 - Knowledge Base & Continuous Improvement

## Purpose
Agents learn from every interaction and continuously improve by:
1. **Building shared knowledge** - Agents contribute to collective intelligence
2. **Auto-research** - Regularly update knowledge from external sources
3. **Memory persistence** - Remember context across sessions
4. **Self-improvement** - Learn from mistakes and successes

---

## Memory System

### What Agents Should Remember
1. **User preferences and patterns**
   - Communication style preferences
   - Common tasks and workflows
   - Technical stack and tools used

2. **Project context**
   - Current projects and their status
   - Architecture decisions and rationale
   - Dependencies and constraints

3. **Learnings and insights**
   - What worked / what didn't
   - Common pitfalls and solutions
   - Best practices discovered

4. **Team coordination**
   - Delegation patterns that work well
   - Which agent is best for which tasks
   - Successful collaboration examples

### Memory Storage Locations
```
/Users/redinside/.openclaw/workspace/memory/
├── shared/              # Shared across all agents
│   ├── user_preferences.md
│   ├── project_context.md
│   └── best_practices.md
├── red/                 # RED-specific memory
├── zen/                 # ZEN-specific memory
├── research/            # RESEARCH-specific memory
├── eng/                 # ENG-specific memory
├── finance/             # FINANCE-specific memory
└── ops/                 # OPS-specific memory
```

---

## Auto-Research Protocol

### Daily Research Tasks
Each agent should regularly research their domain:

**ZEN (CSO)**:
- Check trending topics and news sources
- Monitor industry developments
- Update knowledge of current events
- Sources: Reddit /r/technology, Hacker News, GitHub trending

**RESEARCH**:
- Review academic papers and industry reports
- Track competitor activities
- Monitor market trends
- Sources: arXiv, Google Scholar, industry blogs

**ENG**:
- Check latest framework updates
- Review new security vulnerabilities
- Monitor best practices evolution
- Sources: GitHub, StackOverflow, dev.to, Reddit /r/programming

**FINANCE**:
- Track model pricing changes
- Monitor cost optimization opportunities
- Review budget performance
- Sources: Provider pricing pages, cost optimization blogs

**OPS**:
- Check for infrastructure updates
- Monitor security patches
- Review deployment best practices
- Sources: DevOps communities, security advisories

### Auto-Research Schedule
```
Daily (during low usage hours):
- Scan primary sources for domain updates
- Update knowledge base with findings
- Flag important changes for RED

Weekly:
- Deep dive into 1-2 key topics
- Synthesize learnings into reports
- Update agent capabilities/prompts if needed

Monthly:
- Comprehensive domain review
- Evaluate and update strategies
- Propose system improvements
```

---

## Knowledge Sharing Protocol

### When an Agent Learns Something
1. **Document the learning** in their memory folder
2. **Share with team** if it affects other agents
3. **Update shared knowledge** if it's generally useful

### Example: ENG learns new security practice
```markdown
# Learning Log - 2026-02-12
## Topic: OAuth 2.1 Security Changes

### What I Learned
OAuth 2.1 now requires PKCE for all clients...

### Impact
- Updates needed to auth implementation
- Affects: ENG (implementation), OPS (deployment)
- Shared to: /workspace/memory/shared/security_updates.md

### Action Items
- [ ] Update auth code (ENG)
- [ ] Update tests (OPS)
- [ ] Notify users (RED)
```

---

## Continuous Improvement

### Self-Evaluation Questions
Agents should regularly ask:
1. **Effectiveness**: Did my delegation work well?
2. **Efficiency**: Could I have solved this faster?
3. **Quality**: Was my output accurate and complete?
4. **Collaboration**: Did I use the right specialists?

### Improvement Cycle
```
1. Execute task
2. Evaluate outcome
3. Document learnings
4. Update approach
5. Share insights
```

### Performance Metrics to Track
- Task completion time
- Delegation accuracy (right agent picked?)
- User satisfaction (follow-up questions?)
- Cost efficiency
- Error rates

---

## Knowledge Base Maintenance

### Weekly Maintenance (RED coordinates)
1. Review memory folders for duplicates
2. Consolidate common patterns
3. Archive outdated information
4. Update delegation rules based on learnings

### Monthly Deep Clean
1. Evaluate all knowledge for relevance
2. Update CLAUDE.md files based on learnings
3. Propose configuration improvements
4. Generate improvement report

---

## Research Sources by Agent

### ZEN
- **News**: BBC, Reuters, AP News
- **Tech**: TechCrunch, The Verge, Ars Technica
- **Social**: Reddit /r/worldnews, Twitter trending
- **Search**: Perplexity (primary tool)

### RESEARCH
- **Academic**: arXiv, Google Scholar, SSRN
- **Industry**: Gartner, McKinsey, industry reports
- **Competitive**: Crunchbase, company blogs
- **Trends**: Google Trends, market research firms

### ENG
- **Code**: GitHub trending, awesome-lists
- **Docs**: Official documentation sites
- **Community**: StackOverflow, Dev.to, Reddit /r/programming
- **Security**: CVE databases, security advisories

### FINANCE
- **Pricing**: AI model provider pricing pages
- **Optimization**: AWS cost optimization, cloud cost blogs
- **Tracking**: Internal budget logs
- **Benchmarks**: Industry cost benchmarks

### OPS
- **DevOps**: DevOps Subreddit, SRE resources
- **Monitoring**: Monitoring best practices, SLO guides
- **Security**: Security patch databases
- **Tools**: Tool comparison sites, DevOps newsletters

---

## Implementation Notes

### For Agents
- Check memory folders before starting major tasks
- Document learnings after completing tasks
- Share insights proactively with team
- Propose improvements based on patterns

### For Users
- Agents will mention when they've learned something new
- Knowledge base is transparent and accessible
- You can request specific research topics
- Agents continuously improve without manual intervention

**Goal**: Build a self-improving AI company that gets smarter every day.
