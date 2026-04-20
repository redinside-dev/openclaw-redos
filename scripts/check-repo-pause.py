#!/usr/bin/env python3
"""
check-repo-pause.py <owner/repo>

Hard pause check — call this before ANY gh pr create, git push, or fork.
Exit 0 = allowed. Exit 1 = BLOCKED (prints reason).

Usage in cron payload:
  exec: python3 ~/.openclaw/scripts/check-repo-pause.py decolua/9router
  If exit code is 1, STOP. Do not proceed with PR creation.
"""
import sys
import json
from datetime import date

if len(sys.argv) < 2:
    print("Usage: check-repo-pause.py <owner/repo>")
    sys.exit(0)

repo = sys.argv[1].lower().strip()

rules_path = "/Users/redinside/.openclaw/workspace/repo-pause-rules.json"
try:
    rules = json.load(open(rules_path))
except Exception as e:
    # If file missing, allow (fail open)
    sys.exit(0)

pauses = rules.get("pauses", {})

# Check exact match and also fork match (anuragg-saxenaa/9router → decolua/9router)
repo_short = repo.split("/")[-1] if "/" in repo else repo

for paused_repo, config in pauses.items():
    if not config.get("paused"):
        continue
    paused_short = paused_repo.split("/")[-1]
    if repo == paused_repo.lower() or repo_short == paused_short:
        # Check if pause has expired
        resume_after = config.get("resumeAfter", "9999-12-31")
        try:
            resume_date = date.fromisoformat(resume_after)
            if date.today() >= resume_date:
                # Expired — auto-clear
                print(f"PAUSE EXPIRED for {paused_repo} (resumeAfter={resume_after}) — allowing")
                # Auto-remove from rules
                try:
                    config["paused"] = False
                    json.dump(rules, open(rules_path, "w"), indent=2)
                except:
                    pass
                sys.exit(0)
        except ValueError:
            pass
        reason = config.get("reason", "No reason given")
        print(f"BLOCKED: {paused_repo} is paused until {resume_after}. Reason: {reason}")
        print(f"Do NOT create any PR, branch, or commit to this repo until {resume_after}.")
        sys.exit(1)

sys.exit(0)
