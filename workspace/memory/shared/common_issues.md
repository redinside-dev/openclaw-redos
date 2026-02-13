# Common Issues & Quick Fixes

Frequently encountered problems with quick solutions. For detailed solutions, see solutions_index.md

---

## OpenClaw Configuration

### Invalid Config Keys
**Problem**: "Unrecognized keys" error when restarting gateway
**Quick Fix**: Run `openclaw doctor --fix`
**Why**: OpenClaw schema doesn't support custom config keys

### Gateway Won't Start
**Problem**: Gateway service loaded but not running
**Quick Fix**: Check logs at `/tmp/openclaw/openclaw-[date].log`
**Common causes**: Invalid config, port already in use, missing credentials

---

## API Issues

### Rate Limit Errors (429)
**Problem**: API returns 429 Too Many Requests
**Quick Fix**: Wait 60 seconds, then retry
**Prevention**: Implement rate limiting in your code

### Authentication Failed
**Problem**: API returns 401 Unauthorized
**Quick Fix**: Check API key in `openclaw.json` → `env.vars`
**Check**: Key not expired, has correct permissions

---

## Model Issues

### Model Not Available
**Problem**: Agent can't use specified model
**Quick Fix**: Check model is in `models.providers` config
**Verify**: Provider credentials are valid

### Fallback Model Used
**Problem**: Primary model failed, fallback used (higher cost)
**Quick Fix**: Check primary model status
**Prevention**: Configure robust fallback chain

---

## Telegram Bot Issues

### Bot Not Responding
**Problem**: Telegram bot receives messages but doesn't respond
**Quick Fix**: Check `openclaw status` → Telegram channel status
**Verify**: Token is valid, bot is not blocked

---

## Mission Control Issues

### Gateway Bridge Offline
**Problem**: Mission Control shows "Gateway Offline"
**Quick Fix**: Check bridge is running on port 8081
**Verify**: `curl http://127.0.0.1:8081/api/health`

### UI Not Updating
**Problem**: Dashboard shows stale data
**Quick Fix**: Check browser console for errors
**Verify**: Gateway Bridge is polling successfully

---

## Memory & Performance

### Context Window Full
**Problem**: Agent hits context limit
**Quick Fix**: OpenClaw auto-compacts, wait for completion
**Prevention**: Use shorter conversations, split topics

### Slow Response
**Problem**: Agent takes long time to respond
**Check**: Model being used (tier 1 = fast, tier 5 = slow but smart)
**Fix**: Switch to faster model for simple tasks

---

## Adding New Issues

When you encounter and solve a new common issue:

1. Add it to this file under appropriate category
2. Include: Problem, Quick Fix, Why/Prevention
3. Link to detailed solution if complex
4. Keep it brief - this is for QUICK reference

**Template:**
```markdown
### [Issue Name]
**Problem**: [What happens]
**Quick Fix**: [Fast solution]
**Why/Prevention**: [Optional - root cause or how to avoid]
**Detailed solution**: [Optional - link if complex]
```

---

Last updated: 2026-02-12
