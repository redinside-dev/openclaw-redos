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
from typing import Any, Dict, List, Optional, Sequence

OPENCLAW_HOME = Path.home() / ".openclaw"
ROUTING_LOG = OPENCLAW_HOME / "workspace" / "logs" / "routing-decisions.jsonl"
FALLBACK_ROUTING_LOG = OPENCLAW_HOME / "logs" / "routing-decisions.jsonl"
DIGEST_OUT = OPENCLAW_HOME / "workspace" / "logs" / "routing-digest.jsonl"
GUARDRAIL_LOG = OPENCLAW_HOME / "logs" / "routing-digest-guardrail.log"
GUARDRAIL_STATE = OPENCLAW_HOME / "workspace" / "logs" / "routing-digest-guardrail.state.json"
LOOKBACK_HOURS = 4
FALLBACK_LOOKBACK_HOURS = 72
MAX_SOURCE_LINES = 5000
MAX_DIGEST_LINES = 500
ZERO_STREAK_THRESHOLD = 2
TICKET_REFERENCE = "TICKET-20260301-029"


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


def read_recent_entries(path: Path, cutoff: datetime, ignore_cutoff: bool = False) -> List[Dict[str, Any]]:
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
        if not ignore_cutoff and (ts is None or ts < cutoff):
            continue

        recent.append(row)
    return recent


def top_three(counter: Counter) -> List[Dict[str, Any]]:
    return [{"name": key, "count": count} for key, count in counter.most_common(3)]


def build_digest(
    entries: List[Dict[str, Any]], now: datetime, window_hours: int, source: str, fallback_note: Optional[str]
) -> Dict[str, Any]:
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

    digest: Dict[str, Any] = {
        "ts": now.isoformat(timespec="seconds"),
        "windowHours": window_hours,
        "windowStart": (now - timedelta(hours=window_hours)).isoformat(timespec="seconds"),
        "sampleSize": len(entries),
        "latestSourceTs": latest_ts.isoformat(timespec="seconds") if latest_ts else None,
        "earliestSourceTs": earliest_ts.isoformat(timespec="seconds") if earliest_ts else None,
        "topProviders": top_three(providers),
        "topModels": top_three(models),
        "topAgents": top_three(agents),
        "avgPromptLength": avg_prompt,
        "digestSource": source,
    }

    if fallback_note:
        digest["fallbackNote"] = fallback_note
    return digest


def load_existing_rows(path: Path, limit: int) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    rows: List[Dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except Exception:
            continue
    return rows[-limit:]


def consecutive_zero_sample(rows: Sequence[Dict[str, Any]]) -> int:
    count = 0
    for row in reversed(rows):
        sample = row.get("sampleSize")
        if isinstance(sample, int) and sample == 0:
            count += 1
        else:
            break
    return count


def write_digest_row(path: Path, row: Dict[str, Any]) -> None:
    lines = load_existing_rows(path, MAX_DIGEST_LINES)
    lines.append(row)
    serialized = [json.dumps(entry, ensure_ascii=True) for entry in lines[-MAX_DIGEST_LINES:]]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(serialized) + "\n", encoding="utf-8")


def load_guardrail_state(path: Path) -> Dict[str, Any]:
    defaults = {"streak": 0, "triggered": False, "last_trigger_ts": None}
    if not path.exists():
        return defaults
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
        return {**defaults, **data}
    except Exception:
        return defaults


def write_guardrail_state(path: Path, state: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=True) + "\n", encoding="utf-8")


def log_guardrail_event(message: str, details: Dict[str, Any], now: datetime) -> None:
    GUARDRAIL_LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {"ts": now.isoformat(timespec="seconds"), "message": message, "details": details}
    with GUARDRAIL_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=True) + "\n")


def path_age_hours(path: Path, now: datetime) -> Optional[float]:
    if not path.exists():
        return None
    mtime = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
    return (now - mtime).total_seconds() / 3600


def detect_stale_routing_log(now: datetime) -> None:
    age = path_age_hours(ROUTING_LOG, now)
    if age is None:
        log_guardrail_event(
            "Routing log missing",
            {"detail": "workspace routing-decisions.jsonl is absent", "ticket": TICKET_REFERENCE},
            now,
        )
    elif age > LOOKBACK_HOURS:
        log_guardrail_event(
            "Routing log stale",
            {
                "detail": f"workspace routing log unchanged for {age:.1f}h (threshold {LOOKBACK_HOURS}h)",
                "ticket": TICKET_REFERENCE,
            },
            now,
        )


def handle_zero_streak(
    row: Dict[str, Any], prior_rows: Sequence[Dict[str, Any]], state: Dict[str, Any], now: datetime
) -> bool:
    streak = consecutive_zero_sample(prior_rows)
    if isinstance(row.get("sampleSize"), int) and row["sampleSize"] == 0:
        streak += 1
    else:
        streak = 0

    state_changed = False
    if state.get("streak") != streak:
        state["streak"] = streak
        state_changed = True

    previously_triggered = bool(state.get("triggered"))
    if streak >= ZERO_STREAK_THRESHOLD and not previously_triggered:
        message = "Routing digest produced consecutive zero-sample windows"
        details = {
            "streak": streak,
            "windowStart": row.get("windowStart"),
            "windowHours": row.get("windowHours"),
            "digestSource": row.get("digestSource"),
            "ticket": TICKET_REFERENCE,
        }
        log_guardrail_event(message, details, now)
        state["triggered"] = True
        state["last_trigger_ts"] = row.get("ts")
        state_changed = True
    elif streak < ZERO_STREAK_THRESHOLD and previously_triggered:
        state["triggered"] = False
        state["last_trigger_ts"] = None
        state_changed = True

    return state_changed


def gather_entries(now: datetime) -> Tuple[List[Dict[str, Any]], int, str, Optional[str]]:
    cutoff = now - timedelta(hours=LOOKBACK_HOURS)
    entries = read_recent_entries(ROUTING_LOG, cutoff)
    source = "workspace"
    fallback_note: Optional[str] = None
    window_hours = LOOKBACK_HOURS

    if not entries:
        fallback_entries = read_recent_entries(
            FALLBACK_ROUTING_LOG, now - timedelta(hours=FALLBACK_LOOKBACK_HOURS), ignore_cutoff=True
        )
        if fallback_entries:
            entries = fallback_entries
            source = "fallback"
            window_hours = FALLBACK_LOOKBACK_HOURS
            fallback_note = (
                "No workspace routing samples within the last "
                f"{LOOKBACK_HOURS}h; falling back to {FALLBACK_ROUTING_LOG}"  # noqa: E501
            )

    return entries, window_hours, source, fallback_note


def main() -> None:
    now = datetime.now(timezone.utc)
    prior_rows = load_existing_rows(DIGEST_OUT, ZERO_STREAK_THRESHOLD + 4)
    entries, window_hours, source, fallback_note = gather_entries(now)
    row = build_digest(entries, now, window_hours, source, fallback_note)
    write_digest_row(DIGEST_OUT, row)

    guardrail_state = load_guardrail_state(GUARDRAIL_STATE)
    state_dirty = handle_zero_streak(row, prior_rows, guardrail_state, now)
    if state_dirty:
        write_guardrail_state(GUARDRAIL_STATE, guardrail_state)

    if fallback_note:
        log_guardrail_event(
            "Routing digest degraded to fallback log",
            {"note": fallback_note, "ticket": TICKET_REFERENCE},
            now,
        )

    detect_stale_routing_log(now)

    print(f"[routing-digest] Wrote digest row with sampleSize={row['sampleSize']} (source={row['digestSource']}) -> {DIGEST_OUT}")


if __name__ == "__main__":
    main()
