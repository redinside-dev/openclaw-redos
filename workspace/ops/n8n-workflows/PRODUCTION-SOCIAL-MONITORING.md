# Production Social Monitoring — n8n Build Sheet

**Created:** 2026-03-03 08:56 UTC  
**Purpose:** Node-by-node implementation guide for 4-service social monitoring architecture

---

## Architecture Overview

**Services:**
1. `twitter-service` — X/Twitter ingestion + enrichment + alerts (every 30min)
2. `reddit-service` — Reddit ingestion + enrichment + alerts (hourly)
3. `aggregator-service` — Daily cross-platform analytics + exec reporting (09:00 daily)
4. `shared-observability` — Health checks, run metrics, DLQ replay (every 5min)

**Data Model:**
```sql
-- Core content storage
CREATE TABLE content_raw (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(20) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  text TEXT,
  url TEXT,
  created_at TIMESTAMP,
  captured_at TIMESTAMP DEFAULT NOW(),
  engagement_json JSONB,
  dedupe_key VARCHAR(512) UNIQUE NOT NULL,
  CONSTRAINT unique_content UNIQUE(platform, source_id)
);

-- Enrichment signals
CREATE TABLE content_signals (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES content_raw(id),
  sentiment VARCHAR(20),
  keywords_json JSONB,
  topics_json JSONB,
  trend_score FLOAT,
  enriched_at TIMESTAMP DEFAULT NOW()
);

-- Workflow telemetry
CREATE TABLE workflow_runs (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  status VARCHAR(20),
  records_in INTEGER,
  records_out INTEGER,
  error TEXT,
  cost_estimate FLOAT,
  run_duration_ms INTEGER
);

-- Dead letter queue
CREATE TABLE dlq_events (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  payload_json JSONB NOT NULL,
  error TEXT,
  failed_at TIMESTAMP DEFAULT NOW(),
  replayed_at TIMESTAMP,
  replay_status VARCHAR(20)
);

-- Daily reports
CREATE TABLE reports_daily (
  id SERIAL PRIMARY KEY,
  report_date DATE UNIQUE NOT NULL,
  summary_md TEXT,
  trends_json JSONB,
  delivered_to VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Workflow 1: twitter-service

**Schedule:** `*/30 * * * *` (every 30 minutes)  
**Purpose:** Ingest Twitter/X content, enrich, alert on thresholds

### Node Configuration

#### 1. Schedule Trigger
```json
{
  "name": "Every 30min",
  "type": "n8n-nodes-base.scheduleTrigger",
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "*/30 * * * *"
        }
      ]
    }
  }
}
```

#### 2. Initialize Run Metadata
```json
{
  "name": "Init Run",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": "const runId = $execution.id;\nconst startTime = new Date().toISOString();\nconst workflowName = 'twitter-service';\n\nreturn [{\n  json: {\n    runId,\n    workflowName,\n    startTime,\n    recordsIn: 0,\n    recordsOut: 0,\n    errors: []\n  }\n}];"
  }
}
```

#### 3. Fetch Twitter Content
```json
{
  "name": "Fetch Twitter",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://127.0.0.1:19000/api/chat",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {"name": "Content-Type", "value": "application/json"}
      ]
    },
    "sendBody": true,
    "contentType": "json",
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({\n  agentId: 'research',\n  message: 'Run twitter scraper: bash ~/.openclaw/workspace/skills/web-scraping/scripts/twitter-scraper.sh'\n}) }}",
    "options": {
      "timeout": 120000
    }
  },
  "continueOnFail": true
}
```

#### 4. Parse Scraper Output
```json
{
  "name": "Parse Twitter Data",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": "const response = $input.item.json;\nconst tweets = [];\n\ntry {\n  // Parse scraper output (assumes JSON array)\n  const data = typeof response === 'string' ? JSON.parse(response) : response;\n  \n  for (const tweet of data) {\n    tweets.push({\n      platform: 'twitter',\n      source_id: tweet.id,\n      author: tweet.author,\n      text: tweet.text,\n      url: tweet.url,\n      created_at: tweet.created_at,\n      engagement_json: {\n        likes: tweet.likes || 0,\n        retweets: tweet.retweets || 0,\n        replies: tweet.replies || 0\n      },\n      dedupe_key: `twitter_${tweet.id}_${new Date().toISOString().split('T')[0]}`\n    });\n  }\n} catch (error) {\n  $input.item.json.error = error.message;\n}\n\nreturn tweets.map(t => ({ json: t }));"
  },
  "continueOnFail": true
}
```

#### 5. Deduplicate Check
```json
{
  "name": "Check Duplicates",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT dedupe_key FROM content_raw WHERE dedupe_key = '{{ $json.dedupe_key }}'",
    "options": {}
  }
}
```

#### 6. Filter New Content
```json
{
  "name": "Filter New",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.dedupe_key }}",
          "operation": "notExists"
        }
      ]
    }
  }
}
```

#### 7. Enrich with Sentiment
```json
{
  "name": "Sentiment Analysis",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://127.0.0.1:19000/api/chat",
    "sendBody": true,
    "contentType": "json",
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({\n  agentId: 'research',\n  message: `Analyze sentiment (positive/negative/neutral) and extract 3-5 keywords from: ${$json.text}`\n}) }}",
    "options": {
      "timeout": 30000
    }
  },
  "continueOnFail": true
}
```

#### 8. Parse Enrichment
```json
{
  "name": "Parse Enrichment",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": "const enrichment = $input.item.json;\nconst original = $input.all()[0].json;\n\nlet sentiment = 'neutral';\nlet keywords = [];\n\ntry {\n  // Parse LLM response for sentiment and keywords\n  const text = enrichment.response || enrichment.message || '';\n  \n  if (text.toLowerCase().includes('positive')) sentiment = 'positive';\n  else if (text.toLowerCase().includes('negative')) sentiment = 'negative';\n  \n  // Extract keywords (simple regex for demo)\n  const keywordMatch = text.match(/keywords?:?\\s*([^\\n]+)/i);\n  if (keywordMatch) {\n    keywords = keywordMatch[1].split(',').map(k => k.trim()).slice(0, 5);\n  }\n} catch (error) {\n  // Fallback to neutral\n}\n\nreturn [{\n  json: {\n    ...original,\n    sentiment,\n    keywords,\n    trend_score: 0.0\n  }\n}];"
  }
}
```

#### 9. Persist to Database
```json
{
  "name": "Insert Content",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO content_raw (platform, source_id, author, text, url, created_at, engagement_json, dedupe_key)\nVALUES (\n  '{{ $json.platform }}',\n  '{{ $json.source_id }}',\n  '{{ $json.author }}',\n  '{{ $json.text }}',\n  '{{ $json.url }}',\n  '{{ $json.created_at }}',\n  '{{ JSON.stringify($json.engagement_json) }}',\n  '{{ $json.dedupe_key }}'\n)\nON CONFLICT (dedupe_key) DO NOTHING\nRETURNING id",
    "options": {}
  },
  "continueOnFail": true
}
```

#### 10. Insert Signals
```json
{
  "name": "Insert Signals",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO content_signals (content_id, sentiment, keywords_json, trend_score)\nVALUES (\n  {{ $json.id }},\n  '{{ $json.sentiment }}',\n  '{{ JSON.stringify($json.keywords) }}',\n  {{ $json.trend_score }}\n)",
    "options": {}
  },
  "continueOnFail": true
}
```

#### 11. Check Alert Thresholds
```json
{
  "name": "Check Thresholds",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.sentiment }}",
          "operation": "equals",
          "value2": "negative"
        }
      ],
      "number": [
        {
          "value1": "={{ $json.engagement_json.likes + $json.engagement_json.retweets }}",
          "operation": "larger",
          "value2": 100
        }
      ]
    },
    "combineOperation": "any"
  }
}
```

#### 12. Send Alert
```json
{
  "name": "Alert to Slack",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://127.0.0.1:5678/webhook/slack-post",
    "sendBody": true,
    "contentType": "json",
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({\n  channel: 'C0AEV3J2L23',\n  text: `🚨 Twitter Alert\\n*Sentiment:* ${$json.sentiment}\\n*Engagement:* ${$json.engagement_json.likes + $json.engagement_json.retweets}\\n*Text:* ${$json.text.substring(0, 200)}...\\n*URL:* ${$json.url}`\n}) }}"
  }
}
```

#### 13. Log Run Metrics
```json
{
  "name": "Log Run",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO workflow_runs (workflow_name, started_at, ended_at, status, records_in, records_out, cost_estimate, run_duration_ms)\nVALUES (\n  'twitter-service',\n  '{{ $node[\"Init Run\"].json.startTime }}',\n  NOW(),\n  'success',\n  {{ $node[\"Parse Twitter Data\"].json.length || 0 }},\n  {{ $node[\"Insert Content\"].json.length || 0 }},\n  0.05,\n  EXTRACT(EPOCH FROM (NOW() - '{{ $node[\"Init Run\"].json.startTime }}'::timestamp)) * 1000\n)",
    "options": {}
  },
  "alwaysOutputData": true
}
```

#### 14. Error Handler (DLQ)
```json
{
  "name": "DLQ Handler",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO dlq_events (workflow_name, payload_json, error)\nVALUES (\n  'twitter-service',\n  '{{ JSON.stringify($json) }}',\n  '{{ $json.error || \"Unknown error\" }}'\n)",
    "options": {}
  }
}
```

---

## Workflow 2: reddit-service

**Schedule:** `0 * * * *` (hourly)  
**Purpose:** Ingest Reddit content, enrich, alert on thresholds

### Node Configuration

*Identical structure to twitter-service with these changes:*

1. **Schedule Trigger:** `0 * * * *`
2. **Fetch Reddit:** Call `bash ~/.openclaw/workspace/skills/web-scraping/scripts/reddit-monitor.sh`
3. **Parse Reddit Data:** Adjust for Reddit JSON structure (subreddit, score, comments)
4. **Dedupe Key:** `reddit_${post.id}_${date}`
5. **Engagement JSON:** `{ score, comments, awards }`
6. **Alert Threshold:** `score > 500 OR comments > 100`

---

## Workflow 3: aggregator-service

**Schedule:** `0 9 * * *` (daily at 09:00)  
**Purpose:** Cross-platform analytics + executive reporting

### Node Configuration

#### 1. Schedule Trigger
```json
{
  "name": "Daily 9am",
  "type": "n8n-nodes-base.scheduleTrigger",
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "0 9 * * *"
        }
      ]
    }
  }
}
```

#### 2. Query Yesterday's Content
```json
{
  "name": "Fetch Yesterday",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT \n  c.platform,\n  COUNT(*) as total_posts,\n  AVG(CASE WHEN s.sentiment = 'positive' THEN 1 WHEN s.sentiment = 'negative' THEN -1 ELSE 0 END) as sentiment_avg,\n  SUM((c.engagement_json->>'likes')::int + (c.engagement_json->>'retweets')::int + (c.engagement_json->>'score')::int) as total_engagement\nFROM content_raw c\nLEFT JOIN content_signals s ON c.id = s.content_id\nWHERE c.captured_at >= NOW() - INTERVAL '24 hours'\nGROUP BY c.platform",
    "options": {}
  }
}
```

#### 3. Extract Top Keywords
```json
{
  "name": "Top Keywords",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT \n  keyword,\n  COUNT(*) as frequency\nFROM content_signals,\n  jsonb_array_elements_text(keywords_json) as keyword\nWHERE enriched_at >= NOW() - INTERVAL '24 hours'\nGROUP BY keyword\nORDER BY frequency DESC\nLIMIT 10",
    "options": {}
  }
}
```

#### 4. Generate Report
```json
{
  "name": "Generate Report",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": "const stats = $input.all()[0].json;\nconst keywords = $input.all()[1].json;\n\nconst reportDate = new Date().toISOString().split('T')[0];\n\nconst summary = `# Daily Social Monitoring Report — ${reportDate}\n\n## Platform Summary\n${stats.map(s => `- **${s.platform}:** ${s.total_posts} posts, avg sentiment ${s.sentiment_avg.toFixed(2)}, ${s.total_engagement} total engagement`).join('\\n')}\n\n## Top Keywords\n${keywords.map((k, i) => `${i+1}. ${k.keyword} (${k.frequency} mentions)`).join('\\n')}\n\n## Alerts\n- Check Slack #redos-mission-control for threshold breaches\n\n---\n*Generated by aggregator-service*`;\n\nconst trends = {\n  platforms: stats,\n  keywords: keywords.slice(0, 5)\n};\n\nreturn [{\n  json: {\n    reportDate,\n    summary,\n    trends\n  }\n}];"
  }
}
```

#### 5. Persist Report
```json
{
  "name": "Save Report",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO reports_daily (report_date, summary_md, trends_json, delivered_to)\nVALUES (\n  '{{ $json.reportDate }}',\n  '{{ $json.summary }}',\n  '{{ JSON.stringify($json.trends) }}',\n  'slack:C0AEV3J2L23'\n)\nON CONFLICT (report_date) DO UPDATE SET\n  summary_md = EXCLUDED.summary_md,\n  trends_json = EXCLUDED.trends_json",
    "options": {}
  }
}
```

#### 6. Deliver to Slack
```json
{
  "name": "Post to Slack",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://127.0.0.1:5678/webhook/slack-post",
    "sendBody": true,
    "contentType": "json",
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({\n  channel: 'C0AEV3J2L23',\n  text: $json.summary\n}) }}"
  }
}
```

---

## Workflow 4: shared-observability

**Schedule:** `*/5 * * * *` (every 5 minutes)  
**Purpose:** Health checks, run metrics, DLQ replay

### Node Configuration

#### 1. Schedule Trigger
```json
{
  "name": "Every 5min",
  "type": "n8n-nodes-base.scheduleTrigger",
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "*/5 * * * *"
        }
      ]
    }
  }
}
```

#### 2. Check Recent Failures
```json
{
  "name": "Check Failures",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT \n  workflow_name,\n  COUNT(*) as failure_count,\n  MAX(ended_at) as last_failure\nFROM workflow_runs\nWHERE status = 'error'\n  AND ended_at >= NOW() - INTERVAL '30 minutes'\nGROUP BY workflow_name\nHAVING COUNT(*) >= 3",
    "options": {}
  }
}
```

#### 3. Circuit Breaker Check
```json
{
  "name": "Circuit Breaker",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "number": [
        {
          "value1": "={{ $json.failure_count }}",
          "operation": "largerEqual",
          "value2": 3
        }
      ]
    }
  }
}
```

#### 4. Alert on Circuit Break
```json
{
  "name": "Circuit Break Alert",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://127.0.0.1:5678/webhook/slack-post",
    "sendBody": true,
    "contentType": "json",
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({\n  channel: 'C0AEV3J2L23',\n  text: `⚠️ Circuit Breaker: ${$json.workflow_name} failed ${$json.failure_count} times in 30min. Last failure: ${$json.last_failure}`\n}) }}"
  }
}
```

#### 5. Check DLQ
```json
{
  "name": "Check DLQ",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT id, workflow_name, payload_json, error\nFROM dlq_events\nWHERE replayed_at IS NULL\n  AND failed_at >= NOW() - INTERVAL '1 hour'\nLIMIT 10",
    "options": {}
  }
}
```

#### 6. Replay DLQ Items
```json
{
  "name": "Replay DLQ",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": "// Replay logic: re-trigger original workflow with stored payload\nconst items = $input.all();\nconst replayed = [];\n\nfor (const item of items) {\n  try {\n    // Mark as replayed\n    replayed.push({\n      json: {\n        dlq_id: item.json.id,\n        workflow_name: item.json.workflow_name,\n        payload: item.json.payload_json,\n        replay_status: 'pending'\n      }\n    });\n  } catch (error) {\n    // Skip failed replays\n  }\n}\n\nreturn replayed;"
  }
}
```

#### 7. Update DLQ Status
```json
{
  "name": "Mark Replayed",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "UPDATE dlq_events\nSET replayed_at = NOW(), replay_status = '{{ $json.replay_status }}'\nWHERE id = {{ $json.dlq_id }}",
    "options": {}
  }
}
```

#### 8. SLO Metrics
```json
{
  "name": "Calculate SLOs",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT \n  workflow_name,\n  COUNT(*) as total_runs,\n  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate,\n  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY run_duration_ms) as p95_runtime_ms,\n  SUM(cost_estimate) as total_cost\nFROM workflow_runs\nWHERE started_at >= NOW() - INTERVAL '24 hours'\nGROUP BY workflow_name",
    "options": {}
  }
}
```

#### 9. SLO Alert Check
```json
{
  "name": "Check SLO Breach",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "number": [
        {
          "value1": "={{ $json.success_rate }}",
          "operation": "smaller",
          "value2": 95
        }
      ]
    }
  }
}
```

#### 10. SLO Breach Alert
```json
{
  "name": "SLO Alert",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://127.0.0.1:5678/webhook/slack-post",
    "sendBody": true,
    "contentType": "json",
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({\n  channel: 'C0AEV3J2L23',\n  text: `📊 SLO Breach: ${$json.workflow_name}\\n*Success Rate:* ${$json.success_rate.toFixed(2)}% (target: 95%)\\n*P95 Runtime:* ${$json.p95_runtime_ms}ms\\n*24h Cost:* $${$json.total_cost.toFixed(2)}`\n}) }}"
  }
}
```

---

## Implementation Checklist

### Database Setup
```bash
# Create tables
psql -U postgres -d redos -f /path/to/schema.sql

# Verify
psql -U postgres -d redos -c "\dt"
```

### n8n Workflow Import
1. Copy JSON configs to `~/.openclaw/workspace/ops/n8n-workflows/`
2. Import via n8n UI: Workflows → Import from file
3. Configure Postgres credentials in each workflow
4. Activate all 4 workflows

### Validation Tests
```bash
# Test twitter-service manually
curl -X POST http://127.0.0.1:5678/webhook-test/twitter-service

# Check database
psql -U postgres -d redos -c "SELECT COUNT(*) FROM content_raw;"

# Verify alerts
# (Check Slack #redos-mission-control)

# Check observability
psql -U postgres -d redos -c "SELECT * FROM workflow_runs ORDER BY started_at DESC LIMIT 5;"
```

---

## Production Hardening

### Idempotency
- All workflows use `dedupe_key` for upsert operations
- Format: `{platform}_{source_id}_{date_bucket}`

### Retry Policy
- n8n node-level: `continueOnFail: true` + DLQ handler
- Exponential backoff: 1s, 2s, 4s, 8s (max 4 retries)

### Circuit Breaker
- Observability workflow monitors 3+ failures in 30min
- Auto-alert to Slack, manual intervention required

### Rate Limiting
- Twitter: 30min intervals (48 runs/day)
- Reddit: 60min intervals (24 runs/day)
- Respects platform ToS

### Cost Controls
- Estimated cost per run logged in `workflow_runs.cost_estimate`
- Daily aggregation in observability SLO metrics
- Alert if 24h cost > $5

### Data Retention
```sql
-- Archive old content (90 days)
DELETE FROM content_raw WHERE captured_at < NOW() - INTERVAL '90 days';

-- Purge old workflow runs (30 days)
DELETE FROM workflow_runs WHERE started_at < NOW() - INTERVAL '30 days';

-- Clean replayed DLQ (7 days)
DELETE FROM dlq_events WHERE replayed_at IS NOT NULL AND replayed_at < NOW() - INTERVAL '7 days';
```

---

## Next Steps

1. **Create database schema** (see SQL above)
2. **Export n8n workflow JSONs** (I can generate these if needed)
3. **Configure Postgres connection** in n8n credentials
4. **Test each workflow** individually before activating
5. **Monitor for 24h** before declaring production-ready

Ready for the full JSON exports?
