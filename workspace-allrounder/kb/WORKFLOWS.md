# Workflows (Daily/Weekly)

Last updated: 2026-02-09 (America/Toronto)

## Daily deliverables (by morning)

### 1) Daily Full Status (Telegram + Email)
- Cron job name: **Daily Full Status (Telegram bullets + Email PDF)**
- Runs: 21:00 ET
- Mechanism: `/Users/redinside/.openclaw/workspace/scripts/send_daily_status.sh`
- Expected outputs:
  - Telegram bullet summary
  - PDF emailed to `anorag.saxena@gmail.com`

### 2) Portfolio / Market
- Portfolio review (pre-market weekdays): 08:45 ET
- Trading window briefs (weekdays): 08:00–15:30 every 30 min + 16:00 close
- QQQ watch: intraday monitoring (as configured)

### 3) Research brief
- Daily AI + OpenClaw trends brief: 20:30 ET

### 4) Ops reliability
- System Health Watch: every 30 min during weekdays
- Cron Watchdog: every 10 min (08:00–22:00)

## Change management workflow
1) Backup
2) Minimal patch
3) Restart/verify
4) Log change in memory and/or KB
