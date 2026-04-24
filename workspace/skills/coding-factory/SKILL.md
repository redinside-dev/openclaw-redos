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

## HARD RULE — spring-projects/spring-ai is PERMANENTLY BLOCKED

**NEVER create a PR, push a branch, fork, comment, or review on `spring-projects/spring-ai`.**

Background: maintainer sdeleuze issued an explicit warning on 2026-04-23 that the account would be blocked for submitting unreviewed AI-generated code. All 20 PRs were closed. This repo requires manual operator unblock before any contribution can resume.

Check `workspace/repo-pause-rules.json` BEFORE touching any repo. `spring-projects/spring-ai` has `requiresManualUnblock: true`.

---

## HARD RULE — Quality over Quantity (ALL repos)

**One solid PR that gets merged is worth more than 20 rejected ones.**

Before opening ANY PR on ANY repo:
1. Check `workspace/repo-pause-rules.json` — if paused, STOP.
2. Run `git diff upstream/<base>...HEAD --stat` — if unrelated files appear, STOP and fix the base.
3. Read 2-3 similar files in the repo to understand the code style. Match it exactly.
4. The fix must be yours to stand behind. No AI boilerplate. No verbose javadocs. No extra abstractions.
5. PR body: 2-3 sentences. What broke, what changed, issue link. Nothing else.
6. If in doubt whether the fix is good enough — do NOT open the PR.

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

## HARD RULE — Contributor Standard (25-year experienced developer)

Every contribution must read as if written by a senior engineer who has been contributing to this exact codebase for years. Maintainers can tell within seconds whether a PR was bulk-generated. Reputation takes years to build and minutes to destroy.

**The internal bar before any PR:** "Would I be proud to have my name on this forever in the git log?"

---

## HARD RULE — Fork Hygiene (ROOT CAUSE of all contaminated PRs)

**Every new branch MUST be created directly from the upstream tip. Never from a local stale state.**

```bash
# ALWAYS — before creating any branch:
git fetch upstream
git checkout -b fix/issue-NNN-slug upstream/<base-branch>
# (NOT: git checkout -b fix/... — this branches from local HEAD which may be stale)
```

After any commit, verify immediately:
```bash
git diff upstream/<base-branch>...HEAD --stat
```
- If ANY file appears that you did not write — STOP. The branch is contaminated.
- Fix: `git reset --hard upstream/<base-branch>` then re-apply your change cleanly.
- A contaminated diff means ALL work on that branch must be discarded and restarted clean.

**Never reuse a branch across issues. One issue = one fresh branch from upstream tip.**

---

## HARD RULE — Pre-PR Quality Gate (ALL gates must pass)

**NEVER open a PR without passing every gate below. A rejected PR is worse than no PR.**

### Gate 1 — Issue selection (before writing a single line)
- Read the issue thoroughly. If the fix is not clear to you after reading — skip it and pick another.
- Read the files that need to change. Understand the existing pattern before touching anything.
- Check if another PR already addresses this issue: `gh pr list --repo <owner>/<repo> --search "issue #N"`
- Prefer issues where you have genuine understanding, not just "good first issue" labels.
- Do NOT pick issues that require touching 3+ modules unless you fully understand all of them.

### Gate 2 — Diff sanity (NON-NEGOTIABLE)
```bash
git diff upstream/<base-branch>...HEAD --stat
```
- Must show ONLY the files you intentionally edited.
- If `.editorconfig`, `.github/`, `.mvn/`, unrelated `pom.xml`, guardrail files, MCP files, or ANY file from a different module appears — STOP. Do not open the PR. Fix the base.

### Gate 3 — Code review (internal, before every PR)
Read your own diff as if you are a maintainer seeing it for the first time. Ask:
- Does this match the patterns used 3 files away in the same package?
- Is every import actually used? Are there any dead methods?
- Is the test meaningful — does it actually verify the bug is fixed?
- Would a senior engineer call this "obvious"? If not, simplify until it is.
- Is there a single unnecessary line? Remove it.

### Gate 4 — Build and test locally (no exceptions)
```bash
mvn verify -pl <affected-module> -am -q 2>&1 | tail -20   # Java
npm run build && npm test                                   # TypeScript
pytest -x -q                                               # Python
swift build && swift test                                  # Swift
```
If tests fail — fix before proceeding. Never open a PR with a broken build.

### Gate 5 — PR body (one short paragraph, no more)
```
Fixes #N.

<One sentence: what was broken and why.>
<One sentence: what was changed — name the specific class/method/function.>
<Optional: why this approach over alternatives, if not obvious.>
```
NO headers. NO bullet lists. NO tables. NO "This PR was created by...". No mention of AI.
The PR body should read exactly like a PR from a developer who understands the code and respects the maintainer's time.

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

No matter which path triggers ENG, the output MUST meet the standard of an experienced open-source contributor:

| Requirement | Standard |
|---|---|
| Codebase study | Read the module, understand the pattern, match it exactly before writing a single line |
| Implementation | Complete, production-ready — no `// TODO`, no stubs, no placeholder comments |
| Scope | ONLY the files the fix requires. If you touched a file for any reason other than the stated fix, remove it. |
| Tests | Meaningful assertions that verify the bug is actually fixed — not just coverage padding |
| Build | `mvn verify -pl <module> -am` / `npm run build && npm test` / `pytest -x` — must pass locally |
| Branch | Always created from `upstream/<base>` tip: `git checkout -b <branch> upstream/<base>` |
| Diff check | `git diff upstream/<base>...HEAD --stat` — must show ONLY intended files. Stop if contaminated. |
| Commit | `git commit -s` — single commit, concise message, signoff always |
| PR body | One paragraph: what broke, what changed, nothing else. No AI language. No bullet lists. |
| PR title | Conventional commit format: `fix: <verb> <what> (<closes #N>)` |
| Log | Append to `workspace/projects/pr-log.md` |
| Monitor | Check back within 24h — respond to any maintainer comment same day |

**Frequency:** Max 2-3 PRs per week across all repos combined. Quality over volume. A maintainer who sees 5 PRs from the same person in one day starts ignoring them.

**Stack routing:**
| Language | Build command | Test command |
|---|---|---|
| Java | `mvn verify -pl <module> -am -q` | JUnit 5 (`mvn test -pl <module>`) |
| TypeScript/JS | `npm run build` | `npm test` or `npx vitest run` |
| Python | `pip install -e . -q && pytest -x -q` | pytest |
| Swift | `swift build` | `swift test` |

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
