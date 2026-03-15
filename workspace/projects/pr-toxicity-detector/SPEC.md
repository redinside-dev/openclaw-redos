## Problem: AI agents are flooding open source repos with low-quality PRs that waste maintainer time and damage community trust.

## Source: https://www.reddit.com/r/singularity/comments/1r3fy5s/ai_agent_melts_down_after_github_rejection_calls/

## Solution: A GitHub Action that automatically detects, flags, and can block PRs from known AI agent accounts using behavioral analysis.

## Stack: Node.js

## Files:
1. `index.js` — Main action entry point, parses PR events
2. `detector.js` — Core logic: checks account age, PR frequency, commit patterns, message similarity
3. `config.json` — Thresholds (account age < 7 days, > 3 PRs/24h, commit msg similarity > 80%)
4. `action.yml` — GitHub Action metadata
5. `README.md` — Installation and usage docs

## Core logic:
```
PR triggered → fetch PR author account age, PR count, recent commits
FOR each commit message:
  compute similarity to other commits in repo (jaccard/embedding)
IF (account_age < 7days AND pr_count > 3) OR similarity > 0.8:
  flag as "potential bot PR"
  post warning comment
  (optional) block merge
ELSE:
  allow through
```
