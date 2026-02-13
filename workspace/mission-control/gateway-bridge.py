#!/usr/bin/env python3
"""
OpenClaw Gateway Bridge
Polls OpenClaw CLI and exposes REST API for Mission Control
No external dependencies - uses only Python standard library
"""

import json
import logging
import subprocess
import threading
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import os
from pathlib import Path

# Configuration
API_PORT = 8081
POLL_INTERVAL = 3  # seconds
OPENCLAW_CONFIG_PATH = Path.home() / ".openclaw" / "openclaw.json"

# Available models
AVAILABLE_MODELS = {
    "tier5": ["claude-code/sonnet-4.5"],
    "tier4": ["openai-codex/gpt-5.2", "openai-codex/gpt-4.7"],
    "tier3": ["perplexity/sonar-pro"],
    "tier2": ["zai/glm-4.7", "zai/glm-4.7-flashx", "moonshot/kimi-k2.5"],
    "tier1": ["ollama/qwen2.5-coder:7b", "ollama/llama3.1:8b"]
}

# Shared state
gateway_data = {
    "connected": False,
    "last_update": None,
    "agents": [],
    "tasks": [],
    "budget": {
        "daily": {"spent": 0, "limit": 2.0},
        "monthly": {"spent": 0, "limit": 30.0, "fixed": 460}
    },
    "models": {},
    "events": [],
    "metrics": {
        "active_agents": 0,
        "active_sessions": 0,
        "running_tasks": 0,
        "models_available": 0
    },
    "gateway_status": "unknown",
    "error": None
}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class APIHandler(BaseHTTPRequestHandler):
    """HTTP request handler for REST API"""

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)

        if parsed_path.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            response = {
                "connected": gateway_data["connected"],
                "last_update": gateway_data["last_update"],
                "agents": gateway_data["agents"],
                "tasks": gateway_data["tasks"],
                "budget": gateway_data["budget"],
                "models": gateway_data["models"],
                "events": gateway_data["events"][-50:],
                "metrics": gateway_data["metrics"],
                "gateway_status": gateway_data["gateway_status"],
                "error": gateway_data["error"]
            }

            self.wfile.write(json.dumps(response).encode())

        elif parsed_path.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())

        elif parsed_path.path == '/api/config':
            # Return current agent configuration
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            config = get_agent_config()
            self.wfile.write(json.dumps(config).encode())

        elif parsed_path.path == '/api/models':
            # Return available models
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(AVAILABLE_MODELS).encode())

        elif parsed_path.path == '/api/security':
            # Return security data: grants, requests, trust scores, audit log
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            security_data = get_security_data()
            self.wfile.write(json.dumps(security_data).encode())

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')

    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        content_length = int(self.get_header('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        if parsed_path.path.startswith('/api/agents/') and parsed_path.path.endswith('/model'):
            # Update agent model: /api/agents/{agent_id}/model
            parts = parsed_path.path.split('/')
            if len(parts) >= 4:
                agent_id = parts[3]
                result = update_agent_model(agent_id, data)

                if result['success']:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
                else:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
            else:
                self.send_error(404, "Invalid agent ID")

        elif parsed_path.path == '/api/config/reload':
            # Reload OpenClaw configuration
            result = reload_openclaw_config()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        else:
            self.send_error(404, "Not Found")

    def get_header(self, name, default=None):
        """Get header value with default"""
        return self.headers.get(name, default)

    def log_message(self, format, *args):
        """Suppress HTTP logs"""
        pass


def get_security_data():
    """Get security data: grants, requests, trust scores, audit log, compliance"""
    security_dir = Path.home() / ".openclaw" / "workspace" / "security"
    result = {
        "active_grants": [],
        "pending_requests": [],
        "trust_scores": {},
        "recent_audit": [],
        "compliance": {}
    }

    # Active grants
    grants_file = security_dir / "access_control" / "active_grants.json"
    if grants_file.exists():
        try:
            with open(grants_file) as f:
                result["active_grants"] = json.load(f)
        except Exception:
            pass

    # Pending requests
    pending_file = security_dir / "access_control" / "pending_requests.json"
    if pending_file.exists():
        try:
            with open(pending_file) as f:
                result["pending_requests"] = json.load(f)
        except Exception:
            pass

    # Trust scores
    scores_file = security_dir / "trust_scores.json"
    if scores_file.exists():
        try:
            with open(scores_file) as f:
                result["trust_scores"] = json.load(f)
        except Exception:
            pass

    # Recent audit log (today)
    audit_dir = security_dir / "audit_log"
    if audit_dir.exists():
        today = datetime.now().strftime('%Y-%m-%d')
        log_file = audit_dir / f"{today}.log"
        if log_file.exists():
            try:
                with open(log_file) as f:
                    lines = f.readlines()
                result["recent_audit"] = [l.strip() for l in lines[-50:]]
            except Exception:
                pass

    # Latest compliance report
    compliance_file = security_dir / "compliance" / "latest.json"
    if compliance_file.exists():
        try:
            with open(compliance_file) as f:
                result["compliance"] = json.load(f)
        except Exception:
            pass

    return result


def get_agent_config():
    """Get current agent configuration from openclaw.json"""
    try:
        with open(OPENCLAW_CONFIG_PATH, 'r') as f:
            config = json.load(f)

        agents = []
        for agent in config.get('agents', {}).get('list', []):
            model_config = agent.get('model', {})
            agents.append({
                'id': agent.get('id'),
                'name': agent.get('name'),
                'primary': model_config.get('primary'),
                'fallbacks': model_config.get('fallbacks', [])
            })

        return {
            'success': True,
            'agents': agents
        }

    except Exception as e:
        logger.error(f"Failed to read config: {e}")
        return {
            'success': False,
            'error': str(e),
            'agents': []
        }


def update_agent_model(agent_id, data):
    """Update agent model configuration"""
    try:
        # Validate input
        if 'primary' not in data:
            return {'success': False, 'error': 'Missing primary model'}

        primary = data['primary']
        fallbacks = data.get('fallbacks', [])

        # Read current config
        with open(OPENCLAW_CONFIG_PATH, 'r') as f:
            config = json.load(f)

        # Find and update agent
        agents = config.get('agents', {}).get('list', [])
        agent_found = False

        for agent in agents:
            if agent.get('id') == agent_id:
                agent_found = True
                agent['model'] = {
                    'primary': primary,
                    'fallbacks': fallbacks
                }
                logger.info(f"Updated {agent_id} model: primary={primary}, fallbacks={fallbacks}")
                break

        if not agent_found:
            return {'success': False, 'error': f'Agent {agent_id} not found'}

        # Write updated config
        with open(OPENCLAW_CONFIG_PATH, 'w') as f:
            json.dump(config, f, indent=2)

        # Restart OpenClaw gateway to apply changes
        logger.info("Restarting OpenClaw gateway to apply changes...")
        restart_result = subprocess.run(
            ['openclaw', 'gateway', 'restart'],
            capture_output=True,
            text=True,
            timeout=30
        )

        if restart_result.returncode == 0:
            logger.info("✅ OpenClaw gateway restarted successfully")
        else:
            logger.warning(f"Gateway restart had issues: {restart_result.stderr}")

        # Add event
        gateway_data["events"].append({
            "timestamp": datetime.now().isoformat(),
            "type": "config_update",
            "message": f"Updated {agent_id} model to {primary}"
        })

        return {
            'success': True,
            'message': f'Updated {agent_id} model configuration',
            'agent_id': agent_id,
            'primary': primary,
            'fallbacks': fallbacks
        }

    except Exception as e:
        logger.error(f"Failed to update agent model: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def reload_openclaw_config():
    """Reload OpenClaw configuration"""
    try:
        logger.info("Reloading OpenClaw configuration...")

        result = subprocess.run(
            ['openclaw', 'gateway', 'restart'],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            gateway_data["events"].append({
                "timestamp": datetime.now().isoformat(),
                "type": "config_reload",
                "message": "Configuration reloaded successfully"
            })

            return {
                'success': True,
                'message': 'Configuration reloaded'
            }
        else:
            return {
                'success': False,
                'error': result.stderr
            }

    except Exception as e:
        logger.error(f"Failed to reload config: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def poll_openclaw_status():
    """Poll openclaw status command and update gateway data"""

    while True:
        try:
            # Run openclaw status command
            result = subprocess.run(
                ['openclaw', 'status'],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                parse_openclaw_status(result.stdout)
                gateway_data["connected"] = True
                gateway_data["error"] = None
            else:
                logger.error(f"openclaw status failed: {result.stderr}")
                gateway_data["connected"] = False
                gateway_data["error"] = "openclaw status command failed"

        except subprocess.TimeoutExpired:
            logger.error("openclaw status timed out")
            gateway_data["connected"] = False
            gateway_data["error"] = "Command timeout"

        except FileNotFoundError:
            logger.error("openclaw command not found")
            gateway_data["connected"] = False
            gateway_data["error"] = "OpenClaw not installed"

        except Exception as e:
            logger.error(f"Error polling openclaw: {e}")
            gateway_data["connected"] = False
            gateway_data["error"] = str(e)

        time.sleep(POLL_INTERVAL)


def parse_openclaw_status(output):
    """Parse openclaw status command output"""

    gateway_data["last_update"] = datetime.now().isoformat()

    lines = output.strip().split('\n')

    # Parse agent information
    agents = []
    in_agents_section = False

    for line in lines:
        # Extract gateway status
        if 'Gateway service' in line:
            if 'running' in line:
                gateway_data["gateway_status"] = "online"
            else:
                gateway_data["gateway_status"] = "offline"

        # Extract agent count
        if 'Agents' in line and '·' in line:
            parts = line.split('·')
            for part in parts:
                if 'bootstrapping' in part:
                    try:
                        count = int(part.strip().split()[0])
                        gateway_data["metrics"]["active_agents"] = count
                    except:
                        pass

        # Extract sessions
        if 'Sessions' in line and 'active' in line:
            try:
                parts = line.split('active')
                if parts:
                    count = int(parts[0].strip().split()[-1])
                    gateway_data["metrics"]["active_sessions"] = count
            except:
                pass

    # Load agents dynamically from openclaw.json
    agents = []
    try:
        with open(OPENCLAW_CONFIG_PATH, 'r') as f:
            config = json.load(f)
        
        agent_list = config.get('agents', {}).get('list', [])
        default_status = "active" if gateway_data["gateway_status"] == "online" else "offline"
        
        for agent_config in agent_list:
            agent_id = agent_config.get('id')
            agent_name = agent_config.get('name', agent_id)
            model_config = agent_config.get('model', {})
            primary_model = model_config.get('primary', 'unknown')
            
            # Determine agent status (could be enhanced by parsing sessions data)
            status = default_status
            task = None
            
            # Add special tasks for certain agents
            if agent_id == "infosec":
                task = "Security monitoring"
            elif agent_id == "hatake":
                task = "Parsing & local ops"
            
            agents.append({
                "id": agent_id,
                "name": agent_name,
                "status": status,
                "model": primary_model,
                "task": task
            })
    
    except Exception as e:
        logger.error(f"Failed to load agents from config: {e}")
        # Fallback to empty list if config can't be read
        agents = []

    gateway_data["agents"] = agents
    gateway_data["metrics"]["models_available"] = 8

    # Mock task data
    gateway_data["tasks"] = []

    # Mock budget data (in real implementation, would parse from logs or API)
    # For now, use dummy data
    gateway_data["budget"] = {
        "daily": {"spent": 0.45, "limit": 2.0},
        "monthly": {"spent": 12.30, "limit": 30.0, "fixed": 460}
    }

    # Mock model usage
    gateway_data["models"] = {
        "openai-codex/gpt-5.2": {"calls": 15, "cost": 0.35},
        "ollama/qwen2.5-coder:7b": {"calls": 42, "cost": 0.0},
        "zai/glm-4.7": {"calls": 8, "cost": 0.10}
    }

    # Add event
    gateway_data["events"].append({
        "timestamp": datetime.now().isoformat(),
        "type": "status_update",
        "message": f"Gateway {gateway_data['gateway_status']}"
    })

    # Keep only last 100 events
    if len(gateway_data["events"]) > 100:
        gateway_data["events"] = gateway_data["events"][-100:]


def run_http_server():
    """Run HTTP server"""
    server = HTTPServer(('127.0.0.1', API_PORT), APIHandler)
    logger.info(f"🌐 REST API server started on http://127.0.0.1:{API_PORT}")
    logger.info(f"   Status endpoint: http://127.0.0.1:{API_PORT}/api/status")
    logger.info(f"   Health endpoint: http://127.0.0.1:{API_PORT}/api/health")
    server.serve_forever()


def main():
    """Main entry point"""
    logger.info("🦞 OpenClaw Gateway Bridge starting...")
    logger.info(f"   Polling interval: {POLL_INTERVAL}s")

    # Start polling thread
    poll_thread = threading.Thread(target=poll_openclaw_status, daemon=True)
    poll_thread.start()
    logger.info("✅ Polling thread started")

    # Start HTTP server (blocks)
    try:
        run_http_server()
    except KeyboardInterrupt:
        logger.info("\n👋 Shutting down...")


if __name__ == "__main__":
    main()
