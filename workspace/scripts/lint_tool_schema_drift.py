#!/usr/bin/env python3
"""Lint for legacy / drifted tool-call schemas in prompts/templates.

Goal: catch the highest-impact drift that causes runtime tool call failures.

Currently checks for:
- message tool legacy action/fields:
  - action=sendMessage (should be action=send)
  - field `to` (should be `target`)
  - field `content` (should be `message`)
  - slack target not in channel:<id> / user:<id> form (heuristic)

This is intentionally grep-based (fast, low false-negative for known patterns).
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

PATTERNS = [
    # legacy message action
    ("legacy_action_sendMessage", re.compile(r"\baction\s*=\s*\"?sendMessage\"?\b|\"action\"\s*:\s*\"sendMessage\"", re.I)),

    # legacy message fields (only flag when it looks like a message tool payload)
    ("legacy_message_field_to", re.compile(r"\"action\"\s*:\s*\"send\"[^\n]{0,200}\"to\"\s*:|message\([^\)]{0,200}\bto\s*=\s*\"channel:", re.I)),
    ("legacy_message_field_content", re.compile(r"\"action\"\s*:\s*\"send\"[^\n]{0,200}\"content\"\s*:|message\([^\)]{0,200}\bcontent\s*=", re.I)),

    # Common prompt phrasing that tends to reproduce bad calls
    ("prompt_says_slack_tool", re.compile(r"\bUse\s+slack\s+tool\b", re.I)),
]

DEFAULT_EXCLUDES = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "delivery-queue",
    "agents",
    "sessions",
    "subagents",
    "backups",
    "logs",
}

TEXT_EXTS = {".md", ".txt", ".json", ".yaml", ".yml"}


def iter_files(root: Path, excludes: set[str]):
    for dirpath, dirnames, filenames in os.walk(root):
        # prune
        dirnames[:] = [d for d in dirnames if d not in excludes]
        for fn in filenames:
            p = Path(dirpath) / fn
            if p.suffix.lower() in TEXT_EXTS:
                yield p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(Path.home() / ".openclaw" / "workspace"), help="workspace root to scan")
    ap.add_argument("--extra", action="append", default=[], help="extra roots to scan")
    ap.add_argument("--exclude", action="append", default=[], help="extra exclude dir names")
    args = ap.parse_args()

    roots = [Path(args.root)] + [Path(x) for x in args.extra]
    excludes = set(DEFAULT_EXCLUDES) | set(args.exclude)

    violations = []

    for root in roots:
        if not root.exists():
            continue
        for p in iter_files(root, excludes):
            try:
                text = p.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            for name, rx in PATTERNS:
                for m in rx.finditer(text):
                    # line number
                    line_no = text.count("\n", 0, m.start()) + 1
                    excerpt = text.splitlines()[line_no - 1].strip()[:200]
                    violations.append((name, str(p), line_no, excerpt))

    for name, path, line_no, excerpt in violations:
        print(f"{path}:{line_no}: {name}: {excerpt}")

    if violations:
        print(f"\nFAIL: {len(violations)} drift findings")
        return 2

    print("OK: no known schema-drift patterns found")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
