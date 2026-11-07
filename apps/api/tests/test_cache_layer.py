import pytest
import time
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app
from database import reset_db_for_tests

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_database():
    reset_db_for_tests()
    yield
    reset_db_for_tests()

def get_token(email="owner@pragency.eg", password="Password123!"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]

def test_agents_cache_aside_and_invalidation():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Update an agent status to ensure cache is clean
    client.patch("/api/agents/dr-ibrahim/status", json={"status": "idle"}, headers=headers)

    # 2. First call: Cache MISS
    t0 = time.perf_counter()
    resp1 = client.get("/api/agents", headers=headers)
    t_miss = (time.perf_counter() - t0) * 1000

    assert resp1.status_code == 200
    assert resp1.headers.get("X-Cache") == "MISS"
    assert resp1.json()["count"] == 38

    # 3. Second call: Cache HIT
    t1 = time.perf_counter()
    resp2 = client.get("/api/agents", headers=headers)
    t_hit = (time.perf_counter() - t1) * 1000

    assert resp2.status_code == 200
    assert resp2.headers.get("X-Cache") == "HIT"
    assert resp2.json()["count"] == 38
    assert resp2.json() == resp1.json()

    # 4. Invalidation on mutation
    patch_resp = client.patch(
        "/api/agents/dr-ibrahim/status",
        json={"status": "working", "current_task": "Cache test orchestration"},
        headers=headers,
    )
    assert patch_resp.status_code == 200

    # 5. Third call: Should be MISS after invalidation
    resp3 = client.get("/api/agents", headers=headers)
    assert resp3.status_code == 200
    assert resp3.headers.get("X-Cache") == "MISS"


def test_dashboard_stats_cache_aside_and_invalidation():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Mutate a client to bust any existing dashboard cache
    c_resp = client.post("/api/clients", json={"name": "Cache Test Client", "industry": "Tech"}, headers=headers)
    assert c_resp.status_code == 201
    client_id = c_resp.json()["client"]["id"]

    # 2. First call: Cache MISS
    resp1 = client.get("/api/dashboard/stats", headers=headers)
    assert resp1.status_code == 200
    assert resp1.headers.get("X-Cache") == "MISS"
    stats1 = resp1.json()["stats"]

    # 3. Second call: Cache HIT
    resp2 = client.get("/api/dashboard/stats", headers=headers)
    assert resp2.status_code == 200
    assert resp2.headers.get("X-Cache") == "HIT"
    assert resp2.json()["stats"] == stats1

    # 4. Mutation (Create project) -> triggers invalidate_dashboard_cache()
    p_resp = client.post("/api/projects", json={
        "client_id": client_id,
        "name": "Cache Bust Project",
        "status": "active",
        "retainer_amount": 9999.00
    }, headers=headers)
    assert p_resp.status_code == 201

    # 5. Subsequent call: Must be Cache MISS and reflect new project
    resp3 = client.get("/api/dashboard/stats", headers=headers)
    assert resp3.status_code == 200
    assert resp3.headers.get("X-Cache") == "MISS"
    stats3 = resp3.json()["stats"]
    assert stats3["total_projects"] > stats1["total_projects"]
