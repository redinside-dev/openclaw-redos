#!/usr/bin/env python3

"""Wealthsimple holdings snapshot analyzer (stocks-only).

Reads Wealthsimple holdings-report CSV export and produces:
- Markdown report (detailed)
- JSON summary (machine-readable)

Canonical policy: ignore crypto entirely.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


DEFAULT_CSV = "/Users/redinside/Downloads/holdings-report-2026-02-06.csv"
DEFAULT_OUT_DIR = "/Users/redinside/.openclaw/workspace/portfolio/reports"
DEFAULT_JSON = "/Users/redinside/.openclaw/workspace/portfolio/last-holdings-report.json"


@dataclass(frozen=True)
class HoldingRow:
    account_name: str
    account_type: str
    account_number: str
    symbol: str
    name: str
    security_type: str
    quantity: float
    market_price: float
    market_price_ccy: str
    book_value_cad: float
    market_value: float
    market_value_ccy: str
    unrealized: float
    unrealized_ccy: str


def _to_float(x: str) -> float:
    try:
        s = (x or "").strip().replace(",", "")
        return float(s) if s else 0.0
    except Exception:
        return 0.0


def _norm(s: str) -> str:
    return (s or "").strip()


def is_crypto_row(raw: Dict[str, str]) -> bool:
    acct_name = _norm(raw.get("Account Name", ""))
    acct_type = _norm(raw.get("Account Type", ""))
    sec_type = _norm(raw.get("Security Type", ""))
    if acct_name.lower() == "crypto":
        return True
    if acct_type.lower() == "crypto":
        return True
    if sec_type.upper() == "CRYPTOCURRENCY":
        return True
    return False


def read_holdings(csv_path: str) -> Tuple[List[HoldingRow], int, int]:
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    rows: List[HoldingRow] = []
    total = 0
    excluded = 0

    with path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            total += 1

            # Skip blank/metadata rows that sometimes appear in exports
            symbol = _norm(raw.get("Symbol", ""))
            acct_num = _norm(raw.get("Account Number", ""))
            if not symbol and not acct_num:
                continue

            if is_crypto_row(raw):
                excluded += 1
                continue

            rows.append(
                HoldingRow(
                    account_name=_norm(raw.get("Account Name", "")),
                    account_type=_norm(raw.get("Account Type", "")),
                    account_number=acct_num,
                    symbol=symbol,
                    name=_norm(raw.get("Name", "")),
                    security_type=_norm(raw.get("Security Type", "")),
                    quantity=_to_float(raw.get("Quantity", "0")),
                    market_price=_to_float(raw.get("Market Price", "0")),
                    market_price_ccy=_norm(raw.get("Market Price Currency", "")) or _norm(raw.get("Market Value Currency", "")),
                    book_value_cad=_to_float(raw.get("Book Value (CAD)", "0")),
                    market_value=_to_float(raw.get("Market Value", "0")),
                    market_value_ccy=_norm(raw.get("Market Value Currency", "")) or _norm(raw.get("Market Price Currency", "")),
                    unrealized=_to_float(raw.get("Market Unrealized Returns", "0")),
                    unrealized_ccy=_norm(raw.get("Market Unrealized Returns Currency", "")) or _norm(raw.get("Market Value Currency", "")),
                )
            )

    return rows, total, excluded


def group_by_account(rows: Iterable[HoldingRow]) -> Dict[str, List[HoldingRow]]:
    out: Dict[str, List[HoldingRow]] = {}
    for r in rows:
        key = f"{r.account_name} ({r.account_number})"
        out.setdefault(key, []).append(r)
    return out


def sum_by_currency(pairs: Iterable[Tuple[float, str]]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for val, ccy in pairs:
        c = ccy or "UNK"
        out[c] = out.get(c, 0.0) + float(val)
    return out


def top_holdings(rows: List[HoldingRow], limit: int = 10) -> List[Dict[str, Any]]:
    # Rank within each market_value_ccy separately would be ideal, but for a first pass
    # we rank by absolute market_value.
    ranked = sorted(rows, key=lambda r: r.market_value, reverse=True)
    top = []
    for r in ranked[:limit]:
        top.append(
            {
                "symbol": r.symbol,
                "name": r.name,
                "account": f"{r.account_name} ({r.account_number})",
                "market_value": r.market_value,
                "currency": r.market_value_ccy or "UNK",
                "quantity": r.quantity,
                "market_price": r.market_price,
                "unrealized": r.unrealized,
            }
        )
    return top


def concentration(top: List[Dict[str, Any]], totals_by_ccy: Dict[str, float]) -> Dict[str, Dict[str, float]]:
    # Concentration computed per-currency bucket.
    out: Dict[str, Dict[str, float]] = {}

    # group top by currency
    by_ccy: Dict[str, List[float]] = {}
    for h in top:
        by_ccy.setdefault(h["currency"], []).append(float(h["market_value"]))

    for ccy, vals in by_ccy.items():
        total = float(totals_by_ccy.get(ccy, 0.0))
        if total <= 0:
            continue
        vals_sorted = sorted(vals, reverse=True)
        def pct(x: float) -> float:
            return round(100.0 * x / total, 2)

        out[ccy] = {
            "top1_pct": pct(sum(vals_sorted[:1])),
            "top5_pct": pct(sum(vals_sorted[:5])),
            "top10_pct": pct(sum(vals_sorted[:10])),
        }
    return out


def build_summary(rows: List[HoldingRow], total_rows: int, excluded_rows: int) -> Dict[str, Any]:
    totals_market_value = sum_by_currency((r.market_value, r.market_value_ccy) for r in rows)
    totals_unrealized = sum_by_currency((r.unrealized, r.unrealized_ccy) for r in rows)
    total_book_value_cad = sum(r.book_value_cad for r in rows)

    top = top_holdings(rows, 10)
    conc = concentration(top, totals_market_value)

    accounts = group_by_account(rows)
    account_summaries = []
    for acct, acct_rows in sorted(accounts.items()):
        mv = sum_by_currency((r.market_value, r.market_value_ccy) for r in acct_rows)
        ur = sum_by_currency((r.unrealized, r.unrealized_ccy) for r in acct_rows)
        bv_cad = sum(r.book_value_cad for r in acct_rows)
        account_summaries.append(
            {
                "account": acct,
                "positions": len(acct_rows),
                "market_value_by_currency": mv,
                "unrealized_by_currency": ur,
                "book_value_cad": round(bv_cad, 2),
            }
        )

    return {
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "inputs": {
            "total_rows": total_rows,
            "excluded_rows_crypto": excluded_rows,
            "included_rows": len(rows),
        },
        "totals": {
            "market_value_by_currency": {k: round(v, 2) for k, v in totals_market_value.items()},
            "unrealized_by_currency": {k: round(v, 2) for k, v in totals_unrealized.items()},
            "book_value_cad": round(total_book_value_cad, 2),
        },
        "top_holdings": top,
        "concentration": conc,
        "accounts": account_summaries,
    }


def md_money(val: float, ccy: str) -> str:
    return f"{val:,.2f} {ccy}".replace(",", "")


def render_markdown(summary: Dict[str, Any]) -> str:
    lines: List[str] = []
    lines.append("# Holdings Analyzer Report (Stocks-only)")
    lines.append("")
    lines.append(f"**Generated:** {summary['generated_at']}")
    lines.append("")

    inp = summary["inputs"]
    lines.append("## Input")
    lines.append(f"- Total rows: {inp['total_rows']}")
    lines.append(f"- Excluded (crypto): {inp['excluded_rows_crypto']}")
    lines.append(f"- Included: {inp['included_rows']}")
    lines.append("")

    totals = summary["totals"]
    lines.append("## Totals")
    lines.append("### Market value by currency")
    for ccy, v in totals["market_value_by_currency"].items():
        lines.append(f"- {ccy}: {v:,.2f}")
    lines.append("")
    lines.append("### Unrealized returns by currency")
    for ccy, v in totals["unrealized_by_currency"].items():
        lines.append(f"- {ccy}: {v:,.2f}")
    lines.append("")
    lines.append(f"### Book value (CAD): {totals['book_value_cad']:,.2f} CAD")
    lines.append("")

    lines.append("## Concentration")
    conc = summary.get("concentration", {})
    if not conc:
        lines.append("- (no concentration data)")
    else:
        for ccy, c in conc.items():
            lines.append(f"- {ccy}: top1 {c['top1_pct']}% · top5 {c['top5_pct']}% · top10 {c['top10_pct']}%")
    lines.append("")

    lines.append("## Top holdings (by market value)")
    lines.append("| # | Symbol | Name | Account | Market Value | Qty | Price | Unrealized |")
    lines.append("|---|---|---|---|---|---:|---:|---:|")
    for i, h in enumerate(summary["top_holdings"], start=1):
        mv = md_money(float(h["market_value"]), h["currency"])
        lines.append(
            f"| {i} | {h['symbol']} | {h['name']} | {h['account']} | {mv} | {h['quantity']:.4f} | {h['market_price']:.4f} | {h['unrealized']:.2f} |"
        )
    lines.append("")

    lines.append("## Per-account summary")
    for a in summary["accounts"]:
        lines.append(f"### {a['account']}")
        lines.append(f"- Positions: {a['positions']}")
        lines.append(f"- Book value (CAD): {a['book_value_cad']:,.2f} CAD")
        mv = a["market_value_by_currency"]
        ur = a["unrealized_by_currency"]
        lines.append("- Market value:")
        for ccy, v in mv.items():
            lines.append(f"  - {ccy}: {v:,.2f}")
        lines.append("- Unrealized returns:")
        for ccy, v in ur.items():
            lines.append(f"  - {ccy}: {v:,.2f}")
        lines.append("")

    return "\n".join(lines).replace(",", "")


def default_md_path(out_dir: str) -> str:
    today = dt.date.today().isoformat()
    return str(Path(out_dir) / f"holdings-analyzer-{today}.md")


def main() -> None:
    ap = argparse.ArgumentParser(description="Wealthsimple holdings analyzer (stocks-only)")
    ap.add_argument("--csv", default=DEFAULT_CSV, help=f"Holdings CSV path (default: {DEFAULT_CSV})")
    ap.add_argument("--out-md", default=None, help="Markdown output path")
    ap.add_argument("--out-json", default=DEFAULT_JSON, help=f"JSON output path (default: {DEFAULT_JSON})")
    ap.add_argument("--out-dir", default=DEFAULT_OUT_DIR, help=f"Report directory (default: {DEFAULT_OUT_DIR})")
    args = ap.parse_args()

    out_md = args.out_md or default_md_path(args.out_dir)

    rows, total_rows, excluded = read_holdings(args.csv)
    summary = build_summary(rows, total_rows, excluded)

    # Write outputs
    Path(out_md).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out_json).parent.mkdir(parents=True, exist_ok=True)

    md = render_markdown(summary)
    Path(out_md).write_text(md, encoding="utf-8")
    Path(args.out_json).write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")

    print(f"✓ Wrote markdown: {out_md}")
    print(f"✓ Wrote json: {args.out_json}")
    print(f"✓ Included rows: {summary['inputs']['included_rows']} (excluded crypto: {summary['inputs']['excluded_rows_crypto']})")


if __name__ == "__main__":
    main()
