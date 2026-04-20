# Pre-Deploy Review Protocol

## Protocol Established
I've created a comprehensive security review protocol for pre-deployment of security-relevant changes. The protocol covers:

### What requires review:
- exec permissions and security modes
- tool allowlists and access controls  
- credential handling and secrets management
- deployment scripts and system modifications
- security-critical code affecting agent boundaries

### Review Checklist:
1. Hardcoded secrets detection
2. exec injection prevention  
3. Path traversal protection
4. Cross-agent privilege escalation prevention
5. Prompt injection vector analysis
6. Tool policy compliance

### Process Flow:
1. ENG identifies security-relevant changes
2. ENG submits code/config to INFOSEC
3. INFOSEC performs review using checklist
4. INFOSEC responds with decision (APPROVED / APPROVED WITH CONDITIONS / BLOCKED)
5. ENG acts on decision
6. All decisions logged to security/reviews.jsonl

### Documentation Requirements:
- Code changes with context
- Security implications explained
- Testing approach
- Rollback plan

### Emergency Exceptions:
For critical fixes, immediate deployment allowed with 1-hour retroactive review notification

## Next Steps
When you need me to deploy security-relevant changes, I'll follow this protocol:
1. Prepare the code/config changes
2. Submit them to you for review
3. Wait for your APPROVED/APPROVED WITH CONDITIONS/BLOCKED decision
4. Act accordingly
5. Log the review decision

The protocol is now in place and ready for use. Please review and let me know if you need any modifications to the checklist or process flow.