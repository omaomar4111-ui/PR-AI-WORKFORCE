import pytest
from fastapi.testclient import TestClient

from main import app
from database import (
    reset_db_for_tests,
    create_client,
    create_project,
    create_task,
    create_deliverable,
    create_user,
    MOCK_ORGANIZATIONS,
    CLIENTS_DB,
)
from auth.tokens import create_jwt_token
from middleware.rate_limit import reset_rate_limits

client = TestClient(app)

ORG_A_ID = "00000000-0000-0000-0000-000000000001"
ORG_B_ID = "00000000-0000-0000-0000-000000000002"


def get_token_for(user_id: str, email: str, role: str, org_id: str) -> str:
    return create_jwt_token({
        "sub": user_id,
        "email": email,
        "role": role,
        "org_id": org_id,
        "organization_id": org_id,
    })


@pytest.fixture(autouse=True)
def setup_teardown():
    reset_db_for_tests()
    reset_rate_limits()
    # Ensure Org B exists in database
    MOCK_ORGANIZATIONS[ORG_B_ID] = {
        "id": ORG_B_ID,
        "name": "Competitor Agency Ltd",
        "slug": "competitor-agency",
        "created_at": "2026-01-01T00:00:00Z",
    }
    yield
    reset_db_for_tests()
    reset_rate_limits()


# ── 1. Security Headers ───────────────────────────────────────────────────────
def test_security_headers_present_on_all_responses():
    """Verify production security headers are attached to API responses."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("X-XSS-Protection") == "1; mode=block"
    assert "Strict-Transport-Security" in res.headers
    assert "Content-Security-Policy" in res.headers


# ── 2. Role-Based Access Control (RBAC) ───────────────────────────────────────
def test_rbac_member_cannot_delete_client_or_project():
    """Verify Member role cannot delete clients or projects (returns 403 Forbidden)."""
    # Create client and project as owner
    owner_token = client.post("/api/auth/login", json={"email": "owner@pragency.eg", "password": "Password123!"}).json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}", "X-Test-Bypass-Rate-Limit": "true"}

    client_res = client.post("/api/clients", json={"name": "Protected Client Co"}, headers=owner_headers)
    assert client_res.status_code == 201
    cid = client_res.json()["client"]["id"]

    # Attempt deletion as member
    member_token = client.post("/api/auth/login", json={"email": "member@pragency.eg", "password": "Password123!"}).json()["access_token"]
    member_headers = {"Authorization": f"Bearer {member_token}", "X-Test-Bypass-Rate-Limit": "true"}

    del_res = client.delete(f"/api/clients/{cid}", headers=member_headers)
    assert del_res.status_code == 403
    assert "Access forbidden" in del_res.json()["detail"]

    # Owner can delete
    del_owner_res = client.delete(f"/api/clients/{cid}", headers=owner_headers)
    assert del_owner_res.status_code == 200


def test_rbac_member_cannot_approve_sensitive_actions_or_modify_integrations():
    """Verify Member role cannot approve sensitive actions or connect integrations."""
    member_token = client.post("/api/auth/login", json={"email": "member@pragency.eg", "password": "Password123!"}).json()["access_token"]
    member_headers = {"Authorization": f"Bearer {member_token}", "X-Test-Bypass-Rate-Limit": "true"}

    # Attempt approval
    appr_res = client.post("/api/approvals/req_123/approve", json={"notes": "test"}, headers=member_headers)
    assert appr_res.status_code == 403

    # Attempt rejection
    rej_res = client.post("/api/approvals/req_123/reject", json={"notes": "test"}, headers=member_headers)
    assert rej_res.status_code == 403

    # Attempt integration connection
    conn_res = client.post("/api/integrations/google_drive/connect", json={"config": {"key": "val"}}, headers=member_headers)
    assert conn_res.status_code == 403


def test_rbac_client_portal_cannot_access_agent_internals_or_costs():
    """Verify Client role cannot access internal agent definitions or agency analytics."""
    # Register a client portal user in DB
    client_user = create_user(
        email="client@acme.com",
        password="Password123!",
        full_name="Acme Client Rep",
        role="client",
        org_id=ORG_A_ID,
    )
    client_token = get_token_for(client_user["id"], client_user["email"], "client", ORG_A_ID)
    client_headers = {"Authorization": f"Bearer {client_token}", "X-Test-Bypass-Rate-Limit": "true"}

    # Access agent internals -> 403
    agent_res = client.get("/api/agents", headers=client_headers)
    assert agent_res.status_code == 403

    # Access agency costs -> 403
    analytics_res = client.get("/api/analytics/summary", headers=client_headers)
    assert analytics_res.status_code == 403


# ── 3. Row-Level Security (RLS) Cross-Org Data Isolation ──────────────────────
def test_rls_cross_organization_data_isolation():
    """
    CRITICAL SECURITY TEST:
    Verify a user in Organization B CANNOT read, list, update, or delete data belonging to Organization A.
    """
    # 1. Create client and project in Organization A
    owner_a_token = client.post("/api/auth/login", json={"email": "owner@pragency.eg", "password": "Password123!"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {owner_a_token}", "X-Test-Bypass-Rate-Limit": "true"}

    client_a = client.post("/api/clients", json={"name": "Org A Secret Client"}, headers=headers_a).json()["client"]
    proj_a = client.post("/api/projects", json={"client_id": client_a["id"], "name": "Org A Secret Project"}, headers=headers_a).json()["project"]

    # 2. Create User in Organization B
    user_b = create_user(
        email="owner@competitor.eg",
        password="Password123!",
        full_name="Competitor Boss",
        role="owner",
        org_id=ORG_B_ID,
    )
    token_b = get_token_for(user_b["id"], user_b["email"], "owner", ORG_B_ID)
    headers_b = {"Authorization": f"Bearer {token_b}", "X-Test-Bypass-Rate-Limit": "true"}

    # 3. Org B user lists clients -> Org A client must NOT appear
    list_res_b = client.get("/api/clients", headers=headers_b)
    assert list_res_b.status_code == 200
    clients_b = list_res_b.json()["clients"]
    assert all(c["id"] != client_a["id"] for c in clients_b)

    # 4. Org B user direct read Org A client by ID -> 404 access denied
    get_res_b = client.get(f"/api/clients/{client_a['id']}", headers=headers_b)
    assert get_res_b.status_code == 404

    # 5. Org B user direct read Org A project by ID -> 404 access denied
    get_proj_res_b = client.get(f"/api/projects/{proj_a['id']}", headers=headers_b)
    assert get_proj_res_b.status_code == 404

    # 6. Org B user attempt to delete Org A client -> 404 access denied
    del_res_b = client.delete(f"/api/clients/{client_a['id']}", headers=headers_b)
    assert del_res_b.status_code == 404

    # 7. Verify Org A client still exists and is untouched
    verify_a = client.get(f"/api/clients/{client_a['id']}", headers=headers_a)
    assert verify_a.status_code == 200
    assert verify_a.json()["client"]["name"] == "Org A Secret Client"


# ── 4. Rate Limiting Enforcement ──────────────────────────────────────────────
def test_rate_limiting_auth_endpoint_exceeds_threshold():
    """Verify /api/auth/login enforces 5 requests/minute limit and returns HTTP 429."""
    reset_rate_limits()
    enforce_headers = {"X-Test-Enforce-Rate-Limit": "true"}

    # Perform 5 login requests (should succeed or return 401 for bad password, but not 429)
    for i in range(5):
        res = client.post("/api/auth/login", json={"email": "fake@test.com", "password": "WrongPassword"}, headers=enforce_headers)
        assert res.status_code == 401
        assert "X-RateLimit-Limit" in res.headers

    # 6th request must trigger HTTP 429
    res_6th = client.post("/api/auth/login", json={"email": "fake@test.com", "password": "WrongPassword"}, headers=enforce_headers)
    assert res_6th.status_code == 429
    data = res_6th.json()
    assert "Rate limit exceeded" in data["detail"]
    assert "Retry-After" in res_6th.headers
    assert res_6th.headers["X-RateLimit-Remaining"] == "0"
