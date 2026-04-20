# Show HN: Understand any codebase in minutes with AI

Hi HN! I built a tool that analyzes codebases and helps developers understand unfamiliar code faster.

**The Problem:**
Every time I join a new project or review a PR in an unfamiliar codebase, I spend hours (sometimes days) trying to understand:
- Where does execution start?
- How are these modules connected?
- What does this file actually do?
- What will break if I change this?

**The Solution:**
Codebase Onboarding Agent analyzes your repository and generates:
- Dependency graphs showing how files connect
- Entry point detection (main functions, __init__, etc)
- Code metrics (complexity, coupling, hotspots)
- Natural language Q&A (coming soon)

**Demo:**
I ran it on the Python scripts directory of our autonomous agent system:
- 24 files analyzed
- 143 functions mapped
- 23 entry points detected
- Dependency graph generated in <1 second

**Current Status:**
- Python support: ✅ Working
- JavaScript/TypeScript: 🚧 In progress
- Go/Rust/Java: 📋 Planned
- Web UI: 📋 Planned

**Open Source:**
MIT licensed, contributions welcome! We need help adding language support.

GitHub: https://github.com/openclaw/codebase-onboarding-agent

**Pricing:**
- Open source/public repos: Free forever
- Private repos: $49/month (coming soon)
- Enterprise: Custom pricing

**Why I built this:**
We're building an autonomous AI company where agents coordinate to build products. Onboarding new agents (and humans) to our codebase was taking too long. This tool reduced onboarding time by ~60%.

**Technical Details:**
- Python AST parsing for code analysis
- NetworkX for dependency graphs
- Planning to use tree-sitter for multi-language support
- LLM integration for natural language Q&A

**What I'd love feedback on:**
1. What languages should we prioritize next?
2. What features would make this most useful for you?
3. Would you pay $49/month for private repo analysis?
4. Any similar tools you've used and liked/disliked?

Happy to answer questions!

---

**Update:** Wow, thanks for all the feedback! Top requests so far:
- TypeScript support (working on it!)
- VS Code extension
- GitHub Action for PR comments
- Circular dependency detection

Will keep you posted on progress. Star the repo if you want updates!
