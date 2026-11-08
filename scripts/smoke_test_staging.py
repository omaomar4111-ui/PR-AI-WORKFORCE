#!/usr/bin/env python3
"""
PR AI WORKFORCE — Production & Staging Smoke Test Suite
Executes end-to-end health, observability, security, and auth barrier tests
against a target API environment (Local, Staging, or Railway Production).
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Dict, Any, Tuple

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def mask_host(host_str: str) -> str:
    """Masks host strings for security in reports."""
    if not host_str:
        return "hidden"
    if "upstash.io" in host_str:
        return "happy-*.upstash.io"
    if "supabase.co" in host_str or "pooler.supabase.com" in host_str:
        return "aws-0-eu-west-1.pooler.supabase.com"
    return host_str


class SmokeTestRunner:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.passed = 0
        self.failed = 0
        self.results = []

    def log_result(self, name: str, status: bool, detail: str, duration_ms: float):
        if status:
            self.passed += 1
            icon = "✅"
            print(f"  {icon} {name:<40} PASSED ({duration_ms:.1f}ms) — {detail}")
        else:
            self.failed += 1
            icon = "❌"
            print(f"  {icon} {name:<40} FAILED ({duration_ms:.1f}ms) — {detail}")
        self.results.append({"name": name, "passed": status, "detail": detail, "duration_ms": duration_ms})

    def request(self, method: str, path: str, data: Dict[str, Any] = None, headers: Dict[str, str] = None) -> Tuple[int, Dict[str, Any], float]:
        url = f"{self.base_url}{path}"
        req_headers = {"User-Agent": "PRAIWorkforce-SmokeTest/1.0"}
        if headers:
            req_headers.update(headers)

        payload = None
        if data is not None:
            payload = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=payload, headers=req_headers, method=method)
        start = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                elapsed_ms = (time.perf_counter() - start) * 1000
                status_code = resp.status
                body = resp.read().decode("utf-8")
                try:
                    json_data = json.loads(body)
                except Exception:
                    json_data = {"raw": body}
                return status_code, json_data, elapsed_ms
        except urllib.error.HTTPError as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            status_code = e.code
            try:
                body = e.read().decode("utf-8")
                json_data = json.loads(body)
            except Exception:
                json_data = {"error": str(e)}
            return status_code, json_data, elapsed_ms
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            return 0, {"error": str(e)}, elapsed_ms

    def run_all(self) -> bool:
        print("=" * 75)
        print(f"🚀 PR AI WORKFORCE SMOKE TESTS TARGETING: {self.base_url}")
        print("=" * 75)

        # 1. /health
        code, data, dur = self.request("GET", "/health")
        db_conn = "connected" in str(data.get("database", ""))
        redis_conn = "connected" in str(data.get("redis", ""))
        ok = (code == 200 and data.get("status") == "ok" and db_conn and redis_conn)
        detail = f"status={data.get('status')}, db={data.get('database')}, redis={data.get('redis')}"
        self.log_result("1. API Gateway & Core DB /health", ok, detail, dur)

        # 2. /health/redis
        code, data, dur = self.request("GET", "/health/redis")
        redis_ok = (code == 200 and data.get("status") == "connected" and data.get("ping") is True)
        host_masked = mask_host(data.get("host", ""))
        r_latency = data.get("latency_ms", "N/A")
        detail = f"status={data.get('status')}, host={host_masked}, rtt={r_latency}ms"
        self.log_result("2. Distributed Cache /health/redis", redis_ok, detail, dur)

        # 3. /api/telemetry/vitals (POST RUM metric)
        payload = {
            "name": "LCP",
            "value": 1150.2,
            "rating": "good",
            "delta": 1150.2,
            "id": f"smoke-{int(time.time())}",
            "path": "/dashboard"
        }
        code, data, dur = self.request("POST", "/api/telemetry/vitals", data=payload)
        vitals_ok = (code == 200 and data.get("status") == "recorded" and bool(data.get("id")))
        detail = f"recorded_id={data.get('id', 'none')}, trace_id={data.get('trace_id', 'none')[:12]}..."
        self.log_result("3. RUM Ingestion /api/telemetry/vitals", vitals_ok, detail, dur)

        # 4. Unauthorized Barrier Check: /api/agents without Bearer Token
        code, data, dur = self.request("GET", "/api/agents")
        auth_guard_ok = (code == 401)
        detail = f"http_code={code} (Expected 401 Unauthorized for RBAC enforcement)"
        self.log_result("4. RBAC Barrier /api/agents (No Auth)", auth_guard_ok, detail, dur)

        # 5. Unauthorized Barrier Check: /api/projects without Bearer Token
        code, data, dur = self.request("GET", "/api/projects")
        proj_guard_ok = (code == 401)
        detail = f"http_code={code} (Expected 401 Unauthorized for Project Data)"
        self.log_result("5. RBAC Barrier /api/projects (No Auth)", proj_guard_ok, detail, dur)

        # 6. Auth Authentication Failure Check (Invalid Credentials)
        login_payload = {"email": "invalid_smoke_user@nonexistent.domain", "password": "WrongPassword123!"}
        code, data, dur = self.request("POST", "/api/auth/login", data=login_payload)
        auth_fail_ok = (code in (401, 400))
        detail = f"http_code={code} (Correctly rejected fake credentials)"
        self.log_result("6. Auth Rejection on Invalid Login", auth_fail_ok, detail, dur)

        print("-" * 75)
        print(f"📊 SMOKE TEST SUMMARY: {self.passed} Passed, {self.failed} Failed (Total: {self.passed + self.failed})")
        print("=" * 75)
        return self.failed == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PR AI Workforce Smoke Test Runner")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Base URL of target API environment")
    args = parser.parse_args()

    runner = SmokeTestRunner(args.base_url)
    success = runner.run_all()
    sys.exit(0 if success else 1)
