#!/usr/bin/env python3
"""
Memory Integrity Check Script
Validates the integrity of the memory system by checking:
1. episodes.jsonl file structure and content
2. semantic index consistency
3. workspace/memory/*.sqlite files
4. memory search functionality
"""

import json
import os
import sqlite3
import sys
import logging

def check_episodes_file():
    """Check episodes.jsonl file integrity"""
    episodes_path = os.path.expanduser("~/.openclaw/workspace/logs/episodes.jsonl")
    
    if not os.path.exists(episodes_path):
        return f"ERROR: episodes.jsonl file not found at {episodes_path}"
    
    try:
        with open(episodes_path, 'r') as f:
            lines = f.readlines()
        
        if not lines:
            return f"WARNING: episodes.jsonl is empty ({len(lines)} lines)"
        
        valid_lines = 0
        for line in lines:
            try:
                json.loads(line)
                valid_lines += 1
            except json.JSONDecodeError:
                pass
        
        return f"OK: episodes.jsonl has {len(lines)} lines, {valid_lines} valid JSON entries"
        
    except Exception as e:
        return f"ERROR: Failed to read episodes.jsonl - {str(e)}"

def check_semantic_index():
    """Check semantic index consistency"""
    try:
        # Try to query the index
        from memsearch import search
        
        # Test with a simple query
        results = search("test", max_results=1)
        
        if results is not None:
            return "OK: Semantic index queryable (test query successful)"
        else:
            return "WARNING: Semantic index queryable but returned None"
            
    except ImportError:
        return "INFO: memsearch module not available (expected in isolated environment)"
    except Exception as e:
        return f"ERROR: Semantic index check failed - {str(e)}"

def check_sqlite_files():
    """Check workspace/memory/*.sqlite files"""
    memory_dir = os.path.expanduser("~/.openclaw/workspace/memory")
    
    if not os.path.exists(memory_dir):
        return f"INFO: memory directory not found at {memory_dir}"
    
    sqlite_files = [f for f in os.listdir(memory_dir) if f.endswith('.sqlite')]
    
    if not sqlite_files:
        return "INFO: No .sqlite files found in memory directory"
    
    results = []
    for sqlite_file in sqlite_files:
        try:
            conn = sqlite3.connect(os.path.join(memory_dir, sqlite_file))
            cursor = conn.cursor()
            
            # Check if database is accessible
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            if tables:
                results.append(f"OK: {sqlite_file} - {len(tables)} tables accessible")
            else:
                results.append(f"WARNING: {sqlite_file} - no tables found")
                
            conn.close()
            
        except Exception as e:
            results.append(f"ERROR: {sqlite_file} - {str(e)}")
    
    return "\n".join(results)

def main():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    print("=== Memory System Integrity Check ===")
    
    # Check episodes.jsonl
    print("\n1. Episodes File Check:")
    episodes_result = check_episodes_file()
    print(episodes_result)
    
    # Check semantic index
    print("\n2. Semantic Index Check:")
    index_result = check_semantic_index()
    print(index_result)
    
    # Check SQLite files
    print("\n3. SQLite Database Check:")
    sqlite_result = check_sqlite_files()
    print(sqlite_result)
    
    # Generate summary
    print("\n=== SUMMARY ===")
    
    # Count total episodes
    episodes_path = os.path.expanduser("~/.openclaw/workspace/logs/episodes.jsonl")
    if os.path.exists(episodes_path):
        with open(episodes_path, 'r') as f:
            total_episodes = len(f.readlines())
        print(f"Total episodes in episodes.jsonl: {total_episodes}")
    else:
        print("Total episodes: Unknown (episodes.jsonl not found)")
    
    print("Memory integrity check completed.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())