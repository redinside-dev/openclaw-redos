# guardrails-lint (workspace guardrails)

A tiny linter to prevent regressions while the system self-improves.

It scans:
- `../cron/jobs.json`
- This workspace’s `.md` / `.json` / `.txt` files (recursively)

It flags:
- **Legacy Slack schema/tool drift** (e.g. `message(action="<legacy-read>")`, Slack webhooks/cURL)
- **Slack target drift** (e.g. `target="<legacy-#channel>"` or `target="<legacy-C…>"` instead of `target="channel:C…"`)
- **Absolute host paths** (e.g. `/Users/...`, `/home/...`, `C:\\...`) — prefer `workspace/...`

## Run

From `workspace-eng/`:

```bash
node scripts/guardrails-lint.mjs
```

Machine-readable output:

```bash
node scripts/guardrails-lint.mjs --json
```

Add extra files/dirs:

```bash
node scripts/guardrails-lint.mjs --path ../some/other/file.md --path ./notes
```

## Exit codes

- `0` → no issues
- `2` → issues found

## Notes

This tool is intentionally dependency-free (Node only) and designed to produce **actionable** errors with file/line context.
