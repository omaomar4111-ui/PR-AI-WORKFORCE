"""
Benchmark script to measure p95 latency Before (Cache MISS) and After (Cache HIT)
for GET /api/agents and GET /api/dashboard/stats.
"""
import sys
import time
import os
import json
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api')))

from fastapi.testclient import TestClient
from main import app
from database import reset_db_for_tests
import cache

client = TestClient(app)

def run_benchmark():
    reset_db_for_tests()
    
    # Authenticate
    login_resp = client.post("/api/auth/login", json={"email": "owner@pragency.eg", "password": "Password123!"})
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        ("/api/agents", "GET /api/agents"),
        ("/api/dashboard/stats", "GET /api/dashboard/stats")
    ]
    
    summary = {}
    
    for url, name in endpoints:
        print(f"\n==================================================")
        print(f"Benchmarking {name}")
        print(f"==================================================")
        
        # 1. Cold / Cache MISS iterations
        cold_latencies = []
        for i in range(15):
            if "agents" in url:
                client.patch("/api/agents/dr-ibrahim/status", json={"status": "idle"}, headers=headers)
            else:
                client.post("/api/clients", json={"name": f"ClientBench_{i}_{time.time()}", "industry": "Bench"}, headers=headers)
            
            t0 = time.perf_counter()
            r = client.get(url, headers=headers)
            lat = (time.perf_counter() - t0) * 1000.0
            assert r.status_code == 200
            assert r.headers.get("X-Cache") == "MISS"
            cold_latencies.append(lat)
            
        # 2. Warm up
        client.get(url, headers=headers)
        
        # 3. Warm / Cache HIT iterations
        warm_latencies = []
        for _ in range(15):
            t0 = time.perf_counter()
            r = client.get(url, headers=headers)
            lat = (time.perf_counter() - t0) * 1000.0
            assert r.status_code == 200
            assert r.headers.get("X-Cache") == "HIT"
            warm_latencies.append(lat)
            
        p50_cold = float(np.percentile(cold_latencies, 50))
        p95_cold = float(np.percentile(cold_latencies, 95))
        avg_cold = float(np.mean(cold_latencies))
        
        p50_warm = float(np.percentile(warm_latencies, 50))
        p95_warm = float(np.percentile(warm_latencies, 95))
        avg_warm = float(np.mean(warm_latencies))
        
        reduction = ((p95_cold - p95_warm) / p95_cold) * 100.0
        
        summary[name] = {
            "cold_p95_ms": round(p95_cold, 2),
            "warm_p95_ms": round(p95_warm, 2),
            "cold_avg_ms": round(avg_cold, 2),
            "warm_avg_ms": round(avg_warm, 2),
            "improvement_pct": round(reduction, 2)
        }
        
        print(f"  Cold (MISS) -> p50: {p50_cold:.2f}ms | p95: {p95_cold:.2f}ms | Avg: {avg_cold:.2f}ms")
        print(f"  Warm (HIT)  -> p50: {p50_warm:.2f}ms | p95: {p95_warm:.2f}ms | Avg: {avg_warm:.2f}ms")
        print(f"  Improvement: {reduction:.2f}%")
        
    with open("docs/CACHE_LATENCY_REPORT.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print("\nSaved summary to docs/CACHE_LATENCY_REPORT.json")
    return summary

if __name__ == "__main__":
    run_benchmark()
