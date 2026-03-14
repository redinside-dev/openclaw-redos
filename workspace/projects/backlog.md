## Status Board

| # | Slug | Status | GitHub Repo | Last PR | PM Log |
|---|------|--------|-------------|---------|--------|
| 1 | costwatch | 🔨 BUILDING | — | — | 2026-03-12: ENG building MVP |
| 2 | redos-website | 🔨 BUILDING | — | — | 2026-03-12: ENG building MVP |
| 3 | codebase-onboarding-agent | ✅ SHIPPED | https://github.com/redinside-dev/codebase-onboarding-agent | — | Has full implementation |
| 4 | a2a-protocol | ✅ SHIPPED | https://github.com/redinside-dev/a2a-protocol | — | 2026-03-14: ENG shipped initial implementation |
| 5 | pr-auto-reviewer | ✅ SHIPPED | https://github.com/redinside-dev/pr-auto-reviewer | — | 2026-03-14: ENG shipped initial implementation |
| 6 | agent-loop-detection | ✅ READY | — | — | 2026-03-12: SPEC.md exists |
| 7 | session-memory | ✅ READY | — | — | 2026-03-12: SPEC.md exists |
| 8 | llm-gateway-proxy | ✅ READY | — | — | 2026-03-12: Added to backlog |
| 9 | agent-eval-harness | ✅ READY | — | — | 2026-03-12: Added to backlog |
| 10 | context-window-optimizer | ✅ READY | — | — | 2026-03-12: Added to backlog |

## Current Status
- **Ready projects:** 8/10
- **Building:** 2 (costwatch, redos-website)
- **Goal:** 10 public GitHub repos by 2026-05-05

## Project Descriptions

### #8 — llm-gateway-proxy
Universal LLM proxy with model fallback chains, cost tracking, and request/response logging. Acts as a drop-in middleware layer between apps and any LLM provider. Node.js.

### #9 — agent-eval-harness
Automated evaluation framework for LLM agents. Define test scenarios, expected outputs, and scoring rubrics. Run regression tests against agent behavior. Python.

### #10 — context-window-optimizer
Automatically manages and compresses conversation context to stay within token limits. Summarizes old messages, preserves key facts, reduces cost. Python library.