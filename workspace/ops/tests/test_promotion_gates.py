#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

BASELINE = {
    "id": "baseline-v1",
    "harness": {"integrity_ok": True},
    "results": [
        {"task_id": "crit-1", "pass": True, "critical": True, "runtime_ms": 1000},
        {"task_id": "n1", "pass": True, "critical": False, "runtime_ms": 1000},
        {"task_id": "n2", "pass": False, "critical": False, "runtime_ms": 1000},
    ],
}


class PromotionGateTests(unittest.TestCase):
    def _write_json(self, path: Path, data: dict) -> None:
        path.write_text(json.dumps(data), encoding="utf-8")

    def test_fail_on_critical_regression(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            tdp = Path(td)
            inp = tdp / "input.json"
            report = tdp / "report.json"
            decision = tdp / "decision.json"

            payload = {
                "baseline": BASELINE,
                "candidates": [
                    {
                        "id": "bad-critical",
                        "harness": {
                            "integrity_ok": True,
                            "held_out_isolation_ok": True,
                            "contamination_ok": True,
                        },
                        "results": [
                            {"task_id": "crit-1", "pass": False, "critical": True, "runtime_ms": 1000},
                            {"task_id": "n1", "pass": True, "critical": False, "runtime_ms": 1000},
                            {"task_id": "n2", "pass": True, "critical": False, "runtime_ms": 1000},
                        ],
                    }
                ],
                "gates": {"bootstrap_samples": 500, "seed": 1},
            }

            self._write_json(inp, payload)
            eval_cmd = [
                "python3",
                "workspace/ops/skill_optimizer/evaluate.py",
                "--input",
                str(inp),
                "--output",
                str(report),
            ]
            subprocess.run(eval_cmd, check=True)
            r = json.loads(report.read_text(encoding="utf-8"))
            self.assertFalse(r["all_candidates_pass"])

            p_cmd = [
                "python3",
                "workspace/ops/skill_optimizer/promote.py",
                "--gate-report",
                str(report),
                "--output",
                str(decision),
            ]
            p = subprocess.run(p_cmd)
            self.assertEqual(p.returncode, 2)
            d = json.loads(decision.read_text(encoding="utf-8"))
            self.assertFalse(d["promotion_allowed"])
            self.assertFalse(d["canary_allowed"])

    def test_backward_compat_without_auto_block_gate(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            tdp = Path(td)
            report = tdp / "report.json"
            decision = tdp / "decision.json"

            legacy_report = {
                "generated_at": "2026-03-01T00:00:00Z",
                "schema_version": "gates.v0",
                "baseline_id": "baseline-v0",
                "all_candidates_pass": True,
                "candidate_reports": [
                    {
                        "candidate_id": "legacy-good",
                        "overall_pass": True,
                        "gates": [
                            {"name": "harness_integrity_and_heldout_isolation", "pass": True, "evidence": {}},
                            {"name": "improvement_delta_with_ci", "pass": True, "evidence": {}},
                        ],
                    }
                ],
            }
            self._write_json(report, legacy_report)

            p = subprocess.run(
                [
                    "python3",
                    "workspace/ops/skill_optimizer/promote.py",
                    "--gate-report",
                    str(report),
                    "--output",
                    str(decision),
                ]
            )
            self.assertEqual(p.returncode, 0)
            d = json.loads(decision.read_text(encoding="utf-8"))
            self.assertTrue(d["promotion_allowed"])
            self.assertTrue(d["canary_allowed"])

    def test_pass_all_gates_allows_canary(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            tdp = Path(td)
            inp = tdp / "input.json"
            report = tdp / "report.json"
            decision = tdp / "decision.json"

            # Large sample so CI lower bound for delta is > 0 under strict gate.
            b = []
            c = []
            for i in range(1, 301):
                tid = f"t{i}"
                bpass = i % 5 != 0
                cpass = True if (i % 11 != 0) else bpass
                b.append({"task_id": tid, "pass": bpass, "critical": False, "runtime_ms": 1000})
                c.append({"task_id": tid, "pass": cpass, "critical": False, "runtime_ms": 1000})

            b.append({"task_id": "crit-1", "pass": True, "critical": True, "runtime_ms": 1000})
            c.append({"task_id": "crit-1", "pass": True, "critical": True, "runtime_ms": 1000})

            payload = {
                "baseline": {"id": "baseline-big", "harness": {"integrity_ok": True}, "results": b},
                "candidates": [
                    {
                        "id": "good",
                        "harness": {
                            "integrity_ok": True,
                            "held_out_isolation_ok": True,
                            "contamination_ok": True,
                        },
                        "results": c,
                    }
                ],
                "gates": {"bootstrap_samples": 2000, "seed": 42},
            }
            self._write_json(inp, payload)
            subprocess.run(
                [
                    "python3",
                    "workspace/ops/skill_optimizer/evaluate.py",
                    "--input",
                    str(inp),
                    "--output",
                    str(report),
                    "--strict",
                ],
                check=True,
            )
            r = json.loads(report.read_text(encoding="utf-8"))
            self.assertTrue(r["all_candidates_pass"])

            p = subprocess.run(
                [
                    "python3",
                    "workspace/ops/skill_optimizer/promote.py",
                    "--gate-report",
                    str(report),
                    "--output",
                    str(decision),
                ]
            )
            self.assertEqual(p.returncode, 0)

            ccmd = subprocess.run(
                [
                    "python3",
                    "workspace/ops/skill_optimizer/canary.py",
                    "--decision",
                    str(decision),
                ]
            )
            self.assertEqual(ccmd.returncode, 0)


if __name__ == "__main__":
    unittest.main()
