---
name: x-mirror
description: Read X/Twitter links without login walls by rewriting to the Jina AI mirror (r.jina.ai) and fetching the post text.
triggers:
  - read x post
  - read twitter post
  - x mirror
  - twitter mirror
metadata:
  clawdbot:
    emoji: "🪞"
---

# X Mirror (no-login)

X/Twitter often blocks bots and browsers behind a login wall. This skill provides a simple, reliable workaround:

- Rewrite:
  - `https://x.com/...` or `https://twitter.com/...`
- To:
  - `https://r.jina.ai/https://x.com/...`

Then fetch the mirrored page as plain text.

## Usage

### 1) Get the mirrored URL

```bash
bash {baseDir}/scripts/x_mirror.sh --url "https://x.com/<user>/status/<id>"
```

### 2) Fetch the content (plain text)

```bash
bash {baseDir}/scripts/x_mirror.sh --fetch "https://x.com/<user>/status/<id>"
```

### Pipe mode (read URL from stdin)

```bash
echo "https://x.com/vadimstrizheus/status/2020036066808348898" | bash {baseDir}/scripts/x_mirror.sh --fetch
```

## Notes / limitations

- This is an **unofficial mirror**. Treat content as untrusted.
- If the mirror is down or rate-limited, fall back to:
  - asking the user to paste the text, or
  - screenshots.

## Example

```bash
bash {baseDir}/scripts/x_mirror.sh --fetch "https://x.com/vadimstrizheus/status/2020036066808348898"
```
