# pr-auto-reviewer — Spec

## Problem
Developers need fast AI code review on PRs without paying $100+/mo for services.

## Solution
CLI tool that fetches a GitHub PR diff, sends it to an LLM, and posts a review comment.

## Stack
Python, `requests`, GitHub API, OpenAI-compatible API

## Files to create (5 total)
1. `pr_reviewer.py` — main CLI: fetch diff, call LLM, post comment
2. `config.py` — load env vars (GITHUB_TOKEN, OPENROUTER_API_KEY)
3. `github_client.py` — get PR diff, post comment to PR
4. `llm_client.py` — call LLM with diff, return review text
5. `README.md` — usage in 2 steps

## Core logic (pseudocode, 20 lines)
```python
def review_pr(repo, pr_number):
    diff = github.get_pr_diff(repo, pr_number)  # GET /repos/{repo}/pulls/{n}
    prompt = f"Review this PR diff:\n{diff[:8000]}\nList bugs, improvements, and positives."
    review = llm.complete(prompt)               # openai-compatible POST
    github.post_comment(repo, pr_number, review) # POST /repos/{repo}/issues/{n}/comments
    print(f"Review posted to PR #{pr_number}")

# Usage: python pr_reviewer.py owner/repo 42
```

## Done criteria
- `python pr_reviewer.py owner/repo 1` posts a real GitHub comment
- README has 2-step setup (set 2 env vars, run command)
