#!/usr/bin/env python3
"""
Telegram ↔ RedOS Bridge Gateway
Polls Telegram for messages, routes commands to RedOS, sends responses back.
"""
import json
import subprocess
import os
import sys
import time
import signal
import logging
import urllib.request
import urllib.error
import urllib.parse
import threading

# ── Paths ───────────────────────────────────────────────────────────────────

LOG_FILE = "/tmp/telegram-bridge.log"
HEALTH_FILE = os.path.expanduser("~/.shared/system-health.jsonl")
STATUS_FILE = os.path.expanduser("~/.openclaw/state/system-status.json")
SERVICE_REGISTRY = os.path.expanduser("~/.openclaw/config/service-registry.json")
TOKEN_FALLBACK_PATH = os.path.expanduser("~/.openclaw/config/telegram-bot-token.txt")

# ── Token resolution ─────────────────────────────────────────────────────────

# Token resolved lazily at startup so --help works without a token.
def resolve_token():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if token:
        return token
    fallback = os.path.expanduser("~/.openclaw/config/telegram-bot-token.txt")
    if os.path.exists(fallback):
        with open(fallback) as f:
            token = f.read().strip()
            if token:
                return token
    print("ERROR: TELEGRAM_BOT_TOKEN not set", file=sys.stderr)
    sys.exit(1)

BASE_URL = None  # set after resolve_token() in main()
HERMES_URL = "http://localhost:18789/chat"

POLL_TIMEOUT = 60
HEARTBEAT_INTERVAL = 60
BACKOFF_INITIAL = 1.0
BACKOFF_MAX = 30.0

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("telegram-bridge")

# ── State ───────────────────────────────────────────────────────────────────

poll_offset = 0
running = True

# ── Telegram API helpers ─────────────────────────────────────────────────────

def api_get(method, params=None):
    url = f"{BASE_URL}/{method}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=POLL_TIMEOUT + 10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        log.error(f"Telegram API GET {method} failed: {e}")
        raise


def api_post(method, data):
    url = f"{BASE_URL}/{method}"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        log.error(f"Telegram API POST {method} failed: {e}")
        raise


def send_message(chat_id, text):
    for i in range(0, len(text), 4096):
        chunk = text[i : i + 4096]
        try:
            api_post("sendMessage", {"chat_id": chat_id, "text": chunk})
        except Exception as e:
            log.error(f"sendMessage failed: {e}")


# ── Health heartbeat ─────────────────────────────────────────────────────────

def heartbeat(status="running"):
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime()),
        "component": "telegram-bridge",
        "status": status,
        "poll_offset": poll_offset,
    }
    try:
        with open(HEALTH_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        log.warning(f"Could not write heartbeat: {e}")


# ── Command handlers ────────────────────────────────────────────────────────

def cmd_status(chat_id):
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE) as f:
                data = json.load(f)
            send_message(chat_id, json.dumps(data, indent=2))
            return
        except Exception as e:
            send_message(chat_id, f"Error reading status: {e}")
            return
    send_message(chat_id, "No status available")


def cmd_health(chat_id):
    try:
        with open(HEALTH_FILE) as f:
            lines = f.readlines()
        if lines:
            entry = json.loads(lines[-1].strip())
            ts = entry.get("ts", "unknown")
            status = entry.get("status", "unknown")
            src = entry.get("source", "unknown")
            send_message(chat_id, f"Last heartbeat: {ts}\nStatus: {status}\nSource: {src}")
        else:
            send_message(chat_id, "No health data available")
    except Exception as e:
        send_message(chat_id, f"Error reading health: {e}")


def cmd_services(chat_id):
    try:
        result = subprocess.run(
            ["launchctl", "list"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        rows = []
        for line in result.stdout.splitlines():
            if "ai.openclaw" in line:
                parts = line.split("\t")
                label = parts[0] if len(parts) > 0 else line
                pid = parts[1] if len(parts) > 1 else "-"
                status = parts[2] if len(parts) > 2 else "-"
                rows.append(f"{label:<45} PID={pid or '-':>6}  {status}")

        if rows:
            header = f"{'Service':<45} {'PID':>6}  Status"
            send_message(chat_id, header + "\n" + "\n".join(rows))
        else:
            send_message(chat_id, "No ai.openclaw services found.")
    except Exception as e:
        send_message(chat_id, f"launchctl error: {e}")


def cmd_logs(chat_id):
    try:
        result = subprocess.run(
            [
                "log", "show",
                "--predicate", 'process == "OpenClaw" OR process == "hermes"',
                "--last", "5m",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        truncated = result.stdout[-1500:]
        send_message(chat_id, f"```\n{truncated}\n```")
    except Exception as e:
        send_message(chat_id, f"Log read error: {e}")


def cmd_restart(chat_id, service_id):
    try:
        with open(SERVICE_REGISTRY) as f:
            registry = json.load(f)
    except Exception as e:
        send_message(chat_id, f"Could not read service registry: {e}")
        return

    service = None
    for s in registry.get("services", []):
        if s["id"] == service_id:
            service = s
            break

    if not service:
        send_message(chat_id, f"Unknown service: {service_id}")
        return

    restart_cmd = service.get("restart")
    if not restart_cmd:
        send_message(chat_id, f"No restart command for {service_id}")
        return

    try:
        subprocess.run(restart_cmd, shell=True, capture_output=True, timeout=30)
        send_message(chat_id, f"Restart triggered for {service_id}")
    except Exception as e:
        send_message(chat_id, f"Restart failed for {service_id}: {e}")


def cmd_help(chat_id):
    send_message(
        chat_id,
        "Available commands:\n"
        "!status     — RedOS system status\n"
        "!health     — last heartbeat\n"
        "!services   — launchctl services\n"
        "!logs       — recent OpenClaw/hermes logs\n"
        "!restart <id> — restart a service\n"
        "!help       — this message\n\n"
        "Anything else -> hermes (RedOS LLM).",
    )


def forward_to_hermes(chat_id, message):
    payload = {
        "message": message,
        "chat_id": chat_id,
        "source": "telegram",
    }
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            HERMES_URL,
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
        return result.get("response") or result.get("text") or str(result)
    except Exception as e:
        log.error(f"hermes forward failed: {e}")
        return f"[hermes error: {e}]"


def route(chat_id, text):
    text = text.strip()
    if text == "!status":
        cmd_status(chat_id)
    elif text == "!health":
        cmd_health(chat_id)
    elif text == "!services":
        cmd_services(chat_id)
    elif text == "!logs":
        cmd_logs(chat_id)
    elif text.startswith("!restart "):
        cmd_restart(chat_id, text.split(" ", 1)[1].strip())
    elif text in ("!help", "!h"):
        cmd_help(chat_id)
    else:
        send_message(chat_id, forward_to_hermes(chat_id, text))


# ── Polling loop ─────────────────────────────────────────────────────────────

def poll():
    global poll_offset
    backoff = BACKOFF_INITIAL

    while running:
        try:
            params = {"timeout": POLL_TIMEOUT, "allowed_updates": "message"}
            if poll_offset:
                params["offset"] = poll_offset

            resp = api_get("getUpdates", params)

            if not resp.get("ok"):
                log.warning(f"Telegram API error: {resp}")
                time.sleep(backoff)
                backoff = min(backoff * 2, BACKOFF_MAX)
                continue

            updates = resp.get("result", [])
            if not updates:
                backoff = BACKOFF_INITIAL
                continue

            for update in updates:
                try:
                    msg = update.get("message", {})
                    chat_id = msg.get("chat", {}).get("id")
                    text = msg.get("text", "")
                    if chat_id and text:
                        log.info(f"From {chat_id}: {text[:60]}")
                        route(chat_id, text)
                    poll_offset = update["update_id"] + 1
                except Exception as e:
                    log.error(f"Update processing error: {e}")

            backoff = BACKOFF_INITIAL

        except urllib.error.HTTPError as e:
            log.error(f"HTTP error during poll: {e}")
            time.sleep(backoff)
            backoff = min(backoff * 2, BACKOFF_MAX)
        except Exception as e:
            log.error(f"Poll error: {e}")
            time.sleep(backoff)
            backoff = min(backoff * 2, BACKOFF_MAX)


# ── Shutdown ─────────────────────────────────────────────────────────────────

def shutdown(signum, frame):
    global running
    running = False
    log.info("Shutdown signal received")
    heartbeat(status="stopping")
    log.info("telegram-bridge stopped")
    sys.exit(0)


# ── Heartbeat background thread ──────────────────────────────────────────────

def heartbeat_loop():
    while running:
        time.sleep(HEARTBEAT_INTERVAL)
        if running:
            heartbeat()


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    global BASE_URL
    BASE_URL = f"https://api.telegram.org/bot{resolve_token()}"
    log.info("telegram-bridge starting")
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    heartbeat(status="running")

    hb = threading.Thread(target=heartbeat_loop, daemon=True)
    hb.start()

    log.info("Polling Telegram...")
    poll()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("Usage: telegram-bridge.py [--help]")
        print("TELEGRAM_BOT_TOKEN env or ~/.openclaw/config/telegram-bot-token.txt")
        sys.exit(0)
    main()