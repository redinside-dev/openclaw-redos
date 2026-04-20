#!/usr/bin/env python3
"""Gate runner for RedOS Skill Optimizer candidate promotion decisions.

Supports default quality gates plus DCR contamination/adjusted-quality gates.
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


def _float(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


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


def _percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    v = sorted(values)
    if len(v) == 1:
        return v[0]
    pos = (len(v) - 1) * q
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return v[lo]
    frac = pos - lo
    return v[lo] * (1.0 - frac) + v[hi] * frac


def evaluate_candidate(payload: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    gates_cfg = payload.get("gates", {})
    alpha = float(gates_cfg.get("ci_alpha", 0.05))
    min_delta_pp = float(gates_cfg.get("min_delta_pp", 2.0))
    max_eff_reg_pct = float(gates_cfg.get("max_efficiency_regression_pct", 10.0))
    bootstrap_samples = int(gates_cfg.get("bootstrap_samples", 5000))
    seed = int(gates_cfg.get("seed", 42))

    # DCR thresholds (from RESEARCH brief v0)
    dcr_mean_max = float(gates_cfg.get("dcr_mean_max", 0.35))
    dcr_p90_max = float(gates_cfg.get("dcr_p90_max", 0.60))
    high_risk_threshold = float(gates_cfg.get("dcr_high_risk_threshold", 0.70))
    high_risk_share_max = float(gates_cfg.get("high_risk_task_share_max", 0.10))
    critical_high_risk_max = int(gates_cfg.get("critical_subset_high_risk_max", 0))

    adjusted_delta_pp_min = float(gates_cfg.get("adjusted_min_delta_pp", 1.0))
    adjusted_to_raw_ratio_min = float(gates_cfg.get("adjusted_to_raw_ratio_min", 0.85))

    auto_block_ratio_floor = float(gates_cfg.get("auto_block_adjusted_to_raw_ratio_floor", 0.75))
    auto_block_high_risk_share = float(gates_cfg.get("auto_block_high_risk_task_share", 0.20))

    baseline = payload["baseline"]
    b_map = _index_results(baseline.get("results", []))
    c_map = _index_results(candidate.get("results", []))

    common_task_ids = sorted(set(b_map).intersection(c_map))

    b_pass_raw = [1 if _bool(b_map[t].get("pass")) else 0 for t in common_task_ids]
    c_pass_raw = [1 if _bool(c_map[t].get("pass")) else 0 for t in common_task_ids]

    b_pass_adj = [
        1 if _bool(b_map[t].get("adjusted_pass", b_map[t].get("pass"))) else 0
        for t in common_task_ids
    ]
    c_pass_adj = [
        1 if _bool(c_map[t].get("adjusted_pass", c_map[t].get("pass"))) else 0
        for t in common_task_ids
    ]

    n = len(common_task_ids)

    b_raw_rate = (sum(b_pass_raw) / n) if n else 0.0
    c_raw_rate = (sum(c_pass_raw) / n) if n else 0.0
    raw_delta = c_raw_rate - b_raw_rate
    raw_delta_pp = raw_delta * 100.0

    b_adj_rate = (sum(b_pass_adj) / n) if n else 0.0
    c_adj_rate = (sum(c_pass_adj) / n) if n else 0.0
    adjusted_delta = c_adj_rate - b_adj_rate
    adjusted_delta_pp = adjusted_delta * 100.0

    b_ci = _wilson_ci(sum(b_pass_raw), n, alpha)
    c_ci = _wilson_ci(sum(c_pass_raw), n, alpha)
    raw_d_ci = _bootstrap_delta_ci(b_pass_raw, c_pass_raw, alpha, bootstrap_samples, seed)
    raw_d_ci_pp = (raw_d_ci[0] * 100.0, raw_d_ci[1] * 100.0)

    adj_d_ci = _bootstrap_delta_ci(b_pass_adj, c_pass_adj, alpha, bootstrap_samples, seed + 1)
    adj_d_ci_pp = (adj_d_ci[0] * 100.0, adj_d_ci[1] * 100.0)

    if raw_delta_pp > 0.0:
        adjusted_to_raw_ratio = adjusted_delta_pp / raw_delta_pp
    else:
        adjusted_to_raw_ratio = 1.0 if adjusted_delta_pp >= 0.0 else 0.0

    b_harness = baseline.get("harness", {})
    c_harness = candidate.get("harness", {})
    harness_pass = _bool(b_harness.get("integrity_ok", True)) and _bool(c_harness.get("integrity_ok", True))
    heldout_pass = _bool(c_harness.get("held_out_isolation_ok", False))

    critical_regressions = 0
    critical_total = 0

    dcr_values: list[float] = []
    high_risk_count = 0
    critical_subset_high_risk_count = 0

    for t in common_task_ids:
        is_critical = _bool(b_map[t].get("critical", c_map[t].get("critical", False)))
        if is_critical:
            critical_total += 1
            if _bool(b_map[t].get("pass")) and (not _bool(c_map[t].get("pass"))):
                critical_regressions += 1

        dcr = _float(c_map[t].get("dcr", 0.0), 0.0)
        dcr = max(0.0, min(1.0, dcr))
        dcr_values.append(dcr)
        if dcr >= high_risk_threshold:
            high_risk_count += 1
            if is_critical:
                critical_subset_high_risk_count += 1

    critical_pass = critical_regressions == 0

    dcr_mean = statistics.fmean(dcr_values) if dcr_values else 0.0
    dcr_p90 = _percentile(dcr_values, 0.90)
    high_risk_task_share = (high_risk_count / n) if n else 0.0

    b_runtimes = [float(b_map[t].get("runtime_ms", 0.0)) for t in common_task_ids]
    c_runtimes = [float(c_map[t].get("runtime_ms", 0.0)) for t in common_task_ids]
    b_runtime_mean = statistics.fmean(b_runtimes) if b_runtimes else 0.0
    c_runtime_mean = statistics.fmean(c_runtimes) if c_runtimes else 0.0
    allowed_runtime = b_runtime_mean * (1.0 + max_eff_reg_pct / 100.0)
    efficiency_pass = c_runtime_mean <= allowed_runtime if b_runtime_mean > 0 else True

    contamination_thresholds_pass = (
        (dcr_mean <= dcr_mean_max)
        and (dcr_p90 <= dcr_p90_max)
        and (high_risk_task_share <= high_risk_share_max)
        and (critical_subset_high_risk_count <= critical_high_risk_max)
    )

    adjusted_quality_pass = (
        (adjusted_delta_pp >= adjusted_delta_pp_min)
        and (adj_d_ci_pp[0] > 0.0)
        and (adjusted_to_raw_ratio >= adjusted_to_raw_ratio_min)
    )

    auto_block_conditions_triggered = {
        "critical_high_risk_present": critical_subset_high_risk_count > 0,
        "adjusted_ci95_lower_nonpositive": adj_d_ci_pp[0] <= 0.0,
        "adjusted_to_raw_ratio_below_floor": adjusted_to_raw_ratio < auto_block_ratio_floor,
        "high_risk_share_exceeds_auto_block": high_risk_task_share > auto_block_high_risk_share,
    }
    auto_block = any(auto_block_conditions_triggered.values())

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
            c_raw_rate >= b_raw_rate,
            {
                "baseline_pass_at_1": round(b_raw_rate, 6),
                "candidate_pass_at_1": round(c_raw_rate, 6),
                "raw_pass1_delta_pp": round(raw_delta_pp, 4),
            },
        ),
        GateResult(
            "improvement_delta_with_ci",
            (raw_delta_pp >= min_delta_pp) and (raw_d_ci_pp[0] > 0.0),
            {
                "target_min_delta_pp": min_delta_pp,
                "raw_pass1_delta_pp": round(raw_delta_pp, 4),
                "raw_delta_ci95": [round(raw_d_ci_pp[0], 4), round(raw_d_ci_pp[1], 4)],
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
            "contamination_thresholds",
            contamination_thresholds_pass,
            {
                "dcr_mean": round(dcr_mean, 6),
                "dcr_p90": round(dcr_p90, 6),
                "high_risk_task_share": round(high_risk_task_share, 6),
                "critical_subset_high_risk_count": critical_subset_high_risk_count,
                "thresholds": {
                    "dcr_mean_max": dcr_mean_max,
                    "dcr_p90_max": dcr_p90_max,
                    "high_risk_task_share_max": high_risk_share_max,
                    "critical_subset_high_risk_max": critical_high_risk_max,
                    "high_risk_threshold": high_risk_threshold,
                },
            },
        ),
        GateResult(
            "adjusted_quality",
            adjusted_quality_pass,
            {
                "adjusted_pass1_delta_pp": round(adjusted_delta_pp, 4),
                "adjusted_delta_ci95": [round(adj_d_ci_pp[0], 4), round(adj_d_ci_pp[1], 4)],
                "adjusted_to_raw_ratio": round(adjusted_to_raw_ratio, 6),
                "thresholds": {
                    "adjusted_min_delta_pp": adjusted_delta_pp_min,
                    "adjusted_delta_ci95_lower_gt": 0.0,
                    "adjusted_to_raw_ratio_min": adjusted_to_raw_ratio_min,
                },
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
            "auto_block_conditions",
            not auto_block,
            {
                "auto_block": auto_block,
                "conditions": auto_block_conditions_triggered,
            },
        ),
    ]

    overall = all(g.passed for g in gates)
    decision = "promote" if overall else "block"

    return {
        "candidate_id": candidate.get("id", "unknown-candidate"),
        "overall_pass": overall,
        "decision": decision,
        "raw_pass1": round(c_raw_rate, 6),
        "adjusted_pass1": round(c_adj_rate, 6),
        "raw_pass1_delta_pp": round(raw_delta_pp, 4),
        "adjusted_pass1_delta_pp": round(adjusted_delta_pp, 4),
        "raw_delta_ci95": [round(raw_d_ci_pp[0], 4), round(raw_d_ci_pp[1], 4)],
        "adjusted_delta_ci95": [round(adj_d_ci_pp[0], 4), round(adj_d_ci_pp[1], 4)],
        "dcr": {
            "mean": round(dcr_mean, 6),
            "p90": round(dcr_p90, 6),
            "high_risk_task_share": round(high_risk_task_share, 6),
            "critical_subset_high_risk_count": critical_subset_high_risk_count,
        },
        "derived": {
            "adjusted_to_raw_ratio": round(adjusted_to_raw_ratio, 6),
        },
        "metrics": {
            "common_task_count": n,
            "baseline_pass_at_1": round(b_raw_rate, 6),
            "candidate_pass_at_1": round(c_raw_rate, 6),
            "delta_pp": round(raw_delta_pp, 4),
            "delta_pp_ci95": [round(raw_d_ci_pp[0], 4), round(raw_d_ci_pp[1], 4)],
        },
        "gates": [{"name": g.name, "pass": g.passed, "evidence": g.evidence} for g in gates],
    }


def run(payload: dict[str, Any]) -> dict[str, Any]:
    if "baseline" not in payload:
        raise ValueError("Missing required field: baseline")
    if "candidates" not in payload or not isinstance(payload["candidates"], list):
        raise ValueError("Missing required field: candidates[]")

    out = {
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "schema_version": "gates.v1-dcr",
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

    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    report = run(payload)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    for c in report["candidate_reports"]:
        status = "PASS" if c["overall_pass"] else "FAIL"
        print(
            f"{c['candidate_id']}: {status} "
            f"raw_delta_pp={c['raw_pass1_delta_pp']} raw_ci95={c['raw_delta_ci95']} "
            f"adj_delta_pp={c['adjusted_pass1_delta_pp']} adj_ci95={c['adjusted_delta_ci95']}"
        )

    if args.strict and (not report["all_candidates_pass"]):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
