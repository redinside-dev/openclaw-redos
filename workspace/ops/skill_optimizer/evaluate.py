#!/usr/bin/env python3
"""Evaluator entrypoint: run default promotion gates and emit gate evidence."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sys
from pathlib import Path

# Ensure repo root is on sys.path when invoked as a script.
ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workspace.ops.skill_optimizer_gate_runner import run


def main() -> int:
    p = argparse.ArgumentParser(description="Evaluate candidate(s) against default promotion gates.")
    p.add_argument("--input", required=True, help="Baseline/candidate JSON")
    p.add_argument("--output", required=True, help="Gate report output JSON")
    p.add_argument("--strict", action="store_true", help="Exit non-zero if any candidate fails")
    args = p.parse_args()

    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    payload.setdefault("gates", {})
    payload["gates"].setdefault("min_delta_pp", 2.0)
    payload["gates"].setdefault("ci_alpha", 0.05)
    payload["gates"].setdefault("max_efficiency_regression_pct", 10.0)
    payload["gates"].setdefault("bootstrap_samples", 5000)
    payload["gates"].setdefault("seed", 42)

    report = run(payload)
    report["policy"] = {
        "pass_at_1_delta_pp_min": 2.0,
        "delta_ci95_lower_bound_gt": 0.0,
        "critical_regressions_max": 0,
        "promotion_requires_all_gates": True,
        "canary_requires_all_gates": True,
    }

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    for candidate in report["candidate_reports"]:
        print(
            f"{candidate['candidate_id']}: {'PASS' if candidate['overall_pass'] else 'FAIL'} "
            f"delta_pp={candidate['metrics']['delta_pp']} "
            f"ci95={candidate['metrics']['delta_pp_ci95']}"
        )

    if args.strict and (not report["all_candidates_pass"]):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
