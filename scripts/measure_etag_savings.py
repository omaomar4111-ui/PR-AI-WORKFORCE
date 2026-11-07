import os
import sys
import json
import gzip
import time
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api')))

from fastapi.testclient import TestClient
from main import app

def run_etag_benchmark():
    client = TestClient(app)
    
    # Authenticate
    login_resp = client.post("/api/auth/login", json={"email": "owner@pragency.eg", "password": "Password123!"})
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. First Request: Full GET (200 OK)
    t0 = time.perf_counter()
    resp_200 = client.get("/api/agents", headers=headers)
    t_200_ms = (time.perf_counter() - t0) * 1000

    assert resp_200.status_code == 200
    etag = resp_200.headers.get("ETag") or resp_200.headers.get("etag")
    cache_control = resp_200.headers.get("Cache-Control") or resp_200.headers.get("cache-control")
    raw_body_bytes_200 = len(resp_200.content)
    gzipped_bytes_200 = len(gzip.compress(resp_200.content))

    # 2. Second Request: Conditional GET (304 Not Modified)
    cond_headers = {
        "Authorization": f"Bearer {token}",
        "If-None-Match": etag
    }
    t1 = time.perf_counter()
    resp_304 = client.get("/api/agents", headers=cond_headers)
    t_304_ms = (time.perf_counter() - t1) * 1000

    assert resp_304.status_code == 304
    raw_body_bytes_304 = len(resp_304.content)

    # Bandwidth calculations
    bytes_saved = raw_body_bytes_200 - raw_body_bytes_304
    bandwidth_reduction_pct = round(((raw_body_bytes_200 - raw_body_bytes_304) / raw_body_bytes_200) * 100, 2)

    benchmark_data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "endpoint": "/api/agents",
        "etag": etag,
        "cache_control": cache_control,
        "request_200_full": {
            "status_code": resp_200.status_code,
            "raw_body_bytes": raw_body_bytes_200,
            "raw_body_kb": round(raw_body_bytes_200 / 1024, 2),
            "gzipped_bytes": gzipped_bytes_200,
            "gzipped_kb": round(gzipped_bytes_200 / 1024, 2),
            "response_time_ms": round(t_200_ms, 2)
        },
        "request_304_conditional": {
            "status_code": resp_304.status_code,
            "raw_body_bytes": raw_body_bytes_304,
            "raw_body_kb": 0.0,
            "response_time_ms": round(t_304_ms, 2)
        },
        "bandwidth_savings": {
            "bytes_saved_per_request": bytes_saved,
            "kb_saved_per_request": round(bytes_saved / 1024, 2),
            "reduction_percentage": bandwidth_reduction_pct,
            "latency_improvement_ms": round(t_200_ms - t_304_ms, 2)
        }
    }

    out_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'task_2_6_etag_benchmark.json'))
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(benchmark_data, f, indent=2)

    print(json.dumps(benchmark_data, indent=2))
    return benchmark_data

if __name__ == "__main__":
    run_etag_benchmark()
