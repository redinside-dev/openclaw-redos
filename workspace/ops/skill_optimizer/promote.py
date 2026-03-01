#!/usr/bin/env python3
"""Promotion gate: block promotion unless all gates pass (including auto-block checks)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def _failed_gate_names(candidate: dict) -> list[str]:
    return [g.get("name") for g in candidate.get("gates", []) if not g.get("pass", False)]


def _auto_block(candidate: dict) -> bool:
    gate = next((g for g in candidate.get("gates", []) if g.get("name") == "auto_block_conditions"), None)
    if gate is None:
        return True
    ev = gate.get("evidence", {})
    return bool(ev.get("auto_block", True))


def main() -> int:
    p = argparse.ArgumentParser(description="Promotion decision from gate report")
    p.add_argument("--gate-report", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()

    report = json.loads(Path(args.gate_report).read_text(encoding="utf-8"))

    candidates = report.get("candidate_reports", [])
    all_pass = bool(report.get("all_candidates_pass", False))
    any_auto_block = any(_auto_block(c) for c in candidates)

    promotion_allowed = all_pass and (not any_auto_block)
    canary_allowed = promotion_allowed

    decision = {
        "promotion_allowed": promotion_allowed,
        "canary_allowed": canary_allowed,
        "reason": "all_gates_passed" if promotion_allowed else "gate_failure_or_auto_block",
        "candidate_summaries": [
            {
                "candidate_id": c.get("candidate_id"),
                "overall_pass": c.get("overall_pass", False),
                "auto_block": _auto_block(c),
                "failed_gates": _failed_gate_names(c),
            }
            for c in candidates
        ],
    }

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(decision, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(decision))
    return 0 if decision["promotion_allowed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
