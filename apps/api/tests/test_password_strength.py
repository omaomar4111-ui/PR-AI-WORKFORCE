import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from auth.tokens import validate_password_strength
from middleware.rate_limit import reset_rate_limits

client = TestClient(app)


def test_password_strength_compliant():
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
    """Verify that passwords missing numeric digits are rejected."""
    with pytest.raises(ValueError, match="at least one numeric digit"):
        validate_password_strength("PasswordNoDigit!")


def test_register_endpoint_rejects_weak_password():
    """Verify POST /api/auth/register rejects weak password with HTTP 400."""
    reset_rate_limits()
    response = client.post("/api/auth/register", json={
        "email": "weak_test_user@pragency.eg",
        "password": "weak",
        "full_name": "Weak User"
    })
    assert response.status_code == 400
    assert "at least 8 characters" in response.json()["detail"]
