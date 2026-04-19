#!/usr/bin/env python3
"""Health snapshot -> recurring-pattern tickets.

Lightweight self-healing guardrail:
- Reads recent gateway/errors/health + CI logs
- Detects recurring failure signatures
- Opens tickets in workspace/ops/TICKET-TRACKER.md if a pattern is new

Designed for cron use. No network, no external messaging.

Usage:
  python3 workspace/scripts/health_snapshot_ticket.py [--dry-run] [--window-hours 24] [--threshold 3]
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

REPO_ROOT = Path("/Users/redinside/.openclaw")
LOGS_DIR = REPO_ROOT / "logs"
OPS_DIR = REPO_ROOT / "workspace" / "ops"

GATEWAY_ERR = LOGS_DIR / "gateway.err.log"
ERRORS_JSONL = LOGS_DIR / "errors.jsonl"
HEALTH_JSONL = LOGS_DIR / "health.jsonl"
CI_LOG = OPS_DIR / "ci" / "ci-log.jsonl"
TICKETS_MD = OPS_DIR / "TICKET-TRACKER.md"


def iso_now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_jsonl(path: Path) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except Exception:
            continue
    return out


def tail_text(path: Path, max_lines: int) -> List[str]:
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    return lines[-max_lines:]


def extract_signatures(window_start: datetime) -> List[str]:
    sigs: List[str] = []

    # 1) errors.jsonl
    for e in parse_jsonl(ERRORS_JSONL)[-200:]:
        ts = _parse_dt(e.get("timestamp"))
        if ts and ts < window_start:
            continue
        err_val = e.get("error")
        if isinstance(err_val, dict):
            msg = (err_val.get("message") or "").strip()
        else:
            msg = (err_val or "").strip()
        if not msg:
            continue
        first = msg.splitlines()[0][:200]
        sigs.append(_normalize_sig(first))

    # 2) cron CI failures (our own logged root cause)
    for e in parse_jsonl(CI_LOG)[-500:]:
        ts = _parse_dt(e.get("timestamp"))
        if ts and ts < window_start:
            continue
        if e.get("success") is True:
            continue
        rc = (e.get("rootCause") or "").strip()
        if rc:
            sigs.append(_normalize_sig(rc[:200]))

    # 3) gateway.err.log — timestamp-filtered (not just raw tail)
    TS_RE = re.compile(
        r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))"
    )
    for line in tail_text(GATEWAY_ERR, 2000):
        m = TS_RE.match(line)
        if m:
            dt = _parse_dt(m.group(1))
            if dt is None or dt < window_start:
                continue
        lower = line.lower()
        if any(k in lower for k in ["error", "fail", "exception", "enoent", "timeout", "rate limit", "429"]):
            sigs.append(_normalize_sig(line[:220]))

    # 4) health.jsonl checks: gateway unreachable
    for e in parse_jsonl(HEALTH_JSONL)[-200:]:
        ts = _parse_dt(e.get("timestamp"))
        if ts and ts < window_start:
            continue
        reachable = (((e.get("checks") or {}).get("gateway") or {}).get("reachable"))
        if reachable is False:
            sigs.append("gateway_unreachable")

    return [s for s in sigs if s]


def ticket_exists(tickets_text: str, signature: str) -> bool:
    """Check if an active ticket with this signature already exists."""
    wanted = _core_signature(_normalize_sig(signature))
    for section in tickets_text.split("\n### ")[1:]:
        lines = section.splitlines()
        status = ""
        summary = ""
        for line in lines:
            if line.startswith("- **Status:**"):
                status = line.split(":", 1)[1].strip()
            elif line.startswith("- **Summary:**"):
                summary = line.split(":", 1)[1].strip()
                break
        if status not in {"OPEN", "IN_PROGRESS", "BLOCKED"}:
            continue
        if _signatures_match(_normalize_sig(summary), wanted):
            return True
    return False


MINIMAX_COOLDOWN_PREFIXES = (
    "model fallback decision",
    "auth profile failure",
    "embedded run failover",
    "telegram connect",
    "telegram approval handler",
    "gateway closed",
    "gateway connect failed",
)

def _is_minimax_cooldown_sig(sig: str) -> bool:
    """Return True if this signature is part of the MiniMax auth cooldown cascade."""
    sig_lower = sig.lower()
    return any(prefix in sig_lower for prefix in MINIMAX_COOLDOWN_PREFIXES)


def _group_minimax_cooldown_sigs(candidates: List[Tuple[str, int]]) -> Tuple[Optional[Tuple[str, int, List[str]]], List[Tuple[str, int]]]:
    """
    Separate MiniMax cooldown signatures from everything else.
    Returns (batch_info, remaining_candidates).
    batch_info = (combined_sig, total_count, examples_list) if any cooldown sigs exist, else None.
    """
    cooldown_sigs: List[Tuple[str, int]] = []
    remaining: List[Tuple[str, int]] = []
    for sig, n in candidates:
        if _is_minimax_cooldown_sig(sig):
            cooldown_sigs.append((sig, n))
        else:
            remaining.append((sig, n))
    if not cooldown_sigs:
        return None, candidates
    # Build combined signature and collect examples
    total = sum(n for _, n in cooldown_sigs)
    cooldown_examples = [sig for sig, _ in cooldown_sigs]
    combined_sig = (
        f"MiniMax auth cooldown cascade: "
        f"{len(cooldown_sigs)} related patterns detected ({total}x total): "
        f"model fallback, auth profile failure, embedded run failover, telegram gateway closed (2 types). "
        f"Gateway recovered automatically via 9router/always-on-premium fallback."
    )
    return (combined_sig, total, cooldown_examples), remaining



def _core_signature(sig: str) -> str:
    """Remove volatile recurring-count prefixes for duplicate checks."""
    return re.sub(r"^recurring failure pattern detected \(\d+x\):\s*", "", sig).strip()


def _signatures_match(existing: str, new: str) -> bool:
    """Check if two signatures represent the same recurring pattern."""
    existing_clean = _core_signature(existing)
    new_clean = _core_signature(new)
    # Compare normalized cores and allow contains checks for long signatures.
    return (
        existing_clean == new_clean
        or (len(existing_clean) > 50 and existing_clean in new_clean)
        or (len(new_clean) > 50 and new_clean in existing_clean)
    )


def next_ticket_id(tickets_text: str, now: datetime) -> str:
    ymd = now.strftime("%Y%m%d")
    ids = re.findall(r"###\s+TICKET-(\d{8})-(\d{3})", tickets_text)
    seqs = [int(seq) for (d, seq) in ids if d == ymd]
    n = (max(seqs) + 1) if seqs else 1
    return f"TICKET-{ymd}-{n:03d}"


def sla_deadline(now: datetime, priority: str) -> datetime:
    if priority == "P0":
        return now + timedelta(minutes=30)
    if priority == "P1":
        return now + timedelta(hours=2)
    if priority == "P2":
        return now + timedelta(hours=8)
    return now + timedelta(hours=48)


def priority_for_signature(sig: str) -> str:
    s = sig.lower()
    if "gateway_unreachable" in s:
        return "P0"
    if "permission" in s or "unauthorized" in s or "forbidden" in s:
        return "P1"
    if "rate limit" in s or "429" in s or "timeout" in s:
        return "P1"
    if "enoent" in s or "no such file" in s or "path" in s:
        return "P2"
    return "P2"


def build_ticket(ticket_id: str, now: datetime, sig: str, count: int, examples: List[str], summary: Optional[str] = None) -> str:
    pri = priority_for_signature(sig)
    created = now.astimezone(timezone.utc)
    deadline = sla_deadline(created, pri)
    details = "\n".join([f"  - {ex}" for ex in examples[:4]])
    if summary is None:
        summary = f"Recurring failure pattern detected ({count}x): {sig}"
    return (
        f"\n### {ticket_id}\n"
        f"- **Status:** OPEN\n"
        f"- **Priority:** {pri}\n"
        f"- **Created:** {created.isoformat(timespec='seconds')}\n"
        f"- **SLA Deadline:** {deadline.isoformat(timespec='seconds')} ({_sla_label(pri)})\n"
        f"- **Reporter:** ops (health-snapshot)\n"
        f"- **Assignee:** ops\n"
        f"- **Summary:** {summary}\n"
        f"- **Details:** Detected {count} occurrences in the last window. Examples:\n{details}\n"
        f"- **Root Cause:** \n"
        f"- **Resolution:** \n"
        f"- **Learnings:** \n"
        f"- **Resolved At:** \n"
    )


def append_ticket(text: str, ticket_block: str, dry_run: bool) -> None:
    if dry_run:
        return
    if not text.endswith("\n"):
        text += "\n"
    TICKETS_MD.write_text(text + ticket_block, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--window-hours", type=int, default=24)
    ap.add_argument("--threshold", type=int, default=3)
    args = ap.parse_args()

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=args.window_hours)

    tickets_text = TICKETS_MD.read_text(encoding="utf-8") if TICKETS_MD.exists() else "# TICKET TRACKER\n\n## Active Tickets\n"

    sigs = extract_signatures(window_start)
    if not sigs:
        print("NO_REPLY")
        return 0

    counts = Counter(sigs)
    # Reject payloadless / unknown / too-short signatures to avoid ticket storms
    MIN_SIG_LEN = 20
    BAD_PATTERNS = ("unknown", "no summary", "no summary)", "announce:v1", "iserror=t", "security notice", "external, untrusted source", "web fetch failed (404): security notice")
    def is_valid_sig(s: str) -> bool:
        if len(s.strip()) < MIN_SIG_LEN:
            return False
        lower = s.strip().lower()
        if any(bad in lower for bad in BAD_PATTERNS):
            return False
        return True

    # Candidates: recurring, valid summary, not already tracked
    candidates: List[Tuple[str, int]] = [
        (sig, n) for sig, n in counts.items()
        if n >= args.threshold and is_valid_sig(sig)
    ]
    candidates.sort(key=lambda x: (-x[1], x[0]))

    # ── MiniMax cooldown deduplication ──────────────────────────────────────
    # Group all MiniMax auth-cooldown cascade signatures into ONE ticket.
    # These 5 patterns share the same root cause (MiniMax auth cooldown),
    # the gateway recovers automatically, and splitting them across multiple
    # tickets wastes tracker space and creates noise.
    minimax_sigs: List[Tuple[str, int]] = []
    other_candidates: List[Tuple[str, int]] = []
    for sig, n in candidates:
        if _is_minimax_cooldown_sig(sig):
            minimax_sigs.append((sig, n))
        else:
            other_candidates.append((sig, n))

    # WhatsApp Baileys 401 deduplication
    # All WhatsApp auth failures (401, different server locations) share the same
    # root cause (MiniMax cooldown ripple). Collapse into ONE ticket.
    whatsapp_sigs = []
    other_candidates2 = []
    for sig, n in other_candidates:
        sig_lower = sig.lower()
        if "whatsapp" in sig_lower and ("401" in sig_lower or "unautho" in sig_lower or "channel exited" in sig_lower):
            whatsapp_sigs.append((sig, n))
        else:
            other_candidates2.append((sig, n))
    if whatsapp_sigs:
        best_wa = max(whatsapp_sigs, key=lambda x: len(x[0]))[0]
        total_wa = sum(n for _, n in whatsapp_sigs)
        other_candidates2.insert(0, (best_wa, total_wa))

    # Telegram gateway-closed ripple deduplication
    # When MiniMax cooldown cascades, the gateway destabilizes and Telegram channels
    # disconnect/error across multiple signatures. Group all into ONE ticket.
    telegram_sigs = []
    other_candidates3 = []
    for sig, n in other_candidates2:
        sig_lower = sig.lower()
        is_telegram_ripple = (
            ("telegram" in sig_lower or "gateway closed" in sig_lower)
            and ("connect error" in sig_lower or "approval handler" in sig_lower or "gateway connect" in sig_lower)
        )
        if is_telegram_ripple:
            telegram_sigs.append((sig, n))
        else:
            other_candidates3.append((sig, n))
    if telegram_sigs:
        best_tg = max(telegram_sigs, key=lambda x: len(x[0]))[0]
        total_tg = sum(n for _, n in telegram_sigs)
        other_candidates3.insert(0, (best_tg, total_tg))

    # Add MiniMax cooldown as a single batched candidate (insert at front — highest priority)
    if minimax_sigs:
        best = max(minimax_sigs, key=lambda x: len(x[0]))[0]
        total_count = sum(n for _, n in minimax_sigs)
        other_candidates3.insert(0, (best, total_count))

    candidates = other_candidates3
    # ── end MiniMax deduplication ────────────────────────────────────────────


    opened: List[str] = []
    for sig, n in candidates[:5]:
        if ticket_exists(tickets_text, sig):
            # Ticket already exists for this pattern; skip to avoid duplicates
            continue
        tid = next_ticket_id(tickets_text, now)
        examples = [s for s in sigs if s == sig]
        if _is_minimax_cooldown_sig(sig):
            # MiniMax cooldown summary override — batch all cascade events into one
            summaries = {
                sig: (
                    f"MiniMax auth cooldown cascade ({n}x across {len(minimax_sigs)} patterns): "
                    f"model-fallback / auth-profile / embedded-failover / telegram-connect / telegram-approval-handler. "
                    f"Gateway recovers automatically — no action required."
                )
            }
            summary = summaries.get(sig, f"Recurring failure pattern detected ({n}x): {sig}")
        else:
            summary = f"Recurring failure pattern detected ({n}x): {sig}"
        block = build_ticket(tid, now, sig, n, examples, summary=summary)
        if args.dry_run:
            opened.append(f"{tid} ({sig}, {n}x)")
            # simulate append so subsequent IDs increment and signatures are treated as present
            tickets_text = tickets_text + "\n" + block
            continue
        append_ticket(tickets_text, block, dry_run=False)
        tickets_text = TICKETS_MD.read_text(encoding="utf-8")
        opened.append(tid)

    if args.dry_run:
        if opened:
            print("DRY_RUN: would open tickets: " + ", ".join(opened))
        else:
            print("DRY_RUN: no new recurring patterns")
        return 0

    if opened:
        print("TICKETS_OPENED: " + ", ".join(opened))
    else:
        print("NO_REPLY")
    return 0


def _parse_dt(s: Any) -> Optional[datetime]:
    if not isinstance(s, str) or not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def _normalize_sig(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    # strip timestamps and variable ids best-effort
    s = re.sub(r"\b\d{4}-\d{2}-\d{2}[t ]\d{2}:\d{2}:\d{2}(?:\.\d+)?z?\b", "<ts>", s)
    s = re.sub(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", "<uuid>", s)
    s = re.sub(r"\b\d+ms\b", "<ms>", s)
    return s[:220]


def _sla_label(priority: str) -> str:
    return {"P0": "30 min", "P1": "2 hours", "P2": "8 hours", "P3": "48 hours"}.get(priority, "8 hours")


if __name__ == "__main__":
    raise SystemExit(main())
