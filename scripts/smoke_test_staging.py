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
from typing import Dict, Any, Tuple, Optional

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
            print(f"  [PASS] {name:<45} ({duration_ms:.1f}ms) — {detail}")
        else:
            self.failed += 1
            print(f"  [FAIL] {name:<45} ({duration_ms:.1f}ms) — {detail}")
        self.results.append({"name": name, "passed": status, "detail": detail, "duration_ms": duration_ms})

    def request(self, method: str, path: str, data: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> Tuple[int, Dict[str, Any], float]:
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
        print("=" * 80)
        print(f"🚀 PR AI WORKFORCE SMOKE TESTS TARGETING: {self.base_url}")
        print("=" * 80)

        # a) GET /health → 200 + database="connected (PostgreSQL 17)" + redis="connected"
        code, data, dur = self.request("GET", "/health")
        db_conn = "connected" in str(data.get("database", "")) and "PostgreSQL 17" in str(data.get("database", ""))
        redis_conn = "connected" in str(data.get("redis", ""))
        ok = (code == 200 and data.get("status") == "ok" and db_conn and redis_conn)
        detail = f"status={data.get('status')}, db={data.get('database')}, redis={data.get('redis')}"
        self.log_result("a) GET /health", ok, detail, dur)

        # b) GET /health/redis → 200 + latency_ms
        code, data, dur = self.request("GET", "/health/redis")
        lat = data.get("latency_ms", 999)
        redis_ok = (code == 200 and data.get("status") == "connected" and data.get("ping") is True)
        host_masked = mask_host(data.get("host", ""))
        detail = f"status={data.get('status')}, host={host_masked}, latency={lat}ms"
        self.log_result("b) GET /health/redis", redis_ok, detail, dur)

        # c) POST /api/telemetry/vitals (valid) → 200 + trace_id
        payload = {
            "name": "LCP",
            "value": 1150.2,
            "rating": "good",
            "delta": 1150.2,
            "id": f"smoke-{int(time.time())}",
            "path": "/dashboard"
        }
        code, data, dur = self.request("POST", "/api/telemetry/vitals", data=payload)
        trace_id = data.get("trace_id", "")
        vitals_ok = (code == 200 and data.get("status") == "recorded" and bool(trace_id))
        detail = f"status={data.get('status')}, trace_id={trace_id[:12]}... (id={data.get('id', '')[:8]}...)"
        self.log_result("c) POST /api/telemetry/vitals (valid)", vitals_ok, detail, dur)

        # d) POST /api/telemetry/vitals (bad origin) → 403
        bad_origin_headers = {"Origin": "https://malicious-untrusted-origin.com"}
        code, data, dur = self.request("POST", "/api/telemetry/vitals", data=payload, headers=bad_origin_headers)
        bad_origin_ok = (code == 403)
        detail = f"http_code={code} (Correctly rejected untrusted origin with 403 Forbidden)"
        self.log_result("d) POST /api/telemetry/vitals (bad origin)", bad_origin_ok, detail, dur)

        # e) GET /api/telemetry/vitals (no auth) → 401/403
        code, data, dur = self.request("GET", "/api/telemetry/vitals")
        unauth_ok = (code in (401, 403))
        detail = f"http_code={code} (Correctly guarded against unauthorized access)"
        self.log_result("e) GET /api/telemetry/vitals (no auth)", unauth_ok, detail, dur)

        print("-" * 80)
        print(f"📊 SMOKE TEST SUMMARY: {self.passed} Passed, {self.failed} Failed (Total: {self.passed + self.failed})")
        print("=" * 80)
        return self.failed == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PR AI Workforce Smoke Test Runner")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Base URL of target API environment")
    args = parser.parse_args()

    runner = SmokeTestRunner(args.base_url)
    success = runner.run_all()
    sys.exit(0 if success else 1)
