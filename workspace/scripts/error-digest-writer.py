#!/usr/bin/env python3
"""
error-digest-writer.py — Canonical error digest for OpenClaw crons.

Reads the last N hours of gateway.err.log, categorizes errors, and writes
workspace/logs/error-digest.md in a sandbox-readable markdown format.

Run every 2–4 hours by OPS cron (error-digest-writer-0001).
"""

import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from collections import defaultdict

OPENCLAW_HOME = Path.home() / ".openclaw"
GATEWAY_ERR = OPENCLAW_HOME / "logs" / "gateway.err.log"
DIGEST_OUT   = OPENCLAW_HOME / "workspace" / "logs" / "error-digest.md"
LOOKBACK_H   = 4   # hours of history to include


# ── Error classification ──────────────────────────────────────────────────────

CLASSIFIERS = [
    (re.compile(r"rate.?limit|quota_exceeded|credit_balance|out of credits|plan usage limit", re.I),
     "P2", "rate-limit"),
    (re.compile(r"Unknown model|model not found|cc/", re.I),
     "P1", "unknown-model"),
    (re.compile(r"No credentials|credentials missing|401|403", re.I),
     "P1", "auth-error"),
    (re.compile(r"timeout|timed out|ETIMEDOUT", re.I),
     "P2", "timeout"),
    (re.compile(r"ECONNREFUSED|ENOTFOUND|network|connection refused", re.I),
     "P1", "network"),
    (re.compile(r"Sandbox path is read.only|cannot create directories", re.I),
     "P2", "sandbox-path"),
    (re.compile(r"command not found", re.I),
     "P2", "missing-cmd"),
    (re.compile(r"write failed|read failed|ENOENT", re.I),
     "P2", "fs-error"),
    (re.compile(r"All models failed|FailoverError|embedded agent failed", re.I),
     "P1", "failover"),
    (re.compile(r"lane task error|lane wait exceeded", re.I),
     "P2", "lane-error"),
    (re.compile(r"sessions_send.*failed|announce delivery failed", re.I),
     "P2", "a2a-error"),
]

def classify(line: str):
    for pattern, severity, label in CLASSIFIERS:
        if pattern.search(line):
            return severity, label
    return "P3", "other"


# ── Log parsing ───────────────────────────────────────────────────────────────

TS_RE = re.compile(
    r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))"
)

def parse_ts(line: str):
    m = TS_RE.match(line)
    if not m:
        return None
    try:
        ts = m.group(1)
        # Normalize Z suffix
        ts = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(ts).astimezone(timezone.utc)
    except Exception:
        return None


def read_recent_errors(path: Path, lookback_h: int):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_h)
    errors = []
    if not path.exists():
        return errors
    try:
        lines = path.read_text(errors="replace").splitlines()
    except OSError as e:
        print(f"[error-digest] Cannot read {path}: {e}", file=sys.stderr)
        return errors

    for line in lines:
        if not line.strip():
            continue
        ts = parse_ts(line)
        if ts is None or ts < cutoff:
            continue
        sev, label = classify(line)
        errors.append({"ts": ts, "severity": sev, "label": label, "raw": line.strip()[:200]})
    return errors


# ── Digest writer ─────────────────────────────────────────────────────────────

def write_digest(errors):
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    ts_str   = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Group by severity then label
    by_sev = defaultdict(lambda: defaultdict(list))
    for e in errors:
        by_sev[e["severity"]][e["label"]].append(e)

    total = len(errors)
    lines = [
        "# Canonical Error Digest for Cron + Reflection",
        "",
        "This file serves as the single source of truth for recent errors accessible to",
        "sandboxed cron jobs and reflection prompts.",
        "Updated by error-digest-writer.py (OPS cron, every 2h).",
        "",
        "## Format",
        "Each entry: timestamp · severity · class · message snippet",
        "",
        "---",
        "",
        f"## {date_str} Error Summary (last {LOOKBACK_H}h — {total} events)",
        f"Last updated: {ts_str}",
        "",
    ]

    if total == 0:
        lines.append("✅ No errors in the last 4 hours.")
        lines.append("")
    else:
        for sev in ["P0", "P1", "P2", "P3"]:
            sev_data = by_sev.get(sev, {})
            if not sev_data:
                continue
            sev_label = {
                "P0": "P0 Errors (System-wide failures)",
                "P1": "P1 Errors (High-priority issues)",
                "P2": "P2 Errors (Intermittent / recoverable)",
                "P3": "P3 Info / noise",
            }[sev]
            lines.append(f"### {sev_label}")
            for label, evts in sev_data.items():
                # Deduplicate by message similarity — show at most 3 examples
                lines.append(f"- **{label}** — {len(evts)} occurrence(s)")
                for ev in evts[:3]:
                    ts_short = ev["ts"].strftime("%H:%MZ")
                    lines.append(f"  - `{ts_short}` {ev['raw'][:120]}")
                if len(evts) > 3:
                    lines.append(f"  - _(and {len(evts)-3} more)_")
            lines.append("")

    lines.append("---")
    lines.append("_Auto-generated by error-digest-writer.py — do not edit manually._")

    DIGEST_OUT.parent.mkdir(parents=True, exist_ok=True)
    DIGEST_OUT.write_text("\n".join(lines) + "\n")
    print(f"[error-digest] Written {total} events → {DIGEST_OUT}")
    return total


def main():
    print(f"[error-digest] Reading last {LOOKBACK_H}h from {GATEWAY_ERR}")
    errors = read_recent_errors(GATEWAY_ERR, LOOKBACK_H)
    write_digest(errors)


if __name__ == "__main__":
    main()
