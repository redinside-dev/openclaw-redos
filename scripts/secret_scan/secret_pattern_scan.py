#!/usr/bin/env python3
"""Fast staged-file regex secret scanner.

This is a lightweight complement to gitleaks:
- Runs quickly on staged text-ish files
- Enforces org-specific patterns
- Keeps output simple and actionable

It scans provided filenames (from pre-commit) by reading the *working tree*
content. This is good enough for our hygiene use-case; gitleaks covers deeper
history/staged object scanning.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


# Patterns requested by task + a few high-signal additions.
PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("slack_bot_token", re.compile(r"xoxb-[0-9A-Za-z-]{10,}")),
    ("openai_style_key", re.compile(r"\bsk-[0-9A-Za-z]{20,}\b")),
    # Telegram: <bot_id>:<token>
    ("telegram_bot_token", re.compile(r"\b[0-9]{6,12}:[A-Za-z0-9_-]{30,}\b")),
    # GitHub classic PAT
    ("github_pat", re.compile(r"\bghp_[0-9A-Za-z]{20,}\b")),
    # AWS access key id
    ("aws_access_key_id", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
]

BINARY_EXTS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".pdf",
    ".zip",
    ".gz",
    ".tgz",
    ".bz2",
    ".7z",
    ".dmg",
    ".pkg",
    ".sqlite",
    ".bin",
}


def is_probably_text(path: Path) -> bool:
    if path.suffix.lower() in BINARY_EXTS:
        return False
    try:
        data = path.read_bytes()
    except Exception:
        return False
    # Heuristic: reject NUL bytes
    return b"\x00" not in data[:4096]


def main(argv: list[str]) -> int:
    files = [Path(p) for p in argv[1:] if p.strip()]
    matches: list[tuple[str, str]] = []  # (file, pattern_id)

    for f in files:
        if not f.exists() or not f.is_file():
            continue
        if not is_probably_text(f):
            continue

        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for pid, rx in PATTERNS:
            if rx.search(text):
                matches.append((f.as_posix(), pid))

    if matches:
        print("[secret-pattern-scan] FAIL: potential secrets detected (by regex).\n")
        for fn, pid in sorted(set(matches)):
            print(f" - {fn}: {pid}")
        print(
            "\nNext steps:\n"
            "  • Remove/redact the secret before committing.\n"
            "  • If already exposed anywhere: rotate the credential immediately.\n"
            "  • Prefer env vars / local secrets files (untracked) / Actions secrets.\n"
        )
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
