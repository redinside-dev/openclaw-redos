#!/usr/bin/env python3
"""Canary gate: refuse rollout unless promotion decision allows it."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser(description="Canary rollout gate")
    p.add_argument("--decision", required=True)
    args = p.parse_args()
    decision = json.loads(Path(args.decision).read_text(encoding="utf-8"))
    allowed = bool(decision.get("canary_allowed", False))
    print("CANARY_ALLOWED" if allowed else "CANARY_BLOCKED")
    return 0 if allowed else 2


if __name__ == "__main__":
    raise SystemExit(main())
