import pytest
from fastapi.testclient import TestClient
from main import app
from database import reset_db_for_tests, MOCK_USERS

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_state():
    reset_db_for_tests()
    # Ensure default users exist
    MOCK_USERS["owner@pragency.eg"]["password"] = "Password123!"
    MOCK_USERS["member@pragency.eg"]["password"] = "Password123!"
    MOCK_USERS["owner@pragency.eg"]["full_name"] = "Agency Principal"
    yield
    reset_db_for_tests()


def get_token(email: str = "owner@pragency.eg", password: str = "Password123!") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_update_user_profile_success():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/users/me",
        headers=headers,
        json={"full_name": "Updated Principal Name"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["full_name"] == "Updated Principal Name"


def test_update_user_profile_email_conflict():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/users/me",
        headers=headers,
        json={"email": "member@pragency.eg"}
    )
    assert res.status_code == 400
    assert "already in use" in res.json()["detail"].lower()


def test_update_password_success_and_relogin():
    token = get_token("member@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/users/me/password",
        headers=headers,
        json={
            "current_password": "Password123!",
            "new_password": "NewStrongPass99!"
        }
    )
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # Verify login with new password succeeds
    login_new = client.post(
        "/api/auth/login",
        json={"email": "member@pragency.eg", "password": "NewStrongPass99!"}
    )
    assert login_new.status_code == 200

    # Old password no longer works
    login_old = client.post(
        "/api/auth/login",
        json={"email": "member@pragency.eg", "password": "Password123!"}
    )
    assert login_old.status_code == 401


def test_update_password_weak_rejected():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/users/me/password",
        headers=headers,
        json={
            "current_password": "Password123!",
            "new_password": "weak"
        }
    )
    assert res.status_code == 400


def test_update_password_wrong_current_rejected():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/users/me/password",
        headers=headers,
        json={
            "current_password": "WrongPassword999!",
            "new_password": "BrandNewPass888!"
        }
    )
    assert res.status_code == 400
    assert "incorrect" in res.json()["detail"].lower()


def test_get_organization_authenticated():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/organization", headers=headers)
    assert res.status_code == 200
    org = res.json()["organization"]
    assert "name" in org
    assert org["members_count"] >= 1


def test_update_organization_owner_allowed():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/organization",
        headers=headers,
        json={"name": "PR Workforce Autonomous Enterprise"}
    )
    assert res.status_code == 200
    org = res.json()["organization"]
    assert org["name"] == "PR Workforce Autonomous Enterprise"


def test_update_organization_member_forbidden():
    token = get_token("member@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/organization",
        headers=headers,
        json={"name": "Hacked Org Name"}
    )
    assert res.status_code == 403
