# Research Brief: DCR Auto-Block Thresholds for Skill Optimizer Promotion Gates

Date: 2026-02-28
Owner: RESEARCH

## Goal
Convert contamination-risk research into concrete, enforceable gate thresholds for ENG CI wiring.

## Positioning
- DCR is a companion signal, not a replacement for held-out correctness tests.
- Promotion should require both quality improvement and contamination-risk control.

## Proposed v0 thresholds (owner-ready)

1) Quality gates (already agreed baseline)
- `raw_pass1_delta_pp >= +2.0`
- `raw_delta_ci95_lower > 0`
- `critical_subset_zero_regression == true`

2) Contamination-risk gates (new)
- `dcr_mean <= 0.35`
- `dcr_p90 <= 0.60`
- `high_risk_task_share <= 0.10` where high-risk means `dcr >= 0.70`
- `critical_subset_high_risk_count == 0`

3) Adjusted-quality gates (new)
- `adjusted_pass1_delta_pp >= +1.0`
- `adjusted_delta_ci95_lower > 0`
- `adjusted_to_raw_ratio >= 0.85` to prevent promotions driven mostly by suspected memorization

4) Auto-block conditions (hard fail)
- Any high-risk task (`dcr >= 0.70`) in critical subset
- `adjusted_delta_ci95_lower <= 0`
- `adjusted_to_raw_ratio < 0.75`
- `high_risk_task_share > 0.20`

## Required evidence artifact fields

```json
{
  "candidate_id": "string",
  "raw_pass1": 0.0,
  "adjusted_pass1": 0.0,
  "raw_pass1_delta_pp": 0.0,
  "adjusted_pass1_delta_pp": 0.0,
  "raw_delta_ci95": [0.0, 0.0],
  "adjusted_delta_ci95": [0.0, 0.0],
  "dcr": {
    "mean": 0.0,
    "p90": 0.0,
    "high_risk_task_share": 0.0,
    "critical_subset_high_risk_count": 0
  },
  "derived": {
    "adjusted_to_raw_ratio": 0.0
  },
  "gates": {
    "quality": "pass|fail",
    "contamination": "pass|fail",
    "adjusted_quality": "pass|fail",
    "auto_block": "pass|fail"
  },
  "decision": "promote|block"
}
```

## Rollout recommendation
- Phase 1 (1 week): run DCR gates in shadow mode; log would-block events.
- Phase 2: enforce auto-block + contamination gates for canary eligibility.
- Phase 3: tune thresholds using 2-week false-positive/false-negative review.

## Owner asks
1. ENG: add DCR fields and contamination gates to existing promotion artifact + blocker logic.
2. OPS: add weekly calibration report tracking `raw vs adjusted` drift and block-rate.
3. RED: approve v0 thresholds and shadow->enforce rollout timing.

## Source anchors
- https://aclanthology.org/2025.emnlp-main.1173/
- https://aclanthology.org/2025.emnlp-main.1173.pdf
- https://arxiv.org/abs/2507.11405
