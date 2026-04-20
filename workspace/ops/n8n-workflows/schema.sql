-- Production Social Monitoring Database Schema
-- Created: 2026-03-03
-- Purpose: Support twitter-service, reddit-service, aggregator-service, shared-observability

-- Core content storage
CREATE TABLE IF NOT EXISTS content_raw (
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

CREATE INDEX idx_content_platform ON content_raw(platform);
CREATE INDEX idx_content_captured ON content_raw(captured_at);
CREATE INDEX idx_content_dedupe ON content_raw(dedupe_key);

-- Enrichment signals
CREATE TABLE IF NOT EXISTS content_signals (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES content_raw(id) ON DELETE CASCADE,
  sentiment VARCHAR(20),
  keywords_json JSONB,
  topics_json JSONB,
  trend_score FLOAT DEFAULT 0.0,
  enriched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_signals_content ON content_signals(content_id);
CREATE INDEX idx_signals_sentiment ON content_signals(sentiment);
CREATE INDEX idx_signals_enriched ON content_signals(enriched_at);

-- Workflow telemetry
CREATE TABLE IF NOT EXISTS workflow_runs (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  status VARCHAR(20),
  records_in INTEGER DEFAULT 0,
  records_out INTEGER DEFAULT 0,
  error TEXT,
  cost_estimate FLOAT DEFAULT 0.0,
  run_duration_ms INTEGER
);

CREATE INDEX idx_runs_workflow ON workflow_runs(workflow_name);
CREATE INDEX idx_runs_started ON workflow_runs(started_at);
CREATE INDEX idx_runs_status ON workflow_runs(status);

-- Dead letter queue
CREATE TABLE IF NOT EXISTS dlq_events (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  payload_json JSONB NOT NULL,
  error TEXT,
  failed_at TIMESTAMP DEFAULT NOW(),
  replayed_at TIMESTAMP,
  replay_status VARCHAR(20)
);

CREATE INDEX idx_dlq_workflow ON dlq_events(workflow_name);
CREATE INDEX idx_dlq_failed ON dlq_events(failed_at);
CREATE INDEX idx_dlq_replayed ON dlq_events(replayed_at);

-- Daily reports
CREATE TABLE IF NOT EXISTS reports_daily (
  id SERIAL PRIMARY KEY,
  report_date DATE UNIQUE NOT NULL,
  summary_md TEXT,
  trends_json JSONB,
  delivered_to VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_date ON reports_daily(report_date);

-- Retention policy helper views
CREATE OR REPLACE VIEW v_content_retention AS
SELECT 
  platform,
  COUNT(*) as total_records,
  MIN(captured_at) as oldest_record,
  MAX(captured_at) as newest_record,
  COUNT(*) FILTER (WHERE captured_at < NOW() - INTERVAL '90 days') as records_to_archive
FROM content_raw
GROUP BY platform;

CREATE OR REPLACE VIEW v_workflow_health AS
SELECT 
  workflow_name,
  COUNT(*) as total_runs_24h,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY run_duration_ms) as p95_runtime_ms,
  SUM(cost_estimate) as total_cost_24h,
  MAX(ended_at) as last_run
FROM workflow_runs
WHERE started_at >= NOW() - INTERVAL '24 hours'
GROUP BY workflow_name;

-- Cleanup functions
CREATE OR REPLACE FUNCTION cleanup_old_content() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM content_raw WHERE captured_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_runs() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM workflow_runs WHERE started_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_replayed_dlq() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM dlq_events 
  WHERE replayed_at IS NOT NULL 
    AND replayed_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO content_raw (platform, source_id, author, text, url, created_at, engagement_json, dedupe_key)
VALUES 
  ('twitter', 'test_001', '@testuser', 'Sample tweet for testing', 'https://twitter.com/test/001', NOW(), '{"likes": 10, "retweets": 2, "replies": 1}', 'twitter_test_001_2026-03-03'),
  ('reddit', 'test_002', 'u/testuser', 'Sample reddit post', 'https://reddit.com/r/test/002', NOW(), '{"score": 50, "comments": 5, "awards": 0}', 'reddit_test_002_2026-03-03')
ON CONFLICT (dedupe_key) DO NOTHING;

-- Grant permissions (adjust user as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO n8n_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n_user;
