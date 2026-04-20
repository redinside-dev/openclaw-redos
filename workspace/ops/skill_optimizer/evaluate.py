#!/usr/bin/env python3
"""Evaluator entrypoint: run promotion gates and emit gate evidence."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Ensure repo root is on sys.path when invoked as a script.
ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workspace.ops.skill_optimizer_gate_runner import run


def main() -> int:
    p = argparse.ArgumentParser(description="Evaluate candidate(s) against promotion gates.")
    p.add_argument("--input", required=True, help="Baseline/candidate JSON")
    p.add_argument("--output", required=True, help="Gate report output JSON")
    p.add_argument("--strict", action="store_true", help="Exit non-zero if any candidate fails")
    p.add_argument(
        "--mode",
        choices=["shadow", "enforce"],
        default="enforce",
        help="shadow keeps evidence but does not fail process; enforce blocks on failures",
    )
    args = p.parse_args()

    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    payload.setdefault("gates", {})

    # Quality defaults
    payload["gates"].setdefault("min_delta_pp", 2.0)
    payload["gates"].setdefault("ci_alpha", 0.05)
    payload["gates"].setdefault("max_efficiency_regression_pct", 10.0)
    payload["gates"].setdefault("bootstrap_samples", 5000)
    payload["gates"].setdefault("seed", 42)

    # DCR contamination + adjusted-quality defaults (RESEARCH brief 2026-02-28)
    payload["gates"].setdefault("dcr_mean_max", 0.35)
    payload["gates"].setdefault("dcr_p90_max", 0.60)
    payload["gates"].setdefault("dcr_high_risk_threshold", 0.70)
    payload["gates"].setdefault("high_risk_task_share_max", 0.10)
    payload["gates"].setdefault("critical_subset_high_risk_max", 0)

    payload["gates"].setdefault("adjusted_min_delta_pp", 1.0)
    payload["gates"].setdefault("adjusted_to_raw_ratio_min", 0.85)

    payload["gates"].setdefault("auto_block_adjusted_to_raw_ratio_floor", 0.75)
    payload["gates"].setdefault("auto_block_high_risk_task_share", 0.20)

    report = run(payload)
    report["policy"] = {
        "mode": args.mode,
        "quality": {
            "pass_at_1_delta_pp_min": 2.0,
            "delta_ci95_lower_bound_gt": 0.0,
            "critical_regressions_max": 0,
        },
        "contamination": {
            "dcr_mean_max": 0.35,
            "dcr_p90_max": 0.60,
            "high_risk_task_share_max": 0.10,
            "critical_subset_high_risk_max": 0,
            "high_risk_threshold": 0.70,
        },
        "adjusted_quality": {
            "adjusted_pass1_delta_pp_min": 1.0,
            "adjusted_delta_ci95_lower_bound_gt": 0.0,
            "adjusted_to_raw_ratio_min": 0.85,
        },
        "auto_block": {
            "adjusted_to_raw_ratio_floor": 0.75,
            "high_risk_task_share_max": 0.20,
            "critical_subset_high_risk_count_max": 0,
            "adjusted_delta_ci95_lower_must_be_gt": 0.0,
        },
        "promotion_requires_all_gates": True,
        "canary_requires_all_gates": True,
    }

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    for candidate in report["candidate_reports"]:
        print(
            f"{candidate['candidate_id']}: {'PASS' if candidate['overall_pass'] else 'FAIL'} "
            f"raw_delta_pp={candidate['raw_pass1_delta_pp']} "
            f"raw_ci95={candidate['raw_delta_ci95']} "
            f"adj_delta_pp={candidate['adjusted_pass1_delta_pp']} "
            f"adj_ci95={candidate['adjusted_delta_ci95']} "
            f"dcr_mean={candidate['dcr']['mean']}"
        )

    if args.mode == "shadow":
        return 0
    if args.strict and (not report["all_candidates_pass"]):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
