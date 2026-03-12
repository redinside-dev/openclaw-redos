#!/usr/bin/env python3
"""
Preview Server for Website Agency
Serves built HTML sites locally for demos/outreach
"""
import http.server
import socketserver
import os
import threading

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITES_DIR = os.path.join(BASE_DIR, "sites")
PORT = 8765

class SitesHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SITES_DIR, **kwargs)

    def log_message(self, format, *args):
        pass  # Suppress default logging

_server = None
_thread = None

def start():
    global _server, _thread
    if _server:
        return PORT
    _server = socketserver.TCPServer(("", PORT), SitesHandler)
    _server.allow_reuse_address = True
    _thread = threading.Thread(target=_server.serve_forever, daemon=True)
    _thread.start()
    return PORT

def get_preview_url(slug: str) -> str:
    """Get preview URL for a site slug (e.g. 'joes-pizza' -> URL)"""
    return f"http://localhost:{PORT}/{slug}.html"

if __name__ == "__main__":
    port = start()
    print(f"Preview server running at http://localhost:{port}")
    print(f"Sites dir: {SITES_DIR}")
    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        _server.shutdown()
