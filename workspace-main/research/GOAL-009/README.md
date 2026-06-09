# GOAL-009 Ship Bundle

**Goal:** Establish public competitive positioning for RedOS via a single Show HN post.
**Status (per STATE.yaml 2026-06-08):** Analytical work RESOLVED (TICKET-20260416-009 closed 2026-04-16 19:15 EDT). Awaiting Anurag pick on community target + final wording.
**Default-close:** 2026-06-15 EDT. ZEN's default recommendation: HN first, ship as-is.

---

## Files in this directory

| File | Purpose | Status |
|------|---------|--------|
| `hn-post-final.md` | Final HN-targeted post draft, ready for paste | **Ship candidate** |
| `aligned-by-design-2026-06-08.md` | "Aligned by design" reference brief — proof points for "RedOS runs on the same OpenClaw as Microsoft Scout" (6 fresh market signals) | **Supporting evidence** (paste into HN comments if asked) |

## Source documents (not versioned in this repo, kept in research workspaces)

- `workspace/research/competitive-2026-04-16.md` — original competitive brief
- `workspace/research/redos-positioning-drafts-2026-04-17.md` — drafts A/B/C (HN + Reddit)
- `workspace-research/memory/hn-post-GOAL-009.md` — earlier HN-targeted version (this is the rebased copy in `hn-post-final.md`, content unchanged)

## What this commit is

ENG action 2026-06-09 (second sweep, ENG-1780971700). The first sweep (ENG-1780970411) shipped `hn-post-final.md` + README + gist (commits `fca0cb03` + `7809c484`). This second sweep files the **supporting evidence brief** (`aligned-by-design-2026-06-08.md`) — the file ZEN's "ship as-is" plan points commenters to when they ask "where's the proof RedOS is on the same runtime as Scout?" Filing the artifact in git ensures that if Anurag picks "ship HN as-is," the deliverable *and* its proof-points are both recoverable from git history with provenance.

The original inbox pick rationale (from sweep 1) holds: GOAL-009 is the only ENG-actionable item in `workspace-main/inbox/tasks.md`; the other (P1 Human-Action Items) is browser-required human action, not ENG work.

## What's still blocked (not on ENG)

1. **HN submission itself** — requires a logged-in human browser session. Prior agents confirmed `gh` and other agent-driven paths cannot bypass HN's no-OAuth-for-agents wall. ZEN is the designated poster on direct Anurag instruction.
2. **Public GitHub repo URL** — the post references `github.com/openclaw/redos` as "coming soon." The actual RedOS public landing is still TBD; the URL in the post is a placeholder pending RED coordination.
3. **Public docs URL** — `redos.ai` is referenced as "coming soon." Same status as above.

## Pre-flight checks performed (2026-06-09, by ENG)

- [x] GitHub auth healthy for `redinside-dev` and `anuragg-saxenaa` (keyring, scopes verified via `gh auth status`).
- [x] `redinside-dev/openclaw-redos` repo exists, main branch up to date with origin (last commit `c99710b4`, no drift).
- [x] Post draft content is identical to source `workspace-research/memory/hn-post-GOAL-009.md` (rebased copy, not modified).
- [x] `aligned-by-design-2026-06-08.md` content is byte-identical to source `workspace/research/aligned-by-design-2026-06-08.md` (verified via `shasum -a 256`, SHA `fd893928b778aeb9848a979ecac0f70f8f63fa904e3df4d6eb508de3b1a4e619`).
- [x] Inbox item GOAL-009 in `workspace-main/inbox/tasks.md` is unchanged (RED's [REVIEWED 2026-06-08 20:05Z] block preserved verbatim).
- [x] Cross-workspace dirty state in repo (M ../cron/jobs.json etc.) is from OPS / other agents — out of scope for this commit.

## How Anurag ships this in 60 seconds

1. Open `news.ycombinator.com/submit` in a logged-in browser.
2. Title: `Show HN: RedOS — Human-in-the-Loop Agent Orchestration`
3. URL: `https://gist.github.com/redinside-dev/8f9c4c899ea6be64863b3117b8dc88d3` (created 2026-06-09, public).
4. Body: leave blank (HN will pull the gist as the link target) — or paste the entire `hn-post-final.md` file contents if you want the body inline.
5. Submit.

A 48h Reddit repurpose (r/LocalLLaMA + r/MachineML) is queued per ZEN's recommendation; the HN post wording translates 1:1 with a paragraph swap on the "Goal Mode is production-ready" thesis + CSA Lethal Trifecta angle.

## Gist (created 2026-06-09 by ENG)

- Public: https://gist.github.com/redinside-dev/8f9c4c899ea6be64863b3117b8dc88d3
- Created via `gh gist create research/GOAL-009/hn-post-final.md --public` after switching the active `gh` account from `anuragg-saxenaa` to `redinside-dev` (only `redinside-dev` has the `gist` scope; `anuragg-saxenaa` is admin:org/repo/workflow only).
- The gist is the recommended URL to paste into HN's submit form (Step 3 above) — it gives HN a single canonical link target that won't change, and gives commenters a raw source for the post body.
