# Tool Schema Compat & Validator — Integration Guide

## Problem
Recurring production failures from tool-call schema drift:
- `channel is required when multiple channels are configured`
- `Slack channels require a channel id (use channel:<id>)`
- `write failed: missing required parameter: content`
- Legacy field names (`sendMessage`, `to`, `filePath`, `text`)

## Solution
Three-layer validation + normalization system:

### Layer 1: Core Validators (`tool-schema-compat.cjs`)
- `normalizeMessageArgs()` — converts legacy message args to current schema
- `validateMessageArgs()` — validates normalized message args
- `normalizeWriteArgs()` — converts legacy write args to current schema
- `validateWriteArgs()` — validates normalized write args

### Layer 2: Cron Helper (`cron-tool-helper.cjs`)
For use in **cron job payloads** and **agent prompts**:
```javascript
const toolHelper = require('/Users/redinside/.openclaw/workspace/tools/cron-tool-helper.cjs');

// Before calling message tool:
const safeArgs = toolHelper.message({
  action: 'sendMessage',  // legacy field name
  to: 'telegram:123',     // legacy field name + inferred channel
  message: 'hello'
});
// Returns: { action: 'send', channel: 'telegram', target: '123', message: 'hello' }

// Before calling write tool:
const safeWrite = toolHelper.write({
  filePath: '/tmp/x.txt',  // legacy field name
  text: 'content'          // legacy field name
});
// Returns: { path: '/tmp/x.txt', content: 'content' }
```

### Layer 3: Gateway Middleware (`tool-call-middleware.js`)
For integration into gateway tool-call dispatch:
```javascript
import ToolCallMiddleware from './tool-call-middleware.js';

// Before executing agent response tool calls:
const validatedResponse = ToolCallMiddleware.wrapAgentResponse(agentResponse);
```

## Integration Checklist

### Immediate (P1 — reduce prod failures now)
- [ ] **Cron jobs**: Add `const toolHelper = require(...)` to job payloads that use `message` or `write` tools
- [ ] **Agent templates**: Update prompt templates to call `toolHelper.message()` / `toolHelper.write()` before tool invocation
- [ ] **Test**: Run a cron job with the helper; verify no validation errors in logs

### Short-term (P2 — gateway-level protection)
- [ ] **Gateway integration**: Import `ToolCallMiddleware` in `server.js`
- [ ] **Hook point**: Call `ToolCallMiddleware.wrapAgentResponse()` right before tool execution
- [ ] **Restart**: `openclaw gateway restart` to activate

### Long-term (P3 — prevent future drift)
- [ ] **Linter**: Add schema validator to cron job editor (validate `payload.message` for tool calls)
- [ ] **Prompt templates**: Audit all agent prompt templates for legacy field names
- [ ] **Documentation**: Update tool schema docs to be the single source of truth

## Files

| File | Purpose | Usage |
|------|---------|-------|
| `tool-schema-compat.cjs` | Core validators + normalizers | Import in helpers/middleware |
| `tool-schema-compat.test.cjs` | Unit tests | `node tool-schema-compat.test.cjs` |
| `cron-tool-helper.cjs` | Cron job helper | `require()` in cron payloads |
| `tool-call-interceptor.cjs` | Batch interceptor | Import in gateway/agents |
| `tool-call-middleware.js` | Gateway middleware | Import in `server.js` |

## Example: Cron Job Integration

**Before (fails with "channel is required"):**
```javascript
// In cron job payload.message:
const result = await message({
  action: 'sendMessage',
  to: 'telegram:1012034994',
  message: 'Portfolio update'
});
```

**After (passes validation):**
```javascript
// In cron job payload.message:
const toolHelper = require('/Users/redinside/.openclaw/workspace/tools/cron-tool-helper.cjs');

const result = await message(
  toolHelper.message({
    action: 'sendMessage',
    to: 'telegram:1012034994',
    message: 'Portfolio update'
  })
);
```

## Testing

Run unit tests:
```bash
node /Users/redinside/.openclaw/workspace/tools/tool-schema-compat.test.cjs
```

Expected output:
```
tool-schema-compat tests passed
```

## Monitoring

After gateway restart, check logs for:
- `[Tool Interceptor]` messages (validation passed)
- `[Tool Validation]` errors (validation failed — these should drop to zero)

Track in `workspace/ops/TICKET-TRACKER.md` under "Tool Schema Compat Rollout".
