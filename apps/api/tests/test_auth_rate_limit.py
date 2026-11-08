import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from middleware.rate_limit import reset_rate_limits

client = TestClient(app)


def test_rate_limiting_login_endpoint_threshold():
    """Verify /api/auth/login enforces 5 requests/minute limit with HTTP 429."""
    reset_rate_limits()
    enforce_headers = {"X-Test-Enforce-Rate-Limit": "true"}

    for i in range(5):
        res = client.post(
            "/api/auth/login",
            json={"email": "nonexistent@pragency.eg", "password": "WrongPassword1!"},
            headers=enforce_headers
        )
        assert res.status_code != 429, f"Request {i+1} unexpectedly throttled"

    # 6th request triggers 429
    res_6th = client.post(
        "/api/auth/login",
        json={"email": "nonexistent@pragency.eg", "password": "WrongPassword1!"},
        headers=enforce_headers
    )
    assert res_6th.status_code == 429
    assert "Rate limit exceeded" in res_6th.json()["detail"]
    assert res_6th.headers.get("Retry-After") is not None


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

    # 6th request triggers 429
    res_6th = client.post(
        "/api/auth/register",
        json={"email": "rate_limit_6@test.com", "password": "weak", "full_name": "Test User"},
        headers=enforce_headers
    )
    assert res_6th.status_code == 429
    assert "Rate limit exceeded" in res_6th.json()["detail"]


def test_auth_lockout_after_10_failed_logins():
    """Verify 10 failed login attempts locks out the IP for 15 minutes."""
    reset_rate_limits()
    # Bypass per-minute windowing to test the 10-failed attempts lockout specifically
    bypass_headers = {"X-Test-Bypass-Rate-Limit": "true"}

    # Simulate 10 failed login attempts
    for i in range(10):
        res = client.post(
            "/api/auth/login",
            json={"email": "fake_target@pragency.eg", "password": f"BadPassword{i}!"},
            headers=bypass_headers
        )
        assert res.status_code == 401

    # 11th request (even with normal rate limit) must be locked out with HTTP 429
    enforce_headers = {"X-Test-Enforce-Rate-Limit": "true"}
    locked_res = client.post(
        "/api/auth/login",
        json={"email": "fake_target@pragency.eg", "password": "AnyPassword1!"},
        headers=enforce_headers
    )
    assert locked_res.status_code == 429
    data = locked_res.json()
    assert data.get("locked") is True
    assert "locked due to excessive failed attempts" in data["detail"]
    assert locked_res.headers.get("X-RateLimit-Locked") == "true"
