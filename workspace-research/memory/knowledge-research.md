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

### Pattern: Checklist-based evaluation + feedback granularity is a strong lever for “agent improvement”
- **RefineBench** (Lee et al., arXiv:2511.22173, Nov 27 2025) evaluates refinement on **1,000 problems / 11 domains** using a **checklist-based** evaluation framework.
- It explicitly separates:
  - **Self-refinement** (no guidance; model must self-diagnose)
  - **Guided refinement** (natural-language feedback derived from unmet checklist items)
- Key result: frontier models show **low baseline** and **tiny/no gains** in self-refinement (paper reports Gemini 2.5 Pro ~31.3% baseline, +1.8% after 5 turns; GPT-5 ~29.1% baseline; DeepSeek-R1 slightly declines).
- But with targeted checklist feedback, models can refine to **near-perfect** within ~5 turns (many >70B and proprietary models >90% by turn 5).

**What this means for RedOS**
- “Self-improvement loops” should be treated as an **evaluation + feedback design problem**, not a prompting trick.
- If we want agents to improve prompts/skills reliably, we need **explicit checklists/rubrics** and **ground-truth signals** (tests, linters, specs) that can be converted into targeted feedback.
- Concretely: implement a Skill Optimizer that produces *actionable deltas* (failed checklist items) as feedback to a generator model; don’t rely on “revise your answer” style prompts.

Sources:
- RefineBench paper (arXiv): https://arxiv.org/abs/2511.22173
- RefineBench HTML + links (code/dataset): https://arxiv.org/html/2511.22173v1

## Agent Self-Improvement Patterns

### 1) Self-Refinement loops are not reliably “inherent” — they often degrade without training
- Recent work (EVOLVE) reports that, across multiple models and multiple refinement templates, iterative self-refinement can **fail to improve** and may **degrade** output quality unless the model is explicitly trained to refine effectively.
- Takeaway for RedOS: don’t assume “just add a critique→revise loop” will improve reliability. Treat self-refinement as a capability that needs **measurement + training/conditioning**, not a free win.
- Source: EVOLVE paper (ArXiv HTML) https://arxiv.org/html/2502.05605v4

### 2) When self-refinement works, the winning pattern is usually: generate diverse candidates → structured critique/fusion → synthesize
- A recurring motif across surveys/benchmarks is that refinement works best when the model sees **multiple candidates** and is instructed to **diagnose** and **synthesize** rather than merely pick “best-of-N”.
- Takeaway for RedOS: prefer “candidate set + explicit checklist” over generic “improve your last answer”.
- Source (overview + links to primary papers): https://www.emergentmind.com/topics/self-refinement

### 3) Guided feedback dominates unguided self-refinement (self-diagnosis is the bottleneck)
- RefineBench (as summarized by Emergent Mind) suggests LMs can correct well given **explicit checklist-style feedback**, but gain little when asked to self-diagnose what’s wrong.
- Takeaway for RedOS: if we want agents that improve prompts/skills, we likely need **external signals** (unit tests, rubric checklists, reward model, human spot checks) rather than expecting the agent to notice its own mistakes.
- Source (summary + citation trail): https://www.emergentmind.com/topics/self-refinement

### 4) Decouple “generator” and “evaluator” to reduce self-bias / reward hacking
- Surveys note self-bias and reward-hacking failure modes when the same model both generates and evaluates over repeated loops.
- Takeaway for RedOS: implement self-improvement as a **two-role** system (or two-model system):
  - Generator proposes prompt/skill changes
  - Evaluator scores on held-out tasks with strict checks (tests, compile, lint, rubric)
- Source (summary + citation trail): https://www.emergentmind.com/topics/self-refinement

### Practical RedOS implementation sketch (actionable)
- Build a “Skill Optimizer” that:
  1) Samples candidate instruction/skill variants
  2) Runs them against a fixed evaluation set (e.g., Terminal-Bench-style tasks + unit tests)
  3) Uses a separate judge model + hard signals (tests) for scoring
  4) Promotes only improvements with statistically meaningful gains
