# agent-eval-harness — SPEC.md

## Overview
An automated evaluation framework for LLM agents. Define test scenarios with expected outputs and scoring rubrics, then run regression suites against any agent.

## Problem
LLM agent quality degrades silently:
- No standard way to test agent behavior changes
- Prompt tweaks break other scenarios unexpectedly
- Manual testing doesn't scale
- Hard to measure "did this agent get better?"

## Solution
A Python framework for defining, running, and scoring agent evaluations.

## Features
- **Test scenarios** — YAML-defined inputs + expected outputs
- **Scoring rubrics** — exact match, semantic similarity, regex, custom
- **Multi-provider support** — run same tests against OpenAI, Anthropic, local
- **Regression detection** — compare runs over time, flag regressions
- **HTML report** — visual pass/fail breakdown with diffs
- **CI integration** — exit code 1 on regression, GitHub Actions ready

## Tech Stack
- Python 3.11+
- sentence-transformers (semantic scoring)
- PyYAML (test definitions)
- Jinja2 (HTML reports)
- MIT license

## Scenario Format
```yaml
id: greet-user
input: "Say hello to Alice"
expected: "Hello, Alice"
scoring:
  method: semantic_similarity
  threshold: 0.85
```

## MVP Scope
1. YAML scenario loader
2. Runner for OpenAI + Anthropic
3. Exact match + semantic similarity scoring
4. CLI: `agent-eval run --suite scenarios/ --model gpt-4o`
5. JSON + HTML report output

## Ready: Yes
