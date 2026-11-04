import pytest
import sys
import os

# Add parent directory to path
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


# ── Clients CRUD & RLS Tests ─────────────────────────────────────────────────
def test_clients_crud_owner():
    owner_token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {owner_token}"}

    # 1. Initially empty
    list_resp = client.get("/api/clients", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["count"] == 0

    # 2. Create Client
    new_client = {
        "name": "Nile Media Corp",
        "industry": "Media & Telecom",
        "brand_color": "#8b5cf6",
        "contact_name": "Kareem Tarek",
        "contact_email": "kareem@nilemedia.eg",
        "contact_phone": "+201001234567"
    }
    create_resp = client.post("/api/clients", json=new_client, headers=headers)
    assert create_resp.status_code == 201
    created_id = create_resp.json()["client"]["id"]
    assert create_resp.json()["client"]["name"] == "Nile Media Corp"

    # 3. Read Detail
    detail_resp = client.get(f"/api/clients/{created_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["client"]["industry"] == "Media & Telecom"
    assert "projects" in detail_resp.json()["client"]

    # 4. Update Client
    update_resp = client.put(
        f"/api/clients/{created_id}",
        json={"contact_name": "Kareem T. Updated"},
        headers=headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["client"]["contact_name"] == "Kareem T. Updated"

    # 5. Delete Client
    del_resp = client.delete(f"/api/clients/{created_id}", headers=headers)
    assert del_resp.status_code == 200

    # Verify not found after delete
    get_again = client.get(f"/api/clients/{created_id}", headers=headers)
    assert get_again.status_code == 404


def test_clients_and_projects_rls_isolation():
    owner_token = get_token("owner@pragency.eg")
    member_token = get_token("member@pragency.eg")

    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    member_headers = {"Authorization": f"Bearer {member_token}"}

    # Owner creates Client 1 (unassigned)
    c1_resp = client.post("/api/clients", json={
        "name": "Top Secret Client",
        "industry": "Defense",
        "assigned_to": None
    }, headers=owner_headers)
    c1_id = c1_resp.json()["client"]["id"]

    # Owner creates Client 2 (assigned to member: 22222222-2222-2222-2222-222222222222)
    c2_resp = client.post("/api/clients", json={
        "name": "Member Assigned Client",
        "industry": "Retail",
        "assigned_to": "22222222-2222-2222-2222-222222222222"
    }, headers=owner_headers)
    c2_id = c2_resp.json()["client"]["id"]

    # Owner sees both clients
    owner_list = client.get("/api/clients", headers=owner_headers).json()
    assert owner_list["count"] == 2

    # Member ONLY sees Client 2
    member_list = client.get("/api/clients", headers=member_headers).json()
    assert member_list["count"] == 1
    assert member_list["clients"][0]["id"] == c2_id

    # Member cannot access unassigned Client 1 directly
    forbidden_resp = client.get(f"/api/clients/{c1_id}", headers=member_headers)
    assert forbidden_resp.status_code == 404

    # Member cannot delete unassigned Client 1
    del_forbidden = client.delete(f"/api/clients/{c1_id}", headers=member_headers)
    assert del_forbidden.status_code == 404


# ── Projects CRUD & Stats Tests ──────────────────────────────────────────────
def test_projects_crud_and_dashboard_stats():
    owner_token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {owner_token}"}

    # Initially empty dashboard stats
    empty_stats = client.get("/api/dashboard/stats", headers=headers).json()["stats"]
    assert empty_stats["total_clients"] == 0
    assert empty_stats["active_projects"] == 0
    assert empty_stats["total_retainer"] == 0.0

    # 1. Create Client
    c_resp = client.post("/api/clients", json={
        "name": "Global Tech Ventures",
        "industry": "Venture Capital"
    }, headers=headers)
    client_id = c_resp.json()["client"]["id"]

    # 2. Create Active Project 1 with retainer 5000.00
    p1_resp = client.post("/api/projects", json={
        "client_id": client_id,
        "name": "Q4 PR Launch",
        "status": "active",
        "retainer_amount": 5000.00
    }, headers=headers)
    assert p1_resp.status_code == 201
    p1_id = p1_resp.json()["project"]["id"]

    # 3. Create Active Project 2 with retainer 7500.00
    p2_resp = client.post("/api/projects", json={
        "client_id": client_id,
        "name": "Executive Thought Leadership",
        "status": "active",
        "retainer_amount": 7500.00
    }, headers=headers)
    assert p2_resp.status_code == 201

    # 4. Create Paused Project 3 with retainer 3000.00 (should not count in active retainers)
    client.post("/api/projects", json={
        "client_id": client_id,
        "name": "Paused Podcast Series",
        "status": "paused",
        "retainer_amount": 3000.00
    }, headers=headers)

    # 5. Verify Dashboard Stats
    stats = client.get("/api/dashboard/stats", headers=headers).json()["stats"]
    assert stats["total_clients"] == 1
    assert stats["active_projects"] == 2
    assert stats["total_projects"] == 3
    assert stats["total_retainer"] == 12500.00  # 5000 + 7500

    # 6. Filter projects by client_id
    filtered = client.get(f"/api/projects?client_id={client_id}", headers=headers).json()
    assert filtered["count"] == 3

    # 7. Update Project
    up_resp = client.put(f"/api/projects/{p1_id}", json={"status": "completed"}, headers=headers)
    assert up_resp.status_code == 200
    assert up_resp.json()["project"]["status"] == "completed"

    # Now active projects is 1, retainer is 7500
    updated_stats = client.get("/api/dashboard/stats", headers=headers).json()["stats"]
    assert updated_stats["active_projects"] == 1
    assert updated_stats["total_retainer"] == 7500.00
