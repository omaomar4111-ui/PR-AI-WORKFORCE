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


def test_list_integrations_core_and_extended():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    # Core default list (9 providers)
    res = client.get("/api/integrations", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "integrations" in data
    assert len(data["integrations"]) == 9
    providers = [i["provider"] for i in data["integrations"]]
    assert "google_drive" in providers
    assert "gmail" in providers

    # Extended list (12 providers including Slack, GitHub, Notion)
    res_ext = client.get("/api/integrations?include_extended=true", headers=headers)
    assert res_ext.status_code == 200
    ext_data = res_ext.json()
    assert len(ext_data["integrations"]) == 12
    ext_providers = [i["provider"] for i in ext_data["integrations"]]
    assert "slack" in ext_providers
    assert "github" in ext_providers
    assert "notion" in ext_providers


def test_connect_and_disconnect_integration():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Connect Slack
    slack_payload = {
        "config": {
            "bot_token": "xoxb-sandbox-slack-token-test",
            "webhook_url": "https://hooks.slack.com/services/T00/B00/TEST",
        }
    }
    conn_res = client.post(
        "/api/integrations/slack/connect", json=slack_payload, headers=headers
    )
    assert conn_res.status_code == 200
    conn_data = conn_res.json()
    assert conn_data["success"] is True
    assert conn_data["integration"]["status"] == "connected"

    # 2. Verify Slack is connected in extended list
    list_res = client.get("/api/integrations?include_extended=true", headers=headers)
    assert list_res.status_code == 200
    slack_item = next(
        i for i in list_res.json()["integrations"] if i["provider"] == "slack"
    )
    assert slack_item["status"] == "connected"
    assert slack_item["connected_at"] is not None

    # 3. Test Slack connection
    test_res = client.post("/api/integrations/slack/test", headers=headers)
    assert test_res.status_code == 200
    assert test_res.json()["success"] is True

    # 4. Disconnect via DELETE endpoint
    del_res = client.delete("/api/integrations/slack", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True
    assert del_res.json()["status"] == "disconnected"

    # 5. Verify disconnected state
    list_res2 = client.get("/api/integrations?include_extended=true", headers=headers)
    slack_item2 = next(
        i for i in list_res2.json()["integrations"] if i["provider"] == "slack"
    )
    assert slack_item2["status"] == "disconnected"


def test_connect_google_drive_and_delete():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"config": {"access_token": "ya29.sample_oauth_token"}}
    conn_res = client.post(
        "/api/integrations/google_drive/connect", json=payload, headers=headers
    )
    assert conn_res.status_code == 200

    del_res = client.delete("/api/integrations/google_drive", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


def test_member_role_forbidden_from_connecting_integration():
    member_token = get_auth_token("member")
    headers = {"Authorization": f"Bearer {member_token}"}

    payload = {"config": {"access_token": "token"}}
    res = client.post(
        "/api/integrations/google_drive/connect", json=payload, headers=headers
    )
    assert res.status_code == 403


def test_unauthorized_integration_access():
    res = client.get("/api/integrations")
    assert res.status_code == 401

    res = client.delete("/api/integrations/google_drive")
    assert res.status_code == 401
