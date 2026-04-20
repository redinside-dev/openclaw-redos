#!/usr/bin/env python3
"""Continuous Improvement event logger.

Scans cron run JSONL files (and optionally subagent run logs) and appends structured
entries to workspace/ops/ci/ci-log.jsonl.

Designed to be safe in cron:
- idempotent via a state file storing the last processed ts per source file
- no network
- no external posting

Usage:
  python3 workspace/scripts/ci_event_logger.py [--dry-run] [--since-minutes 180]
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

REPO_ROOT = Path("/Users/redinside/.openclaw")
CRON_RUNS_DIR = REPO_ROOT / "cron" / "runs"
SUBAGENT_RUNS_PATH = REPO_ROOT / "subagents" / "runs.json"
OPS_DIR = REPO_ROOT / "workspace" / "ops"
CI_DIR = OPS_DIR / "ci"
STATE_PATH = CI_DIR / "ci-event-logger.state.json"
OUT_LOG = CI_DIR / "ci-log.jsonl"


def iso_now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def atomic_write(path: Path, content: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(content, encoding="utf-8")
    tmp.replace(path)


def ensure_dirs() -> None:
    CI_DIR.mkdir(parents=True, exist_ok=True)


def iter_jsonl_lines(path: Path) -> Iterable[Dict[str, Any]]:
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except Exception:
                    continue
    except FileNotFoundError:
        return


def summarize_root_cause(event: Dict[str, Any]) -> Optional[str]:
    """Heuristic root-cause extraction from cron run summary."""
    summary = (event.get("summary") or "").strip()
    status = (event.get("status") or "").lower()
    if status in ("ok", "success"):
        return None

    # Common patterns we can detect without deep parsing.
    lower = summary.lower()
    if "enoent" in lower or "no such file" in lower:
        return "File path missing (ENOENT) — likely relative-path/cwd mismatch"
    if "rate limit" in lower or "429" in lower:
        return "Provider/API rate limiting (429)"
    if "timeout" in lower or "timed out" in lower:
        return "Timeout while waiting for tool/provider response"
    if "permission" in lower or "forbidden" in lower or "unauthorized" in lower:
        return "Permission/auth failure"
    if "schema" in lower and "target" in lower:
        return "Tool schema mismatch (e.g., missing/invalid message target)"

    # Fallback: first non-empty line (truncated).
    if summary:
        return summary.splitlines()[0][:220]
    return "Unknown (no summary)"


def suggest_next_improvements(root_cause: Optional[str], status: str) -> List[str]:
    if status.lower() in ("ok", "success"):
        return ["Capture any new edge cases as a ticket/learning when they occur"]

    rc = (root_cause or "").lower()
    if "relative" in rc or "enoent" in rc or "path" in rc:
        return [
            "Switch cron prompts/scripts to absolute paths under /Users/redinside/.openclaw",
            "Add a preflight file-exists check and log a clear error signature",
        ]
    if "rate" in rc or "429" in rc:
        return [
            "Add backoff/retry with jitter for rate-limit errors",
            "Prefer a more reliable provider/model for cron/monitoring lanes",
        ]
    if "timeout" in rc:
        return [
            "Increase cron timeoutSeconds for multi-step jobs (>=300s)",
            "Add smaller, incremental tool calls and early exits",
        ]
    if "schema" in rc or "target" in rc:
        return [
            "Add prompt lint: reject message tool calls without target=channel:<id>/user:<id>",
            "Update templates to the current message tool schema",
        ]

    return [
        "Add a focused regression test/dry-run for this workflow",
        "Document the failure mode + prevention in LEARNINGS.md",
    ]


def load_state() -> Dict[str, Any]:
    return load_json(STATE_PATH, default={"version": 1, "files": {}})


def save_state(state: Dict[str, Any]) -> None:
    atomic_write(STATE_PATH, json.dumps(state, indent=2, sort_keys=True) + "\n")


def list_cron_run_files() -> List[Path]:
    if not CRON_RUNS_DIR.exists():
        return []
    files = [p for p in CRON_RUNS_DIR.iterdir() if p.is_file() and p.suffix == ".jsonl"]
    return sorted(files, key=lambda p: p.stat().st_mtime)


def should_ingest(event: Dict[str, Any]) -> bool:
    return event.get("action") == "finished" and "jobId" in event and "ts" in event


def build_ci_entry(event: Dict[str, Any], source_file: str) -> Dict[str, Any]:
    """Build a CI entry from a cron finished event."""
    status = (event.get("status") or "unknown")
    root_cause = summarize_root_cause(event)
    improvements = suggest_next_improvements(root_cause, status)

    entry = {
        "ts": int(event.get("ts")),
        "timestamp": datetime.fromtimestamp(int(event.get("ts")) / 1000, tz=timezone.utc).isoformat(timespec="seconds"),
        "source": "cron",
        "sourceFile": source_file,
        "jobId": event.get("jobId"),
        "sessionId": event.get("sessionId"),
        "status": status,
        "durationMs": event.get("durationMs"),
        "model": event.get("model"),
        "provider": event.get("provider"),
        "success": str(status).lower() in ("ok", "success"),
        "rootCause": root_cause,
        "nextImprovements": improvements[:2],
    }

    # Avoid log bloat; keep only a snippet.
    summary = (event.get("summary") or "").strip().replace("\u0000", "")
    if summary:
        entry["summarySnippet"] = summary[:500]

    return entry


def append_jsonl(path: Path, objs: List[Dict[str, Any]], dry_run: bool) -> None:
    if not objs:
        return
    if dry_run:
        return
    with path.open("a", encoding="utf-8") as f:
        for obj in objs:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def ingest_subagent_runs(state: Dict[str, Any], dry_run: bool) -> List[Dict[str, Any]]:
    """Ingest completed subagent runs from subagents/runs.json."""
    if not SUBAGENT_RUNS_PATH.exists():
        return []

    s = state.setdefault("subagents", {})
    last_ended_at = int(s.get("lastEndedAt", 0) or 0)

    data = load_json(SUBAGENT_RUNS_PATH, default={})
    runs = (data or {}).get("runs") or {}

    new_entries: List[Dict[str, Any]] = []
    max_ended = last_ended_at

    for run_id, r in runs.items():
        ended_at = int(r.get("endedAt") or 0)
        if ended_at <= 0 or ended_at <= last_ended_at:
            continue

        outcome = (r.get("outcome") or {})
        status = outcome.get("status") or "unknown"
        success = str(status).lower() in ("ok", "success")

        root_cause = None
        if not success:
            # best-effort; we may not have the full error here
            root_cause = f"Subagent run failed (status={status})"

        improvements = suggest_next_improvements(root_cause, status)

        entry = {
            "ts": ended_at,
            "timestamp": datetime.fromtimestamp(ended_at / 1000, tz=timezone.utc).isoformat(timespec="seconds"),
            "source": "subagent",
            "runId": run_id,
            "childSessionKey": r.get("childSessionKey"),
            "requesterSessionKey": r.get("requesterSessionKey"),
            "status": status,
            "success": success,
            "model": r.get("model"),
            "durationMs": (int(r.get("endedAt") or 0) - int(r.get("startedAt") or 0)) if r.get("startedAt") and r.get("endedAt") else None,
            "rootCause": root_cause,
            "nextImprovements": improvements[:2],
        }
        task = (r.get("task") or "").strip()
        if task:
            entry["taskSnippet"] = task[:500]

        new_entries.append(entry)
        if ended_at > max_ended:
            max_ended = ended_at

    if max_ended > last_ended_at and not dry_run:
        s["lastEndedAt"] = max_ended

    return new_entries


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--since-minutes", type=int, default=180, help="Only ingest events newer than this window if no state exists")
    args = ap.parse_args()

    ensure_dirs()
    state = load_state()
    files_state: Dict[str, Any] = state.setdefault("files", {})

    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    default_cutoff_ms = now_ms - int(timedelta(minutes=args.since_minutes).total_seconds() * 1000)

    new_entries: List[Dict[str, Any]] = []
    changed = False

    for run_file in list_cron_run_files():
        key = str(run_file)
        last_ts = int(files_state.get(key, {}).get("lastTs", 0) or 0)
        if last_ts <= 0:
            last_ts = default_cutoff_ms

        max_ts = last_ts
        for event in iter_jsonl_lines(run_file):
            ts = int(event.get("ts") or 0)
            if ts <= last_ts:
                continue
            if not should_ingest(event):
                continue
            new_entries.append(build_ci_entry(event, source_file=run_file.name))
            if ts > max_ts:
                max_ts = ts

        if max_ts > last_ts:
            files_state[key] = {"lastTs": max_ts}
            changed = True

    # Ingest subagent completions as well
    subagent_entries = ingest_subagent_runs(state, dry_run=args.dry_run)
    if subagent_entries:
        new_entries.extend(subagent_entries)
        changed = True

    # Sort deterministic
    new_entries.sort(key=lambda e: (e.get("ts", 0), str(e.get("jobId") or e.get("runId") or "")))

    if new_entries:
        append_jsonl(OUT_LOG, new_entries, dry_run=args.dry_run)

    if changed and not args.dry_run:
        state["updatedAt"] = iso_now_utc()
        save_state(state)

    # Cron-friendly output
    if args.dry_run:
        print(f"DRY_RUN: would append {len(new_entries)} CI events")
        if new_entries:
            print("Sample:")
            print(json.dumps(new_entries[-1], indent=2)[:1200])
        return 0

    if new_entries:
        print(f"CI_LOGGED: {len(new_entries)}")
    else:
        print("NO_REPLY")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
