import json
import subprocess
import time
import uuid

URL = "http://127.0.0.1:11434/api/chat"
MODEL = "llama3.1:8b"

SCHEMAS = {
    "ticket_triage": {
        "schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "category": {"type": "string", "description": "One of: bug, feature, incident, question, ops"},
                "severity": {"type": "string", "description": "One of: low, medium, high, critical"},
                "suggested_owner_team": {"type": "string"},
                "next_actions": {"type": "array", "items": {"type": "string"}},
                "missing_info": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["summary", "category", "severity", "suggested_owner_team", "next_actions", "missing_info"],
        },
        "required": ["summary", "category", "severity", "suggested_owner_team", "next_actions", "missing_info"],
        "cases": [
            "Customer reports intermittent 500 errors on /login. Started after deploy 2026-02-08 21:00. Happens more on mobile. No stacktrace attached.",
            "Request: add export-to-CSV button on the analytics dashboard for weekly KPIs. Needed by Ops by Friday.",
            "Incident: CPU on Mac mini runner spiked to 95% and CI jobs are queueing. Disk usage at 92%.",
            "Question: What is the process to rotate API keys for the staging environment?",
        ],
    },
    "notes_action_items": {
        "schema": {
            "type": "object",
            "properties": {
                "meeting_title": {"type": "string"},
                "date": {"type": "string"},
                "action_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "task": {"type": "string"},
                            "owner": {"type": "string"},
                            "due": {"type": "string"},
                            "dependencies": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["task", "owner", "due", "dependencies"],
                    },
                },
            },
            "required": ["meeting_title", "date", "action_items"],
        },
        "required": ["meeting_title", "date", "action_items"],
        "cases": [
            "Meeting notes: Sprint planning. Decide to ship onboarding v2 behind a flag. Jen to confirm timeline with CS. Anurag to draft instrumentation plan. Need to update runbooks. Target: end of week.",
            "Notes: Security review. Rotate staging keys. Enable 2FA for admin accounts. Add alert for unusual login rate. Owner: IT for 2FA rollout.",
            "Notes: Ops sync. Reduce support backlog. Create canned responses for top 5 issues. Train new hire on escalation policy.",
        ],
    },
    "research_summary": {
        "schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string"},
                "summary_bullets": {"type": "array", "items": {"type": "string"}},
                "risks": {"type": "array", "items": {"type": "string"}},
                "recommended_next_actions": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["topic", "summary_bullets", "risks", "recommended_next_actions"],
        },
        "required": ["topic", "summary_bullets", "risks", "recommended_next_actions"],
        "cases": [
            "Summarize: We want to evaluate local LLMs for internal drafting/extraction. Constraints: localhost-only, deterministic routing, security-first. Need a 48h POC plan.",
            "Summarize: New vendor proposes an 'agent' that auto-reads email + posts to Slack. We worry about data exfiltration and prompt injection. Provide a short brief.",
            "Summarize: MCP ecosystem is evolving; we want to standardize tool interfaces but avoid installing untrusted skills. Provide a policy outline.",
        ],
    },
}


def validate_required_fields(parsed, required):
    return [k for k in required if k not in parsed]


def curl_chat(payload):
    payload_bytes = json.dumps(payload).encode("utf-8")
    # Write-out JSON for timings on stderr, response body on stdout
    cmd = [
        "curl",
        "-sS",
        "-X",
        "POST",
        URL,
        "-H",
        "Content-Type: application/json",
        "--data-binary",
        "@-",
        "-w",
        "\n__TIMINGS__{\"time_starttransfer\":%{time_starttransfer},\"time_total\":%{time_total}}\n",
    ]
    p = subprocess.run(cmd, input=payload_bytes, capture_output=True, check=False)
    out = p.stdout.decode("utf-8", errors="replace")
    err = p.stderr.decode("utf-8", errors="replace")
    if p.returncode != 0:
        raise RuntimeError(f"curl failed rc={p.returncode} stderr={err[-500:]}")

    # timings marker is appended to stdout
    if "__TIMINGS__" not in out:
        raise RuntimeError("missing timings marker")
    body, timing_line = out.rsplit("__TIMINGS__", 1)
    timings = json.loads(timing_line.strip())

    body = body.strip()
    resp = json.loads(body)
    return resp, timings


def run():
    session = str(uuid.uuid4())
    results = []

    for task, spec in SCHEMAS.items():
        for idx, text in enumerate(spec["cases"], start=1):
            prompt = (
                "Return ONLY valid JSON matching the provided schema."
                " Do not include markdown or commentary.\n\n"
                f"INPUT:\n{text}"
            )
            payload = {
                "model": MODEL,
                "stream": False,
                "format": spec["schema"],
                "options": {"temperature": 0},
                "messages": [
                    {"role": "system", "content": "You are a precise internal assistant. Output must be JSON only."},
                    {"role": "user", "content": prompt},
                ],
            }

            row = {"task": task, "case": idx}
            t0 = time.time()
            try:
                resp, timings = curl_chat(payload)
                content = (resp.get("message") or {}).get("content") or ""
                row.update(
                    {
                        "ttft_s" : timings.get("time_starttransfer"),
                        "total_s": timings.get("time_total"),
                        "raw_len": len(content),
                    }
                )

                ok_schema = True
                missing = []
                parsed = None
                try:
                    parsed = json.loads(content)
                    missing = validate_required_fields(parsed, spec["required"])
                    if missing:
                        ok_schema = False
                except Exception:
                    ok_schema = False

                row["ok_schema"] = ok_schema
                row["missing_fields"] = missing
                # quick subjective score (real scoring should be human)
                row["quality_1_5"] = 4 if ok_schema else 1

            except Exception as e:
                row["error"] = str(e)
                row["ok_schema"] = False
                row["quality_1_5"] = 1

            row["ts"] = t0
            results.append(row)

    print(
        json.dumps(
            {
                "session": session,
                "model": MODEL,
                "url": URL,
                "results": results,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    run()
