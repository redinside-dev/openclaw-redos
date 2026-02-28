#!/usr/bin/env python3
"""Promotion gate: block promotion unless all default gates pass."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser(description="Promotion decision from gate report")
    p.add_argument("--gate-report", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()

    report = json.loads(Path(args.gate_report).read_text(encoding="utf-8"))
    decision = {
        "promotion_allowed": bool(report.get("all_candidates_pass", False)),
        "canary_allowed": bool(report.get("all_candidates_pass", False)),
        "reason": "all_gates_passed" if report.get("all_candidates_pass", False) else "gate_failure",
        "candidate_summaries": [
            {
                "candidate_id": c.get("candidate_id"),
                "overall_pass": c.get("overall_pass", False),
                "failed_gates": [g.get("name") for g in c.get("gates", []) if not g.get("pass", False)],
            }
            for c in report.get("candidate_reports", [])
        ],
    }

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(decision, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(decision))
    return 0 if decision["promotion_allowed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
