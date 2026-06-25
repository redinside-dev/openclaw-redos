# Credential Exposure Risk Assessment

## Findings

### 1. PERPLEXITY_API_KEY
- **Type**: Provider API Key
- **Blast Radius**: High (affects AI model access)
- **Git History**: Not checked (exec blocked)
- **Risk**: HIGH
- **Action**: Rotate immediately

### 2. MINIMAX_API_KEY
- **Type**: Provider API Key
- **Blast Radius**: Medium (model access)
- **Git History**: Not checked (exec blocked)
- **Risk**: MEDIUM
- **Action**: Rotate within 7 days

### 3. Brave Search API Key
- **Type**: Provider API Key
- **Blast Radius**: Medium (search functionality)
- **Git History**: Not checked (exec blocked)
- **Risk**: MEDIUM
- **Action**: Rotate within 14 days

### 4. Slack botToken
- **Type**: Authentication Token
- **Blast Radius**: High (channel access)
- **Git History**: Not checked (exec blocked)
- **Risk**: CRITICAL
- **Action**: Rotate immediately

### 5. Slack appToken
- **Type**: Authentication Token
- **Blast Radius**: High (channel access)
- **Git History**: Not checked (exec blocked)
- **Risk**: CRITICAL
- **Action**: Rotate immediately

### 6. Hooks auth token
- **Type**: Authentication Token
- **Blast Radius**: Medium (webhooks)
- **Git History**: Not checked (exec blocked)
- **Risk**: MEDIUM
- **Action**: Rotate within 30 days

### 7. Gateway auth token
- **Type**: Authentication Token
- **Blast Radius**: High (system access)
- **Git History**: Not checked (exec blocked)
- **Risk**: CRITICAL
- **Action**: Rotate immediately

## Limitations
- Git history analysis blocked due to exec restrictions
- Some keys appear in the config but not in the listed 7
- No access to .git directory inspection

## Priority Order
1. Slack botToken & appToken (CRITICAL)
2. Gateway auth token (CRITICAL)
3. PERPLEXITY_API_KEY (HIGH)
4. MINIMAX_API_KEY (MEDIUM)
5. Brave Search API Key (MEDIUM)
6. Hooks auth token (MEDIUM)
7. Remaining keys (LOW)

## Recommendations
- Implement automated secret scanning
- Enforce git history checks for credential exposure
- Rotate all tokens with high blast radius