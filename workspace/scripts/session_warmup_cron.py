#!/usr/bin/env python3
"""Session warmup cron runner for A2A deadlock prevention.

- Pings specialist agent sessions to reduce cold-start timeout risk.
- Uses per-attempt timeout (default 120s) and bounded retries (default 2x).
- Writes warmup marker JSON and appends structured audit logs.

Exit codes:
- 0: all target agents warmed successfully
- 1: one or more agents failed after retry budget
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class WarmupResult:
    agent: str
    status: str
    attempts_used: int
    duration_ms: int
    error: str | None = None

    def to_marker_status(self) -> str:
        return "alive" if self.status == "ok" else "timeout"


def run_warmup_attempt(agent: str, timeout_seconds: int) -> tuple[bool, str, int]:
    """Run one warmup attempt for a target agent.

    Returns (success, evidence, duration_ms).
    """
    msg = (
        "WARMUP_CHECK: Reply exactly 'pong'. "
        "No additional actions."
    )
    cmd = [
        "openclaw",
        "agent",
        "--agent",
        agent,
        "--message",
        msg,
        "--timeout",
        str(timeout_seconds),
    ]

    start = time.time()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds + 10,
        )
        duration_ms = int((time.time() - start) * 1000)
        output = (proc.stdout or "").strip()
        err = (proc.stderr or "").strip()

        if proc.returncode == 0:
            evidence = output[-300:] if output else "ok"
            return True, evidence, duration_ms

        evidence = (err or output or f"exit={proc.returncode}")[-500:]
        return False, evidence, duration_ms
    except subprocess.TimeoutExpired:
        duration_ms = int((time.time() - start) * 1000)
        return False, f"timeout>{timeout_seconds}s", duration_ms
    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        return False, f"exception:{exc}", duration_ms


def warmup_agent(agent: str, timeout_seconds: int, max_retries: int) -> WarmupResult:
    attempts = max_retries + 1
    total_ms = 0
    last_error = None

    for attempt in range(1, attempts + 1):
        success, evidence, duration_ms = run_warmup_attempt(agent, timeout_seconds)
        total_ms += duration_ms

        if success:
            return WarmupResult(
                agent=agent,
                status="ok",
                attempts_used=attempt,
                duration_ms=total_ms,
                error=None,
            )

        last_error = f"attempt {attempt}/{attempts}: {evidence}"
        if attempt < attempts:
            time.sleep(min(2 * attempt, 5))

    return WarmupResult(
        agent=agent,
        status="error",
        attempts_used=attempts,
        duration_ms=total_ms,
        error=last_error,
    )


def append_jsonl(path: Path, row: Dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_marker(results: List[WarmupResult], marker_paths: List[Path]) -> None:
    payload = {
        "ts": now_iso(),
        "source": "session_warmup_cron.py",
        "policy": {
            "timeout_seconds": ARGS.timeout_seconds,
            "max_retries": ARGS.max_retries,
        },
        "agents": {r.agent: r.to_marker_status() for r in results},
        "note": "Warmup marker for A2A deadlock prevention (120s timeout, 2x retry policy).",
    }

    for p in marker_paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="A2A session warmup cron runner")
    p.add_argument(
        "--agents",
        default="eng,ops,research,infosec",
        help="Comma-separated agent ids",
    )
    p.add_argument("--timeout-seconds", type=int, default=120)
    p.add_argument("--max-retries", type=int, default=2, help="Retries after first attempt")
    p.add_argument(
        "--workspace-root",
        default="/Users/redinside/.openclaw/workspace",
        help="Workspace root path",
    )
    return p.parse_args()


ARGS = parse_args()


def main() -> int:
    agents = [a.strip() for a in ARGS.agents.split(",") if a.strip()]
    workspace = Path(ARGS.workspace_root)
    logs_dir = workspace / "logs"

    marker_paths = [
        workspace / "tmp" / "session-warmup-last.json",
        workspace / "workspace" / "tmp" / "session-warmup-last.json",
        workspace / "workspace" / "workspace" / "tmp" / "session-warmup-last.json",
    ]

    results: List[WarmupResult] = []
    started = now_iso()

    for agent in agents:
        res = warmup_agent(
            agent=agent,
            timeout_seconds=ARGS.timeout_seconds,
            max_retries=ARGS.max_retries,
        )
        results.append(res)

    write_marker(results, marker_paths)

    summary = {
        "ts": now_iso(),
        "event": "session_warmup",
        "started": started,
        "timeout_seconds": ARGS.timeout_seconds,
        "max_retries": ARGS.max_retries,
        "results": [r.__dict__ for r in results],
    }

    append_jsonl(logs_dir / "audit.jsonl", summary)
    append_jsonl(logs_dir / "a2a-delegations.jsonl", {
        "ts": summary["ts"],
        "from": "ops",
        "event": "session_warmup",
        "policy": {
            "timeout_seconds": ARGS.timeout_seconds,
            "max_retries": ARGS.max_retries,
        },
        "targets": [r.__dict__ for r in results],
    })

    failed = [r for r in results if r.status != "ok"]

    print("Session warmup summary:")
    for r in results:
        if r.status == "ok":
            print(f"  ✅ {r.agent}: ok (attempts={r.attempts_used}, {r.duration_ms}ms)")
        else:
            print(f"  ❌ {r.agent}: failed after {r.attempts_used} attempts ({r.error})")

    if failed:
        print(f"FAIL: {len(failed)}/{len(results)} agents failed warmup", file=sys.stderr)
        return 1

    print("OK: all agents warmed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
