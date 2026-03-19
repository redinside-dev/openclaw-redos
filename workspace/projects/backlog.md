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

## Current Status
- **Shipped:** 11/11 (all with GitHub Actions CI + anuragg-saxenaa)
- **Goal:** 10 public GitHub repos by 2026-05-05 ✅ DONE — 10 shipped

## Project Descriptions

### #8 — llm-gateway-proxy
Universal LLM proxy with model fallback chains, cost tracking, and request/response logging. Acts as a drop-in middleware layer between apps and any LLM provider. Node.js.

### #9 — agent-eval-harness
Automated evaluation framework for LLM agents. Define test scenarios, expected outputs, and scoring rubrics. Run regression tests against agent behavior. Python.

### #10 — context-window-optimizer
Automatically manages and compresses conversation context to stay within token limits. Summarizes old messages, preserves key facts, reduces cost. Python library.

### #11 — llm-observability-hub
Lightweight Python observability hub for LLM apps. FastAPI ingest, SQLite storage, anomaly detection (cost spikes, high latency, errors), CLI dashboard.
