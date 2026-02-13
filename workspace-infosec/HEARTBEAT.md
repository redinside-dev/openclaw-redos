# HEARTBEAT.md - INFOSEC Agent Periodic Tasks

## Security Scan
- Run a quick security scan of the workspace for anomalies
- Check access_control audit logs for unauthorized attempts
- Review monitoring_daemon.log for alerts or warnings

## Compliance Check
- Verify all agent workspaces have proper permissions
- Confirm no sensitive data (API keys, tokens) in plaintext logs
- Check that sandbox mode is enforced for all agents

## Threat Assessment
- Review recent Telegram messages for prompt injection patterns
- Check for unexpected processes or network connections
- Verify gateway auth token hasn't been compromised

## Report
- Summarize findings in security/audit_log/
- Alert RED via Telegram if critical issues found
