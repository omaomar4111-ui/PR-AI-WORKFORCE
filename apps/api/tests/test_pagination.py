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

def test_tasks_pagination_and_bounds():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create client & project
    c_resp = client.post("/api/clients", json={"name": "Page Client", "industry": "Tech"}, headers=headers)
    client_id = c_resp.json()["client"]["id"]

    p_resp = client.post("/api/projects", json={
        "client_id": client_id,
        "name": "Page Project",
        "status": "active",
        "retainer_amount": 5000.00
    }, headers=headers)
    project_id = p_resp.json()["project"]["id"]

    # 2. Create 5 tasks
    for i in range(5):
        client.post("/api/tasks", json={
            "project_id": project_id,
            "title": f"Task #{i+1}",
            "priority": "medium",
            "assigned_to": "dr-ibrahim"
        }, headers=headers)

    # 3. Default pagination: limit=20
    resp_def = client.get("/api/tasks", headers=headers)
    assert resp_def.status_code == 200
    data_def = resp_def.json()
    assert data_def["total"] == 5
    assert data_def["count"] == 5
    assert data_def["skip"] == 0
    assert data_def["limit"] == 20

    # 4. Explicit pagination: skip=1, limit=2
    resp_page = client.get("/api/tasks?skip=1&limit=2", headers=headers)
    assert resp_page.status_code == 200
    data_page = resp_page.json()
    assert data_page["total"] == 5
    assert data_page["count"] == 2
    assert data_page["skip"] == 1
    assert data_page["limit"] == 2

    # 5. Out of bounds: limit > 100 must return 422
    resp_overflow = client.get("/api/tasks?limit=150", headers=headers)
    assert resp_overflow.status_code == 422


def test_deliverables_workflows_and_memories_pagination():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Deliverables pagination test
    d_resp = client.get("/api/deliverables?skip=0&limit=10", headers=headers)
    assert d_resp.status_code == 200
    assert "total" in d_resp.json()
    assert "skip" in d_resp.json()
    assert "limit" in d_resp.json()

    # 2. Workflows pagination test
    w_resp = client.get("/api/workflows?skip=0&limit=10", headers=headers)
    assert w_resp.status_code == 200
    assert "total" in w_resp.json()
    assert "skip" in w_resp.json()
    assert "limit" in w_resp.json()

    # 3. Memories pagination test (/api/memories and alias /api/memory)
    m1_resp = client.get("/api/memories?skip=0&limit=10", headers=headers)
    assert m1_resp.status_code == 200
    assert "total" in m1_resp.json()
    assert m1_resp.json()["limit"] == 10

    m2_resp = client.get("/api/memory?skip=0&limit=10", headers=headers)
    assert m2_resp.status_code == 200
    assert "total" in m2_resp.json()
