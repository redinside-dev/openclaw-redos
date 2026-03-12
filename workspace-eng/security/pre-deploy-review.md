# Security Review Protocol

## Pre-Deploy Review Requirements
Before deploying any security-relevant changes, ENG must submit for INFOSEC review:

### What requires review:
- **exec permissions** - Any changes to tool execution permissions or security modes
- **tool allowlists** - Modifications to tool policies, security configurations, or access controls
- **credential handling** - Code that manages secrets, tokens, API keys, or authentication
- **deployment scripts** - Scripts that modify system state, install software, or configure security settings
- **security-critical code** - Any code affecting agent boundaries, privilege escalation, or data protection

### Review Checklist:
1. **Hardcoded secrets** - No plaintext credentials, tokens, or API keys
2. **exec injection** - Safe command construction, input validation, proper escaping
3. **path traversal** - Safe file path handling, no directory traversal vulnerabilities
4. **cross-agent privilege escalation** - No privilege escalation between agent boundaries
5. **prompt injection vectors** - No injection points that could manipulate agent behavior
6. **tool policy violations** - Compliance with existing security tool policies

### Review Response Format:
- **APPROVED** - Changes are secure and ready for deployment
- **APPROVED WITH CONDITIONS** - Changes are mostly secure but require specific modifications
- **BLOCKED** - Changes are insecure and must not be deployed

### Required Documentation:
- Code changes with context
- Security implications explained
- Testing approach for security-critical functionality
- Rollback plan if issues are discovered

## Logging:
All review decisions must be logged to `security/reviews.jsonl` with:
- Timestamp
- Reviewer (INFOSEC)
- Requester (ENG)
- Change description
- Review decision
- Specific findings/reasons
- Approval timestamp if approved

## Process Flow:
1. ENG identifies security-relevant changes
2. ENG submits code/config to INFOSEC
3. INFOSEC performs review using checklist
4. INFOSEC responds with decision and logs it
5. ENG acts on decision (deploy or revise)
6. Both parties log the interaction

## Emergency Exceptions:
For critical security fixes with no alternatives, ENG may deploy immediately but must:
- Document the emergency
- Notify INFOSEC within 1 hour
- Submit for retroactive review
- Prepare rollback if review fails