import pytest
import sys
import os

# Add parent directory to path so config and main can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check_returns_200():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "healthy"]
    assert data["service"] == "PR AI WORKFORCE API"
    assert "version" in data
    assert "timestamp" in data
    assert "connected" in data["database"]
