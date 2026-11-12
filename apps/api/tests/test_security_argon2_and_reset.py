import pytest
from fastapi.testclient import TestClient
from main import app
from database import reset_db_for_tests, get_user_by_email
from auth.tokens import hash_password, verify_password, create_password_reset_token, verify_password_reset_token

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    reset_db_for_tests()
    yield
    reset_db_for_tests()


def test_argon2id_hashing_and_verification():
    """Verify passwords hashed with Argon2id format and verify correctly."""
    plain = "SuperSecure123!"
    hashed = hash_password(plain)
    assert hashed.startswith("$argon2id$")
    assert verify_password(hashed, plain) is True
    assert verify_password(hashed, "WrongSecret123!") is False


def test_argon2id_backward_compatibility_with_legacy_and_plain():
    """Verify backward compatibility with legacy plain text passwords in tests."""
    assert verify_password("Password123!", "Password123!") is True
    assert verify_password("Password123!", "WrongPassword") is False


def test_register_hashes_password_with_argon2id():
    """Verify new user registration stores password as Argon2id hash."""
    res = client.post("/api/auth/register", json={
        "email": "new_founder@agency.eg",
        "password": "StrongPassword999!",
        "full_name": "New Agency Founder"
    })
    assert res.status_code == 200
    user = get_user_by_email("new_founder@agency.eg")
    assert user is not None
    assert user["password"].startswith("$argon2id$")

    # Verify user can login with their password
    login_res = client.post("/api/auth/login", json={
        "email": "new_founder@agency.eg",
        "password": "StrongPassword999!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_forgot_and_reset_password_flow_with_15min_token():
    """Verify 15-minute temporary reset token flow and Argon2id re-hashing."""
    # 1. Forgot password request for existing user
    forgot_res = client.post("/api/auth/forgot-password", json={"email": "owner@pragency.eg"})
    assert forgot_res.status_code == 200
    data = forgot_res.json()
    assert data["status"] == "ok"
    assert "reset_token" in data
    assert data["expires_in"] == 900
    token = data["reset_token"]

    # 2. Reset password with invalid token
    bad_reset = client.post("/api/auth/reset-password", json={
        "token": "invalid.jwt.token",
        "new_password": "NewSecretPass456!"
    })
    assert bad_reset.status_code == 400

    # 3. Reset password with weak password fails strength validation
    weak_reset = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "weak"
    })
    assert weak_reset.status_code == 400

    # 4. Successful password reset
    good_reset = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "NewSecretPass456!"
    })
    assert good_reset.status_code == 200
    assert good_reset.json()["status"] == "success"

    # 5. Verify user can login with new password
    login_new = client.post("/api/auth/login", json={
        "email": "owner@pragency.eg",
        "password": "NewSecretPass456!"
    })
    assert login_new.status_code == 200

    # 6. Verify old password fails
    login_old = client.post("/api/auth/login", json={
        "email": "owner@pragency.eg",
        "password": "Password123!"
    })
    assert login_old.status_code == 401


def test_forgot_password_anti_enumeration():
    """Verify forgot password returns generic success for non-existent emails to prevent enumeration."""
    res = client.post("/api/auth/forgot-password", json={"email": "nonexistent@pragency.eg"})
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert "reset_token" not in res.json()
