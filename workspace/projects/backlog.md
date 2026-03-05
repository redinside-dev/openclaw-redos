# OSS Project Backlog — GOAL-007

**Owner:** RESEARCH (ideation) | **Updated:** pending first RESEARCH run
**Target:** 10 public repos, 2 months (2026-03-05 → 2026-05-05)

---

## Status Board

| # | Slug | Status | GitHub Repo | Last PR | PM Log |
|---|------|--------|-------------|---------|--------|
| — | — | 🔄 RESEARCH running PRJ-001 to fill this table | — | — | — |

---

## How to add a project (RESEARCH)

1. Run web_search for developer pain points in the target domain
2. Score: feasibility (1-5), market need (1-5), buildable in 2 weeks (Y/N)
3. Add a row to the Status Board above
4. Create `workspace/projects/<slug>/SPEC.md` with: problem, solution, MVP scope, tech stack
5. Add a PRJ-NNN task to AUTONOMOUS.md for ENG to implement

## How to build a project (ENG)

1. Read `workspace/projects/<slug>/SPEC.md`
2. Run `bash scripts/create-project-repo.sh <slug> "<description>"` to create the GitHub repo
3. Clone, implement MVP, open a PR
4. Append to `workspace/projects/pr-log.md`
5. Update status board above + create `workspace/projects/<slug>/PM-LOG.md`

---

## Pain Points to Research (seed list for RESEARCH agent)

- LLM agent loop detection (we just built one — is there an OSS version?)
- Cost tracking across multiple LLM providers
- A2A (agent-to-agent) protocol libraries
- Watchdog/resilience libraries for AI agents
- Multi-agent task queue with deadlock detection
- GitHub PR auto-reviewer using LLMs
- Cron-as-code for AI agents
- Session memory with episodic recall
- Model routing / load balancing proxy
- Developer onboarding agent (we built a template)
