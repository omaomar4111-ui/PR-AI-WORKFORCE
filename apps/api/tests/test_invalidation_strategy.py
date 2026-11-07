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
    yield
    reset_db_for_tests()

def get_token(email="owner@pragency.eg", password="Password123!"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]

def test_targeted_invalidation_clients_projects_tasks():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Warm dashboard cache
    r1 = client.get("/api/dashboard/stats", headers=headers)
    assert r1.status_code == 200
    # Next call must be HIT
    r2 = client.get("/api/dashboard/stats", headers=headers)
    assert r2.headers.get("X-Cache") == "HIT"

    # 2. Mutate Client (CREATE) -> Invalidation
    c_resp = client.post("/api/clients", json={"name": "Inv Client", "industry": "PR"}, headers=headers)
    assert c_resp.status_code == 201
    client_id = c_resp.json()["client"]["id"]
    # Must be MISS
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "MISS"
    # Re-warm
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "HIT"

    # 3. Mutate Project (CREATE) -> Invalidation
    p_resp = client.post("/api/projects", json={
        "client_id": client_id,
        "name": "Inv Project",
        "status": "active",
        "retainer_amount": 5000.00
    }, headers=headers)
    assert p_resp.status_code == 201
    project_id = p_resp.json()["project"]["id"]
    # Must be MISS
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "MISS"
    # Re-warm
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "HIT"

    # 4. Mutate Task (CREATE) -> Invalidation
    t_resp = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Inv Task",
        "assigned_to": "dr-ibrahim",
        "priority": "high",
        "weight": 2.0
    }, headers=headers)
    assert t_resp.status_code == 201
    task_id = t_resp.json()["task"]["id"]
    # Must be MISS
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "MISS"
    # Re-warm
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "HIT"

    # 5. Mutate Task (UPDATE / PATCH) -> Invalidation
    patch_t = client.patch(f"/api/tasks/{task_id}", json={"status": "in_progress"}, headers=headers)
    assert patch_t.status_code == 200
    # Must be MISS
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "MISS"
    # Re-warm
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "HIT"

    # 6. Mutate Task (DELETE) -> Invalidation
    del_t = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert del_t.status_code == 200
    # Must be MISS
    assert client.get("/api/dashboard/stats", headers=headers).headers.get("X-Cache") == "MISS"
