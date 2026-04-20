#!/usr/bin/env python3
"""Block commits that add/modify local-only sensitive files.

Hard rule: no secrets in openclaw.json or any backups should ever enter git.
This hook fails the commit if any staged path matches a forbidden pattern.

Why this exists even though .gitignore covers many of these:
- .gitignore is not retroactive; files can still be force-added.
- CI should block too.

This hook is intentionally strict.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


FORBIDDEN_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("openclaw.json", re.compile(r"^openclaw\.json$")),
    ("openclaw.json backups", re.compile(r"^openclaw\.json\.(bak|backup).*$")),
    ("dot-env", re.compile(r"^\.env(\..*)?$")),
    ("exec approvals", re.compile(r"^exec-approvals\.json(\..*)?$")),
    ("device identity", re.compile(r"^identity/(device-auth|device)\.json$")),
    ("proxy accounts", re.compile(r"^config/proxy-accounts\.json$")),
]


def main(argv: list[str]) -> int:
    # pre-commit passes staged filenames.
    paths = [p.strip() for p in argv[1:] if p.strip()]
    bad: list[tuple[str, str]] = []

    for p in paths:
        # Normalize to posix style for matching.
        pp = Path(p).as_posix()
        for label, rx in FORBIDDEN_PATTERNS:
            if rx.search(pp):
                bad.append((pp, label))

    if bad:
        print("[forbid-sensitive-files] BLOCKED: refusing to commit sensitive local-only files:\n")
        for pp, label in bad:
            print(f" - {pp}  ({label})")
        print(
            "\nRemediation:\n"
            "  1) Remove the file from the commit: git restore --staged <path>\n"
            "  2) Ensure secrets live in .env / secrets/ / credentials/ (untracked),\n"
            "     or use your secret manager / GitHub Actions secrets for CI.\n"
            "  3) If this was already committed, rotate the credential and purge it\n"
            "     from history (see docs/SECRET-INCIDENT-RESPONSE.md).\n"
        )
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
