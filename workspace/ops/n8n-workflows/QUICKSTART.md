# Quick Start Guide — Production Social Monitoring

**Created:** 2026-03-03 08:58 UTC  
**Prerequisites:** PostgreSQL, n8n running on localhost:5678

---

## Step 1: Database Setup

Since PostgreSQL isn't installed yet, you have two options:

### Option A: Install PostgreSQL via Homebrew
```bash
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb redos

# Run schema
psql -d redos -f ~/.openclaw/workspace/ops/n8n-workflows/schema.sql
```

### Option B: Use SQLite (Lightweight Alternative)

n8n supports SQLite out of the box. Here's the SQLite schema:

```bash
# Create SQLite database
sqlite3 ~/.openclaw/workspace/data/social-monitoring.db < ~/.openclaw/workspace/ops/n8n-workflows/schema-sqlite.sql
```

I'll create the SQLite schema next since it's faster to get started.

---

## Step 2: Configure n8n Credentials

1. Open n8n: `http://127.0.0.1:5678`
2. Go to **Settings** → **Credentials** → **Add Credential**
3. Select **Postgres** (or **SQLite**)
4. Configure:
   - **Host:** `localhost` (Postgres) or **File Path:** `~/.openclaw/workspace/data/social-monitoring.db` (SQLite)
   - **Database:** `redos`
   - **User:** `postgres` (or your user)
   - **Password:** (if set)
5. Test connection → Save as `social-monitoring-db`

---

## Step 3: Import Workflows

```bash
# I'll generate the 4 workflow JSON files next
# Then import via n8n UI: Workflows → Import from file
```

---

## Step 4: Configure Scraper Scripts

The workflows call these scripts:
- `~/.openclaw/workspace/skills/web-scraping/scripts/twitter-scraper.sh`
- `~/.openclaw/workspace/skills/web-scraping/scripts/reddit-monitor.sh`

Let me check if they exist and are configured properly.

---

## Step 5: Activate & Monitor

1. Activate all 4 workflows in n8n
2. Monitor first runs in n8n execution log
3. Check database: `SELECT * FROM workflow_runs ORDER BY started_at DESC LIMIT 5;`
4. Watch Slack #redos-mission-control for alerts

---

**Next:** Creating SQLite schema + checking scraper scripts...
