# Security Hardening & Threat Model

This document serves as a living record of identified risks, proposed mitigations, and implemented security controls.

## Current Threat Landscape

### Identified Threats
1. **Credential Exposure** (P0)
   - Issue: brave_api_key exposed since March 13th (over 60 hours)
   - Risk: Unauthorized search API usage, potential data exfiltration
   - Mitigation: Rotate credential immediately; implement secret scanning
   - Owner: RED (credential rotation)

2. **Infrastructure Auth Degradation** (P1)
   - Issue: Recurring iflow 406 errors, openrouter auth failures
   - Risk: Could indicate compromised credentials or misconfigurations
   - Mitigation: Audit authentication flows; implement alerting on auth failures
   - Owner: INFOSEC (monitoring) / INFRA (resolution)

3. **Skill Network Calls** (P1)
   - Issue: 59 skills with potentially unrestricted network access
   - Risk: Data exfiltration, C2 communication, amplification attacks
   - Mitigation: Audit skill behaviors; implement egress filtering
   - Owner: INFOSEC (audit) / ENG (remediation)

4. **Binary-Level Exec Permissions** (P2)
   - Issue: 7/8 agents have broad /bin/bash approval without binary-specific allowlists
   - Risk: Potential for arbitrary command execution
   - Mitigation: Implement granular exec permissions per-tool basis
   - Owner: INFOSEC (policy definition) / ENG (implementation)

5. **Shell Scope Restriction Pending** (P2)
   - Issue: L3-001 shell scope restriction awaiting RED approval since March 13
   - Risk: Extended window for shell command misuse
   - Mitigation: Approve restriction to limit exec surface
   - Owner: RED (approval pending)

### Proposed Hardening Controls

1. **Pre-deploy Security Review Protocol**
   - Requirement: All ENG deployments must undergo security review
   - Implementation: Formal check-in point before any production deploy
   - Status: Not yet established - awaiting ENG sync

2. **Secret Scanning Integration**
   - Requirement: Automated scanning for exposed credentials
   - Implementation: Integrate GitGuardian or similar into commit pipeline
   - Status: Proposed

3. **Granular Execution Permissions**
   - Requirement: Binary-level exec allowlists for agents
   - Implementation: Define specific tools each agent can execute
   - Status: Proposed

4. **Network Egress Filtering**
   - Requirement: Control outbound connections from agent skills
   - Implementation: iptables rules or application-level proxies
   - Status: Proposed

## Compliance Considerations

### China MIIT Safety Guidelines
- Issue: Need to review Chinese telecommunications regulations
- Risk: Non-compliance if expanding to Chinese markets
- Mitigation: Conduct compliance audit; implement required controls
- Owner: INFOSEC (audit) / LEGAL (interpretation)

## Action Items

| Item | Priority | Owner | Due Date | Status |
|------|----------|-------|----------|--------|
| Rotate brave_api_key | P0 | RED | ASAP | OPEN |
| Establish pre-deploy review protocol | P1 | ENG/INFOSEC | ASAP | IN PROGRESS |
| Audit skill network behavior | P1 | INFOSEC | 2026-03-28 | NOT STARTED |
| Implement granular exec permissions | P2 | ENG/INFOSEC | TBD | PROPOSED |
| Approve L3-001 shell scope restriction | P2 | RED | TBD | PENDING |

---
_Last Updated: March 21, 2026_