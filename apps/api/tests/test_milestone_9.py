import pytest
import json
import asyncio
from fastapi.testclient import TestClient

from main import app
from database import reset_db_for_tests
from virtual_office.status_manager import reset_statuses, get_all_statuses, update_agent_status

client = TestClient(app)


def get_auth_token(role="owner"):
    email = "owner@pragency.eg" if role == "owner" else "member@pragency.eg"
    res = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(autouse=True)
def setup_teardown():
    reset_db_for_tests()
    reset_statuses()
    yield
    reset_db_for_tests()
    reset_statuses()


def test_get_agents_status_returns_38_agents():
    """Verify GET /api/agents/status returns operational status for all 38 agents."""
    token = get_auth_token("owner")
    res = client.get("/api/agents/status", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 38
    statuses = data["statuses"]
    assert len(statuses) == 38

    # All agents default to idle
    for item in statuses:
        assert item["status"] in ("idle", "working", "blocked")
        assert "agent_id" in item
        assert "name" in item
        assert "department" in item

    departments = {item["department"] for item in statuses}
    expected_depts = {"marketing", "creative", "video", "engineering", "research", "sales", "operations", "quality"}
    assert departments == expected_depts


def test_patch_agent_status_updates_record():
    """Verify PATCH /api/agents/{agent_id}/status updates the agent's status."""
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Update Dr. Ibrahim to 'working'
    patch_res = client.patch(
        "/api/agents/dr-ibrahim/status",
        json={"status": "working", "current_task": "Real-time market intelligence analysis"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    agent_data = patch_res.json()["agent"]
    assert agent_data["agent_id"] == "dr-ibrahim"
    assert agent_data["status"] == "working"
    assert agent_data["current_task"] == "Real-time market intelligence analysis"

    # 2. Verify in status list
    list_res = client.get("/api/agents/status", headers=headers)
    assert list_res.status_code == 200
    dr_entry = next((s for s in list_res.json()["statuses"] if s["agent_id"] == "dr-ibrahim"), None)
    assert dr_entry is not None
    assert dr_entry["status"] == "working"

    # 3. Update to 'blocked'
    patch_res2 = client.patch(
        "/api/agents/dr-ibrahim/status",
        json={"status": "blocked", "current_task": "Awaiting executive human sign-off"},
        headers=headers,
    )
    assert patch_res2.status_code == 200
    assert patch_res2.json()["agent"]["status"] == "blocked"

    # 4. Reset back to 'idle'
    patch_res3 = client.patch(
        "/api/agents/dr-ibrahim/status",
        json={"status": "idle"},
        headers=headers,
    )
    assert patch_res3.status_code == 200
    assert patch_res3.json()["agent"]["status"] == "idle"
    assert patch_res3.json()["agent"]["current_task"] is None


def test_patch_agent_status_invalid_value():
    """Verify invalid status transitions return HTTP 422 error."""
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.patch(
        "/api/agents/dr-ibrahim/status",
        json={"status": "offline_unsupported_status"},
        headers=headers,
    )
    assert res.status_code == 422


def test_websocket_agents_status_connection_and_broadcast():
    """Verify /ws/agents/status connects and delivers initial snapshot and pong heartbeats."""
    with client.websocket_connect("/ws/agents/status") as websocket:
        init_raw = websocket.receive_text()
        init_data = json.loads(init_raw)
        assert init_data["type"] == "initial_status"
        assert init_data["count"] == 38
        assert len(init_data["statuses"]) == 38

        # Test heartbeat ping-pong
        websocket.send_text("ping")
        pong_raw = websocket.receive_text()
        pong_data = json.loads(pong_raw)
        assert pong_data["type"] == "status_pong"
        assert pong_data["payload"] == "ping"


def test_agent_execution_updates_status_lifecycle():
    """Verify executing an agent via API automatically sets working status and resets to idle."""
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    sample_input = {
        "client_name": "Virtual Office Demo Client",
        "industry": "PR AI Software",
        "competitors": ["Agency Corp"],
        "research_objectives": ["Brand positioning"],
        "target_region": "MENA",
    }

    exec_res = client.post(
        "/api/agents/dr-ibrahim/execute",
        json={"input": sample_input, "title": "Automated Virtual Office Probe"},
        headers=headers,
    )
    assert exec_res.status_code == 200

    # After completion, agent must be reset to idle
    status_res = client.get("/api/agents/status", headers=headers)
    assert status_res.status_code == 200
    dr_status = next(s for s in status_res.json()["statuses"] if s["agent_id"] == "dr-ibrahim")
    assert dr_status["status"] == "idle"
