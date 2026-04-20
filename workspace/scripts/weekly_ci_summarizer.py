#!/usr/bin/env python3
"""Weekly summarizer for continuous-improvement logs.

Reads workspace/ops/ci/ci-log.jsonl and rolls the last 7 days into:
- workspace/ops/ci/WEEKLY-SUMMARY.md
- an appended LEARNING entry in workspace/ops/LEARNINGS.md

Usage:
  python3 workspace/scripts/weekly_ci_summarizer.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path("/Users/redinside/.openclaw")
OPS_DIR = REPO_ROOT / "workspace" / "ops"
CI_LOG = OPS_DIR / "ci" / "ci-log.jsonl"
WEEKLY_MD = OPS_DIR / "ci" / "WEEKLY-SUMMARY.md"
LEARNINGS_MD = OPS_DIR / "LEARNINGS.md"


def iso_now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_jsonl(path: Path) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except Exception:
            continue
    return out


def find_next_learning_id(learnings_text: str, today: datetime) -> str:
    ymd = today.strftime("%Y%m%d")
    ids = re.findall(r"###\s+LEARNING-(\d{8})-(\d{3})", learnings_text)
    seqs = [int(seq) for (d, seq) in ids if d == ymd]
    n = (max(seqs) + 1) if seqs else 1
    return f"LEARNING-{ymd}-{n:03d}"


def append_to_file(path: Path, text: str, dry_run: bool) -> None:
    if dry_run:
        return
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return
    existing = path.read_text(encoding="utf-8")
    if not existing.endswith("\n"):
        existing += "\n"
    path.write_text(existing + text, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=7)

    events = parse_jsonl(CI_LOG)
    week_events = [e for e in events if _parse_dt(e.get("timestamp")) and _parse_dt(e.get("timestamp")) >= cutoff]

    if not week_events:
        print("NO_REPLY")
        return 0

    ok = sum(1 for e in week_events if e.get("success") is True)
    fail = len(week_events) - ok

    by_job = Counter(e.get("jobId") for e in week_events)
    top_jobs = [j for j, _ in by_job.most_common(5) if j]

    rc_counter = Counter((e.get("rootCause") or "Unknown") for e in week_events if not e.get("success"))
    top_rc = rc_counter.most_common(5)

    improvements = []
    for e in week_events:
        for imp in (e.get("nextImprovements") or []):
            if imp and imp not in improvements:
                improvements.append(imp)
        if len(improvements) >= 6:
            break

    # Write WEEKLY-SUMMARY.md (overwrite)
    summary_md = """# Weekly Continuous Improvement Summary

- **Generated:** {generated}
- **Window:** last 7 days (UTC)

## Activity
- Total events: {total}
- Success: {ok}
- Failures: {fail}

## Top active jobs
{top_jobs_section}

## Top failure root causes
{top_rc_section}

## Suggested next improvements (deduped)
{improvements_section}
""".format(
        generated=iso_now_utc(),
        total=len(week_events),
        ok=ok,
        fail=fail,
        top_jobs_section="\n".join([f"- {j} ({by_job[j]} runs)" for j in top_jobs]) or "- (none)",
        top_rc_section="\n".join([f"- {rc} ({n})" for rc, n in top_rc]) or "- (none)",
        improvements_section="\n".join([f"- {i}" for i in improvements[:6]]) or "- (none)",
    )

    if args.dry_run:
        print("DRY_RUN: would update WEEKLY-SUMMARY.md and append LEARNING")
        print(summary_md[:1400])
        return 0

    WEEKLY_MD.parent.mkdir(parents=True, exist_ok=True)
    WEEKLY_MD.write_text(summary_md, encoding="utf-8")

    # Append to LEARNINGS.md as an observation learning
    learnings_text = LEARNINGS_MD.read_text(encoding="utf-8") if LEARNINGS_MD.exists() else "# LEARNINGS\n\n## Learnings\n"
    learning_id = find_next_learning_id(learnings_text, now)

    learning_entry = (
        f"\n### {learning_id}\n"
        f"- **Date:** {iso_now_utc()}\n"
        f"- **Source Ticket:** observation (weekly CI rollup)\n"
        f"- **Agent:** OPS\n"
        f"- **Category:** workflow\n"
        f"- **Summary:** Weekly CI rollup: {ok} ok / {fail} failed events; top root causes captured\n"
        f"- **Details:** Generated from `workspace/ops/ci/ci-log.jsonl`. Top root causes: "
        + "; ".join([f"{rc} ({n})" for rc, n in top_rc])
        + "\n"
        f"- **Prevention:** Apply the top 1–2 improvements below and add targeted regression checks for recurring failures\n"
        f"- **Applied To:** workspace/ops/ci/WEEKLY-SUMMARY.md + this entry\n"
        f"\n**Next improvements (priority):**\n"
        + "\n".join([f"- {i}" for i in improvements[:4]])
        + "\n"
    )

    append_to_file(LEARNINGS_MD, learning_entry, dry_run=False)

    print("CI_WEEKLY_SUMMARY_WRITTEN")
    return 0


def _parse_dt(s: Any) -> Optional[datetime]:
    if not isinstance(s, str) or not s:
        return None
    try:
        # Ensure timezone aware
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


if __name__ == "__main__":
    raise SystemExit(main())
