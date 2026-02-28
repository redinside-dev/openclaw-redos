#!/usr/bin/env python3
"""Gate runner for RedOS Skill Optimizer candidate promotion decisions.

Input JSON schema (minimal):
{
  "baseline": {
    "id": "baseline",
    "results": [
      {"task_id": "t1", "pass": true, "critical": false, "runtime_ms": 1200}
    ],
    "harness": {"integrity_ok": true}
  },
  "candidates": [
    {
      "id": "candidate-a",
      "results": [...],
      "harness": {
        "integrity_ok": true,
        "held_out_isolation_ok": true,
        "contamination_ok": true
      }
    }
  ],
  "gates": {
    "min_delta_pp": 2.0,
    "ci_alpha": 0.05,
    "max_efficiency_regression_pct": 10.0,
    "bootstrap_samples": 5000,
    "seed": 42
  }
}
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import random
import statistics
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class GateResult:
    name: str
    passed: bool
    evidence: dict[str, Any]


def _bool(v: Any) -> bool:
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    if isinstance(v, str):
        return v.strip().lower() in {"1", "true", "yes", "y", "pass", "passed"}
    return False


def _wilson_ci(successes: int, n: int, alpha: float) -> tuple[float, float]:
    if n <= 0:
        return (0.0, 0.0)
    z = 1.959963984540054 if abs(alpha - 0.05) < 1e-9 else 1.959963984540054
    phat = successes / n
    denom = 1 + z * z / n
    center = (phat + z * z / (2 * n)) / denom
    margin = z * math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n) / denom
    return (max(0.0, center - margin), min(1.0, center + margin))


def _bootstrap_delta_ci(
    baseline_passes: list[int],
    candidate_passes: list[int],
    alpha: float,
    samples: int,
    seed: int,
) -> tuple[float, float]:
    n = len(baseline_passes)
    if n == 0:
        return (0.0, 0.0)
    rng = random.Random(seed)
    deltas: list[float] = []
    idx = list(range(n))
    for _ in range(samples):
        chosen = [rng.choice(idx) for _ in range(n)]
        b = sum(baseline_passes[i] for i in chosen) / n
        c = sum(candidate_passes[i] for i in chosen) / n
        deltas.append(c - b)
    deltas.sort()
    low_i = max(0, min(len(deltas) - 1, int((alpha / 2.0) * len(deltas))))
    high_i = max(0, min(len(deltas) - 1, int((1.0 - alpha / 2.0) * len(deltas)) - 1))
    return (deltas[low_i], deltas[high_i])


def _index_results(results: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for row in results:
        task_id = str(row.get("task_id", "")).strip()
        if not task_id:
            continue
        out[task_id] = row
    return out


def evaluate_candidate(payload: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    gates_cfg = payload.get("gates", {})
    alpha = float(gates_cfg.get("ci_alpha", 0.05))
    min_delta_pp = float(gates_cfg.get("min_delta_pp", 2.0))
    max_eff_reg_pct = float(gates_cfg.get("max_efficiency_regression_pct", 10.0))
    bootstrap_samples = int(gates_cfg.get("bootstrap_samples", 5000))
    seed = int(gates_cfg.get("seed", 42))

    baseline = payload["baseline"]
    b_map = _index_results(baseline.get("results", []))
    c_map = _index_results(candidate.get("results", []))

    common_task_ids = sorted(set(b_map).intersection(c_map))
    b_pass = [1 if _bool(b_map[t].get("pass")) else 0 for t in common_task_ids]
    c_pass = [1 if _bool(c_map[t].get("pass")) else 0 for t in common_task_ids]

    n = len(common_task_ids)
    b_success = sum(b_pass)
    c_success = sum(c_pass)

    b_rate = (b_success / n) if n else 0.0
    c_rate = (c_success / n) if n else 0.0
    delta = c_rate - b_rate
    delta_pp = delta * 100.0

    b_ci = _wilson_ci(b_success, n, alpha)
    c_ci = _wilson_ci(c_success, n, alpha)
    d_ci = _bootstrap_delta_ci(b_pass, c_pass, alpha, bootstrap_samples, seed)
    d_ci_pp = (d_ci[0] * 100.0, d_ci[1] * 100.0)

    b_harness = baseline.get("harness", {})
    c_harness = candidate.get("harness", {})
    harness_pass = _bool(b_harness.get("integrity_ok", True)) and _bool(c_harness.get("integrity_ok", True))
    heldout_pass = _bool(c_harness.get("held_out_isolation_ok", False))
    contamination_pass = _bool(c_harness.get("contamination_ok", False))

    critical_regressions = 0
    critical_total = 0
    for t in common_task_ids:
        critical = _bool(b_map[t].get("critical", c_map[t].get("critical", False)))
        if not critical:
            continue
        critical_total += 1
        if _bool(b_map[t].get("pass")) and (not _bool(c_map[t].get("pass"))):
            critical_regressions += 1
    critical_pass = critical_regressions == 0

    b_runtimes = [float(b_map[t].get("runtime_ms", 0.0)) for t in common_task_ids]
    c_runtimes = [float(c_map[t].get("runtime_ms", 0.0)) for t in common_task_ids]
    b_runtime_mean = statistics.fmean(b_runtimes) if b_runtimes else 0.0
    c_runtime_mean = statistics.fmean(c_runtimes) if c_runtimes else 0.0
    allowed_runtime = b_runtime_mean * (1.0 + max_eff_reg_pct / 100.0)
    efficiency_pass = c_runtime_mean <= allowed_runtime if b_runtime_mean > 0 else True

    gates = [
        GateResult(
            "harness_integrity_and_heldout_isolation",
            harness_pass and heldout_pass,
            {
                "baseline_integrity_ok": _bool(b_harness.get("integrity_ok", True)),
                "candidate_integrity_ok": _bool(c_harness.get("integrity_ok", True)),
                "held_out_isolation_ok": heldout_pass,
                "common_task_count": n,
            },
        ),
        GateResult(
            "hard_floor_no_collapse_vs_baseline",
            c_rate >= b_rate,
            {
                "baseline_pass_at_1": round(b_rate, 6),
                "candidate_pass_at_1": round(c_rate, 6),
                "delta_pp": round(delta_pp, 4),
            },
        ),
        GateResult(
            "improvement_delta_with_ci",
            (delta_pp >= min_delta_pp) and (d_ci_pp[0] > 0.0),
            {
                "target_min_delta_pp": min_delta_pp,
                "observed_delta_pp": round(delta_pp, 4),
                "delta_pp_ci95": [round(d_ci_pp[0], 4), round(d_ci_pp[1], 4)],
                "baseline_pass_ci95": [round(b_ci[0], 6), round(b_ci[1], 6)],
                "candidate_pass_ci95": [round(c_ci[0], 6), round(c_ci[1], 6)],
            },
        ),
        GateResult(
            "critical_subset_zero_regression",
            critical_pass,
            {
                "critical_task_count": critical_total,
                "critical_regressions": critical_regressions,
            },
        ),
        GateResult(
            "efficiency_envelope",
            efficiency_pass,
            {
                "max_efficiency_regression_pct": max_eff_reg_pct,
                "baseline_runtime_ms_mean": round(b_runtime_mean, 4),
                "candidate_runtime_ms_mean": round(c_runtime_mean, 4),
                "allowed_runtime_ms_mean": round(allowed_runtime, 4),
            },
        ),
        GateResult(
            "contamination_controls",
            contamination_pass,
            {
                "contamination_ok": contamination_pass,
                "note": "Set candidate.harness.contamination_ok=true only after contamination audit passes.",
            },
        ),
    ]

    overall = all(g.passed for g in gates)
    return {
        "candidate_id": candidate.get("id", "unknown-candidate"),
        "overall_pass": overall,
        "metrics": {
            "common_task_count": n,
            "baseline_pass_at_1": round(b_rate, 6),
            "candidate_pass_at_1": round(c_rate, 6),
            "delta_pp": round(delta_pp, 4),
            "delta_pp_ci95": [round(d_ci_pp[0], 4), round(d_ci_pp[1], 4)],
        },
        "gates": [
            {"name": g.name, "pass": g.passed, "evidence": g.evidence}
            for g in gates
        ],
    }


def run(payload: dict[str, Any]) -> dict[str, Any]:
    if "baseline" not in payload:
        raise ValueError("Missing required field: baseline")
    if "candidates" not in payload or not isinstance(payload["candidates"], list):
        raise ValueError("Missing required field: candidates[]")

    out = {
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "schema_version": "gates.v0",
        "baseline_id": payload["baseline"].get("id", "baseline"),
        "candidate_reports": [evaluate_candidate(payload, c) for c in payload["candidates"]],
    }
    out["all_candidates_pass"] = all(r["overall_pass"] for r in out["candidate_reports"])
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Skill Optimizer promotion gates and emit pass/fail + CI evidence.")
    parser.add_argument("--input", required=True, help="Path to input JSON with baseline/candidates.")
    parser.add_argument("--output", required=True, help="Path to write gate report JSON.")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Return non-zero when any candidate fails promotion gates.",
    )
    args = parser.parse_args()

    in_path = Path(args.input)
    out_path = Path(args.output)
    payload = json.loads(in_path.read_text(encoding="utf-8"))

    report = run(payload)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    for c in report["candidate_reports"]:
        status = "PASS" if c["overall_pass"] else "FAIL"
        print(f"{c['candidate_id']}: {status} (delta_pp={c['metrics']['delta_pp']}, ci95={c['metrics']['delta_pp_ci95']})")

    if args.strict and (not report["all_candidates_pass"]):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
