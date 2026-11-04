import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_login_owner_success():
    response = client.post("/api/auth/login", json={
        "email": "owner@pragency.eg",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "owner"
    assert data["user"]["email"] == "owner@pragency.eg"
    assert "password" not in data["user"]

def test_login_member_success():
    response = client.post("/api/auth/login", json={
        "email": "member@pragency.eg",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "member"

def test_login_invalid_password_returns_401():
    response = client.post("/api/auth/login", json={
        "email": "owner@pragency.eg",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

def test_protected_me_endpoint_with_valid_token():
    # Login first
    login_res = client.post("/api/auth/login", json={
        "email": "owner@pragency.eg",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    
    # Request /api/auth/me
    me_res = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == "owner@pragency.eg"

def test_protected_me_endpoint_unauthorized():
    res = client.get("/api/auth/me")
    assert res.status_code == 401
