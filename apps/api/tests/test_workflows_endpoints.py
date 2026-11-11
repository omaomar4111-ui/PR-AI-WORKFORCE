import pytest
from fastapi.testclient import TestClient
from main import app
from database import reset_db_for_tests

client = TestClient(app)


def get_auth_token(role="owner"):
    email = "owner@pragency.eg" if role == "owner" else "member@pragency.eg"
    res = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(autouse=True)
def setup_teardown():
    reset_db_for_tests()
    yield
    reset_db_for_tests()


def test_list_workflows_empty():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/workflows", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "workflows" in data
    assert isinstance(data["workflows"], list)


def test_create_custom_builder_workflow():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Social Growth Sprint",
        "user_request": "Execute a 3-step social growth workflow for luxury fashion client",
        "auto_start": False,
        "steps": [
            {
                "assigned_agent_id": "dr-ibrahim",
                "assigned_agent_name": "Dr. Ibrahim (Market Researcher)",
                "title": "Analyze Fashion Trend Data",
                "step_order": 1,
                "input": {"focus": "luxury-fashion-cairo"},
                "requires_approval": False,
            },
            {
                "assigned_agent_id": "copywriter",
                "assigned_agent_name": "Content Architect (Copywriter)",
                "title": "Draft Viral Carousel Hooks",
                "step_order": 2,
                "input": {"tone": "sophisticated"},
                "requires_approval": False,
            },
            {
                "assigned_agent_id": "qa-lead",
                "assigned_agent_name": "QA Lead (Reviewer)",
                "title": "Quality Review and Compliance",
                "step_order": 3,
                "input": {},
                "requires_approval": True,
            },
        ],
    }

    res = client.post("/api/workflows", json=payload, headers=headers)
    assert res.status_code == 201
    wf = res.json()["workflow"]
    assert wf["title"] == "Social Growth Sprint"
    assert len(wf["steps"]) == 3
    assert wf["steps"][0]["assigned_agent_id"] == "dr-ibrahim"
    assert wf["steps"][2]["requires_approval"] is True


def test_get_and_update_workflow():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create initial workflow
    create_payload = {
        "title": "Initial Pipeline",
        "user_request": "Initial brief for testing update",
        "auto_start": False,
        "steps": [
            {
                "assigned_agent_id": "dr-ibrahim",
                "assigned_agent_name": "Dr. Ibrahim",
                "title": "Step 1",
                "step_order": 1,
            }
        ],
    }
    create_res = client.post("/api/workflows", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    wf_id = create_res.json()["workflow"]["id"]

    # 2. Get workflow
    get_res = client.get(f"/api/workflows/{wf_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["workflow"]["title"] == "Initial Pipeline"

    # 3. Update title and replace steps
    update_payload = {
        "title": "Updated Master Pipeline",
        "user_request": "Updated brief with more details",
        "steps": [
            {
                "assigned_agent_id": "ragaa",
                "assigned_agent_name": "Ragaa (PR Strategist)",
                "title": "PR Narrative Outline",
                "step_order": 1,
            },
            {
                "assigned_agent_id": "media-buyer",
                "assigned_agent_name": "Media Buyer",
                "title": "Ad Placement Plan",
                "step_order": 2,
            },
        ],
    }
    put_res = client.put(f"/api/workflows/{wf_id}", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    updated_wf = put_res.json()["workflow"]
    assert updated_wf["title"] == "Updated Master Pipeline"
    assert len(updated_wf["steps"]) == 2
    assert updated_wf["steps"][0]["assigned_agent_id"] == "ragaa"


def test_execute_workflow_endpoint():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    create_payload = {
        "title": "Runnable Flow",
        "user_request": "Short test workflow",
        "auto_start": False,
        "steps": [
            {
                "assigned_agent_id": "dr-ibrahim",
                "assigned_agent_name": "Dr. Ibrahim",
                "title": "Market Scan",
                "step_order": 1,
            }
        ],
    }
    create_res = client.post("/api/workflows", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    wf_id = create_res.json()["workflow"]["id"]

    # Execute workflow asynchronously
    exec_res = client.post(f"/api/workflows/{wf_id}/execute", headers=headers)
    assert exec_res.status_code == 200
    assert exec_res.json()["success"] is True
    assert exec_res.json()["status"] == "running"


def test_delete_workflow():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    create_payload = {
        "title": "To Delete Flow",
        "user_request": "Brief to be deleted",
        "auto_start": False,
    }
    create_res = client.post("/api/workflows", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    wf_id = create_res.json()["workflow"]["id"]

    # Delete
    del_res = client.delete(f"/api/workflows/{wf_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Confirm 404
    get_res = client.get(f"/api/workflows/{wf_id}", headers=headers)
    assert get_res.status_code == 404


def test_unauthorized_access():
    res = client.get("/api/workflows")
    assert res.status_code == 401

    res = client.post("/api/workflows", json={"user_request": "test"})
    assert res.status_code == 401
