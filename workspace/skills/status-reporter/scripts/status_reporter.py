#!/usr/bin/env python3

"""Status Reporter for OpenClaw workspace trackers.

Modes:
- today: only today's highlights
- week: week rollup
- full: (C) today + week + next/blocked + cron snapshot

This script is intentionally stdlib-only.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


WORKSPACE = Path("/Users/redinside/.openclaw/workspace")
TRACKERS = {
    "red_daily": WORKSPACE / "DAILY_TASKS.md",
    "zen_daily": WORKSPACE / "ZEN_DAILY_TASKS.md",
    "combined": WORKSPACE / "COMBINED_TASK_TRACKER.md",
    "weekly": WORKSPACE / "WEEKLY_SUMMARY.md",
}
CRON_JOBS = Path(os.path.expanduser("~/.openclaw/cron/jobs.json"))

DEFAULT_OUT_DIR = WORKSPACE / "status"


@dataclass(frozen=True)
class CronJob:
    job_id: str
    name: str
    enabled: bool
    schedule: str
    tz: str


def read_text(p: Path) -> str:
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8", errors="replace")


def today_iso() -> str:
    return dt.date.today().isoformat()


def monday_of_week(d: dt.date) -> dt.date:
    return d - dt.timedelta(days=d.weekday())


def extract_section(md: str, header: str) -> str:
    """Extract a markdown section by exact header line (e.g., '## Done')."""
    if not md:
        return ""
    # Header can be '#', '##', etc. We'll match the exact header text.
    pat = re.compile(rf"^(#+)\s+{re.escape(header.strip('# ').strip())}\s*$", re.M)
    m = pat.search(md)
    if not m:
        return ""
    start = m.start()
    # find next header of same or higher level
    level = len(m.group(1))
    pat_next = re.compile(rf"^#{{1,{level}}}\s+.+$", re.M)
    m2 = pat_next.search(md, m.end())
    end = m2.start() if m2 else len(md)
    return md[start:end].strip() + "\n"


def extract_lines_containing(md: str, needle: str, limit: int = 30) -> List[str]:
    out: List[str] = []
    for line in md.splitlines():
        if needle in line:
            out.append(line)
        if len(out) >= limit:
            break
    return out


def parse_combined_for_date(md: str, date_iso: str) -> List[str]:
    """Return table rows containing the date."""
    if not md:
        return []
    rows = []
    for line in md.splitlines():
        if line.startswith("|") and f"| {date_iso} |" in line:
            rows.append(line)
    return rows


def parse_weekly_current_block(md: str) -> str:
    """Heuristic: return last top-level '## ' block if present, else full file."""
    if not md:
        return ""
    blocks = re.split(r"(?m)^##\s+", md)
    if len(blocks) <= 1:
        return md.strip()
    # Rebuild headers; keep last non-empty block
    parts = re.findall(r"(?m)^##\s+(.+)$", md)
    # blocks[0] is preamble
    for i in range(len(blocks) - 1, 0, -1):
        content = blocks[i].strip()
        if content:
            header = parts[i - 1] if i - 1 < len(parts) else "Weekly"
            return ("## " + header + "\n" + content).strip()
    return md.strip()


def load_cron_jobs() -> List[CronJob]:
    if not CRON_JOBS.exists():
        return []
    try:
        data = json.loads(CRON_JOBS.read_text(encoding="utf-8"))
    except Exception:
        return []

    jobs: List[CronJob] = []
    # jobs.json schema: { jobs: { <id>: {name,schedule,enabled,...} } } (best-effort)
    raw_jobs = data.get("jobs") if isinstance(data, dict) else None
    if isinstance(raw_jobs, dict):
        items = raw_jobs.items()
    elif isinstance(raw_jobs, list):
        items = [(j.get("id") or j.get("jobId") or "(unknown)", j) for j in raw_jobs]
    else:
        return []

    for jid, j in items:
        if not isinstance(j, dict):
            continue
        name = str(j.get("name") or j.get("title") or "(unnamed)")
        enabled = bool(j.get("enabled", True))
        sched = j.get("schedule", {})
        tz = ""
        sched_str = ""
        if isinstance(sched, dict):
            kind = sched.get("kind")
            tz = str(sched.get("tz") or "")
            if kind == "cron":
                sched_str = str(sched.get("expr") or "")
            elif kind == "every":
                sched_str = f"every {sched.get('everyMs')}ms"
            elif kind == "at":
                sched_str = f"at {sched.get('at')}"
            else:
                sched_str = json.dumps(sched)
        jobs.append(CronJob(job_id=str(jid), name=name, enabled=enabled, schedule=sched_str, tz=tz))

    # stable order
    jobs.sort(key=lambda x: (not x.enabled, x.name.lower()))
    return jobs


def md_bullets(lines: List[str]) -> str:
    if not lines:
        return "- (none)"
    out = []
    for l in lines:
        l = l.strip()
        if not l:
            continue
        out.append(l if l.startswith("-") else f"- {l}")
    return "\n".join(out) if out else "- (none)"


def build_report(mode: str) -> Tuple[str, str]:
    date = today_iso()
    week_start = monday_of_week(dt.date.today()).isoformat()

    red_daily = read_text(TRACKERS["red_daily"])
    zen_daily = read_text(TRACKERS["zen_daily"])
    combined = read_text(TRACKERS["combined"])
    weekly = read_text(TRACKERS["weekly"])

    combined_today_rows = parse_combined_for_date(combined, date)

    # Daily files: use Done/In Progress/Blocked if present
    red_done = extract_section(red_daily, "Done")
    red_inprog = extract_section(red_daily, "In Progress")
    red_blocked = extract_section(red_daily, "Blocked")

    zen_done = extract_section(zen_daily, "Done")
    zen_inprog = extract_section(zen_daily, "In Progress")
    zen_blocked = extract_section(zen_daily, "Blocked")

    weekly_current = parse_weekly_current_block(weekly)

    cron_jobs = load_cron_jobs()
    enabled_jobs = [j for j in cron_jobs if j.enabled]

    title = f"Status Report — {date} (Week of {week_start})"
    gen = dt.datetime.now().isoformat(timespec="seconds")

    md: List[str] = []
    md.append(f"# {title}")
    md.append("")
    md.append(f"Generated: `{gen}`")
    md.append("")

    if mode in ("today", "full"):
        md.append("## Today")
        md.append("### Combined tracker entries")
        if combined_today_rows:
            md.append("(rendered as bullets for PDF-friendliness)")
            for row in combined_today_rows:
                cols = [c.strip() for c in row.strip("|").split("|")]
                # expected: date, lane, task, owner, status, due, notes
                lane = cols[1] if len(cols) > 1 else ""
                task = cols[2] if len(cols) > 2 else row
                status = cols[4] if len(cols) > 4 else ""
                due = cols[5] if len(cols) > 5 else ""
                notes = cols[6] if len(cols) > 6 else ""
                # keep notes compact to avoid TeX overfull boxes
                notes_compact = (notes[:180] + "…") if len(notes) > 180 else notes
                bits = [b for b in [f"**{task}**", f"lane={lane}", f"status={status}", (f"due={due}" if due and due != "—" else ""), (f"notes={notes_compact}" if notes_compact else "")] if b]
                md.append("- " + " · ".join(bits))
        else:
            md.append("- (no combined tracker rows for today)")
        md.append("")

        md.append("### RED — Daily")
        md.append(red_inprog or "- (no In Progress section found)")
        md.append(red_done or "- (no Done section found)")
        if red_blocked:
            md.append(red_blocked)
        md.append("")

        md.append("### ZEN — Daily")
        md.append(zen_inprog or "- (no In Progress section found)")
        md.append(zen_done or "- (no Done section found)")
        if zen_blocked:
            md.append(zen_blocked)
        md.append("")

    if mode in ("week", "full"):
        md.append("## This week")
        md.append(weekly_current or "- (weekly summary missing)")
        md.append("")

    if mode == "full":
        md.append("## Cron snapshot (enabled jobs)")
        if not enabled_jobs:
            md.append("- (no enabled cron jobs found)")
        else:
            for j in enabled_jobs:
                tz = f" [{j.tz}]" if j.tz else ""
                md.append(f"- `{j.job_id}` — **{j.name}** — `{j.schedule}`{tz}")
        md.append("")

        md.append("## Notes / Next")
        md.append("- If you want this auto-sent on a schedule, we can add a cron job to post this summary to Telegram.")
        md.append("- If you want a 'portfolio status' section, that will be separate (depends on holdings/trade CSV freshness).")
        md.append("")

    # Console/Telegram-friendly short summary
    short: List[str] = []
    short.append(f"STATUS ({date})")
    if combined_today_rows:
        short.append("Today (combined):")
        # Attempt to convert combined table rows into bullets by splitting columns.
        for row in combined_today_rows[:10]:
            cols = [c.strip() for c in row.strip("|").split("|")]
            # expected: date, lane, task, owner, status, due, notes
            task = cols[2] if len(cols) > 2 else row
            status = cols[4] if len(cols) > 4 else ""
            short.append(f"- {task} [{status}]")
    else:
        short.append("Today (combined): -")

    # Cron: highlight just the daily brief if present
    for j in enabled_jobs:
        if "brief" in j.name.lower() and "openclaw" in j.name.lower():
            tz = f" {j.tz}" if j.tz else ""
            short.append(f"Cron: {j.name} @ {j.schedule}{tz}")
            break

    return "\n".join(md).strip() + "\n", "\n".join(short).strip() + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description="OpenClaw workspace status reporter")
    ap.add_argument("--mode", choices=["today", "week", "full"], default="full")
    ap.add_argument("--out", default=None, help="Output markdown path (default: workspace/status/status-YYYY-MM-DD.md)")
    args = ap.parse_args()

    out_dir = DEFAULT_OUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    out_path = Path(args.out) if args.out else (out_dir / f"status-{today_iso()}.md")

    md, short = build_report(args.mode)
    out_path.write_text(md, encoding="utf-8")

    print(short)
    print(f"✓ Wrote: {out_path}")


if __name__ == "__main__":
    main()
