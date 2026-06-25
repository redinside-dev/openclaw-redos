# MEMORY.md - Long-term Memory

This is your curated long-term memory. Write significant events, decisions, lessons learned, and important context here.

## How to Use This File

- **Daily entries:** Write brief summaries of what happened each day in `memory/YYYY-MM-DD.md`
- **Curated memories:** Move important items from daily files into this long-term memory
- **Decisions:** Record major decisions and their reasoning
- **Lessons:** Document lessons learned to avoid repeating mistakes
- **Context:** Store important context that should persist across sessions

## Recent Entries

## 2026-04-14 - Competitive Intelligence
- Cursor AI released Cursor 3 with unified workspace and parallel agents (see https://cursor.com/blog/cursor-3). New changelog features enable multi-repo parallel agents (https://cursor.com/changelog).
- Devin AI posted release notes on April 10, 2026 with new desktop support and architecture upgrades (https://docs.devin.ai/release-notes/overview).
- These signals indicate accelerating competition in integrated AI coding environments.


## Template for New Entries

## YYYY-MM-DD - Event/Decision
- **What happened:** Brief description
- **Why it matt
## 2026-06-08 - Mixed-author push protocol + duplicate-PR anti-pattern (DECISION-LOG)

**Mixed-author push protocol (CEO call):** when 100% additive diff + no secret-like filenames + private repo + 0-behind origin (clean rollback path) → CEO can approve mixed-author push unilaterally. Sequence: `git stash push -u` → `git status` clean except unpushed → `git push origin main` → `git stash pop` → triage the uncommitted changes separately. Public repo or non-additive diff → escalate or split. Reference: 19:28 EDT decision to push 11 mixed-author commits to `~/.openclaw` main.

**Duplicate-PR anti-pattern (Spring AI lesson):** if a competing PR exists upstream and your local branch SHA is bit-identical to its tip, the only professional move is co-author or maintainer reassignment — NEVER open a second PR. Reputation math: take-over = +1 with maintainers, compete = −2. Also: do not `@-mention` and ask "can I take this" — that is faux-collaborative and puts the burden on the original contributor. Earn the reassignment with a substantive review + an additional test case that covers an un-covered edge. Reference: 19:28 EDT decision on spring-ai PR #6029 / issue #5940.

**Process reminder for ENG (worth adding to LEARNINGS.md):** before spinning a fork-branch for an upstream issue, check if a PR is already open against that issue. Two forks-of-same-fix in one week is a pattern. Add to next LEARNINGS.md sync.
