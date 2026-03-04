#!/usr/bin/env bash
# twitter-fetch.sh — Authenticated Twitter search via session cookies + Twitter internal API
# Reads credentials from ~/.openclaw/credentials/twitter-session.json
# Usage: twitter-fetch.sh [query]
# Output: JSON array of tweet objects to stdout

set -euo pipefail

CREDS="$HOME/.openclaw/credentials/twitter-session.json"
if [ ! -f "$CREDS" ]; then
    echo '[]' && exit 0
fi

AUTH_TOKEN=$(python3 -c "import json; d=json.load(open('$CREDS')); print(d['auth_token'])")
CT0=$(python3 -c "import json; d=json.load(open('$CREDS')); print(d['ct0'])")
TWID=$(python3 -c "import json; d=json.load(open('$CREDS')); print(d['twid'])")

# Rotate queries to look human (picked by caller or random)
QUERIES=(
    "AI tools agent automation"
    "LLM GPT machine learning 2026"
    "artificial intelligence startup"
    "AI research breakthrough open source"
    "MCP model context protocol agent"
    "Claude Gemini GPT comparison"
    "AI coding tools developer"
    "agentic AI workflow automation"
)
QUERY="${1:-${QUERIES[$((RANDOM % ${#QUERIES[@]}))]}}"
ENCODED_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")

# Random human-like delay (8-45 seconds)
DELAY=$((RANDOM % 38 + 8))
sleep "$DELAY"

# Twitter internal search API (uses same Bearer token as web client)
BEARER="AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I6BeUge7Zu0%3D4puTs6YKBQAAAAAAAABqq4pWr3SuCqeELpHO9C3YUnVGXpPzJzA"

# Random user agents
UA_LIST=(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15"
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
)
UA="${UA_LIST[$((RANDOM % ${#UA_LIST[@]}))]}"

RESULT=$(curl -s --max-time 25 \
    "https://api.twitter.com/1.1/search/tweets.json?q=${ENCODED_QUERY}&result_type=recent&count=20&tweet_mode=extended&lang=en" \
    -H "Cookie: auth_token=${AUTH_TOKEN}; ct0=${CT0}; twid=${TWID}" \
    -H "x-csrf-token: ${CT0}" \
    -H "Authorization: Bearer ${BEARER}" \
    -H "User-Agent: ${UA}" \
    -H "Accept: application/json" \
    -H "Accept-Language: en-US,en;q=0.9" \
    -H "Referer: https://twitter.com/search?q=${ENCODED_QUERY}&f=live" \
    2>/dev/null) || true

# Parse and output normalized JSON array
python3 - << PYEOF
import json, sys

try:
    data = json.loads('''$RESULT''')
    statuses = data.get('statuses', [])
    tweets = []
    for s in statuses[:15]:
        text = s.get('full_text') or s.get('text') or ''
        # Skip retweets if they dominate
        if text.startswith('RT @') and len(tweets) > 5:
            continue
        tweet = {
            'id': str(s['id']),
            'author': s['user']['screen_name'],
            'text': text[:280],
            'url': f"https://twitter.com/{s['user']['screen_name']}/status/{s['id']}",
            'created_at': s['created_at'],
            'likes': s.get('favorite_count', 0),
            'retweets': s.get('retweet_count', 0),
            'replies': s.get('reply_count', 0)
        }
        tweets.append(tweet)
    print(json.dumps(tweets))
except Exception as e:
    sys.stderr.write(f'Parse error: {e}\n')
    print('[]')
PYEOF
