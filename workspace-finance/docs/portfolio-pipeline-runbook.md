# Portfolio Pipeline Data-Readiness Runbook

## Overview
This runbook ensures the portfolio pipeline remains operational by providing:
- Required export files and expected paths
- Validation checklist for data integrity
- One-command refresh procedure
- Failure modes and recovery steps

## Required Export Files

### 1. Holdings File (`workspace/portfolio/HOLDINGS.md`)
**Format:** Markdown table with:
- Ticker symbols (required)
- Share quantities (required)
- Purchase prices (required)
- Market value (calculated)
- Weight % (calculated)

**Example:**
```markdown
# Portfolio Holdings

## Current Positions

### Technology
- **MSFT** - Microsoft Corp (Large Cap) - 15%
- **AAPL** - Apple Inc (Large Cap) - 12%
```

### 2. Trades File (`workspace/portfolio/TRADES.md`)
**Format:** Markdown with:
- Trade date (YYYY-MM-DD)
- Ticker symbol
- Action (BUY/SELL)
- Quantity
- Price per share
- Total value
- Net position impact

**Example:**
```markdown
# Recent Trades (Last 30 Days)

### Buys
- **NVDA** - Added 10% position (2025-02-25)
- **META** - Added 5% position (2025-02-27)
```

## Expected Paths

```
workspace/
├── portfolio/
│   ├── HOLDINGS.md              # Required
│   ├── TRADES.md                # Required
│   ├── positions.csv            # Optional (CSV export)
│   ├── trades.csv               # Optional (CSV export)
│   └── reports/
│       ├── portfolio-review-YYYY-MM-DD.md
│       └── trading-brief-YYYY-MM-DD.md
```

## Validation Checklist

### Pre-Processing Validation
- [ ] HOLDINGS.md exists and readable
- [ ] TRADES.md exists and readable (if available)
- [ ] At least 5 positions listed
- [ ] No duplicate ticker symbols
- [ ] All tickers are valid (4-5 characters, uppercase)
- [ ] Share quantities > 0
- [ ] Purchase prices > 0
- [ ] Total weight = 100% (within 0.5% tolerance)

### Data Integrity Checks
- [ ] No invalid characters in ticker symbols
- [ ] No negative quantities
- [ ] No zero prices
- [ ] All sector allocations sum to 100%
- [ ] Target allocations present and valid

### Post-Processing Validation
- [ ] Portfolio review generated successfully
- [ ] Market data retrieved for all tickers
- [ ] Risk metrics calculated (beta, Sharpe ratio, max drawdown)
- [ ] Watchlist generated
- [ ] Reports saved to reports/ directory

## One-Command Refresh Procedure

### Primary Refresh Command
```bash
cd /Users/redinside/.openclaw/workspace-finance && \
./scripts/portfolio-refresh.sh
```

### Manual Refresh Steps
```bash
# 1. Navigate to workspace
cd /Users/redinside/.openclaw/workspace-finance

# 2. Validate holdings file
python3 scripts/validate-holdings.py workspace/portfolio/HOLDINGS.md

# 3. Generate portfolio review
python3 scripts/portfolio-analyzer.py --holdings workspace/portfolio/HOLDINGS.md \
    --trades workspace/portfolio/TRADES.md --output workspace/reports/

# 4. Generate trading brief
python3 scripts/trading-brief.py --holdings workspace/portfolio/HOLDINGS.md \
    --market-data latest --output workspace/reports/

# 5. Update state files
python3 scripts/update-state.py --status success
```

## Top Failure Modes & Recovery Steps

### 1. Missing Holdings File
**Error:** `ENOENT: no such file or directory, open 'workspace/portfolio/HOLDINGS.md'`

**Recovery Steps:**
1. Check if file was accidentally deleted: `ls -la workspace/portfolio/`
2. If missing, create from last known good backup or manually recreate
3. Ensure proper permissions: `chmod 644 workspace/portfolio/HOLDINGS.md`
4. Verify format matches validation schema

### 2. Invalid File Format
**Error:** JSON parsing error or markdown validation failure

**Recovery Steps:**
1. Open file in text editor to check for syntax errors
2. Restore from backup if recent corruption detected
3. Use validation script to identify specific issues:
   ```bash
   python3 scripts/validate-holdings.py workspace/portfolio/HOLDINGS.md
   ```
4. Fix identified issues and re-run validation

### 3. API Rate Limiting
**Error:** `Perplexity API error (401): insufficient_quota`

**Recovery Steps:**
1. Check current quota usage: `cat workspace/tmp/provider-quota.json`
2. Wait until next quota reset (typically daily)
3. Use cached market data if available
4. Reduce concurrent API calls

### 4. Network Connectivity Issues
**Error:** `ConnectionError: Failed to establish a connection`

**Recovery Steps:**
1. Check internet connectivity: `ping -c 3 google.com`
2. Verify DNS resolution: `nslookup api.perplexity.ai`
3. Restart network services if needed
4. Use offline mode with cached data

### 5. Permission Denied
**Error:** `PermissionError: [Errno 13] Permission denied`

**Recovery Steps:**
1. Check file permissions: `ls -la workspace/portfolio/HOLDINGS.md`
2. Fix permissions if needed: `chmod 644 workspace/portfolio/HOLDINGS.md`
3. Verify ownership: `chown redinside:staff workspace/portfolio/HOLDINGS.md`
4. Check if file is locked by another process

### 6. Out of Memory/Disk Space
**Error:** `MemoryError` or `No space left on device`

**Recovery Steps:**
1. Check available disk space: `df -h`
2. Clear temporary files if needed: `rm -rf workspace/tmp/*`
3. Monitor memory usage: `top` or `htop`
4. Free up resources or upgrade system capacity

## Emergency Recovery Procedure

### When Pipeline Completely Fails
```bash
# 1. Emergency backup
cp workspace/portfolio/HOLDINGS.md workspace/backup/HOLDINGS-`date +%Y%m%d`.md

# 2. Restore from last known good
cp workspace/backup/HOLDINGS-20250308.md workspace/portfolio/HOLDINGS.md

# 3. Force refresh with minimal validation
python3 scripts/portfolio-analyzer.py --force --minimal-validation \
    --holdings workspace/portfolio/HOLDINGS.md --output workspace/reports/

# 4. Verify basic functionality
python3 scripts/validate-holdings.py workspace/portfolio/HOLDINGS.md
```

### Quick Health Check Script
Create `scripts/health-check.sh`:
```bash
#!/bin/bash

echo "=== Portfolio Pipeline Health Check ==="

# Check file existence
if [ ! -f "workspace/portfolio/HOLDINGS.md" ]; then
    echo "❌ HOLDINGS.md missing"
    exit 1
fi

echo "✅ HOLDINGS.md exists"

# Check basic validation
if python3 scripts/validate-holdings.py workspace/portfolio/HOLDINGS.md; then
    echo "✅ Data validation passed"
else
    echo "❌ Data validation failed"
    exit 1
fi

echo "✅ Pipeline appears healthy"
```

## Monitoring & Alerting

### Automated Health Checks
- Run `scripts/health-check.sh` every 15 minutes
- Send alert to FINANCE if any check fails
- Log all health check results to `workspace/logs/health.log`

### Manual Verification Steps
1. Check last successful run timestamp
2. Verify recent reports exist and are current
3. Confirm market data is being retrieved
4. Test one-command refresh procedure

## Recovery Time Objectives (RTO)
- **File Missing:** 5 minutes (restore from backup)
- **Format Corruption:** 10 minutes (restore and validate)
- **API Failures:** 30 minutes (retry with cached data)
- **Network Issues:** 15 minutes (restore connectivity or use offline mode)
- **Permission Issues:** 2 minutes (fix permissions)

## Documentation Links
- Portfolio Analyzer Usage: `docs/portfolio-analyzer.md`
- Validation Schema: `scripts/schemas/holdings-schema.json`
- Recovery Procedures: `docs/recovery-procedures.md`
- API Integration: `docs/api-integration.md`

---
*Runbook Version: 1.0*
*Last Updated: March 13, 2026*
*Next Review: March 20, 2026*