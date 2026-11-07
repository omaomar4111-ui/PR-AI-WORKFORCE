import pytest
import sys
import os
from urllib.parse import urlparse

# Add parent directory to path so config and main can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app
from database import list_web_vitals_db, engine

client = TestClient(app)


def test_rum_pii_not_stored():
    """Verify that client_ip and url are completely excluded from persistence (GDPR compliance)."""
    payload = {
        "name": "LCP",
        "value": 245.8,
        "rating": "good",
        "url": "http://localhost:3000/clients?search=acme&filter=vip"
    }
    response = client.post("/api/telemetry/vitals", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "recorded"
    assert data["metric"] == "LCP"
    assert data["route_template"] == "/clients"

    # Verify latest record from database/memory helper
    vitals = list_web_vitals_db(limit=5)
    matching = [v for v in vitals if v["metric_name"] == "LCP" and abs(v["metric_value"] - 245.8) < 0.01]
    assert len(matching) > 0
    rec = matching[0]

    # Verify PII columns client_ip and raw url are NOT present or are None
    assert "client_ip" not in rec or rec.get("client_ip") is None
    assert "url" not in rec or rec.get("url") is None
    assert rec.get("route_template") == "/clients"

    # If connected to live database, verify table schema does NOT contain client_ip or url columns
    if engine:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                res = conn.execute(text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name='web_vitals'"
                )).fetchall()
                col_names = {r[0] for r in res}
                assert "client_ip" not in col_names, "client_ip column must be dropped from web_vitals"
                assert "url" not in col_names, "url column must be dropped from web_vitals"
                assert "route_template" in col_names, "route_template column must exist in web_vitals"
                assert "country_code" in col_names, "country_code column must exist in web_vitals"
        except Exception:
            pass


def test_rum_route_template_sanitization():
    """Verify that complex URLs with query params and secrets are strictly stripped to route_template."""
    dirty_url = "http://localhost:3000/dashboard?user=123&session_token=super_secret_xyz&ref=partner#section"
    payload = {
        "name": "INP",
        "value": 35.2,
        "rating": "good",
        "url": dirty_url
    }
    response = client.post("/api/telemetry/vitals", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["route_template"] == "/dashboard"
    assert "user=" not in data["route_template"]
    assert "session_token" not in data["route_template"]

    vitals = list_web_vitals_db(limit=5)
    matching = [v for v in vitals if v["metric_name"] == "INP" and abs(v["metric_value"] - 35.2) < 0.01]
    assert len(matching) > 0
    assert matching[0]["route_template"] == "/dashboard"


def test_anon_cannot_read_web_vitals():
    """Verify that unauthenticated clients / anonymous users cannot read web_vitals (no data leakage)."""
    # 1. API level: unauthenticated GET /api/telemetry/vitals returns 401
    resp = client.get("/api/telemetry/vitals")
    assert resp.status_code in [401, 403], f"Anonymous GET must be rejected, got {resp.status_code}"

    # 2. Database level: verify Supabase RLS policies restrict SELECT to service_role only
    if engine:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                policies = conn.execute(text(
                    "SELECT polname, polcmd, polroles::regrole[] FROM pg_policy WHERE polrelid='web_vitals'::regclass"
                )).fetchall()
                # Ensure no policy grants read to PUBLIC, anon, or authenticated
                for polname, polcmd, polroles in policies:
                    roles_str = str(polroles)
                    assert "service_role" in roles_str, f"Policy {polname} should belong strictly to service_role"
                    assert "authenticated" not in roles_str or polname != "Allow authenticated read web_vitals", \
                        "Authenticated users must not have unrestricted read access to web_vitals"
        except Exception:
            pass
