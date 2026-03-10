#!/usr/bin/env python3
import http.server
import os
import subprocess
import sys
import threading
from datetime import datetime, timezone


def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] {msg}", file=sys.stderr, flush=True)


SECRET = os.environ.get("DEPLOY_WEBHOOK_SECRET", "")
if not SECRET:
    print("ERROR: DEPLOY_WEBHOOK_SECRET environment variable is not set", file=sys.stderr)
    sys.exit(1)

DEPLOY_SCRIPT = "/home/postiz/app/scripts/deploy.sh"
DEPLOY_LOG = "/home/postiz/app/logs/deploy.log"


def run_deploy():
    log("Starting deploy.sh in background")
    os.makedirs(os.path.dirname(DEPLOY_LOG), exist_ok=True)
    with open(DEPLOY_LOG, "a") as logfile:
        subprocess.Popen(
            ["bash", DEPLOY_SCRIPT],
            stdout=logfile,
            stderr=logfile,
        )


class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        log(f"{self.address_string()} - {format % args}")

    def send_response_only_body(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body.encode())

    def do_POST(self):
        if self.path != "/deploy":
            log(f"404 - Unknown path: {self.path}")
            self.send_response_only_body(404, "Not Found")
            return

        auth = self.headers.get("Authorization", "")
        expected = f"Bearer {SECRET}"
        if auth != expected:
            log("403 - Invalid or missing Authorization header")
            self.send_response_only_body(403, "Forbidden")
            return

        log("202 - Deploy triggered")
        self.send_response_only_body(202, "Accepted")
        threading.Thread(target=run_deploy, daemon=True).start()

    def do_GET(self):
        self.send_response_only_body(405, "Method Not Allowed")

    def do_PUT(self):
        self.send_response_only_body(405, "Method Not Allowed")

    def do_DELETE(self):
        self.send_response_only_body(405, "Method Not Allowed")


if __name__ == "__main__":
    host = "0.0.0.0"
    port = 9443
    server = http.server.HTTPServer((host, port), WebhookHandler)
    log(f"Webhook listener started on {host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Shutting down")
        server.server_close()
