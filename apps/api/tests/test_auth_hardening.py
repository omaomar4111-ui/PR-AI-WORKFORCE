import os
import sys
import time
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from auth.tokens import validate_password_strength, create_jwt_token, verify_jwt_token
from middleware.rate_limit import reset_rate_limits

client = TestClient(app)


def test_password_strength_valid_passwords():
    """Verify that compliant passwords pass strength validation."""
    validate_password_strength("Password123!")
    validate_password_strength("Secure2026Pass")
    validate_password_strength("MyP@ssw0rd99")


def test_password_strength_too_short():
    """Verify that passwords under 8 characters are rejected."""
    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password_strength("Pass1!")


def test_password_strength_missing_uppercase():
    """Verify that passwords missing uppercase characters are rejected."""
    with pytest.raises(ValueError, match="at least one uppercase"):
        validate_password_strength("password123!")


def test_password_strength_missing_lowercase():
    """Verify that passwords missing lowercase characters are rejected."""
    with pytest.raises(ValueError, match="at least one lowercase"):
        validate_password_strength("PASSWORD123!")


def test_password_strength_missing_digit():
    """Verify that passwords missing digits are rejected."""
    with pytest.raises(ValueError, match="at least one numeric digit"):
        validate_password_strength("PasswordNoDigit!")


def test_register_endpoint_rejects_weak_password():
    """Verify POST /api/auth/register rejects weak password with HTTP 400."""
    response = client.post("/api/auth/register", json={
        "email": "weak_pwd_user@pragency.eg",
        "password": "weak",
        "full_name": "Weak Pwd User"
    })
    assert response.status_code == 400
    assert "at least 8 characters" in response.json()["detail"]


def test_jwt_access_token_15m_expiry():
    """Verify that access tokens are minted with 15-minute expiration (900 seconds)."""
    payload = {"sub": "user-test-123", "email": "test@pragency.eg", "role": "member"}
    t0 = int(time.time())
    token = create_jwt_token(payload)
    
    verified = verify_jwt_token(token)
    assert verified is not None
    assert verified["sub"] == "user-test-123"
    assert verified["exp"] - verified["iat"] == 900
    assert verified["exp"] >= t0 + 890


def test_jwt_expired_token_rejected():
    """Verify that an expired JWT token returns None on verification."""
    payload = {"sub": "user-expired", "email": "expired@pragency.eg"}
    # Token that expired 10 seconds ago
    expired_token = create_jwt_token(payload, expires_in=-10)
    assert verify_jwt_token(expired_token) is None


def test_rate_limiting_register_endpoint_threshold():
    """Verify /api/auth/register enforces 5 requests/minute limit with HTTP 429."""
    reset_rate_limits()
    enforce_headers = {"X-Test-Enforce-Rate-Limit": "true"}

    for i in range(5):
        res = client.post(
            "/api/auth/register",
            json={"email": f"rate_limit_{i}@test.com", "password": "weak", "full_name": "Test User"},
            headers=enforce_headers
        )
        assert res.status_code != 429, f"Request {i+1} unexpectedly throttled"

    # 6th request must trigger HTTP 429
    res_6th = client.post(
        "/api/auth/register",
        json={"email": "rate_limit_6@test.com", "password": "weak", "full_name": "Test User"},
        headers=enforce_headers
    )
    assert res_6th.status_code == 429
    data = res_6th.json()
    assert "Rate limit exceeded" in data["detail"]
    assert res_6th.headers.get("Retry-After") is not None
    assert res_6th.headers.get("X-RateLimit-Remaining") == "0"
