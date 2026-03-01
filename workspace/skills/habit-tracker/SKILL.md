# Skill: habit-tracker

**Daily habit check-in and optional weekly summary.**

Use when the user replies to a habit check-in question (e.g. "Did you complete your top priority today?") or when asked to record a habit or produce a weekly habit summary.

---

## When to use

- User replies to a daily habit check-in message (yes / no / or a short note).
- User says "record habit" or "log habit" with a response.
- User asks "habit summary" or "how did my habits do this week?"

---

## Storage

- **Directory:** `workspace/habits/` (create if missing).
- **Daily log:** `workspace/habits/habit-log.md` — append-only, one line per check-in.

### Log format (append one line per check-in)

```markdown
## YYYY-MM-DD
- **Top priority:** yes|no|note — <optional short note>
- **<habit_label>:** yes|no|note — <optional short note>
```

Or if you prefer a single line for quick parsing:

```
YYYY-MM-DD | <habit_id> | yes|no|note | <optional note>
```

Use the same format consistently. Prefer the section + bullet format for readability.

---

## Steps to record a check-in

1. Read `workspace/habits/habit-log.md` (create with header `# Habit log` if missing).
2. If today's date section exists, append the new habit line under it; otherwise add `## YYYY-MM-DD` and the line.
3. Write: `**<habit_label>:** <response> — <note if any>`.
4. Reply to the user: "Recorded. <habit_label>: <response>."

---

## Steps for weekly summary

1. Read `workspace/habits/habit-log.md` and take the last 7 days.
2. Count yes / no / note per habit (if multiple habits).
3. Compose a short summary (e.g. "This week: top priority 5/7 days; …").
4. Send to user via Telegram (or current channel). Optionally post to Slack #redos-mission-control.

---

## Default daily question

The daily cron sends one question. Default prompt (can be customized in cron payload):

- "Habit check-in: Did you complete your top priority today? Reply yes / no / or a short note."

User replies in the same thread or next message; the agent (main) then uses this skill to record the response.

---

## Enabling

Add to `openclaw.json` under `skills.entries`: `"habit-tracker": { "enabled": true }`. Assign to main (and optionally allrounder) so check-in replies are handled.
