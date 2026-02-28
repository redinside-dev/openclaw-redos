#!/usr/bin/env python3
"""
routing-digest-writer.py — Canonical routing digest for cron/reflection.

Reads recent routing decisions and writes a compact rolling digest to
workspace/logs/routing-digest.jsonl so sandboxed jobs can reason about routing
health without scanning large raw logs.
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

OPENCLAW_HOME = Path.home() / ".openclaw"
ROUTING_LOG = OPENCLAW_HOME / "workspace" / "logs" / "routing-decisions.jsonl"
DIGEST_OUT = OPENCLAW_HOME / "workspace" / "logs" / "routing-digest.jsonl"
LOOKBACK_HOURS = 4
MAX_SOURCE_LINES = 5000
MAX_DIGEST_LINES = 500


def parse_dt(raw: Any) -> Optional[datetime]:
    if not isinstance(raw, str) or not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def read_recent_entries(path: Path, cutoff: datetime) -> List[Dict[str, Any]]:
    if not path.exists():
        return []

    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    recent: List[Dict[str, Any]] = []
    for line in lines[-MAX_SOURCE_LINES:]:
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except Exception:
            continue

        ts = parse_dt(row.get("ts"))
        if ts is None or ts < cutoff:
            continue

        recent.append(row)
    return recent


def top_three(counter: Counter) -> List[Dict[str, Any]]:
    return [{"name": key, "count": count} for key, count in counter.most_common(3)]


def build_digest(entries: List[Dict[str, Any]], now: datetime, cutoff: datetime) -> Dict[str, Any]:
    providers = Counter()
    models = Counter()
    agents = Counter()
    prompt_lengths: List[int] = []

    latest_ts: Optional[datetime] = None
    earliest_ts: Optional[datetime] = None

    for row in entries:
        provider = str(row.get("provider") or "unknown")
        model = str(row.get("selected_model") or row.get("model") or "unknown")
        agent = str(row.get("agent") or "unknown")
        providers[provider] += 1
        models[model] += 1
        agents[agent] += 1

        prompt_length = row.get("prompt_length")
        if isinstance(prompt_length, int):
            prompt_lengths.append(prompt_length)

        ts = parse_dt(row.get("ts"))
        if ts is not None:
            if latest_ts is None or ts > latest_ts:
                latest_ts = ts
            if earliest_ts is None or ts < earliest_ts:
                earliest_ts = ts

    avg_prompt = int(sum(prompt_lengths) / len(prompt_lengths)) if prompt_lengths else 0

    return {
        "ts": now.isoformat(timespec="seconds"),
        "windowHours": LOOKBACK_HOURS,
        "windowStart": cutoff.isoformat(timespec="seconds"),
        "sampleSize": len(entries),
        "latestSourceTs": latest_ts.isoformat(timespec="seconds") if latest_ts else None,
        "earliestSourceTs": earliest_ts.isoformat(timespec="seconds") if earliest_ts else None,
        "topProviders": top_three(providers),
        "topModels": top_three(models),
        "topAgents": top_three(agents),
        "avgPromptLength": avg_prompt,
    }


def load_existing(path: Path) -> List[str]:
    if not path.exists():
        return []
    return [ln for ln in path.read_text(encoding="utf-8", errors="replace").splitlines() if ln.strip()]


def write_digest_row(path: Path, row: Dict[str, Any]) -> None:
    lines = load_existing(path)
    lines.append(json.dumps(row, ensure_ascii=True))
    lines = lines[-MAX_DIGEST_LINES:]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=LOOKBACK_HOURS)
    recent = read_recent_entries(ROUTING_LOG, cutoff)
    row = build_digest(recent, now, cutoff)
    write_digest_row(DIGEST_OUT, row)
    print(f"[routing-digest] Wrote digest row with sampleSize={row['sampleSize']} -> {DIGEST_OUT}")


if __name__ == "__main__":
    main()
