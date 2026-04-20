-- SQLite Schema for Production Social Monitoring
-- Created: 2026-03-03
-- Purpose: Lightweight alternative to PostgreSQL for social monitoring workflows

-- Core content storage
CREATE TABLE IF NOT EXISTS content_raw (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  source_id TEXT NOT NULL,
  author TEXT,
  text TEXT,
  url TEXT,
  created_at TEXT,
  captured_at TEXT DEFAULT (datetime('now')),
  engagement_json TEXT,
  dedupe_key TEXT UNIQUE NOT NULL,
  UNIQUE(platform, source_id)
);

CREATE INDEX IF NOT EXISTS idx_content_platform ON content_raw(platform);
CREATE INDEX IF NOT EXISTS idx_content_captured ON content_raw(captured_at);
CREATE INDEX IF NOT EXISTS idx_content_dedupe ON content_raw(dedupe_key);

-- Enrichment signals
CREATE TABLE IF NOT EXISTS content_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  sentiment TEXT,
  keywords_json TEXT,
  topics_json TEXT,
  trend_score REAL DEFAULT 0.0,
  enriched_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (content_id) REFERENCES content_raw(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signals_content ON content_signals(content_id);
CREATE INDEX IF NOT EXISTS idx_signals_sentiment ON content_signals(sentiment);
CREATE INDEX IF NOT EXISTS idx_signals_enriched ON content_signals(enriched_at);

-- Workflow telemetry
CREATE TABLE IF NOT EXISTS workflow_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT,
  records_in INTEGER DEFAULT 0,
  records_out INTEGER DEFAULT 0,
  error TEXT,
  cost_estimate REAL DEFAULT 0.0,
  run_duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_runs_workflow ON workflow_runs(workflow_name);
CREATE INDEX IF NOT EXISTS idx_runs_started ON workflow_runs(started_at);
CREATE INDEX IF NOT EXISTS idx_runs_status ON workflow_runs(status);

-- Dead letter queue
CREATE TABLE IF NOT EXISTS dlq_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_name TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  error TEXT,
  failed_at TEXT DEFAULT (datetime('now')),
  replayed_at TEXT,
  replay_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_dlq_workflow ON dlq_events(workflow_name);
CREATE INDEX IF NOT EXISTS idx_dlq_failed ON dlq_events(failed_at);
CREATE INDEX IF NOT EXISTS idx_dlq_replayed ON dlq_events(replayed_at);

-- Daily reports
CREATE TABLE IF NOT EXISTS reports_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT UNIQUE NOT NULL,
  summary_md TEXT,
  trends_json TEXT,
  delivered_to TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_date ON reports_daily(report_date);

-- Sample data for testing
INSERT OR IGNORE INTO content_raw (platform, source_id, author, text, url, created_at, engagement_json, dedupe_key)
VALUES 
  ('twitter', 'test_001', '@testuser', 'Sample tweet for testing', 'https://twitter.com/test/001', datetime('now'), '{"likes": 10, "retweets": 2, "replies": 1}', 'twitter_test_001_2026-03-03'),
  ('reddit', 'test_002', 'u/testuser', 'Sample reddit post', 'https://reddit.com/r/test/002', datetime('now'), '{"score": 50, "comments": 5, "awards": 0}', 'reddit_test_002_2026-03-03');

-- Verification queries
-- SELECT COUNT(*) as total_content FROM content_raw;
-- SELECT * FROM workflow_runs ORDER BY started_at DESC LIMIT 5;
-- SELECT workflow_name, COUNT(*) as runs FROM workflow_runs GROUP BY workflow_name;
