#!/usr/bin/env python3
"""Generate a weekly cost report from workspace/costs/*.json.

Inputs (best-effort):
- codexbar-cost-claude.json (daily costs + tokens + cache tokens)
- codexbar-usage-all.json (Codex credits + limits)
- provider-quota.json (provider list)
- estimator.json (top expensive agents snapshot)

Output:
- Prints a JSON summary to stdout.
- Writes a Markdown report to workspace/costs/weekly-cost-YYYY-MM-DD.md if --out-md is provided.
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple


def _read_json(path: str) -> Optional[Any]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except Exception:
        return None


def _safe_float(x: Any) -> float:
    try:
        return float(x)
    except Exception:
        return 0.0


def _safe_int(x: Any) -> int:
    try:
        return int(x)
    except Exception:
        return 0


def _parse_ymd(s: str) -> Optional[date]:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


@dataclass
class WeeklyClaude:
    window_start: str
    window_end: str
    days: int
    total_cost_usd: float
    avg_daily_cost_usd: float
    total_tokens: int
    cache_read_tokens: int
    cache_creation_tokens: int
    cache_hit_rate_pct: Optional[float]
    missing_cost_days: int


def compute_weekly_claude(claude_json: Any) -> Tuple[Optional[WeeklyClaude], Dict[str, Any]]:
    """Compute last-7-days window ending at latest date available."""
    if not claude_json or not isinstance(claude_json, list) or not claude_json:
        return None, {"error": "missing_or_invalid_claude_json"}

    obj = claude_json[0]
    daily = obj.get("daily")
    if not isinstance(daily, list) or not daily:
        return None, {"error": "missing_daily_rows"}

    rows = []
    for d in daily:
        if not isinstance(d, dict):
            continue
        ds = d.get("date")
        dd = _parse_ymd(ds) if isinstance(ds, str) else None
        if not dd:
            continue
        rows.append((dd, d))

    if not rows:
        return None, {"error": "no_parsable_dates"}

    rows.sort(key=lambda t: t[0])
    end = rows[-1][0]
    start = end - timedelta(days=6)

    window = [r for r in rows if start <= r[0] <= end]
    # In case of sparse data, still treat it as a 7-day calendar window.
    total_cost = 0.0
    total_tokens = 0
    cache_read = 0
    cache_create = 0
    missing_cost_days = 0

    # Track which calendar dates we saw.
    seen_dates = set(dd for dd, _ in window)

    for dd, d in window:
        cost = d.get("totalCost")
        if cost is None:
            missing_cost_days += 1
        total_cost += _safe_float(cost)
        total_tokens += _safe_int(d.get("totalTokens"))
        cache_read += _safe_int(d.get("cacheReadTokens"))
        cache_create += _safe_int(d.get("cacheCreationTokens"))

    # Count days with no row as missing cost days too.
    missing_cost_days += (7 - len(seen_dates))

    denom = cache_read + cache_create
    cache_hit = (cache_read / denom * 100.0) if denom > 0 else None

    avg_daily = total_cost / 7.0

    wk = WeeklyClaude(
        window_start=start.isoformat(),
        window_end=end.isoformat(),
        days=7,
        total_cost_usd=total_cost,
        avg_daily_cost_usd=avg_daily,
        total_tokens=total_tokens,
        cache_read_tokens=cache_read,
        cache_creation_tokens=cache_create,
        cache_hit_rate_pct=cache_hit,
        missing_cost_days=missing_cost_days,
    )

    meta = {
        "last30DaysCostUSD": _safe_float(obj.get("last30DaysCostUSD")),
        "updatedAt": obj.get("updatedAt"),
        "provider": obj.get("provider"),
        "source": obj.get("source"),
    }

    return wk, meta


def compute_top_agents(estimator_json: Any) -> List[Dict[str, Any]]:
    # estimator.json schema is not guaranteed; best-effort.
    if not estimator_json or not isinstance(estimator_json, dict):
        return []
    agents = estimator_json.get("agents")
    if not isinstance(agents, dict):
        return []
    items = []
    for k, v in agents.items():
        items.append((str(k), _safe_float(v)))
    items.sort(key=lambda t: t[1], reverse=True)
    top = items[:3]
    return [{"agent": a, "cost": c} for a, c in top]


def compute_codex_credits(usage_all_json: Any) -> Dict[str, Any]:
    # codexbar-usage-all.json contains an entry with provider=codex.
    if not usage_all_json or not isinstance(usage_all_json, list):
        return {}
    for entry in usage_all_json:
        if isinstance(entry, dict) and entry.get("provider") == "codex":
            dash = entry.get("openaiDashboard", {}) if isinstance(entry.get("openaiDashboard"), dict) else {}
            usage = dash.get("usageBreakdown", [])
            # Find last 7 non-empty credit days
            last_nonzero = []
            for d in usage:
                if not isinstance(d, dict):
                    continue
                credits = _safe_float(d.get("totalCreditsUsed"))
                if credits > 0:
                    last_nonzero.append({"day": d.get("day"), "credits": credits})
            secondary = dash.get("secondaryLimit", {}) if isinstance(dash.get("secondaryLimit"), dict) else {}
            return {
                "updatedAt": dash.get("updatedAt"),
                "secondaryUsedPercent": secondary.get("usedPercent"),
                "secondaryResetsAt": secondary.get("resetsAt"),
                "creditsNonzeroDays": last_nonzero[:5],
            }
    return {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--costs-dir", default=os.path.expanduser("~/ .openclaw/workspace/costs"))
    ap.add_argument("--out-md", default="")
    args = ap.parse_args()

    # Default costs-dir is incorrect due to space; override with env var if set.
    costs_dir = os.environ.get("OPENCLAW_COSTS_DIR") or args.costs_dir
    # Normalize: allow passing workspace-relative via env.
    costs_dir = os.path.abspath(costs_dir)

    claude = _read_json(os.path.join(costs_dir, "codexbar-cost-claude.json"))
    estimator = _read_json(os.path.join(costs_dir, "estimator.json"))
    usage_all = _read_json(os.path.join(costs_dir, "codexbar-usage-all.json"))
    quota = _read_json(os.path.join(costs_dir, "provider-quota.json"))

    wk, claude_meta = compute_weekly_claude(claude)
    top_agents = compute_top_agents(estimator)
    codex = compute_codex_credits(usage_all)

    providers_active = None
    if isinstance(quota, dict):
        prov = quota.get("providers")
        if isinstance(prov, dict):
            providers_active = len(prov)

    # Status against a default daily budget if present in estimator.json
    budget = None
    if isinstance(estimator, dict) and "daily_budget" in estimator:
        budget = _safe_float(estimator.get("daily_budget"))

    status = "UNKNOWN"
    if wk is not None:
        if budget is not None and budget > 0:
            status = "GREEN" if wk.avg_daily_cost_usd < 0.5 * budget else "YELLOW" if wk.avg_daily_cost_usd < budget else "RED"
        else:
            status = "GREEN" if wk.avg_daily_cost_usd < 5 else "YELLOW" if wk.avg_daily_cost_usd < 10 else "RED"

    now = datetime.now().isoformat(timespec="seconds")

    summary = {
        "generatedAt": now,
        "costsDir": costs_dir,
        "claude": {
            **({} if wk is None else {
                "windowStart": wk.window_start,
                "windowEnd": wk.window_end,
                "days": wk.days,
                "totalCostUSD": round(wk.total_cost_usd, 6),
                "avgDailyCostUSD": round(wk.avg_daily_cost_usd, 6),
                "totalTokens": wk.total_tokens,
                "cacheHitRatePct": None if wk.cache_hit_rate_pct is None else round(wk.cache_hit_rate_pct, 2),
                "missingCostDays": wk.missing_cost_days,
            }),
            "meta": claude_meta,
        },
        "topExpensiveAgents": top_agents,
        "providersActive": providers_active,
        "codex": codex,
        "budget": {
            "dailyBudget": budget,
        },
        "status": status,
    }

    if args.out_md and wk is not None:
        md_path = args.out_md
        cache_str = "N/A" if wk.cache_hit_rate_pct is None else f"{wk.cache_hit_rate_pct:.1f}%"
        budget_line = "" if budget is None else f"- Daily budget (estimator.json): ${budget:.2f}\n"
        top_agents_lines = "\n".join([f"- {i+1}. {a['agent']}: ${a['cost']:.2f}" for i, a in enumerate(top_agents)])
        if not top_agents_lines:
            top_agents_lines = "- N/A (estimator.json missing agents map)"

        codex_lines = "- No codex usage data" if not codex else (
            f"- Secondary used: {codex.get('secondaryUsedPercent','?')}% (resetsAt={codex.get('secondaryResetsAt','?')})\n"
            + ("- Nonzero credit days: " + ", ".join([f"{d.get('day')}={d.get('credits')}" for d in codex.get('creditsNonzeroDays', [])]) if codex.get('creditsNonzeroDays') else "- Nonzero credit days: none")
        )

        md = (
            f"# Weekly Cost Report\n"
            f"Generated: {now}\n\n"
            f"## Claude (last 7-day window ending {wk.window_end})\n"
            f"- 7-day total: ${wk.total_cost_usd:.2f}\n"
            f"- Daily avg: ${wk.avg_daily_cost_usd:.2f}\n"
            f"- Cache hit rate: {cache_str} (read/(read+create))\n"
            f"- Missing cost days (no row or missing totalCost): {wk.missing_cost_days}/7\n"
            f"- 30-day total (from codexbar): ${_safe_float(claude_meta.get('last30DaysCostUSD')):.2f}\n"
            f"{budget_line}\n"
            f"## Top 3 Expensive Agents (from estimator.json snapshot)\n"
            f"{top_agents_lines}\n\n"
            f"## Providers\n"
            f"- Active providers (provider-quota.json): {providers_active}\n\n"
            f"## Codex\n"
            f"{codex_lines}\n\n"
            f"## Status\n"
            f"- {status}\n"
        )
        os.makedirs(os.path.dirname(md_path), exist_ok=True)
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md)

    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
