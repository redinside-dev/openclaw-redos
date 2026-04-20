#!/usr/bin/env python3
import sys
import os
import requests
import json
from datetime import datetime

def parse_holdings(holdings_path):
    """Parse holdings file and extract US-listed tickers from TFSA+RRSP."""
    us_tickers = []
    try:
        with open(holdings_path, 'r') as f:
            lines = f.readlines()
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            parts = line.split(',')
            if len(parts) < 4:
                continue
                
            account, symbol, asset_type, approx_weight = parts
            account = account.strip()
            symbol = symbol.strip()
            
            # Skip crypto and non-US tickers
            if asset_type.strip() == 'Crypto':
                continue
            if any(x in symbol for x in ['.B', '.TO', '.CA', '.L', '.AU', '.NZ']):
                continue
            
            # Only consider TFSA and RRSP
            if account in ['TFSA', 'RRSP']:
                try:
                    weight = float(approx_weight.strip())
                    us_tickers.append((symbol, weight))
                except ValueError:
                    continue
                    
    except Exception as e:
        print(f"Error reading holdings file: {e}")
        return []
    
    return us_tickers

def get_alpha_vantage_quote(symbol, api_key):
    """Get global quote from Alpha Vantage."""
    url = f"https://www.alphavantage.co/query"
    params = {
        "function": "GLOBAL_QUOTE",
        "symbol": symbol,
        "apikey": api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if "Global Quote" not in data or not data["Global Quote"]:
            return None
            
        quote = data["Global Quote"]
        return {
            "symbol": quote.get("01. symbol", ""),
            "price": quote.get("05. price", ""),
            "change_percent": quote.get("10. change percent", "")
        }
        
    except Exception as e:
        print(f"Error fetching quote for {symbol}: {e}")
        return None

def main():
    holdings_path = sys.argv[1] if len(sys.argv) > 1 else "/Users/redinside/.openclaw/workspace/portfolio/HOLDINGS.md"
    top_n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY", "demo")
    
    # Parse holdings
    us_tickers = parse_holdings(holdings_path)
    
    if not us_tickers:
        print("No US-listed tickers found in holdings.")
        return
    
    # Sort by weight and take top N
    us_tickers.sort(key=lambda x: x[1], reverse=True)
    top_tickers = us_tickers[:top_n]
    
    print(f"Top {top_n} US tickers by weight:")
    for symbol, weight in top_tickers:
        print(f"  {symbol}: {weight:.2f}%")
    
    # Fetch quotes
    quotes = []
    for symbol, weight in top_tickers:
        quote = get_alpha_vantage_quote(symbol, api_key)
        if quote:
            quotes.append(quote)
    
    if not quotes:
        print("No quote data available.")
        return
    
    # Sort by absolute change percent
    quotes.sort(key=lambda x: abs(float(x["change_percent"][:-1]) if x["change_percent"] else 0), reverse=True)
    
    # Build message
    message = []
    message.append("Market Leads")
    message.append("")
    
    # Today's bias
    if quotes:
        total_change = sum(float(q["change_percent"][:-1]) for q in quotes if q["change_percent"])
        avg_change = total_change / len(quotes)
        if avg_change > 0:
            message.append("Today's bias: Market showing positive momentum.")
        elif avg_change < 0:
            message.append("Today's bias: Market showing negative momentum.")
        else:
            message.append("Today's bias: Mixed market signals.")
    else:
        message.append("Today's bias: Data not available.")
    
    message.append("")
    
    # Top movers
    movers = []
    for quote in quotes[:3]:
        if not quote["change_percent"]:
            continue
        change_percent = float(quote["change_percent"][:-1])
        direction = "up" if change_percent > 0 else "down"
        movers.append(f"- {quote['symbol']}: {abs(change_percent):.1f}% {direction}")
    
    if movers:
        message.append("Top movers to watch:")
        message.extend(movers)
    else:
        message.append("Top movers to watch: No significant movers detected.")
    
    message.append("")
    
    # Risk / do-not-do
    message.append("Risk / do-not-do:")
    message.append("- Avoid chasing large gap moves without confirmation.")
    
    # Footer
    message.append("")
    message.append("Provider: Alpha Vantage | Model: FINANCE")
    
    # Print message
    full_message = "\n".join(message)
    print(full_message)
    
    # Send to Telegram (would normally use message tool, but for testing we print)
    print(f"\n--- Message to send to Telegram ---\n{full_message}")
    print(f"Length: {len(full_message)} characters")

if __name__ == "__main__":
    main()
