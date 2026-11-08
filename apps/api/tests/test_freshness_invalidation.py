"""
Security & Freshness Invalidation Test Suite
Verifies that any mutation (Create, Update, Delete) on Agents or data feeding Dashboard stats
immediately invalidates the cached representation and returns fresh data without waiting for TTL expiration (5 minutes / 60 seconds).
"""
import pytest
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
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    # Bust existing cache keys so test starts completely clean
    client.patch("/api/agents/dr-ibrahim/status", json={"status": "idle"}, headers=headers)
    client.post("/api/clients", json={"name": "BustClient", "industry": "PR"}, headers=headers)
    reset_db_for_tests()
    yield
    reset_db_for_tests()

def get_token(email="owner@pragency.eg", password="Password123!"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_agent_mutation_invalidates_cache_immediately():
    """
    Proves that mutating agent status invalidates the 'app:prod:agents:all' cache immediately.
    The client receives fresh updated agent state on the very next request rather than stale 5-minute cached data.
    """
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure baseline state: dr-ibrahim is idle
    patch_reset = client.patch(
        "/api/agents/dr-ibrahim/status",
        json={"status": "idle", "current_task": None},
        headers=headers,
    )
    assert patch_reset.status_code == 200

    # 1. Warm cache: first call MISS, second call HIT
    res1 = client.get("/api/agents", headers=headers)
    assert res1.status_code == 200
    assert res1.headers.get("X-Cache") == "MISS"

    res2 = client.get("/api/agents", headers=headers)
    assert res2.status_code == 200
    assert res2.headers.get("X-Cache") == "HIT"

    # 2. Mutate Agent: Set to working on breaking crisis
    unique_task = "Crisis Management Campaign 2026"
    patch_res = client.patch(
        "/api/agents/dr-ibrahim/status",
        json={"status": "working", "current_task": unique_task},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["agent"]["status"] == "working"

    # 3. Immediate Read: GET /api/agents must be MISS (purged immediately, NOT served from stale 5-minute cache)
    res3 = client.get("/api/agents", headers=headers)
    assert res3.status_code == 200
    assert res3.headers.get("X-Cache") == "MISS", "Expected immediate cache invalidation on agent status update"

    # 4. Immediate Read on status: reflects the updated operational status
    st_res = client.get("/api/agents/status", headers=headers)
    assert st_res.status_code == 200
    agent_st = next(s for s in st_res.json()["statuses"] if s["agent_id"] == "dr-ibrahim")
    assert agent_st["status"] == "working"
    assert agent_st.get("current_task") == unique_task

    # 5. Subsequent read on agents is cached with new state (HIT)
    res4 = client.get("/api/agents", headers=headers)
    assert res4.status_code == 200
    assert res4.headers.get("X-Cache") == "HIT"

    # 6. Resetting agent status invalidates cache again
    patch_back = client.patch(
        "/api/agents/dr-ibrahim/status",
        json={"status": "idle", "current_task": None},
        headers=headers,
    )
    assert patch_back.status_code == 200
    res5 = client.get("/api/agents", headers=headers)
    assert res5.status_code == 200
    assert res5.headers.get("X-Cache") == "MISS"


def test_dashboard_stats_crud_invalidates_cache_immediately():
    """
    Proves that Create, Update, Delete on clients, projects, and tasks
    immediately invalidate dashboard stats cache and return updated metrics instantly.
    """
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Warm dashboard cache
    r1 = client.get("/api/dashboard/stats", headers=headers)
    assert r1.status_code == 200
    r2 = client.get("/api/dashboard/stats", headers=headers)
    assert r2.headers.get("X-Cache") == "HIT"
    base_stats = r2.json()["stats"]
    base_clients = base_stats["total_clients"]
    base_projects = base_stats["total_projects"]
    base_tasks = base_stats["total_tasks"]

    # 2. CREATE CLIENT -> Verify immediate invalidation & increment
    c_resp = client.post("/api/clients", json={"name": "Freshness Corp", "industry": "Automotive"}, headers=headers)
    assert c_resp.status_code == 201
    client_id = c_resp.json()["client"]["id"]

    stat_after_client = client.get("/api/dashboard/stats", headers=headers)
    assert stat_after_client.headers.get("X-Cache") == "MISS", "Cache must be invalidated immediately after Client creation"
    assert stat_after_client.json()["stats"]["total_clients"] == base_clients + 1

    # Re-warm
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "HIT"

    # 3. CREATE PROJECT -> Verify immediate invalidation & increment
    p_resp = client.post("/api/projects", json={
        "client_id": client_id,
        "name": "Freshness Brand Launch",
        "status": "active",
        "retainer_amount": 15000.00
    }, headers=headers)
    assert p_resp.status_code == 201
    project_id = p_resp.json()["project"]["id"]

    stat_after_project = client.get("/api/dashboard/stats", headers=headers)
    assert stat_after_project.headers.get("X-Cache") == "MISS", "Cache must be invalidated immediately after Project creation"
    assert stat_after_project.json()["stats"]["total_projects"] == base_projects + 1
    assert stat_after_project.json()["stats"]["active_projects"] >= 1

    # Re-warm
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "HIT"

    # 4. CREATE TASK -> Verify immediate invalidation & increment
    t_resp = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Freshness Press Release",
        "assigned_to": "copywriter",
        "priority": "urgent",
        "weight": 3.0
    }, headers=headers)
    assert t_resp.status_code == 201
    task_id = t_resp.json()["task"]["id"]

    stat_after_task = client.get("/api/dashboard/stats", headers=headers)
    assert stat_after_task.headers.get("X-Cache") == "MISS", "Cache must be invalidated immediately after Task creation"
    assert stat_after_task.json()["stats"]["total_tasks"] == base_tasks + 1

    # Re-warm
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "HIT"

    # 5. UPDATE TASK -> Verify immediate invalidation
    patch_t = client.patch(f"/api/tasks/{task_id}", json={"status": "completed"}, headers=headers)
    assert patch_t.status_code == 200

    stat_after_patch = client.get("/api/dashboard/stats", headers=headers)
    assert stat_after_patch.headers.get("X-Cache") == "MISS", "Cache must be invalidated immediately after Task update"

    # Re-warm
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "HIT"

    # 6. DELETE TASK -> Verify immediate invalidation & decrement
    del_t = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert del_t.status_code == 200

    stat_after_del = client.get("/api/dashboard/stats", headers=headers)
    assert stat_after_del.headers.get("X-Cache") == "MISS", "Cache must be invalidated immediately after Task deletion"
    assert stat_after_del.json()["stats"]["total_tasks"] == base_tasks
