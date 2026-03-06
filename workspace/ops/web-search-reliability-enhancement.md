# Web Search Reliability Enhancement

## Problem
Repeated `web_search` 401 insufficient_quota failures are blocking operations. Current approach lacks:
- Automatic credential rotation
- Backoff/retry mechanisms
- Circuit breaker protection
- Fallback providers

## Solution Architecture

### 1. Credential Management Enhancement
- Extend existing credential rotation system to handle Perplexity API keys
- Implement proactive credential validation before use
- Add automatic rotation based on usage patterns

### 2. Backoff & Retry Strategy
- Exponential backoff for failed requests
- Configurable retry limits
- Smart failure detection (401 vs 429 vs 5xx)

### 3. Circuit Breaker Pattern
- Track consecutive failures per provider
- Automatic fallback to backup provider
- Alert when circuit is broken

### 4. Multi-Provider Fallback
- Primary: Perplexity Sonar Pro
- Secondary: Exa MCP (already configured)
- Tertiary: Brave Search API

## Implementation Plan

### Phase 1: Enhanced Credential Monitoring (P0)
- Extend `credential-monitor.py` to track web_search usage
- Add API key validation endpoint
- Implement proactive rotation based on quota

### Phase 2: Backoff & Retry (P1)
- Create wrapper around `web_search` tool
- Implement exponential backoff (1s, 2s, 4s, 8s)
- Add circuit breaker with 3 consecutive failures threshold

### Phase 3: Provider Fallback (P1)
- Implement provider switching logic
- Add fallback provider configuration
- Create unified search interface

## Configuration

### Provider Configuration
```json
{
  "web_search": {
    "providers": [
      {
        "name": "perplexity",
        "primary": true,
        "circuit_breaker": {
          "threshold": 3,
          "reset_timeout": 300
        },
        "backoff": {
          "initial_delay": 1,
          "max_delay": 8,
          "multiplier": 2
        }
      },
      {
        "name": "exa",
        "primary": false,
        "circuit_breaker": {
          "threshold": 3,
          "reset_timeout": 600
        }
      },
      {
        "name": "brave",
        "primary": false,
        "api_key_required": true
      }
    ]
  }
}
```

### Monitoring
- Track success/failure rates per provider
- Monitor API quota usage
- Alert on provider degradation

## Rollout Strategy

### Immediate Actions (Today)
1. Extend credential rotation to handle Perplexity keys
2. Add API key validation to credential monitor
3. Implement basic backoff for web_search failures

### Short Term (This Week)
1. Add circuit breaker logic
2. Implement provider fallback
3. Create unified search interface

### Long Term (Next Sprint)
1. Add usage-based rotation triggers
2. Implement provider health monitoring
3. Create dashboard for search reliability

## Success Metrics
- 99%+ web_search availability
- Automatic recovery from provider failures
- Zero manual intervention for credential issues
- Sub-5 minute recovery time for provider outages