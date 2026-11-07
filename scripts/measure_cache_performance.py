#!/usr/bin/env python3
"""
PR AI WORKFORCE - Phase 2.2 Live Redis Cache-Aside Benchmark
Measures actual live HTTP request latency and verifies X-Cache headers (MISS vs HIT).
"""

import time
import json
import sys
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

API_URL = "http://127.0.0.1:8000"

def make_request(path: str, method: str = "GET", headers: dict = None, body: dict = None):
    url = f"{API_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    req_headers = headers.copy() if headers else {}
    if data:
        req_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    t0 = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        t_elapsed = (time.perf_counter() - t0) * 1000
        content = resp.read().decode("utf-8")
        resp_headers = dict(resp.headers)
        return {
            "status_code": resp.status,
            "latency_ms": round(t_elapsed, 2),
            "headers": resp_headers,
            "json": json.loads(content) if content else None,
        }

def run_benchmark():
    print("===============================================================")
    print("🚀 PHASE 2.2 REDIS CACHE-ASIDE PERFORMANCE BENCHMARK")
    print("===============================================================")

    # 1. Check Redis Health
    health = make_request("/health/redis")
    print(f"✓ /health/redis: status={health['json']['status']}, latency={health['json']['latency_ms']}ms, tls={health['json']['tls']}")

    # 2. Login as Owner
    login_resp = make_request(
        "/api/auth/login",
        method="POST",
        body={"email": "owner@pragency.eg", "password": "Password123!"}
    )
    token = login_resp["json"]["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print("✓ Auth: successfully logged in as owner")

    # 3. Benchmark GET /api/agents (Cold / Cache MISS)
    # First patch agent to guarantee clean cache
    make_request("/api/agents/dr-ibrahim/status", method="PATCH", headers=auth_headers, body={"status": "idle"})
    
    agents_miss = make_request("/api/agents", headers=auth_headers)
    print(f"✓ /api/agents (MISS): latency={agents_miss['latency_ms']}ms, X-Cache={agents_miss['headers'].get('x-cache')}")

    # Benchmark GET /api/agents (Warm / Cache HIT)
    agents_hit = make_request("/api/agents", headers=auth_headers)
    print(f"✓ /api/agents (HIT):  latency={agents_hit['latency_ms']}ms, X-Cache={agents_hit['headers'].get('x-cache')}")

    # 4. Benchmark GET /api/dashboard/stats (Cold / Cache MISS)
    # Mutate client to bust cache
    make_request("/api/clients", method="POST", headers=auth_headers, body={"name": "Live Benchmark Client", "industry": "Bench"})
    
    dash_miss = make_request("/api/dashboard/stats", headers=auth_headers)
    print(f"✓ /api/dashboard/stats (MISS): latency={dash_miss['latency_ms']}ms, X-Cache={dash_miss['headers'].get('x-cache')}")

    # Benchmark GET /api/dashboard/stats (Warm / Cache HIT)
    dash_hit = make_request("/api/dashboard/stats", headers=auth_headers)
    print(f"✓ /api/dashboard/stats (HIT):  latency={dash_hit['latency_ms']}ms, X-Cache={dash_hit['headers'].get('x-cache')}")

    # 5. Verify Invalidation on Mutation
    # Mutate agent status -> should bust agents cache
    make_request("/api/agents/dr-ibrahim/status", method="PATCH", headers=auth_headers, body={"status": "working", "current_task": "Live Benchmark"})
    agents_after_inv = make_request("/api/agents", headers=auth_headers)
    print(f"✓ Invalidation Check /api/agents: X-Cache={agents_after_inv['headers'].get('x-cache')} (Expected: MISS)")

    # Reset agent status
    make_request("/api/agents/dr-ibrahim/status", method="PATCH", headers=auth_headers, body={"status": "idle"})

    results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "redis_health": health["json"],
        "endpoints": {
            "/api/agents": {
                "miss_latency_ms": agents_miss["latency_ms"],
                "hit_latency_ms": agents_hit["latency_ms"],
                "speedup_percentage": round(((agents_miss["latency_ms"] - agents_hit["latency_ms"]) / max(agents_miss["latency_ms"], 0.1)) * 100, 1),
                "invalidation_verified": agents_after_inv["headers"].get("x-cache") == "MISS",
            },
            "/api/dashboard/stats": {
                "miss_latency_ms": dash_miss["latency_ms"],
                "hit_latency_ms": dash_hit["latency_ms"],
                "speedup_percentage": round(((dash_miss["latency_ms"] - dash_hit["latency_ms"]) / max(dash_miss["latency_ms"], 0.1)) * 100, 1),
            }
        }
    }

    with open("task_2_2_cache_benchmark.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("===============================================================")
    print("📊 BENCHMARK SUMMARY")
    print(f"  /api/agents:          MISS {agents_miss['latency_ms']}ms -> HIT {agents_hit['latency_ms']}ms ({results['endpoints']['/api/agents']['speedup_percentage']}% faster)")
    print(f"  /api/dashboard/stats: MISS {dash_miss['latency_ms']}ms -> HIT {dash_hit['latency_ms']}ms ({results['endpoints']['/api/dashboard/stats']['speedup_percentage']}% faster)")
    print("===============================================================")

if __name__ == "__main__":
    run_benchmark()
