#!/bin/bash
# Validation script for production social monitoring deployment
# Run this after importing workflows to verify everything is configured correctly

set -e

echo "=== Production Social Monitoring Validation ==="
echo ""

# Check database exists
echo "✓ Checking database..."
if [ -f ~/.openclaw/workspace/data/social-monitoring.db ]; then
    echo "  Database exists: social-monitoring.db"
else
    echo "  ✗ Database not found!"
    exit 1
fi

# Check tables
echo ""
echo "✓ Checking database schema..."
TABLE_COUNT=$(sqlite3 ~/.openclaw/workspace/data/social-monitoring.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
echo "  Tables found: $TABLE_COUNT (expected: 5)"

if [ "$TABLE_COUNT" -eq 5 ]; then
    echo "  ✓ All tables present"
else
    echo "  ✗ Missing tables!"
    exit 1
fi

# Check sample data
echo ""
echo "✓ Checking sample data..."
SAMPLE_COUNT=$(sqlite3 ~/.openclaw/workspace/data/social-monitoring.db "SELECT COUNT(*) FROM content_raw;")
echo "  Sample records: $SAMPLE_COUNT"

# Check n8n is running
echo ""
echo "✓ Checking n8n status..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5678 | grep -q "200\|302"; then
    echo "  ✓ n8n is running on port 5678"
else
    echo "  ✗ n8n is not accessible!"
    exit 1
fi

# Check workflow files exist
echo ""
echo "✓ Checking workflow files..."
WORKFLOWS=(
    "twitter-service.json"
    "reddit-service.json"
    "aggregator-service.json"
    "shared-observability.json"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f ~/.openclaw/workspace/ops/n8n-workflows/$workflow ]; then
        echo "  ✓ $workflow"
    else
        echo "  ✗ $workflow missing!"
        exit 1
    fi
done

# Check scraper scripts
echo ""
echo "✓ Checking scraper scripts..."
if [ -f ~/.openclaw/workspace/skills/web-scraping/scripts/twitter-scraper.sh ]; then
    echo "  ✓ twitter-scraper.sh"
else
    echo "  ✗ twitter-scraper.sh missing!"
fi

if [ -f ~/.openclaw/workspace/skills/web-scraping/scripts/reddit-monitor.sh ]; then
    echo "  ✓ reddit-monitor.sh"
else
    echo "  ✗ reddit-monitor.sh missing!"
fi

# Check targets config
echo ""
echo "✓ Checking targets configuration..."
if [ -f ~/.openclaw/workspace/skills/web-scraping/config/targets.json ]; then
    TWITTER_PROFILES=$(jq -r '.twitter.profiles | length' ~/.openclaw/workspace/skills/web-scraping/config/targets.json)
    REDDIT_SUBS=$(jq -r '.reddit.subreddits | length' ~/.openclaw/workspace/skills/web-scraping/config/targets.json)
    echo "  ✓ Twitter profiles: $TWITTER_PROFILES"
    echo "  ✓ Reddit subreddits: $REDDIT_SUBS"
else
    echo "  ✗ targets.json missing!"
fi

# Check n8n API key
echo ""
echo "✓ Checking n8n API key..."
if [ -f ~/.openclaw/workspace/config/n8n-api-key.txt ]; then
    echo "  ✓ API key configured"
else
    echo "  ✗ API key missing!"
fi

# Test database queries
echo ""
echo "✓ Testing database queries..."
sqlite3 ~/.openclaw/workspace/data/social-monitoring.db "SELECT platform, COUNT(*) as count FROM content_raw GROUP BY platform;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✓ Database queries working"
else
    echo "  ✗ Database query failed!"
    exit 1
fi

echo ""
echo "=== Validation Complete ==="
echo ""
echo "Next steps:"
echo "1. Open n8n: http://127.0.0.1:5678"
echo "2. Add SQLite credential: social-monitoring-db"
echo "3. Import 4 workflow JSON files"
echo "4. Activate all workflows"
echo "5. Test twitter-service manually"
echo ""
echo "Documentation:"
echo "  • Full design: ~/.openclaw/workspace/ops/n8n-workflows/PRODUCTION-SOCIAL-MONITORING.md"
echo "  • Quick start: ~/.openclaw/workspace/ops/n8n-workflows/QUICKSTART.md"
echo "  • Deployment: ~/.openclaw/workspace/ops/n8n-workflows/DEPLOYMENT-SUMMARY.md"
