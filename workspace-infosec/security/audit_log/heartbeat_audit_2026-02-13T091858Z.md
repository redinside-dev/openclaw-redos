# Heartbeat Security Audit
UTC: 2026-02-13T09:18:58Z
Local: 2026-02-13 04:18:58 EST

## Workspace git status
?? AGENTS.md
?? BOOTSTRAP.md
?? DELEGATION_RULES.md
?? HEARTBEAT.md
?? IDENTITY.md
?? ORG_STRUCTURE.md
?? SOUL.md
?? TOOLS.md
?? USER.md
?? security/

## Modified files (last 2 days, maxdepth 4)
security/audit_log/heartbeat_20260213T091520Z.txt
security/audit_log/heartbeat_audit_2026-02-13T091858Z.md
security/audit_log/heartbeat_audit_2026-02-13_03-41-22.md
IDENTITY.md
DELEGATION_RULES.md
HEARTBEAT.md
ORG_STRUCTURE.md
BOOTSTRAP.md
USER.md
SOUL.md
AGENTS.md
TOOLS.md

## Quick plaintext-secret scan (grep heuristics; first 200 hits)
./security/audit_log/heartbeat_audit_2026-02-13T091858Z.md:31:## Quick plaintext-secret scan (grep heuristics; first 200 hits)
./security/audit_log/heartbeat_audit_2026-02-13_03-41-22.md:7:- Secret scan (grep patterns for common keys/tokens/private keys): **no matches**
./HEARTBEAT.md:10:- Confirm no sensitive data (API keys, tokens) in plaintext logs
./HEARTBEAT.md:16:- Verify gateway auth token hasn't been compromised
./AGENTS.md:28:Capture what matters. Decisions, context, things to remember. Skip the secrets unless asked to keep them.
./AGENTS.md:136:You are free to edit `HEARTBEAT.md` with a short checklist or reminders. Keep it small to limit token burn.

## Key material / env files present

## World-writable (maxdepth 4; first 200)

## Listening ports (lsof; first 120 lines)

## OpenClaw processes
redinside        12450  22.9  0.8 457084976 134528   ??  S     2:52AM   2:17.75 openclaw-gateway    
redinside        46748   2.6  0.0 435307968   2288   ??  Ss    4:18AM   0:00.02 /bin/zsh -c cd /Users/redinside/.openclaw/workspace-infosec && out=security/audit_log/heartbeat_audit_$(date -u '+%Y-%m-%dT%H%M%SZ').md; {\012  echo "# Heartbeat Security Audit";\012  echo "UTC: $(date -u '+%Y-%m-%dT%H:%M:%SZ')";\012  echo "Local: $(date '+%Y-%m-%d %H:%M:%S %Z')";\012  echo;\012  echo "## Workspace git status";\012  git status --porcelain=v1 || true;\012  echo;\012  echo "## Modified files (last 2 days, maxdepth 4)";\012  find . -type f -maxdepth 4 -mtime -2 -not -path './.git/*' -print | sed 's|^./||' | head -n 200;\012  echo;\012  echo "## Quick plaintext-secret scan (grep heuristics; first 200 hits)";\012  grep -RIn --exclude-dir=.git --exclude-dir=node_modules -E "(api[_-]?key|secret|token|password|passwd|bearer[[:space:]]+|BEGIN[[:space:]]+PRIVATE[[:space:]]+KEY|ssh-rsa|xox[baprs]-|ghp_|sk-[A-Za-z0-9]{20,})" . 2>/dev/null | head -n 200 || true;\012  echo;\012  echo "## Key material / env files present";\012  find . -maxdepth 3 -type f \( -name '*.key' -o -name '*.pem' -o -name '*.p12' -o -name '*.pfx' -o -name '*.env' \) -print 2>/dev/null || true;\012  echo;\012  echo "## World-writable (maxdepth 4; first 200)";\012  find . -maxdepth 4 \( -type f -o -type d \) -perm -002 -print 2>/dev/null | head -n 200 || true;\012  echo;\012  echo "## Listening ports (lsof; first 120 lines)";\012  lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | head -n 120 || true;\012  echo;\012  echo "## OpenClaw processes";\012  ps aux | egrep -i 'openclaw|openclaw-gateway|node gateway/server.js' | head -n 50 || true;\012} > "$out";\012\012echo "Wrote $out"
redinside        11761   0.9  0.0 435301888   7376   ??  SN    2:51AM   0:05.54 /opt/homebrew/Cellar/python@3.14/3.14.2_1/Frameworks/Python.framework/Versions/3.14/Resources/Python.app/Contents/MacOS/Python /Users/redinside/.openclaw/workspace/mission-control/gateway-bridge.py
redinside         4915   0.4  0.1 437296832  13264   ??  S    12:46AM   5:24.38 /Applications/Windsurf.app/Contents/Resources/app/extensions/windsurf/bin/language_server_macos_arm --api_server_url https://server.self-serve.windsurf.com --run_child --enable_lsp --extension_server_port 52180 --ide_name windsurf --csrf_token 4348804f-4453-49c8-afa3-5a533e4e0f25 --random_port --inference_api_server_url https://inference.codeium.com --database_dir /Users/redinside/.codeium/windsurf/database/9c0694567290725d9dcba14ade58e297 --enable_index_service --enable_local_search --search_max_workspace_file_count 5000 --indexed_files_retention_period_days 30 --workspace_id file_Users_redinside_openclaw_workspace --sentry_telemetry --sentry_environment stable --codeium_dir .codeium/windsurf --extensions_dir /Users/redinside/.windsurf/extensions --parent_pipe_path /var/folders/bs/srf_0gbd0y13hwm0_g5jvdcw0000gn/T/server_a074d40550f63217 --windsurf_version 1.9544.35 --stdin_initial_metadata
redinside        46784   0.3  0.0 410059936    176   ??  U     4:18AM   0:00.00 egrep -i openclaw|openclaw-gateway|node gateway/server.js
redinside        45760   0.2  0.0 446231536   7456   ??  SN    4:14AM   0:00.65 node gateway/server.js
