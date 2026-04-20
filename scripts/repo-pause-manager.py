#!/usr/bin/env python3
"""
repo-pause-manager.py — Manage repo pause/resume rules via CLI or agent exec.

Commands:
  pause  <owner/repo> <days> [reason]   — pause for N days (or "forever")
  resume <owner/repo>                   — immediately resume
  status                                — list all active pauses
  check  <owner/repo>                   — exit 0=allowed, 1=blocked

Usage examples (from agent/cron exec):
  python3 ~/.openclaw/scripts/repo-pause-manager.py pause decolua/9router 5 "owner requested"
  python3 ~/.openclaw/scripts/repo-pause-manager.py resume decolua/9router
  python3 ~/.openclaw/scripts/repo-pause-manager.py status
  python3 ~/.openclaw/scripts/repo-pause-manager.py check decolua/9router
  python3 ~/.openclaw/scripts/repo-pause-manager.py check decolua/9router --quiet
  python3 ~/.openclaw/scripts/repo-pause-manager.py sweep   — auto-expire and notify
"""
import sys
import json
import os
from datetime import date, timedelta

RULES_PATH = os.path.expanduser("~/.openclaw/workspace/repo-pause-rules.json")


def load():
    try:
        return json.load(open(RULES_PATH))
    except Exception:
        return {"pauses": {}}


def save(d):
    json.dump(d, open(RULES_PATH, "w"), indent=2)


def normalize(repo):
    """Match repo by short name too: '9router' matches 'decolua/9router'"""
    return repo.strip().lower()


def find_pause(d, repo):
    repo = normalize(repo)
    short = repo.split("/")[-1]
    for k, v in d.get("pauses", {}).items():
        if k.lower() == repo or k.lower().split("/")[-1] == short:
            return k, v
    return None, None


def cmd_pause(repo, days, reason="paused by operator"):
    d = load()
    if "pauses" not in d:
        d["pauses"] = {}

    today = date.today()
    if str(days).lower() == "forever":
        resume_after = "9999-12-31"
        summary = "indefinitely"
    else:
        try:
            n = int(days)
        except ValueError:
            print(f"ERROR: days must be a number or 'forever', got: {days}")
            sys.exit(2)
        resume_after = (today + timedelta(days=n)).isoformat()
        summary = f"for {n} days (until {resume_after})"

    # Resolve full repo name: if short name given, keep existing full name or use as-is
    existing_key, _ = find_pause(d, repo)
    key = existing_key if existing_key else repo

    d["pauses"][key] = {
        "paused": True,
        "reason": reason,
        "pausedAt": today.isoformat(),
        "resumeAfter": resume_after,
        "pausedBy": "operator"
    }
    save(d)
    print(f"PAUSED: {key} {summary}. Reason: {reason}")
    return f"✅ {key} paused {summary}.\nReason: {reason}\nAuto-resumes: {resume_after}"


def cmd_resume(repo):
    d = load()
    key, config = find_pause(d, repo)
    if not key:
        print(f"NOT FOUND: no pause rule for '{repo}'")
        return f"ℹ️ No active pause found for '{repo}' — already running."
    config["paused"] = False
    config["resumedAt"] = date.today().isoformat()
    config["resumedBy"] = "operator"
    save(d)
    print(f"RESUMED: {key}")
    return f"✅ {key} resumed immediately."


def cmd_status():
    d = load()
    pauses = d.get("pauses", {})
    today = date.today()
    lines = []
    active = []
    for repo, cfg in pauses.items():
        if not cfg.get("paused"):
            continue
        resume = cfg.get("resumeAfter", "?")
        try:
            resume_date = date.fromisoformat(resume)
            if resume_date <= today:
                expired = " (EXPIRED — will auto-clear on next check)"
            else:
                days_left = (resume_date - today).days
                expired = f" ({days_left}d remaining)"
        except Exception:
            expired = ""
        line = f"• {repo}: paused until {resume}{expired} — {cfg.get('reason','')}"
        active.append(line)
    if not active:
        return "✅ No repos currently paused. All coding factory activity is running."
    return "⏸️ Active pauses:\n" + "\n".join(active)


def cmd_check(repo, quiet=False):
    d = load()
    key, config = find_pause(d, repo)
    if not key or not config.get("paused"):
        if not quiet:
            print(f"ALLOWED: {repo} — no active pause")
        sys.exit(0)
    today = date.today()
    resume = config.get("resumeAfter", "9999-12-31")
    try:
        resume_date = date.fromisoformat(resume)
        if resume_date <= today:
            # Auto-expire
            config["paused"] = False
            config["autoResumedAt"] = today.isoformat()
            save(d)
            if not quiet:
                print(f"ALLOWED: {key} pause expired ({resume}) — auto-cleared")
            sys.exit(0)
    except Exception:
        pass
    reason = config.get("reason", "")
    if not quiet:
        print(f"BLOCKED: {key} is paused until {resume}. {reason}")
        print(f"Do NOT create any PR, branch, or commit to this repo until {resume}.")
    sys.exit(1)


def cmd_sweep():
    """Check all pauses, auto-expire, return notification lines for expired ones."""
    d = load()
    today = date.today()
    expired = []
    for repo, cfg in d.get("pauses", {}).items():
        if not cfg.get("paused"):
            continue
        resume = cfg.get("resumeAfter", "9999-12-31")
        try:
            if date.fromisoformat(resume) <= today:
                cfg["paused"] = False
                cfg["autoResumedAt"] = today.isoformat()
                expired.append(repo)
        except Exception:
            pass
    if expired:
        save(d)
        for r in expired:
            print(f"AUTO-RESUMED: {r}")
        return f"✅ Auto-resumed: {', '.join(expired)}"
    return ""


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    cmd = args[0].lower()

    if cmd == "pause":
        if len(args) < 3:
            print("Usage: pause <owner/repo> <days|forever> [reason]")
            sys.exit(2)
        reason = " ".join(args[3:]) if len(args) > 3 else "paused by operator"
        msg = cmd_pause(args[1], args[2], reason)
        print(msg)

    elif cmd == "resume":
        if len(args) < 2:
            print("Usage: resume <owner/repo>")
            sys.exit(2)
        msg = cmd_resume(args[1])
        print(msg)

    elif cmd == "status":
        print(cmd_status())

    elif cmd == "check":
        if len(args) < 2:
            print("Usage: check <owner/repo> [--quiet]")
            sys.exit(2)
        quiet = "--quiet" in args
        cmd_check(args[1], quiet)

    elif cmd == "sweep":
        result = cmd_sweep()
        if result:
            print(result)

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(2)
