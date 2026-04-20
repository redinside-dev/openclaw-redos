#!/usr/bin/env python3
import json
import re
from datetime import datetime
from pathlib import Path

def parse_entry(block, platform):
    """Parse a single entry block from feed file."""
    lines = block.strip().split('\n')

    # Extract title (between **)
    title_match = re.search(r'\*\*(.+?)\*\*', lines[0])
    title = title_match.group(1).strip() if title_match else ""

    # Extract URL from Source line
    url = ""
    for line in lines:
        if line.strip().startswith("Source:"):
            url = line.split("Source:")[1].strip()
            break

    # Extract score
    score = 0
    for line in lines:
        if line.strip().startswith("Score:"):
            try:
                score = int(line.split("Score:")[1].strip())
            except:
                score = 0
            break

    # Extract date (last line with underscore format)
    date_str = ""
    for line in reversed(lines):
        if line.strip().startswith("_") and line.strip().endswith("_"):
            date_str = line.strip().strip("_")
            break

    # Extract summary (lines between Score and date, excluding title line)
    summary_lines = []
    in_summary = False
    for line in lines[1:]:  # Skip title line
        if line.strip().startswith("Score:"):
            in_summary = True
            continue
        if in_summary:
            if line.strip().startswith("_"):
                break
            summary_lines.append(line.strip())

    summary = " ".join(summary_lines).strip()

    return {
        "title": title,
        "url": url,
        "summary": summary,
        "score": score,
        "platform": platform,
        "date": date_str
    }

def parse_feed(filepath, platform):
    """Parse entire feed file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by --- delimiters
    blocks = content.split('---')

    entries = []
    for block in blocks:
        # Skip empty or header blocks
        if not block.strip() or "**" not in block:
            continue
        entry = parse_entry(block, platform)
        if entry["title"]:  # Only add if title exists
            entries.append(entry)

    return entries

def main():
    workspace = Path("/Users/redinside/.openclaw/workspace")
    ideas_dir = workspace / "ideas"
    ideas_dir.mkdir(parents=True, exist_ok=True)

    # Parse feeds
    twitter_entries = parse_feed(ideas_dir / "twitter-feed.md", "twitter")
    reddit_entries = parse_feed(ideas_dir / "reddit-feed.md", "reddit")

    all_entries = twitter_entries + reddit_entries

    # Sort by score descending
    all_entries.sort(key=lambda x: x["score"], reverse=True)

    # Keep top 200
    top_entries = all_entries[:200]

    # Build output
    result = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total": len(top_entries),
        "ideas": top_entries
    }

    # Write JSON
    output_path = ideas_dir / "ideas-index.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    # Count by platform
    twitter_count = sum(1 for e in top_entries if e["platform"] == "twitter")
    reddit_count = sum(1 for e in top_entries if e["platform"] == "reddit")

    print(f"Indexed {len(top_entries)} ideas ({twitter_count} twitter, {reddit_count} reddit)")
    print(f"Wrote {output_path}")

if __name__ == "__main__":
    main()
