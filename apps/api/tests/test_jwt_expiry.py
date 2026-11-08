import os
import sys
import time
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from auth.tokens import create_jwt_token, create_refresh_token, verify_jwt_token


def test_jwt_access_token_15m_expiry():
    """Verify that access tokens default to 15-minute expiration (900 seconds)."""
    payload = {"sub": "user-test-access", "role": "member"}
    t0 = int(time.time())
    token = create_jwt_token(payload)

    verified = verify_jwt_token(token)
    assert verified is not None
    assert verified["sub"] == "user-test-access"
    assert verified["exp"] - verified["iat"] == 900
    assert verified["exp"] >= t0 + 890


def test_jwt_refresh_token_7d_expiry():
    """Verify that refresh tokens default to 7-day expiration (604,800 seconds)."""
    payload = {"sub": "user-test-refresh", "role": "member"}
    t0 = int(time.time())
    token = create_refresh_token(payload)

    verified = verify_jwt_token(token)
    assert verified is not None
    assert verified["sub"] == "user-test-refresh"
    assert verified.get("token_type") == "refresh"
    assert verified["exp"] - verified["iat"] == 86400 * 7
    assert verified["exp"] >= t0 + (86400 * 7) - 10


def test_jwt_expired_token_rejected():
    """Verify that expired JWT tokens return None."""
    payload = {"sub": "user-expired", "role": "member"}
    expired_token = create_jwt_token(payload, expires_in=-10)
    assert verify_jwt_token(expired_token) is None


def test_jwt_tampered_signature_rejected():
    """Verify that tampered JWT signatures return None."""
    payload = {"sub": "user-valid", "role": "member"}
    token = create_jwt_token(payload)
    parts = token.split(".")
    tampered_token = f"{parts[0]}.{parts[1]}.tamperedSignatureHere"
    assert verify_jwt_token(tampered_token) is None
