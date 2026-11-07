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


def test_agents_cache_control_and_etag_headers():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/agents", headers=headers)
    assert resp.status_code == 200
    
    # 1. Cache-Control header presence and directives
    assert "cache-control" in resp.headers or "Cache-Control" in resp.headers
    cache_control = resp.headers.get("cache-control") or resp.headers.get("Cache-Control")
    assert "public" in cache_control
    assert "max-age=60" in cache_control
    assert "stale-while-revalidate=300" in cache_control

    # 2. ETag header presence and format
    assert "etag" in resp.headers or "ETag" in resp.headers
    etag = resp.headers.get("etag") or resp.headers.get("ETag")
    assert etag.startswith('"') and etag.endswith('"')
    assert len(etag) > 10

    # 3. Content body is present on 200
    data = resp.json()
    assert data["count"] == 38
    assert len(data["agents"]) == 38


def test_agents_conditional_if_none_match_304():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initial GET to retrieve ETag
    resp1 = client.get("/api/agents", headers=headers)
    assert resp1.status_code == 200
    etag = resp1.headers.get("ETag") or resp1.headers.get("etag")
    assert etag is not None

    # 2. Conditional GET with matching If-None-Match
    cond_headers = {
        "Authorization": f"Bearer {token}",
        "If-None-Match": etag,
    }
    resp2 = client.get("/api/agents", headers=cond_headers)
    
    # HTTP 304 Not Modified
    assert resp2.status_code == 304
    assert len(resp2.content) == 0  # Body MUST be empty per RFC 7232
    assert (resp2.headers.get("ETag") or resp2.headers.get("etag")) == etag
    assert "max-age=60" in (resp2.headers.get("Cache-Control") or resp2.headers.get("cache-control"))


def test_agents_conditional_weak_etag_and_comma_separated():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp1 = client.get("/api/agents", headers=headers)
    assert resp1.status_code == 200
    etag = resp1.headers.get("ETag") or resp1.headers.get("etag")

    # Weak format: W/"..."
    weak_etag = f"W/{etag}"
    resp_weak = client.get("/api/agents", headers={"Authorization": f"Bearer {token}", "If-None-Match": weak_etag})
    assert resp_weak.status_code == 304
    assert len(resp_weak.content) == 0

    # Comma-separated list with match
    list_etags = f'"stale-etag-1", {etag}, "stale-etag-2"'
    resp_list = client.get("/api/agents", headers={"Authorization": f"Bearer {token}", "If-None-Match": list_etags})
    assert resp_list.status_code == 304
    assert len(resp_list.content) == 0


def test_agents_conditional_if_none_match_mismatch_200():
    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "If-None-Match": '"outdated-or-different-etag-12345"',
    }

    resp = client.get("/api/agents", headers=headers)
    assert resp.status_code == 200
    assert len(resp.content) > 0
    data = resp.json()
    assert data["count"] == 38
    real_etag = resp.headers.get("ETag") or resp.headers.get("etag")
    assert real_etag != '"outdated-or-different-etag-12345"'
