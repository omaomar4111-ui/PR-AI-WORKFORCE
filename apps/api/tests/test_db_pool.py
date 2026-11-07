import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app
from database import engine, get_db_pool_status

client = TestClient(app)

def test_db_health_endpoint_and_pool_tuning():
    res = client.get("/health/db")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "connected"
    pool = data["pool"]
    assert pool["pool_size"] == 10
    assert pool["max_overflow"] == 20
    assert pool["pre_ping"] is True
    assert pool["recycle_seconds"] == 300

def test_engine_pool_parameters():
    status = get_db_pool_status()
    assert status["pool_size"] == 10
    assert status["max_overflow"] == 20
    assert status["pre_ping"] is True
    assert status["recycle_seconds"] == 300
    assert status["max_capacity"] == 30
