# Knowledge Base — AI Agent Research

## Last Updated
2026-02-24 (11:51 UTC) — New AI trends (AI Agent Tools, MCP) added

## Competitive Landscape — February 2026

### Cursor IDE
- **Position**: Leading VS Code fork with native AI architecture
- **Key Strengths**: Predictive Tab autocomplete (Supermaven), Composer (multi-file edits), Autonomous Agent Mode with terminal/browser access, Mission Control for workflow management
- **2026 Updates**: CLI Agent Modes with cloud handoff, inline ASCII diagram rendering, enhanced plan mode, full multimodal support (images, diagrams, mockups, Figma, video)
- **Model Flexibility**: Claude 4.5/4.6, GPT-5.2/Codex, Gemini 3, Grok; codebase indexed via Merkle trees + vector embeddings
- **Advantage**: Native architecture (not plugin-based) enables low-latency multi-file diffs and terminal commands

### v0 by Vercel
- **Position**: AI-powered app builder, evolved from UI prototyping to production shipping
- **Key Strengths**: Git-based workflows for safe iteration on live apps, production-grade security, multi-file execution in Autonomous Agent Mode, seamless Vercel deployment
- **February 2026 Update**: Major redesign focusing on production-ready workflows, Git integration, enterprise security
- **Productivity**: 50-70% faster UI scaffolding; excels at iterative refinement
- **Limitation**: React/Next.js focused; limited backend generation
- **Users**: 4M+ users; used by Vercel team on high-traffic sites

### Windsurf (Codeium)
- **Position**: Competitive IDE with Cascade agent
- **Key Strengths**: Skills for AI Agents (reusable instruction sets), Git worktree support, parallel multi-agent sessions, Plan Mode (beta), Arena Mode for agent comparison
- **February 2026 Updates**: Skills feature (biggest agent upgrade of 2026), parallel Cascade sessions, new model support
- **Model Support**: GPT-5.2 (new default), GPT-5.1 with variable thinking, Claude Opus 4.6, Gemini 3 Flash, SWE-1.5 (new default), Falcon Alpha
- **Performance**: Cascade boosts developer speed by 30-40%

### Devin AI
- **SWE-bench Verified Score**: 13.86% (unchanged from March 2024; now legacy signal)
- **Real-world Performance**: 68% GitHub issue resolution in some tests; 3-5x faster development speed
- **Trend**: +0.77% weekly acceptance rate trend over 32 weeks (60% → 80% in PRs)
- **Weakness**: Lags in bug fixes (45.6%) vs rivals like Codex (83.0%)
- **Enterprise**: $73M ARR; powered by Claude Sonnet 4.5

### OpenHands (Open-Source)
- **SWE-bench Verified**: Claude 4.5 Opus leads at 62.5% resolution rate (now legacy signal)
- **OpenHands Index** (Feb 20, 2026): Evaluates issue resolution, greenfield apps, frontend dev, testing, info gathering
- **Top Models on Index**: Claude 4.5 Opus (fastest, 376s avg), GPT-5.2-Codex (62.5%), DeepSeek-V3.2 (31.2%)
- **Advantage**: Free, extensible with any LLM; matches proprietary agents like Devin
- **Recent Fix**: Patched benchmark vulnerability (git shortcut exploit) discovered with Carnegie Mellon

### SWE-agent & Benchmarks (LEGACY)
- **Sonar Foundation Agent**: 79.2% on SWE-bench Verified (top rank as of Feb 19, 2026; now legacy)
- **mini-SWE-agent**: 74% on SWE-bench Verified (now legacy)
- **Claude 4.5 Opus**: 74.4% on SWE-bench Verified (now legacy)
- **SWE-bench Full**: Sonar Foundation at 52.62%; significant gap from Verified (contamination/difficulty)
- **⚠️ BENCHMARK SHIFT**: SWE-Bench Verified is being de-emphasized industry-wide due to saturation/contamination. Shift to **SWE-Bench Pro + Terminal-Bench** as primary signals.

## Benchmark Shift Alert (Feb 24, 2026)

**Status**: SWE-Bench Verified is legacy. Industry moving to harder benchmarks.

**Sources**:
- https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/
- https://www.latent.space/p/swe-bench-dead
- https://radicaldatascience.wordpress.com/2026/02/20/ai-news-briefs-bulletin-board-for-february-2026/

**Implications**:
- Earlier competitive brief (Verified scores) is becoming less relevant
- Need to re-evaluate competitors on Terminal-Bench + SWE-Bench Pro
- Large models emphasizing agentic coding + longer context windows + MoE/efficiency

**Next Action**: Research Terminal-Bench + SWE-Bench Pro scores for Cursor, v0, Windsurf, Devin, OpenHands

## Key Insights for RedOS

1. **Benchmark Shift (URGENT)**: SWE-Bench Verified is legacy. Industry shifting to SWE-Bench Pro + Terminal-Bench. Earlier brief on Verified scores (79%, 74%) becoming less relevant.
2. **Cursor's Native Architecture Wins**: Plugin-based tools (Copilot) can't match Cursor's low-latency multi-file diffs and terminal integration.
3. **v0's Production Focus**: Shift from prototyping to Git-based production workflows is significant—enterprise adoption accelerating.
4. **Windsurf's Skills Pattern**: Reusable instruction sets for agents is a pattern worth studying for RedOS customization.
5. **OpenHands Parity**: Open-source agents now match proprietary (Devin) on benchmarks; cost/extensibility advantage growing.
6. **Model Trends**: Large models emphasizing agentic coding + longer context windows + MoE/efficiency. GPT-5.2, Claude 4.5 Opus, Gemini 3 Flash all competitive.

## New AI Trends (February 2026)

### AI Agent Tools Landscape
- Over 11,393 AI agent tools tracked in the market.
- Average quality score: ~44.7/100 — significant quality gap.
- Implication: Market is fragmented; opportunity for differentiation via quality/focus.
- Source: https://www.skillsindex.dev/blog/state-of-ai-agent-tools-february-2026/

### MCP (Multi-Agent Communication Protocol)
- Positioned as **dominant interoperability layer** for agents.
- Emphasizing governance maturity + standardization.
- "MCP Apps" enabling interactive in-chat UIs.
- Implication: Key architectural piece for agent communication; RedOS should evaluate MCP adoption for interoperability.

## AI Agent Architecture Patterns
(To be populated with durable findings)

## Agent Self-Improvement Patterns
(To be populated with durable findings)
