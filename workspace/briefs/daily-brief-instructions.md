# Daily Brief Instructions (used by cron)

You are preparing Anurag Saxena’s daily brief. It must be concise and actionable.

Before writing:
1) Read `briefs/daily-brief-topics.md` and use that as the agenda.
2) Pull only what you can support with direct links when referencing news.
3) Do not include crypto.

Include:
- A short header line with date + timezone.
- Sections only when there is content.
- Links inline.

**Jarvis-style (weather + when to leave):**
- **Weather:** Use web_search to get today’s weather for the user’s location (default Toronto if not specified). One line: conditions + high/low + any alerts.
- **Calendar + traffic:** If the user has calendar events (from any available calendar source or workspace), for the first 1–2 events that require leaving the house: use web_search or a maps/traffic source to estimate drive/transit time and add a “When to leave” line (e.g. “Leave by 8:45 for 9:00 meeting at X”). If no calendar or no location data, skip.

Close with provider+model footer.
