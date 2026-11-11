from fastapi.testclient import TestClient
from main import app
from database import list_web_vitals_db

client = TestClient(app)

def test_metrics_post_web_vitals_success():
    """Verify POST /api/metrics ingests Core Web Vitals accurately."""
    payloads = [
        {"name": "LCP", "value": 1820.5, "rating": "good", "route_template": "/dashboard"},
        {"name": "CLS", "value": 0.04, "rating": "good", "route_template": "/tasks"},
        {"name": "INP", "value": 45.2, "rating": "good", "route_template": "/virtual-office"},
        {"name": "FCP", "value": 850.0, "rating": "good", "route_template": "/login"},
        {"name": "TTFB", "value": 120.3, "rating": "good", "route_template": "/dashboard"},
    ]
    for p in payloads:
        resp = client.post("/api/metrics", json=p)
        assert resp.status_code == 200, f"Failed for {p['name']}: {resp.text}"
        data = resp.json()
        assert data["status"] == "recorded"
        assert data["metric"] == p["name"]
        assert data["value"] == p["value"]
        assert data["rating"] == p["rating"]
        assert data["route_template"] == p["route_template"]

    # Verify persisted in database
    vitals = list_web_vitals_db(limit=20)
    vital_names = {v.get("metric_name") or v.get("metric") for v in vitals}
    for p in payloads:
        assert p["name"] in vital_names

def test_metrics_post_pii_rejected():
    """Verify that any telemetry payload containing PII is rejected with 422."""
    pii_payloads = [
        {"name": "LCP", "value": 1200.0, "user_id": "usr_secret_123"},
        {"name": "FID", "value": 15.0, "email": "employee@pragency.eg"},
        {"name": "CLS", "value": 0.05, "ip": "192.168.1.1"},
        {"name": "INP", "value": 50.0, "token": "jwt_secret_token"},
    ]
    for p in pii_payloads:
        resp = client.post("/api/metrics", json=p)
        assert resp.status_code == 422
        assert "PII is strictly prohibited" in resp.json()["detail"]
