#!/usr/bin/env python3
"""Lint for legacy Slack/Message schema patterns.

Why:
- OpenClaw runtime uses message(action="send", channel="slack", target="channel:<id>")
- Legacy patterns (sendMessage/to/readMessages) still show up in prompts/templates and
  can cause agents to "think" they posted without making a real tool call.

This linter is intentionally simple/fast and is safe to run in CI.

Exit codes:
- 0: clean
- 1: violations found
- 2: unexpected error
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path


LEGACY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "legacy_action_sendMessage",
        re.compile(r"\bsendMessage\b|\bslack\.sendMessage\b|action\s*[:=]\s*\"sendMessage\"", re.I),
    ),
    (
        "legacy_field_to_channel",
        re.compile(r"\bto\s*[:=]\s*\"?channel:[A-Z0-9]+\"?", re.I),
    ),
    (
        "legacy_action_readMessages",
        re.compile(r"\breadMessages\b|action\s*[:=]\s*\"readMessages\"", re.I),
    ),
    # Common legacy prompt snippet: to="channel:..." without explicit key name in JSON-ish text
    (
        "legacy_prompt_to_channel",
        re.compile(r"to=\"channel:[A-Z0-9]+\"", re.I),
    ),
]

# Files we *do* want to scan. Keep this small to avoid noise.
DEFAULT_SCAN_GLOBS = [
    "SOUL.md",
    "AGENTS.md",
    "ORG.md",
    "**/*.prompt",
    "**/*.md",
    "**/*.txt",
    "**/*.json",
]

DEFAULT_EXCLUDE_DIRS = {
    "logs",
    ".openclaw",
    ".clawhub",
    ".pi",
    "node_modules",
    "sandboxes",
    "subagents",
}

# Docs that intentionally discuss legacy schema. Keep these out of the strict lint.
DEFAULT_EXCLUDE_FILES = {
    "ops/LEARNINGS.md",
    "ops/TICKET-TRACKER.md",
    "ops/STANDUP-LOG.md",
}


@dataclass(frozen=True)
class Finding:
    path: Path
    line_no: int
    kind: str
    line: str


def iter_files(root: Path, globs: list[str]) -> list[Path]:
    files: set[Path] = set()
    for g in globs:
        for p in root.glob(g):
            if p.is_file():
                files.add(p)
    return sorted(files)


def is_excluded(path: Path, root: Path, exclude_dirs: set[str], exclude_files: set[str]) -> bool:
    rel = path.relative_to(root).as_posix()
    if rel in exclude_files:
        return True
    parts = set(path.relative_to(root).parts)
    if parts.intersection(exclude_dirs):
        return True
    return False


def scan_file(path: Path, *, root: Path) -> list[Finding]:
    findings: list[Finding] = []
    try:
        text = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except Exception as e:
        # Treat unreadable file as non-fatal; report as a finding
        findings.append(Finding(path=path, line_no=0, kind="unreadable_file", line=str(e)))
        return findings

    for i, line in enumerate(text, start=1):
        for kind, rx in LEGACY_PATTERNS:
            if rx.search(line):
                findings.append(Finding(path=path, line_no=i, kind=kind, line=line.rstrip("\n")))
    return findings


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--workspace",
        default=os.path.expanduser("~/.openclaw/workspace"),
        help="Workspace root to scan (default: ~/.openclaw/workspace)",
    )
    ap.add_argument(
        "--cron",
        default=os.path.expanduser("~/.openclaw/cron/jobs.json"),
        help="Cron jobs.json path to scan (default: ~/.openclaw/cron/jobs.json)",
    )
    ap.add_argument(
        "--strict",
        action="store_true",
        help="If set, fail on unreadable files too.",
    )
    args = ap.parse_args()

    workspace = Path(args.workspace).resolve()
    cron = Path(args.cron).resolve()

    findings: list[Finding] = []

    # 1) Always scan cron/jobs.json (most important)
    if cron.exists() and cron.is_file():
        findings.extend(scan_file(cron, root=cron.parent))
    else:
        findings.append(Finding(path=cron, line_no=0, kind="missing_cron_jobs_json", line="File not found"))

    # 2) Scan selected workspace text files (excluding noisy dirs)
    if workspace.exists() and workspace.is_dir():
        for p in iter_files(workspace, DEFAULT_SCAN_GLOBS):
            if is_excluded(p, workspace, DEFAULT_EXCLUDE_DIRS, DEFAULT_EXCLUDE_FILES):
                continue
            findings.extend(scan_file(p, root=workspace))
    else:
        findings.append(Finding(path=workspace, line_no=0, kind="missing_workspace", line="Workspace dir not found"))

    # Filter unreadable unless strict
    if not args.strict:
        findings = [f for f in findings if f.kind != "unreadable_file"]

    if not findings:
        return 0

    out = sys.stdout
    print("\n[lint_slack_schema] Legacy Slack schema violations found:\n", file=out)
    for f in findings:
        # Make paths readable
        try:
            display = str(f.path)
        except Exception:
            display = repr(f.path)
        if f.line_no:
            print(f"- {display}:{f.line_no}  {f.kind}\n    {f.line}", file=out)
        else:
            print(f"- {display}  {f.kind}\n    {f.line}", file=out)

    print(
        "\nExpected Slack send schema:\n"
        "  message(action=\"send\", channel=\"slack\", target=\"channel:<id>\", message=\"...\")\n"
        "(Avoid legacy sendMessage/to/readMessages.)\n",
        file=out,
    )
    return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception as e:
        print(f"[lint_slack_schema] ERROR: {e}", file=sys.stderr)
        raise SystemExit(2)
