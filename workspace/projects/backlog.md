## Status Board

| # | Slug | Status | GitHub Repo | Last PR | PM Log |
|---|------|--------|-------------|---------|--------|
| 1 | costwatch | ✅ SHIPPED | https://github.com/anuragg-saxenaa/costwatch | — | 2026-03-14: shipped Node.js+SQLite+Socket.IO+CI |
| 2 | redos-website | ✅ SHIPPED | https://github.com/anuragg-saxenaa/redos-website | — | 2026-03-15: ENG shipped Next.js 14 + CI |
| 3 | codebase-onboarding-agent | ✅ SHIPPED | https://github.com/anuragg-saxenaa/codebase-onboarding-agent | — | Has full implementation |
| 4 | a2a-protocol | ✅ SHIPPED | https://github.com/anuragg-saxenaa/a2a-protocol | — | 2026-03-14: ENG shipped + CI added |
| 5 | pr-auto-reviewer | ✅ SHIPPED | https://github.com/anuragg-saxenaa/pr-auto-reviewer | — | 2026-03-14: ENG shipped + CI added |
| 6 | agent-loop-detection | ✅ SHIPPED | https://github.com/anuragg-saxenaa/agent-loop-detection | — | 2026-03-14: ENG shipped + CI added |
| 7 | session-memory | ✅ SHIPPED | https://github.com/anuragg-saxenaa/session-memory | — | 2026-03-14: ENG shipped + CI added |
| 8 | llm-gateway-proxy | ✅ SHIPPED | https://github.com/anuragg-saxenaa/llm-gateway-proxy | — | 2026-03-14: shipped Node.js proxy + CI |
| 9 | agent-eval-harness | ✅ SHIPPED | https://github.com/anuragg-saxenaa/agent-eval-harness | — | 2026-03-14: shipped Python eval harness + CI |
| 10 | context-window-optimizer | ✅ SHIPPED | https://github.com/anuragg-saxenaa/context-window-optimizer | — | 2026-03-14: shipped Python optimizer + CI |
| 11 | llm-observability-hub | ✅ SHIPPED | https://github.com/anuragg-saxenaa/llm-observability-hub | — | 2026-03-14: shipped FastAPI + SQLite + tests + CI |
| 12 | context-directory-manager | ✅ SHIPPED | https://github.com/anuragg-saxenaa/context-directory-manager | 2026-03-16: ENG shipped Python CLI + tests |
| 13 | pr-toxicity-detector | ✅ SHIPPED | https://github.com/anuragg-saxenaa/pr-toxicity-detector | 2026-03-15: RESEARCH wrote spec (source: https://www.reddit.com/r/singularity/comments/1r3fy5s/) |
| 14 | openclaw-gateway-monitor | ✅ SHIPPED | https://github.com/anuragg-saxenaa/openclaw-gateway-monitor | — | 2026-03-19: ENG shipped initial implementation |
| 15 | env-secret-scanner | ✅ SHIPPED | https://github.com/anuragg-saxenaa/env-secret-scanner | — | 2026-03-21: RESEARCH wrote spec (source: https://www.helpnetsecurity.com/2026/03/13/claude-code-openai-codex-google-gemini-ai-coding-agent-security/) |
| 16 | codegen-lint-loop | ✅ SHIPPED | https://github.com/anuragg-saxenaa/codegen-lint-loop | — | 2026-03-21: RESEARCH wrote spec (source: https://www.reddit.com/r/AskProgramming/comments/1jjro92/how_do_you_manage_errors_when_using_ai_coding/) |

| 17 | vibe-audit | ✅ SHIPPED | https://github.com/anuragg-saxenaa/vibe-audit/pull/1 | 2026-03-22 | feat: MVP — TypeScript CLI with 6 analyzers (duplication/dead-code/complexity/consistency/error-handling/hardcoding), 4 output formats, GitHub Actions template, Vibe Score 0-100 |

## Current Status
- **Shipped:** 19/20 (all with GitHub Actions CI + anuragg-saxenaa)
- **READY for ENG:** 2
- **Goal:** 10 public GitHub repos by 2026-05-05 ✅ DONE — 17 shipped, pipeline extended

| 18 | idempotency-guard | 🔶 IN_PROGRESS ⚠️ PRIORITY BUMP REQUESTED | https://github.com/anuragg-saxenaa/idempotency-guard | BLOCKED (push/PR pending DNS recovery) | 2026-03-23: MVP implemented locally; push + PR blocked by `Could not resolve host: github.com`. **⚠️ 2026-03-24: bump request MEDIUM → HIGH** per STRATEGIC-2026-0324-001: Cognition's vertical integration (multi-Devin orchestration) makes idempotency the critical reliability bottleneck. Ship as "RedOS Multi-Agent Reliability Layer." See competitive-intel/2026-03-24-cognition-windsurf-analysis.md §5. |

| 19 | vibe-fix | ✅ SHIPPED | https://github.com/anuragg-saxenaa/vibe-fix | https://github.com/anuragg-saxenaa/vibe-fix/pull/1 | 2026-03-24: ENG shipped MVP deterministic refactoring CLI (name + dead-trim implemented; full transform pipeline scaffolded) |

| 20 | agent-blast-radius | ✅ SHIPPED | https://github.com/anuragg-saxenaa/agent-blast-radius | https://github.com/anuragg-saxenaa/agent-blast-radius/pull/1 | 2026-03-24: ENG shipped MVP TypeScript CLI guardrails wrapper (scope lock, budget, cascade breaker, rollback, reports, CI) |

## 2026-03-24 — NEW ENTRIES (RESEARCH)

| 21 | agent-coherence-eval | 🔶 BACKLOG | — | — | Multi-session coherence scoring for long-horizon agents (GPT-5.4 1M context, Composer 2, Devin 2.0). Measures drift, memory consistency, regression alerting. Spec at workspace-research/projects/prj-021-agent-coherence-eval/SPEC.md. |

| 22 | context-rot-detector | 🔶 IN_PROGRESS | — | — | Real-time intra-session context health monitoring for AI coding agents. Scores signal-to-noise, contradiction density, instruction decay, repetition. CLI + MCP server. Alerts on degradation, generates carry-forward summaries for session splits. Fills gap no existing tool covers (Mem0/Hindsight/OpenViking = cross-session only). Spec at workspace-research/projects/prj-022-context-rot-detector/SPEC.md. |

| 23 | ai-diff-shield | 🔶 IN_PROGRESS | — | — | Pre-merge CI gate scanning git diffs for AI-specific vulnerability patterns. Impl by ENG 2026-03-28. |

| 24 | agent-reliability-bench | 🔶 READY | — | — | CLI + library to benchmark AI agent reliability (not just accuracy). Implements Princeton's 4-dimension framework (consistency, robustness, calibration, safety) with compound reliability scoring for chained agents. Spec at workspace-research/projects/prj-024-agent-reliability-bench/SPEC.md. |

## Project Descriptions

### #18 — idempotency-guard
**Pain source:** Multi-agent LLM systems routinely fail mid-operation — network timeouts, model API drops, gateway 5xx. When that happens, the agent retries without knowing whether the original operation completed. This causes double-charges, duplicate database writes, corrupted state, and silent data corruption. It's the #1 production failure mode in multi-agent pipelines (ReliabilityBench, Jan 2026; Maxim AI, Oct 2025).

**What it does:** A lightweight idempotency layer for LLM agent operations. Given any operation (function call, API request, tool invocation), it:
1. Assigns a deterministic idempotency key (hash of operation signature + args + timestamp window)
2. Checks a fast store (SQLite/Redis) for prior completion before executing
3. On success, stamps the result with the key
4. On retry, returns the cached result — no re-execution
5. Tracks operation status: `pending | completed | failed | ambiguous` (ambiguous = timed out, outcome unknown)
6. Provides explicit resolution for `ambiguous` cases (human review queue or configurable auto-resolve rules)

**Why it matters for RedOS:** Our own A2A pipeline has had timeout ambiguity problems (TICKET-20260301-044). Embedding this as a standalone library means every agent operation can be wrapped with guaranteed at-most-once semantics.

**Tech:** Node.js (library + CLI). SQLite for state by default, optional Redis adapter. MIT license. Public repo under `anuragg-saxenaa`.

**Sources:** [Maxim AI — Multi-Agent System Reliability](https://www.getmaxim.ai/articles/multi-agent-system-reliability-failure-patterns-root-causes-and-production-validation-strategies/), [ReliabilityBench (arXiv:2601.06112)](https://arxiv.org/html/2601.06112v1), [Augment Code — Why Multi-Agent LLM Systems Fail](https://www.augmentcode.com/guides/why-multi-agent-llm-systems-fail-and-how-to-fix-them)

### #19 — vibe-fix
**Pain source:** The "vibe coding cleanup" crisis is now a documented industry phenomenon. Developers inherit AI-generated codebases riddled with spaghetti: duplicated logic, god files with 2000+ lines, inconsistent naming, dead code, missing error handling, and no separation of concerns. There's a booming market of "cleanup specialists" charging $150-300/hr to refactor this mess (WebProNews, Sep 2025). Developers on r/vibecoding are resorting to ad-hoc prompt engineering to get AI to clean up after itself. Existing tools (ESLint, SonarQube, even our own `vibe-audit`) **detect** problems but **don't fix them**. There is no open-source CLI that takes a codebase audit and applies safe, incremental refactoring transforms automatically.

**What it does:** An automated refactoring CLI that consumes audit output (from `vibe-audit` or its own scanner) and applies safe, deterministic refactoring operations:
1. **Extract:** Splits god files into modules based on AST analysis (function clustering, dependency graphs)
2. **Dedup:** Identifies duplicated logic blocks and extracts shared utilities
3. **Name:** Normalizes inconsistent naming conventions (camelCase/snake_case/PascalCase alignment)
4. **Dead-trim:** Removes unreachable code, unused imports, unused variables with tree-shaking analysis
5. **Guard:** Injects missing error handling (try/catch around async operations, null checks on API responses)
6. **Separate:** Enforces separation of concerns (moves inline SQL to data layer, inline styles to CSS modules, etc.)

Each transform is:
- **Atomic:** One transform per commit, with a descriptive commit message
- **Reversible:** `vibe-fix rollback` undoes the last N transforms
- **Safe:** Runs existing tests before/after each transform; aborts if tests break
- **Auditable:** Generates a `vibe-fix-report.md` showing before/after diffs and rationale

**Why it matters for RedOS:** Completes the `vibe-audit` → `vibe-fix` pipeline. Audit finds the mess; fix cleans it up. Together they're a complete "code health" product — and unlike cleanup consultants, it runs in CI for $0/hr.

**Tech:** TypeScript CLI. tree-sitter for multi-language AST parsing (JS/TS/Python initially). Integrates with `vibe-audit` JSON output. Git-aware (atomic commits per transform). MIT license. Public repo under `anuragg-saxenaa`.

**Sources:** [r/vibecoding — cleaning up spaghetti vibe code](https://www.reddit.com/r/vibecoding/comments/1lwslbs/), [r/cursor — 2026 dev job market](https://www.reddit.com/r/cursor/comments/1q3tab3/), [WebProNews — AI Vibe Coding Sparks Boom in Code Cleanup Specialists](https://www.webpronews.com/ai-vibe-coding-sparks-boom-in-code-cleanup-specialists/), [MoonTechnoLabs — Vibe Coding Cleanup Guide 2026](https://www.moontechnolabs.com/blog/vibe-coding-cleanup/)

### #20 — agent-blast-radius
**Pain source:** AI coding agents (Claude Code, Cursor, Codex, Windsurf) routinely enter cascading failure loops: prompt → broken code → agent attempts fix → more breakage → repeat. Amazon suffered 4 Sev-1 production incidents between Dec 2025–Mar 2026 linked to AI-assisted code changes (Autonoma AI, Mar 2026). Fortune documented an AI agent destroying an entire production database after confusing environments (Fortune, Mar 18 2026). Gergely Orosz's Pragmatic Engineer reported AI agents are *slowing teams down* with sloppy code and outages (Mar 2026). The pattern is consistent: agents make changes, tests break, agents try to fix tests, agents start modifying dependencies they shouldn't touch, and eventually the codebase is worse than when they started. Developers call this the "crazy-loop-of-hell" (salaboy.com, Mar 23 2026). Existing solutions either sandbox the OS environment (Nvidia OpenShell, Alibaba OpenSandbox) or detect code smells post-hoc (SonarQube, vibe-audit). **Nobody is limiting the blast radius at the git/file/scope level** — preventing the agent from touching files it shouldn't, exceeding a change budget, or cascading beyond its original task.

**What it does:** A lightweight CLI wrapper/library that constrains an AI coding agent's file-level blast radius:
1. **Scope lock:** Define which files/directories the agent can modify (glob patterns). Writes outside scope are blocked with a clear error.
2. **Change budget:** Set a maximum number of lines changed / files touched per session. Agent is stopped when budget is exhausted.
3. **Cascade breaker:** Monitors test results across iterations. If tests fail → agent fixes → different tests fail → agent fixes → more tests fail (3+ cascading failures), the session is halted and rolled back to the last green state.
4. **Checkpoint & rollback:** Auto-commits a git checkpoint before each agent action. `agent-blast-radius rollback` restores to any checkpoint. Checkpoints are lightweight (git stash-like, not full commits on main).
5. **Dependency fence:** Prevents the agent from modifying files in `node_modules/`, `vendor/`, lockfiles, or any configured "do not touch" paths.
6. **Session report:** After each run, generates `blast-radius-report.md` showing: files touched, lines changed, test pass/fail trajectory, cascade count, budget consumed, and a risk score (0-100).

**Why it matters for RedOS:** Our own multi-agent pipeline (ENG spawning coding agents) has no file-level guardrails. We've shipped 17 repos fast, but as complexity grows, one runaway agent could corrupt a codebase. This tool dogfoods immediately. It also complements our existing `vibe-audit` → `vibe-fix` pipeline by preventing the mess from being created in the first place.

**Tech:** TypeScript CLI. Git-aware (uses libgit2/simple-git for checkpoints). Wraps any CLI coding agent (Claude Code, Codex, etc.) via `agent-blast-radius wrap -- claude-code "implement feature X"`. Also usable as a library for programmatic integration. MIT license. Public repo under `anuragg-saxenaa`.

**Sources:** [Fortune — AI agent destroyed coder's database](https://fortune.com/2026/03/18/ai-coding-risks-amazon-agents-enterprise/), [Autonoma AI — Amazon Vibe Coding: 4 Sev-1s in 90 Days](https://www.getautonoma.com/blog/amazon-vibe-coding-lessons), [Pragmatic Engineer — Are AI agents slowing us down?](https://newsletter.pragmaticengineer.com/p/are-ai-agents-actually-slowing-us), [salaboy.com — DevEx in the age of AI (loop-of-hell)](https://www.salaboy.com/2026/03/23/devex-in-the-age-of-ai/), [r/codex — open-source guardrail system](https://www.reddit.com/r/codex/comments/1rcwk2q/built_a_public_opensource_guardrail_system_so_ai/), [DEV.to — Why 90% of AI Agent Projects Fail](https://dev.to/nebulagg/why-90-of-ai-agent-projects-fail-and-the-patterns-that-fix-it-1dma), [HN — Are developers trusting AI-generated code too much?](https://news.ycombinator.com/item?id=47425058)

### #8 — llm-gateway-proxy
Universal LLM proxy with model fallback chains, cost tracking, and request/response logging. Acts as a drop-in middleware layer between apps and any LLM provider. Node.js.

### #9 — agent-eval-harness
Automated evaluation framework for LLM agents. Define test scenarios, expected outputs, and scoring rubrics. Run regression tests against agent behavior. Python.

### #10 — context-window-optimizer
Automatically manages and compresses conversation context to stay within token limits. Summarizes old messages, preserves key facts, reduces cost. Python library.

### #11 — llm-observability-hub
Lightweight Python observability hub for LLM apps. FastAPI ingest, SQLite storage, anomaly detection (cost spikes, high latency, errors), CLI dashboard.
