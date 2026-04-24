---
name: coding-factory
description: Full 3-part autonomous coding factory workflow. Defines how RESEARCH discovers OSS opportunities, how ENG implements production code, and how RED delegates on-demand repos from Telegram directly to ENG.
---

# Coding Factory — 3-Part Autonomous Workflow

## Overview

The coding factory operates 3 parallel paths:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Coding Factory Workflow                          │
│                                                                     │
│  PATH 1 — Autonomous Discovery                                      │
│  ─────────────────────────────                                      │
│  RESEARCH (internet scan, any language)                             │
│       ↓  discovers trending OSS repos (10k+ stars, any stack)      │
│       ↓  writes structured brief to workspace/projects/backlog.md  │
│       ↓  delegates to ENG via sessions_spawn                        │
│  ENG   (implements full feature/fix, tests, PR)                     │
│                                                                     │
│  PATH 2 — Issue Watcher (autonomous, always-on)                    │
│  ──────────────────────────────────────────────                     │
│  ENG polls GitHub issues every 15 min (decolua/9router)            │
│       ↓  picks concrete bugs, <50 lines                             │
│       ↓  implements full fix, runs tests                            │
│       ↓  opens PR with --no-edit                                    │
│                                                                     │
│  PATH 3 — On-Demand via Telegram → RED → ENG                       │
│  ─────────────────────────────────────────────                      │
│  User sends repo to RED via Telegram                               │
│       ↓  RED (CEO) delegates DIRECTLY to ENG (no research step)    │
│       ↓  ENG reads repo, picks issue or backlog spec               │
│       ↓  implements full fix/feature, tests, PR                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## HARD RULE — GitHub Identity (enforce FIRST, before any git/gh command)

**`redinside-dev` MUST NEVER appear on any PR, review, comment, or commit. Only `anuragg-saxenaa`.**

Run these commands at the START of every ENG session and before every git push, gh pr create, gh pr comment, gh pr review, or gh pr approve:

```bash
gh auth switch --user anuragg-saxenaa
git config user.name "Anurag Saxena"
git config user.email "anuragg.saxenaa@gmail.com"
```

Verify: `gh auth status` must show `anuragg-saxenaa` as the active account before proceeding.  
If it shows `redinside-dev` as active — switch immediately. Do not proceed without switching.

This applies to ALL coding factory paths: Path 1 (OSS discovery), Path 2 (issue watcher), Path 3 (on-demand), and any external OSS PR reviews/approvals.

---

## HARD RULE — Pre-PR Quality Gate (MANDATORY before `gh pr create`)

**NEVER open a PR without passing this checklist. A rejected PR is worse than no PR.**

### 1. Diff sanity check — FIRST and NON-NEGOTIABLE
```bash
git diff upstream/<base-branch>...HEAD --stat
```
- Count of changed files must be ≤ the number of files your fix actually touched.
- If the diff shows `.editorconfig`, `.github/`, `.mvn/`, `pom.xml` files from unrelated modules, or ANY file you did not intentionally edit → **STOP. The branch base is stale.**
- Fix: `git reset --hard upstream/<base-branch>` then `git cherry-pick <your-sha> --signoff`
- Only proceed when `git diff upstream/<base-branch>...HEAD --stat` shows ONLY your intended files.

### 2. Code review self-check (internal review before opening PR)
Before opening, answer ALL of these:
- Does every line of code follow the existing patterns in the repo? (Read 2-3 similar files first)
- Is any code AI-generated boilerplate that adds no value? Remove it.
- Are there verbose javadocs, unnecessary comments, or repeated explanations? Remove them — follow repo style.
- Does the PR contain ONLY the fix for the stated issue? No extra cleanup, no extra tests beyond what's needed, no refactoring.
- Is the change minimal? Fewer lines is better. The diff should be obvious at a glance.

### 3. Build and test locally
```bash
mvn verify -pl <affected-module> -am -q   # Java
npm run build                              # TypeScript
pytest                                     # Python
```
Fix all failures before opening the PR.

### 4. PR body must be concise
- 2-3 sentences max: what was broken, what was changed, link to issue.
- NO: marketing language, excessive bullet points, tables, or AI-generated summaries.
- Example: "Fixes #N. `BedrockKnowledgeBaseVectorStoreAutoConfiguration` now imports `BedrockAwsConnectionConfiguration` and accepts an optional `AwsCredentialsProvider`, matching the pattern in `BedrockConverseProxyChatAutoConfiguration`."

---

## HARD RULE — PR Ownership (fire-and-forget is FORBIDDEN)

Opening a PR is NOT done. ENG owns each PR until it is merged or explicitly closed.

**Mandatory after every PR is opened:**

1. **Every commit MUST have `--signoff` (`-s`)** — use `git commit -s` always. DCO failure = blocked PR.
2. **Branch onto correct base** — always branch from the exact upstream target branch tip, not from an old fork state. Stale base = upstream commits polluting the PR diff.
3. **Monitor within 24h** — run `gh pr checks` and `gh api .../issues/N/comments` on every open PR every 24h.
4. **Respond to ALL comments** — any question, suggestion, or change request from a maintainer MUST get a reply within 24h. Never leave a maintainer's comment unanswered.
5. **Fix CI failures immediately** — DCO fail, build fail, lint fail: fix and force-push the same day.
6. **Keep PRs up to date** — if the base branch moved and there are conflicts, rebase and force-push.
7. **One fix per PR** — each PR must contain only the commits for its stated fix. No accumulated commits from other branches.

**Contributor identity on all commits and comments:**
- `git config user.name "Anurag Saxena"` (display name — not the GitHub handle)
- `git config user.email "anuragg.saxenaa@gmail.com"`
- GitHub account: `anuragg-saxenaa`

**PR monitoring is tracked in `workspace-eng/pr-log.md`** — after each monitoring run, update the PR log with status, last-checked timestamp, and any open action items.

---

## PATH 1 — RESEARCH → ENG (Autonomous OSS Discovery)

### RESEARCH Agent Protocol

**Trigger:** RESEARCH inner-loop runs every 3 hours.

**When to trigger OSS discovery:** 
- When `workspace/projects/backlog.md` has fewer than 5 READY items, OR
- During dedicated weekly OSS scan (Monday 9am)

**OSS Discovery Steps:**

```
1. SCAN trending repos (any language/framework):
   web_search("trending github repositories 2026 AI machine learning")
   web_search("github trending this week stars > 10000")
   web_search("new open source project launched 2026 developer tools")
   web_search("popular AI framework JavaScript Python Java Swift 2026 github")

2. EVALUATE each candidate:
   - Stars: 10,000+ preferred, 5,000+ minimum
   - Language: ANY — Java, TypeScript, Python, Go, Rust, Swift, etc.
   - Activity: commits in last 30 days
   - Issues: open bugs or feature requests with "good first issue" / "help wanted"
   - Fit: does ENG have the stack? (Java=Stream A, TS=Stream B, Python=Stream C, Swift/RN=Stream D)

3. WRITE spec to backlog.md:
   ## <N> | <repo-name>
   ⭐ READY
   
   **Stack:** <detected stack>
   **Repo:** <github org/repo>
   **Stars:** <count>
   **Pain source:** <why developers want this fixed — cite GitHub issue or discussion>
   **What to do:** <concrete action: fix issue #N, add feature, improve docs>
   **Stream:** <A/B/C/D/E>

4. DELEGATE to ENG:
   sessions_spawn({
     agentId: "eng",
     message: "OSS discovery brief ready. Read workspace/projects/backlog.md — new READY item added: <repo-name>. Implement it using Stream <X>. Full implementation, tests, PR with --no-edit."
   })
```

**Output format for each discovery:**

```markdown
## Research: OSS Discovery — <date>

**Repos evaluated:** N
**Added to backlog:** N

### Candidates Found
| Repo | Stars | Stack | Action | Stream |
|---|---|---|---|---|
| org/repo | 15k | TypeScript | Fix issue #123 | B |

### Delegated to ENG
sessions_spawn sent for: <repo-name>
```

---

## PATH 2 — ENG Issue Watcher (Always-On)

ENG runs autonomously every 15 minutes watching `decolua/9router` for bugs.

**Details:** See `workspace/skills/eng-coding/SKILL.md` — OSS Contribution Protocol.

**PR log:** `workspace/projects/pr-log.md`

---

## PATH 3 — On-Demand: Telegram → RED → ENG

### When User Sends Repo to RED via Telegram

RED (CEO) receives the message and immediately delegates to ENG. **No research step — ENG goes directly.**

**RED's response protocol when user sends a repo:**

```
User: "Implement feature X in github.com/org/repo"
or
User: "Fix issues in org/repo"
or  
User: "Add to our coding factory: org/repo"

RED RESPONSE:
1. Acknowledge to user on Telegram (within 60s)
2. Immediately spawn ENG:

sessions_spawn({
  agentId: "eng",
  message: `
On-demand task from RED (Telegram request from Anurag).

Repo: <org/repo>
Task: <what user asked>

STEPS:
1. gh repo clone <org/repo> (or use existing if already cloned)
2. gh issue list --label "bug,help wanted,good first issue" --limit 5
3. Pick most concrete, actionable issue (<50 lines)
4. Read source, implement FULL fix (no stubs, no TODOs)
5. Run tests: use repo's own test framework
6. git commit -m "fix: <desc> (closes #N)"
7. git push + gh pr create --no-edit --title "fix: <desc>" --body "Closes #N"
8. Log to workspace/projects/pr-log.md
9. Report result back via sessions_send to main
  `
})

3. Reply to user: "Delegated to ENG ✓ — will implement and open PR"
```

**RED identification of on-demand repo requests:**
- Any Telegram message with a GitHub URL
- Any message containing "implement", "fix", "add to factory", "pr for", "code for"
- Message pattern: `<verb> <github-url-or-repo>` 

**Known always-on repos (no delegation needed, ENG handles autonomously):**
- `decolua/9router` — IssueWatcher every 15min
- `FellouAI/eko` — Stream B, Wednesdays
- `affaan-m/everything-claude-code` — Stream B

**On-demand repos (RED→ENG delegation):**
- Any repo the user sends to RED via Telegram
- Examples already in use: `decolua/9router` (before it was automated), various OSS repos

---

## ENG Implementation Contract (ALL PATHS)

No matter which path triggers ENG, the output MUST be:

| Requirement | Standard |
|---|---|
| Implementation | Fully complete — no `// TODO`, no stubs, no `throw new UnsupportedOperationException()` |
| Tests | Real assertions using repo's own test framework |
| Build | Clean — `mvn verify` / `npm run build` / `pytest` / `swift build` passes |
| PR | `gh pr create --no-edit` — ALWAYS include this flag |
| Commit message | `fix: <desc> (closes #N)` or `feat: <desc>` — always `git commit -s` (signoff) |
| Log | Append to `workspace/projects/pr-log.md` |

**Stack routing:**
| Language | Stream | Build | Test |
|---|---|---|---|
| Java / Spring | A | `mvn verify` | JUnit 5 |
| TypeScript / JS | B | `npm run build` | vitest/jest |
| Python | C | `pip install && pytest` | pytest |
| Swift / React Native | D | `swift build` / `npm test` | XCTest / jest |
| Java (complex/multi-file) | E | `mvn verify` | JUnit 5 + Claude Code |

---

## RESEARCH to ENG Handoff — Structured Brief Format

When RESEARCH hands off to ENG, write a brief to `workspace/projects/research-to-eng-<date>.md`:

```markdown
## Research Brief for ENG — <date>

### Trending OSS Opportunities

| Priority | Repo | Stars | Stack | Stream | Action |
|---|---|---|---|---|---|
| HIGH | org/repo1 | 12k | TypeScript | B | Fix issue #234: description |
| MED | org/repo2 | 8k | Java | A | Add feature: description |

### Context
[Why these repos are trending, what developers are asking for]

### Implementation Notes
[Any API gotchas, specific patterns to follow, related libraries]

### Deadline Suggestion
[If time-sensitive: e.g., "Spring AI 1.1 drops next week — contribute before release"]
```

ENG reads this brief and implements the highest-priority item first.

---

## Metrics & Logging

All factory activity is logged to `workspace/projects/pr-log.md`:

```markdown
| Date | Path | Repo | PR | Description | Stream |
|---|---|---|---|---|---|
| 2026-04-05 | Issue Watcher | decolua/9router | #493 | fix: optional API key for ollama | B |
| 2026-04-05 | OSS Discovery | org/repo | #12 | feat: add streaming support | A |
| 2026-04-05 | On-Demand (RED) | org/repo | #5 | fix: auth middleware | B |
```

---

## Error Recovery

| Error | Recovery |
|---|---|
| ENG build fails | Read error, fix, retry max 3x |
| PR creation blocked | Verify `--no-edit` flag present, check branch pushed |
| RESEARCH finds no good repos | Lower star threshold to 3k, widen search to "recently trending" |
| sessions_spawn to ENG fails | Write task to `workspace/AUTONOMOUS.md` as PENDING[ENG] |
| RED can't reach ENG via A2A | Write to `workspace-main/inbox/tasks.md` — ENG reads on next heartbeat |
