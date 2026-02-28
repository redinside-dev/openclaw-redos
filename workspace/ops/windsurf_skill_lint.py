#!/usr/bin/env python3
"""Lint Windsurf SKILL.md metadata for repo-local skill packs.

Default root checked in CI: .windsurf/skills
Required SKILL.md frontmatter fields: name, description
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

REQUIRED_FIELDS = ("name", "description")
FRONTMATTER_SEP = "---"
KV_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*?)\s*$")


def _strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and ((value[0] == '"' and value[-1] == '"') or (value[0] == "'" and value[-1] == "'")):
        return value[1:-1].strip()
    return value


def parse_frontmatter(skill_md: Path) -> tuple[dict[str, str], list[str]]:
    text = skill_md.read_text(encoding="utf-8")
    lines = text.splitlines()
    errors: list[str] = []
    if not lines or lines[0].strip() != FRONTMATTER_SEP:
        return {}, [f"{skill_md}: missing YAML frontmatter opening '---'"]

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == FRONTMATTER_SEP:
            end_idx = i
            break
    if end_idx is None:
        return {}, [f"{skill_md}: missing YAML frontmatter closing '---'"]

    data: dict[str, str] = {}
    for i, raw in enumerate(lines[1:end_idx], start=2):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = KV_RE.match(line)
        if not m:
            errors.append(f"{skill_md}:{i}: invalid frontmatter line '{raw}'")
            continue
        key, value = m.group(1), _strip_quotes(m.group(2))
        data[key] = value
    return data, errors


def lint_roots(roots: list[Path]) -> dict[str, Any]:
    errors: list[str] = []
    checked_skills = 0
    found_roots: list[str] = []

    for root in roots:
        if not root.exists() or not root.is_dir():
            continue
        found_roots.append(str(root))
        for entry in sorted(root.iterdir()):
            if not entry.is_dir():
                continue
            checked_skills += 1
            skill_md = entry / "SKILL.md"
            if not skill_md.exists():
                errors.append(f"{entry}: missing SKILL.md")
                continue
            fm, fm_errors = parse_frontmatter(skill_md)
            errors.extend(fm_errors)
            for required in REQUIRED_FIELDS:
                if not fm.get(required, "").strip():
                    errors.append(f"{skill_md}: missing required frontmatter field '{required}'")

    return {
        "roots": [str(r) for r in roots],
        "found_roots": found_roots,
        "checked_skills": checked_skills,
        "error_count": len(errors),
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Lint Windsurf SKILL.md metadata schema")
    parser.add_argument("--root", action="append", default=[".windsurf/skills"], help="Skill root directory (repeatable)")
    parser.add_argument("--json", action="store_true", help="Emit JSON report")
    parser.add_argument("--strict-no-skills", action="store_true", help="Fail when no skill dirs are found")
    args = parser.parse_args()

    roots = [Path(r) for r in args.root]
    report = lint_roots(roots)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        if report["checked_skills"] == 0:
            print("windsurf-skill-lint: no skills found under configured roots")
        else:
            print(
                f"windsurf-skill-lint: checked={report['checked_skills']} errors={report['error_count']}"
            )
        for err in report["errors"]:
            print(f"ERROR: {err}")

    if args.strict_no_skills and report["checked_skills"] == 0:
        return 2
    return 1 if report["error_count"] > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
