import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_redis_endpoint():
    response = client.get("/health/redis")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "latency_ms" in data
    assert "host" in data
    assert "tls" in data
    assert isinstance(data["latency_ms"], (int, float))
