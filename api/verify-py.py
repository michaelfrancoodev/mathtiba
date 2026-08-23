from http.server import BaseHTTPRequestHandler
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from parser import (
    parse_equation, apply_action, equivalent, is_solved, pretty
)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or "{}")

        try:
            eq = parse_equation(body["expression"])
            new_eq = apply_action(eq, body["op"], body.get("value"))

            result = {
                "ok": True,
                "valid": equivalent(eq, new_eq),   # equality preserved?
                "expression": pretty(new_eq),
                "solved": is_solved(new_eq),
                "progress": len(str(new_eq.lhs)) < len(str(eq.lhs)),
            }
        except Exception as exc:
            result = {"ok": False, "error": str(exc)}

        payload = json.dumps(result).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
