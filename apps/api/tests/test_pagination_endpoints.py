"""
Tests for skip and limit pagination (default 20, max 100) on:
- /api/tasks
- /api/deliverables
- /api/workflows
- /api/memory
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
    yield
    reset_db_for_tests()

def get_token(email="owner@pragency.eg", password="Password123!"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_tasks_pagination():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create client & project
    c = client.post("/api/clients", json={"name": "PagClient", "industry": "Tech"}, headers=headers).json()["client"]
    p = client.post("/api/projects", json={"client_id": c["id"], "name": "PagProj", "status": "active", "retainer_amount": 5000}, headers=headers).json()["project"]

    # 2. Seed 25 tasks
    for i in range(25):
        client.post("/api/tasks", json={
            "project_id": p["id"],
            "title": f"Task #{i+1:02d}",
            "assigned_to": "copywriter",
            "priority": "medium",
            "weight": 1.0
        }, headers=headers)

    # 3. Test default pagination (default limit: 20, skip: 0)
    res_default = client.get("/api/tasks", headers=headers)
    assert res_default.status_code == 200
    body = res_default.json()
    assert body["total"] == 25
    assert body["count"] == 20
    assert body["skip"] == 0
    assert body["limit"] == 20
    assert len(body["tasks"]) == 20

    # 4. Test page 2 (skip: 20, limit: 20) -> should return remaining 5 tasks
    res_page2 = client.get("/api/tasks?skip=20&limit=20", headers=headers)
    assert res_page2.status_code == 200
    b2 = res_page2.json()
    assert b2["total"] == 25
    assert b2["count"] == 5
    assert b2["skip"] == 20
    assert b2["limit"] == 20
    assert len(b2["tasks"]) == 5

    # 5. Test max limit validation (limit > 100 must fail with 422)
    res_invalid = client.get("/api/tasks?limit=101", headers=headers)
    assert res_invalid.status_code == 422


def test_deliverables_pagination():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Default query
    res = client.get("/api/deliverables", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "deliverables" in body
    assert "count" in body
    assert "total" in body
    assert body["skip"] == 0
    assert body["limit"] == 20

    # Custom pagination
    res_custom = client.get("/api/deliverables?skip=5&limit=10", headers=headers)
    assert res_custom.status_code == 200
    assert res_custom.json()["skip"] == 5
    assert res_custom.json()["limit"] == 10

    # Max limit validation
    assert client.get("/api/deliverables?limit=101", headers=headers).status_code == 422


def test_workflows_pagination():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Default query
    res = client.get("/api/workflows", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "workflows" in body
    assert "count" in body
    assert "total" in body
    assert body["skip"] == 0
    assert body["limit"] == 20

    # Custom pagination
    res_custom = client.get("/api/workflows?skip=2&limit=5", headers=headers)
    assert res_custom.status_code == 200
    assert res_custom.json()["skip"] == 2
    assert res_custom.json()["limit"] == 5

    # Max limit validation
    assert client.get("/api/workflows?limit=101", headers=headers).status_code == 422


def test_memory_pagination():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Default query on /api/memory
    res = client.get("/api/memory", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "memories" in body
    assert "count" in body
    assert "total" in body
    assert body["skip"] == 0
    assert body["limit"] == 20

    # Default query on /api/memories alias
    res_alias = client.get("/api/memories", headers=headers)
    assert res_alias.status_code == 200
    assert res_alias.json()["limit"] == 20

    # Custom pagination
    res_custom = client.get("/api/memory?skip=3&limit=7", headers=headers)
    assert res_custom.status_code == 200
    assert res_custom.json()["skip"] == 3
    assert res_custom.json()["limit"] == 7

    # Max limit validation
    assert client.get("/api/memory?limit=101", headers=headers).status_code == 422
