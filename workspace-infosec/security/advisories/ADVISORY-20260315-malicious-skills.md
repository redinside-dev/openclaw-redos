# Security Advisory: Malicious Skill Attack - Data Exfiltration via ClawHub Skills

**Date:** 2026-03-15  
**Source:** ZEN (via Singularity Point threat intelligence)  
**Severity:** CRITICAL  
**Status:** ACTIVE THREAT - Documented Attack

---

## Executive Summary

Cisco's AI security team confirmed a documented attack vector where malicious skills deployed to ClawHub contain hidden functions that:
1. Read `openclaw.json` configuration files
2. Exfiltrate credentials, API keys, and agent configs to attacker-controlled servers

**Attack Names:**
- "GitHub PR Summariser"
- "Daily News Briefer"

These appear as legitimate productivity tools but contain silent functions that scan for and transmit sensitive configuration data.

---

## Attack Vector Details

### Initial Vector
- Users install seemingly benign skills from ClawHub
- Skills request normal permissions (file read, network)
- Hidden functions execute silently in background

### Data Targeted
- `openclaw.json` - Contains:
  - API keys (openrouter, perplexity, brave search)
  - Slack tokens
  - Model configurations
  - Agent credentials
  - Gateway authentication schemas

### Exfiltration Mechanism
- HTTP POST to attacker-controlled endpoints
- Runs silently during normal skill operation
- Difficult to detect without code audit

---

## Relevance to Our Deployment

**Installed Skills (from `~/.openclaw/workspace/skills/`):**
- 59 skills installed in workspace
- Skills with network access: `web-search`, `github`, `gog`, `telegram-approvals`, `n8n-webhooks`, `outreach-automation`
- Skills with file access: Most skills require file read/write

**Risk Assessment:**
- ✅ No "GitHub PR Summariser" or "Daily News Briefer" skills detected
- ⚠️ Skill audit never performed - unknown if any installed skills contain hidden exfiltration
- ⚠️ `openclaw.json` contains multiple API keys and tokens

---

## China MIIT Safety Guidelines (March 11, 2026)

New guidelines from China's Ministry of Industry and Information Technology:

1. **Use official latest version** - Keep OpenClaw updated
2. **Minimize internet exposure** - Restrict gateway exposure
3. **Grant minimum permissions** - Least-privilege for skills/agents
4. **Caution with third-party skills** - Audit before install
5. **Guard against browser hijacking** - Monitor browser automation
6. **Regularly patch** - Security updates

---

## Immediate Actions Required

### 1. Skill Audit (HIGH PRIORITY)
- [ ] Audit all installed skills in `workspace/skills/` for suspicious network calls
- [ ] Review skill source code before use
- [ ] Remove unused skills

### 2. Credential Rotation (CRITICAL)
- [ ] Rotate `brave_api_key` (already flagged as exposed)
- [ ] Review all tokens in `openclaw.json`
- [ ] Implement secrets rotation policy

### 3. Network Monitoring (MEDIUM)
- [ ] Add egress monitoring for unusual outbound connections
- [ ] Log all skill network requests

### 4. Skill Installation Policy (MEDIUM)
- [ ] Require code review before installing new skills
- [ ] Implement skill allowlist (approved skills only)
- [ ] Add skill manifest verification

---

## Related Advisories

- `ADVISORY-20260315-agent-exfiltration.md` - Prompt injection and data exfiltration threats

---

## References

- Singularity Point threat report
- Cisco AI Security Team confirmation (March 2026)
- China NVDB MIIT Safety Guidelines (March 11, 2026)

---

**Reported by:** ZEN (via sessions_send)  
**Investigating:** INFOSEC  
**Next Review:** 2026-03-16
