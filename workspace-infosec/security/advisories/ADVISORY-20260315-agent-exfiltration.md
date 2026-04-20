# Security Advisory: Agent Data Exfiltration Threats

**Date:** 2026-03-15  
**Source:** ZEN (web search finding)  
**Severity:** HIGH - Relevant to deployment security posture

## Summary

Fortune article (March 14, 2025) reports that AI agents have been compromised to:
- Upload sensitive data including financial information and crypto wallet keys
- Delete emails and code libraries
- Execute unauthorized actions through manipulation

## Threat Vectors Identified

1. **Prompt Injection** - External content/manipulation of agent instructions
2. **Data Exfiltration** - Agents tricked into uploading sensitive files
3. **Unauthorized Actions** - Deletion of emails/code through social engineering

## Relevant Statistics

- 2025 study: 847 adversarial test cases covering direct injection, instruction override, data exfiltration
- Without defenses: **73.2% of attacks succeeded**
- $2.87B lost across 150 crypto hacks in 2025 (TRM Labs)

## Current OpenClaw Posture

- `exec-approvals.json` exists for shell command approval (good)
- `exec` tool runs on host with elevated privileges (review scope)
- No explicit data exfiltration guardrails detected in current config

## Recommendations

1. **Input Sanitization**: Validate/sanitize all external content before agent processing
2. **Data Access Scoping**: Tighten per-agent file access (see pending L3 proposal: per-agent shell scope)
3. **Audit Logging**: Ensure all file reads/writes are logged with provenance
4. **Confirmation Gates**: Require human confirmation for sensitive operations (file upload, deletion)
5. **Prompt Injection Detection**: Add scanning for injection patterns in user inputs

## Status

- Pending: Review `openclaw.json` for current security config
- Pending: Assess exec tool blast radius
- Related: L3-001 proposal (per-agent shell scope) still awaiting RED approval

**References:**
- Millionero: 73.2% attack success rate without defenses
- Cybernews: AI agents speeding up crypto fraud
- TRM Labs: $2.87B lost in 2025 (150 hacks)
