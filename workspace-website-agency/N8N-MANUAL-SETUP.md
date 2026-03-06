# N8N Setup - Manual Instructions

## Steps to create website-agency webhook in n8n:

1. **Open n8n**: http://127.0.0.1:5678

2. **Create new workflow**: Click "+" button

3. **Add Webhook node**:
   - Search for "Webhook" in node search
   - Set HTTP Method: POST
   - Set Path: `website-agency`
   - Copy the webhook URL shown

4. **Add Execute Command node** (or any action you want):
   - Connect it to the Webhook
   - Command: `python3 /Users/redinside/.openclaw/workspace-website-agency/scripts/run_pipeline.py --stage full --count 50`

5. **Add Respond node**:
   - Connect to Execute Command
   - Set Response Body: `{"ok": true}`

6. **Activate**: Toggle the switch at top-right

7. **Test**:
   ```bash
   curl -X POST http://127.0.0.1:5678/webhook/website-agency \
     -H "Content-Type: application/json" \
     -d '{"stage": "full"}'
   ```

---

## For the website agency to work 24/7:

### Option 1: Use n8n Schedule Trigger
- Add a "Schedule Trigger" node instead of Webhook
- Set to run every 4 hours
- Connect to Python script node

### Option 2: Use Cron + Webhook
- Create webhook as above
- Add cron job that calls webhook:
  ```bash
  curl -X POST http://127.0.0.1:5678/webhook/website-agency
  ```

---

## The Python scripts work fine!
Run manually:
```bash
python3 /Users/redinside/.openclaw/workspace-website-agency/scripts/run_pipeline.py --stage full
```
