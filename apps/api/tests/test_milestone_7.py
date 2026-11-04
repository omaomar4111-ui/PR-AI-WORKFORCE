import pytest
from fastapi.testclient import TestClient
from main import app
import database
from approvals.service import (
    RequiresApproval,
    SENSITIVE_ACTIONS,
    request_approval,
    approve,
    reject,
    edit_and_approve,
    list_approval_requests,
    get_approval_request,
    get_pending_approvals_count,
)
from integrations.registry import get_integration_adapter, list_supported_providers
from agents.registry import get_agent

client = TestClient(app)

OWNER_ORG_ID = "00000000-0000-0000-0000-000000000001"
OWNER_USER = {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "owner@pragency.eg",
    "role": "owner",
    "organization_id": OWNER_ORG_ID,
}


def get_auth_token(email: str = "owner@pragency.eg", password: str = "Password123!") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(autouse=True)
def clean_db():
    database.reset_db_for_tests()
    yield
    database.reset_db_for_tests()


def test_approval_request_lifecycle():
    """Verify approval request creation, approval, and rejection."""
    # 1. Create approval request
    req = request_approval(
        workflow_id="wf-test-1",
        step_id="step-test-1",
        agent_id="media-buyer",
        action_type="start_ad_campaign",
        payload={"platform": "Meta", "budget": 5000, "target": "Cairo"},
    )
    assert req["status"] == "pending"
    assert req["action_type"] == "start_ad_campaign"
    assert get_pending_approvals_count() == 1

    # 2. Approve request
    import asyncio
    approved = asyncio.run(approve(req["id"], user_id=OWNER_USER["id"], notes="Budget approved for Q4 launch"))
    assert approved["status"] == "approved"
    assert approved["reviewed_by"] == OWNER_USER["id"]
    assert approved["notes"] == "Budget approved for Q4 launch"
    assert get_pending_approvals_count() == 0

    # 3. Create another request and reject
    req2 = request_approval(
        workflow_id="wf-test-2",
        step_id="step-test-2",
        agent_id="copywriter",
        action_type="publish_post",
        payload={"caption": "Unchecked controversial draft"},
    )
    assert req2["status"] == "pending"
    rejected = asyncio.run(reject(req2["id"], user_id=OWNER_USER["id"], notes="Tone inappropriate"))
    assert rejected["status"] == "rejected"
    assert rejected["notes"] == "Tone inappropriate"


def test_approval_edit_and_approve():
    """Verify payload modification during approval (Edit & Approve)."""
    req = request_approval(
        workflow_id="wf-test-3",
        step_id="step-test-3",
        agent_id="media-buyer",
        action_type="update_ad_budget",
        payload={"budget": 100000},
    )

    import asyncio
    edited = asyncio.run(edit_and_approve(
        request_id=req["id"],
        user_id=OWNER_USER["id"],
        modified_payload={"budget": 25000, "currency": "EGP"},
        notes="Reduced budget to approved cap",
    ))
    assert edited["status"] == "edited"
    assert edited["payload"]["budget"] == 25000
    assert edited["payload"]["currency"] == "EGP"
    assert edited["notes"] == "Reduced budget to approved cap"


@pytest.mark.anyio
async def test_sensitive_action_requires_approval_exception():
    """Verify that an agent attempting a sensitive action without approval throws RequiresApproval."""
    agent = get_agent("copywriter")
    
    # Attempting sensitive action 'send_email' without approved flag
    with pytest.raises(RequiresApproval) as excinfo:
        await agent.execute(
            task_input={
                "topic": "Pitch Email",
                "format": "email",
                "tone": "formal",
                "target_language": "ar",
                "key_takeaways": ["Intro"],
                "action_type": "send_email",  # Sensitive action!
            },
            user=OWNER_USER,
        )
    assert excinfo.value.action_type == "send_email"
    assert "human approval" in str(excinfo.value).lower()

    # With approval flag, it succeeds
    result = await agent.execute(
        task_input={
            "topic": "Pitch Email",
            "format": "email",
            "tone": "formal",
            "target_language": "ar",
            "key_takeaways": ["Intro"],
            "action_type": "send_email",
            "approved": True,
        },
        user=OWNER_USER,
    )
    assert result["deliverable"]["status"] == "delivered"


def test_integration_adapter_unconnected_returns_not_connected():
    """Verify missing credentials NEVER simulate success and return not_connected."""
    drive = get_integration_adapter("google_drive", OWNER_ORG_ID)
    status = drive.get_status()
    assert status["status"] == "disconnected"

    # Testing connection without credentials
    test_res = drive.test_connection()
    assert test_res["status"] == "not_connected"
    assert "credentials or access_token missing" in test_res["message"]

    # Executing action without credentials
    exec_res = drive.execute("read_file", {"file_id": "123"})
    assert exec_res["status"] == "not_connected"


def test_integration_adapter_connected_executes_action():
    """Verify connecting with mock credentials enables successful execution."""
    drive = get_integration_adapter("google_drive", OWNER_ORG_ID)
    
    # Connect with credentials
    drive.connect(
        config={"access_token": "ya29.mock_oauth_token_xyz", "client_id": "test_client"},
        user_id=OWNER_USER["id"],
    )

    status = drive.get_status()
    assert status["status"] == "connected"

    # Test connection
    test_res = drive.test_connection()
    assert test_res["status"] == "connected"

    # Execute read_file
    read_res = drive.execute("read_file", {"file_id": "doc_file_001", "file_name": "brief.docx"})
    assert read_res["status"] == "success"
    assert read_res["file_id"] == "doc_file_001"
    assert "drive_url" not in read_res

    # Execute write_file
    write_res = drive.execute("write_file", {"name": "strategy.json"})
    assert write_res["status"] == "success"
    assert "https://drive.google.com" in write_res["drive_url"]

    # Disconnect
    assert drive.disconnect() is True
    assert drive.get_status()["status"] == "disconnected"


def test_approvals_and_integrations_rest_api():
    """Verify REST API for approvals list/approve/reject/edit and integrations list/connect/test/disconnect."""
    token = get_auth_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create approval request
    req = request_approval(
        workflow_id="wf-api-1",
        step_id="step-api-1",
        agent_id="media-buyer",
        action_type="publish_post",
        payload={"post_text": "Exclusive agency announcement"},
    )

    # 2. Check pending count endpoint
    count_res = client.get("/api/approvals/count", headers=headers)
    assert count_res.status_code == 200
    assert count_res.json()["pending_count"] >= 1

    # 3. List approvals
    list_res = client.get("/api/approvals?status=pending", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["approvals"]) >= 1

    # 4. Approve via API
    app_res = client.post(
        f"/api/approvals/{req['id']}/approve",
        headers=headers,
        json={"notes": "Approved by Agency Principal via Dashboard"},
    )
    assert app_res.status_code == 200
    assert app_res.json()["approval"]["status"] == "approved"

    # 5. List integrations endpoint (all 9 providers present)
    integ_res = client.get("/api/integrations", headers=headers)
    assert integ_res.status_code == 200
    integrations = integ_res.json()["integrations"]
    assert len(integrations) == 9
    providers = [i["provider"] for i in integrations]
    assert "google_drive" in providers
    assert "meta_ads" in providers
    assert "gmail" in providers

    # 6. Connect Google Drive via API
    conn_res = client.post(
        "/api/integrations/google_drive/connect",
        headers=headers,
        json={"config": {"access_token": "ya29.test_api_token"}},
    )
    assert conn_res.status_code == 200
    assert conn_res.json()["integration"]["status"] == "connected"

    # 7. Test Google Drive connection
    test_res = client.post("/api/integrations/google_drive/test", headers=headers)
    assert test_res.status_code == 200
    assert test_res.json()["status"] == "connected"

    # 8. Disconnect Google Drive
    disc_res = client.post("/api/integrations/google_drive/disconnect", headers=headers)
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "disconnected"
