# SECURITY

## Ollama localhost-only verification
Run:
```bash
/usr/sbin/lsof -nP -iTCP:11434 -sTCP:LISTEN
/usr/sbin/netstat -anv | grep 11434
```
Pass criteria:
- Listener is **127.0.0.1:11434** (not `0.0.0.0`).

## Data handling
- Prompts/results must be sanitized before committing.
- Do not include PII, secrets, customer data.
