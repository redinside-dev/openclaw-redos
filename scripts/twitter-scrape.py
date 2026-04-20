#!/usr/bin/env python3
"""
twitter-scrape.py — Authenticated Twitter/X scraping via scrapling StealthyFetcher
Reads session cookies from ~/.openclaw/credentials/twitter-session.json
Usage: python3 twitter-scrape.py [optional_query]
Output: JSON array of tweet objects to stdout
"""

import json
import sys
import time
import random
import re
import os

CREDS_FILE = os.path.expanduser('~/.openclaw/credentials/twitter-session.json')
SCRAPLING_VENV = os.path.expanduser(
    '~/.local/pipx/venvs/scrapling/lib/python3.14/site-packages'
)

# Add scrapling to path
if SCRAPLING_VENV not in sys.path:
    sys.path.insert(0, SCRAPLING_VENV)

# Load credentials
try:
    creds = json.load(open(CREDS_FILE))
    AUTH_TOKEN = creds['auth_token']
    CT0 = creds['ct0']
    TWID = creds['twid']
except Exception as e:
    sys.stderr.write(f'Failed to load credentials: {e}\n')
    print('[]')
    sys.exit(0)

# Rotate queries — looks more human than always the same query
QUERIES = [
    'AI agent tools 2026',
    'LLM GPT model release',
    'artificial intelligence startup launch',
    'MCP model context protocol',
    'AI coding assistant developer',
    'machine learning open source',
    'Claude Gemini GPT announcement',
    'agentic AI workflow automation',
    'AI research breakthrough paper',
    'llm inference performance',
]

query = sys.argv[1] if len(sys.argv) > 1 else random.choice(QUERIES)

# Human-like random delay (8–35 seconds)
delay = random.randint(8, 35)
time.sleep(delay)

# Random user agents
USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
]

try:
    from scrapling.fetchers import StealthyFetcher

    url = f'https://x.com/search?q={query.replace(" ", "+")}&f=live&src=typed_query'

    page = StealthyFetcher.fetch(
        url,
        headless=True,
        cookies=[
            {'name': 'auth_token', 'value': AUTH_TOKEN, 'domain': '.x.com', 'path': '/'},
            {'name': 'ct0', 'value': CT0, 'domain': '.x.com', 'path': '/'},
            {'name': 'twid', 'value': TWID, 'domain': '.x.com', 'path': '/'},
            {'name': 'auth_token', 'value': AUTH_TOKEN, 'domain': '.twitter.com', 'path': '/'},
            {'name': 'ct0', 'value': CT0, 'domain': '.twitter.com', 'path': '/'},
            {'name': 'twid', 'value': TWID, 'domain': '.twitter.com', 'path': '/'},
        ],
        extra_headers={
            'x-csrf-token': CT0,
            'x-twitter-active-user': 'yes',
            'x-twitter-auth-type': 'OAuth2Session',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        network_idle=True,
        wait=random.randint(2000, 4000),
        real_chrome=False,
    )

    # Extract tweets from the rendered page
    tweets = []
    tweet_els = page.find_all('[data-testid="tweet"]')

    for el in tweet_els[:15]:
        try:
            # Text
            text_el = el.find('[data-testid="tweetText"]')
            text = text_el.get_all_text(separator=' ', strip=True) if text_el else ''

            # Author — find <a> with single-segment href like /username
            author_el = el.find('[data-testid="User-Name"]')
            author = ''
            if author_el:
                links = author_el.find_all('a')
                for a in links:
                    href = a.attrib.get('href', '')
                    if href.startswith('/') and '/' not in href[1:]:
                        author = href[1:]
                        break

            # URL — find tweet permalink via <time>'s parent <a>
            time_el = el.find('time')
            tweet_url = ''
            if time_el:
                parent_a = time_el.parent
                if parent_a and parent_a.tag == 'a':
                    tweet_url = 'https://x.com' + parent_a.attrib.get('href', '')

            # Engagement metrics
            likes = 0
            retweets = 0
            for btn in el.find_all('[data-testid$="-count"]') or []:
                testid = btn.attrib.get('data-testid', '')
                val_text = btn.get_all_text(strip=True).replace(',', '')
                try:
                    val = int(val_text) if val_text.isdigit() else 0
                except Exception:
                    val = 0
                if 'like' in testid:
                    likes = val
                elif 'retweet' in testid:
                    retweets = val

            if text and author:
                tweet_id = f'tw_{hash(tweet_url or text) & 0xFFFFFFFF}'
                tweets.append({
                    'id': tweet_id,
                    'author': author,
                    'text': text[:280],
                    'url': tweet_url or f'https://x.com/{author}',
                    'created_at': '',
                    'likes': likes,
                    'retweets': retweets,
                    'replies': 0,
                })
        except Exception:
            continue

    print(json.dumps(tweets))

except Exception as e:
    sys.stderr.write(f'Scraping error: {e}\n')
    print('[]')
