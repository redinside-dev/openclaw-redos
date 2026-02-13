import argparse, json, subprocess, pathlib

URL = "http://127.0.0.1:11434/api/chat"

SCHEMA_PATHS = {
  "ticket_triage": "bench/schemas/ticket_triage.json",
  "notes_action_items": "bench/schemas/notes_action_items.json",
  "research_brief": "bench/schemas/research_brief.json",
  "rewrite_shorten": "bench/schemas/rewrite_shorten.json",
}

REQ_FIELDS = {
  "ticket_triage": ["summary","category","severity","suggested_owner_team","next_actions","missing_info"],
  "notes_action_items": ["meeting_title","date","action_items"],
  "research_brief": ["topic","summary_bullets","risks","recommended_next_actions"],
  "rewrite_shorten": ["tone","shortened_text","key_points"],
}

def curl_chat(payload, max_time=90):
    cmd = [
        "curl","--max-time",str(max_time),"-sS","-X","POST",URL,
        "-H","Content-Type: application/json",
        "--data-binary","@-",
        "-w","\n__TIMINGS__{\"time_starttransfer\":%{time_starttransfer},\"time_total\":%{time_total}}\n",
    ]
    p = subprocess.run(cmd, input=json.dumps(payload).encode("utf-8"), capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode("utf-8", errors="replace")[-500:])
    out = p.stdout.decode("utf-8", errors="replace")
    body, timing_line = out.rsplit("__TIMINGS__", 1)
    return json.loads(body.strip()), json.loads(timing_line.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--prompt-set", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    prompts = [json.loads(l) for l in pathlib.Path(args.prompt_set).read_text().splitlines() if l.strip()]

    results = []
    for i, item in enumerate(prompts, start=1):
        task = item["task"]
        schema = json.loads(pathlib.Path(SCHEMA_PATHS[task]).read_text())
        payload = {
            "model": args.model,
            "stream": False,
            "format": schema,
            "options": {"temperature": 0},
            "messages": [
                {"role": "system", "content": "Return ONLY valid JSON matching the schema. No markdown."},
                {"role": "user", "content": item["input"]},
            ],
        }

        row = {"i": i, "task": task}
        try:
            resp, t = curl_chat(payload)
            content = (resp.get("message") or {}).get("content") or ""
            row.update({"ttft_s": t.get("time_starttransfer"), "total_s": t.get("time_total"), "raw_len": len(content)})
            ok = True
            missing = []
            try:
                parsed = json.loads(content)
                missing = [k for k in REQ_FIELDS[task] if k not in parsed]
                if missing:
                    ok = False
            except Exception:
                ok = False
            row.update({"ok_schema": ok, "missing_fields": missing})
        except Exception as e:
            row.update({"error": str(e), "ok_schema": False})
        results.append(row)

    out = {"runner": "bench_ollama.py", "model": args.model, "results": results}
    pathlib.Path(args.out).write_text(json.dumps(out, indent=2))
    print(args.out)

if __name__ == "__main__":
    main()
