# Secret Incident Response (OpenClaw)

If a secret is detected by pre-commit or CI, treat it as a **credential compromise until proven otherwise**.

## Immediate actions (first 5 minutes)

1. **Stop the bleeding**
   - Cancel the commit / revert the PR (do not merge).
   - Remove the secret from the working tree / staged changes.

2. **Rotate the credential** (do this *even if you think it was “just local”*)
   - Slack token: rotate/reinstall app token.
   - OpenAI key: revoke + mint a new key.
   - Telegram bot token: revoke via @BotFather, mint new token.
   - GitHub token: revoke the PAT.
   - AWS key: deactivate access key, create new one.

3. **Invalidate sessions**
   - If a service supports session invalidation, do it.

## Clean up the repo

### If the secret never made it into git history
- `git restore --staged <file>`
- edit the file to remove secret
- recommit

### If the secret was committed locally (not pushed)
- `git reset --soft HEAD~1`
- remove the secret, recommit

### If the secret was pushed (history rewrite required)
1. **Rotate first**, then clean history.
2. Use one of:
   - `git filter-repo` (recommended)
   - BFG Repo-Cleaner
3. Force push the rewritten history.
4. Ask all collaborators to re-clone or hard-reset.

## Hard rules (non-negotiable)

- **Never commit**:
  - `openclaw.json`
  - `openclaw.json.bak*` / `openclaw.json.backup*`
  - `.env` or `.env.*` (except `.env.example`)
  - `credentials/`, `secrets/`

## Where secrets should live instead

- Local development: `.env` (untracked) / `secrets/` / OS keychain
- CI: GitHub Actions **Secrets** / repo/environment secrets

## Verification checklist

- [ ] Secret rotated/revoked
- [ ] No remaining copies in working tree
- [ ] `gitleaks` passes on branch
- [ ] No traces in git history (if pushed, history rewritten)
- [ ] Downstream systems updated with new secret
