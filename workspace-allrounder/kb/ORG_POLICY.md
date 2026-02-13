# Organization Policy (RedTeam)

Last updated: 2026-02-09 (America/Toronto)

## 1) Canonical code location (MANDATORY)
All new work that is a **project** (open-source or internal utility) must be created under:

**Development / Codebase / Projects/**

Nothing project-like should be created elsewhere.

## 2) Approved projects for updates
Until explicitly expanded, only these projects are approved for active updates:
- `original-project`
- `stock-portfolio`

## 3) OpenClaw workspace policy
OpenClaw runtime/workspace changes (config, cron definitions, local KB/memory, scripts under `~/.openclaw/`) are **LOCAL-ONLY** for now.
- Do **not** push OpenClaw workspace/config artifacts to GitHub/shared repos until Anurag defines the formal backup/recovery strategy.

## 4) Department folder structure under Projects
Within `Development / Codebase / Projects/`, work must be grouped by org + department to keep ownership clear.

Recommended structure:
```
Development/Codebase/Projects/
  RedTeam/
    zen/            # Zen-owned utilities/POCs
    red/            # Red-owned utilities/POCs
    engineering/    # ENG workstreams and tools
    research/       # RESEARCH POCs, experiments, prototypes
    ops/            # OPS automation, runbooks (project-form)
    finance/        # FINANCE tools (stocks-only)
```

Rules:
- If it’s a POC, it still goes in the right **department folder**.
- Each project must have a `README.md` with: purpose, how to run, owner, rollback/uninstall notes.
- Keep projects small and single-purpose.

## 5) Commit & push discipline (for Projects only)
Any work under `Development / Codebase / Projects/` must be:
- committed with clear messages
- pushed to the correct remote
- kept traceable (no dumping unrelated files)

## 6) Change safety
Any change (even in Projects) must have:
1) backup/snapshot of current state
2) minimal patch
3) verification
4) rollback path
