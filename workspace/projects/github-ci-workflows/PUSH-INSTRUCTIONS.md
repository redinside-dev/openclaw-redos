# GitHub CI Workflows — Ready to Push

All workflow files are written and committed locally. Blocked by missing `workflow` PAT scope.

## One-time fix

```bash
# Add workflow scope to gh CLI token
gh auth refresh -h github.com -s workflow
# Follow the browser prompt, approve the scope
```

## Then push all CI workflows

```bash
for repo in a2a-protocol pr-auto-reviewer agent-loop-detection session-memory; do
  cd /tmp/build-$repo
  git push
done
```

## And push the 9router PR

```bash
cd /tmp/contrib-9router
git push origin ci/docker-publish-workflow
gh pr create --repo decolua/9router \
  --title "ci: add optimized Docker publish workflow (closes #281)" \
  --body "$(cat <<'EOF'
Implements the Docker publish workflow proposed in #281.

## What this does
- Triggers on `v*` tag push and manual `workflow_dispatch` only — no noise on every master commit
- **amd64 only** — drops arm64 to halve build time
- **Registry-based layer cache** via ghcr.io — fast warm builds
- **Disabled provenance/SBOM** attestations — saves ~30s per build
- `NEXT_TELEMETRY_DISABLED=1` baked in
- **Dependabot** weekly updates for GitHub Actions versions

## Publish a new image
\`\`\`bash
git tag v1.2.3 && git push origin v1.2.3
\`\`\`
Or trigger manually from the Actions tab.

---
Closes #281
EOF
)"
```

## Repos with CI committed but not pushed

| Repo | Local path | Language | CI matrix |
|------|-----------|----------|-----------|
| a2a-protocol | /tmp/build-a2a-protocol | TypeScript | Node 18, 20 |
| pr-auto-reviewer | /tmp/build-pr-auto-reviewer | Python | 3.10, 3.11, 3.12 |
| agent-loop-detection | /tmp/build-agent-loop-detection | Node.js | 18, 20, 22 |
| session-memory | /tmp/build-session-memory | TypeScript | Node 18, 20 |
| 9router (fork) | /tmp/contrib-9router | Next.js | Docker publish on tag |
