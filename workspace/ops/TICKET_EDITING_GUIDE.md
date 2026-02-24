# Ticket Tracker Editing Guide (Tool-Safe)

The `edit` tool has two hard constraints:
1) `oldText` must match **exactly** (whitespace/newlines included)
2) `oldText` must be **unique** in the file

That makes “small anchors” brittle (they either drift or match multiple times).

## Recommended patterns

### 1) Unique header + tight window (preferred)
Use the ticket header as the anchor and replace a *stable* block that includes multiple fields.

Example anchor window:
- `### TICKET-YYYYMMDD-NNN`
- plus the next ~8–15 lines (Status/Priority/Created/SLA/Reporter/Assignee/Summary)

Then replace with the updated block.

### 2) Append-only insertion point (for new tickets)
Maintain a single insertion marker under:

`## Active Tickets`

Use an edit that replaces:

`## Active Tickets\n`

with:

`## Active Tickets\n\n<new-ticket-block>\n`

This avoids searching for unstable context.

### 3) Avoid these
- Editing a single line like `- **Status:** OPEN` (non-unique).
- Anchoring on text that appears in multiple tickets (e.g., "**Status:** OPEN").
- Anchoring on blocks that may be reflowed by humans/formatters.

## When in doubt
Prefer replacing the entire ticket block (from `### TICKET-...` until the next `### TICKET-...` or section header).
