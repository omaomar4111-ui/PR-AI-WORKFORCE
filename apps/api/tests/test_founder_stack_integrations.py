import pytest
from fastapi.testclient import TestClient
from main import app
from database import reset_db_for_tests
from integrations.registry import list_supported_providers, get_integration_adapter

client = TestClient(app)

OWNER_EMAIL = "owner@pragency.eg"
ORG_ID = "00000000-0000-0000-0000-000000000001"


def get_owner_token():
    res = client.post("/api/auth/login", json={"email": OWNER_EMAIL, "password": "Password123!"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(autouse=True)
def clean_db():
    reset_db_for_tests()
    yield
    reset_db_for_tests()


def test_list_supported_providers_counts():
    """Verify tier counts: 9 core, 12 extended, 18 with founder stack."""
    core = list_supported_providers()
    assert len(core) == 9

    ext = list_supported_providers(include_extended=True)
    assert len(ext) == 12

    founder = list_supported_providers(include_founder=True)
    assert len(founder) == 18

    founder_providers = [p["provider"] for p in founder]
    for required in ["resend", "supabase", "stripe", "linear", "posthog", "cloudflare"]:
        assert required in founder_providers


def test_api_integrations_endpoint_founder_query():
    """Verify REST API returns 18 items when include_founder=true."""
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Core default
    res_core = client.get("/api/integrations", headers=headers)
    assert res_core.status_code == 200
    assert len(res_core.json()["integrations"]) == 9

    # Extended
    res_ext = client.get("/api/integrations?include_extended=true", headers=headers)
    assert res_ext.status_code == 200
    assert len(res_ext.json()["integrations"]) == 12

    # Founder stack
    res_founder = client.get("/api/integrations?include_extended=true&include_founder=true", headers=headers)
    assert res_founder.status_code == 200
    integrations = res_founder.json()["integrations"]
    assert len(integrations) == 18

    providers = {i["provider"]: i for i in integrations}
    assert "resend" in providers
    assert "supabase" in providers
    assert "stripe" in providers
    assert "linear" in providers
    assert "posthog" in providers
    assert "cloudflare" in providers


def test_resend_integration_lifecycle():
    """Verify Resend connect, test, execute, disconnect."""
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test fails without credentials
    test_fail = client.post("/api/integrations/resend/test", headers=headers)
    assert test_fail.status_code == 200
    assert test_fail.json()["success"] is False

    # 2. Connect
    payload = {"config": {"api_key": "re_sandbox_test_marketing_key_8899", "sender_domain": "mail.pragency.eg"}}
    conn = client.post("/api/integrations/resend/connect", json=payload, headers=headers)
    assert conn.status_code == 200
    assert conn.json()["integration"]["status"] == "connected"

    # 3. Test succeeds
    test_ok = client.post("/api/integrations/resend/test", headers=headers)
    assert test_ok.status_code == 200
    assert test_ok.json()["success"] is True

    # 4. Adapter execution
    adapter = get_integration_adapter("resend", ORG_ID)
    res = adapter.execute("send_email", {"to": "client@example.com", "subject": "Campaign Launch"})
    assert res["success"] is True
    assert "resend" in res["email_id"]

    # 5. Disconnect
    disc = client.post("/api/integrations/resend/disconnect", headers=headers)
    assert disc.status_code == 200
    assert disc.json()["status"] == "disconnected"


def test_supabase_integration_lifecycle():
    """Verify Supabase connect, test, execute, disconnect."""
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Connect
    payload = {
        "config": {
            "supabase_url": "https://pr-workforce.supabase.co",
            "anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sandbox_anon_key",
        }
    }
    conn = client.post("/api/integrations/supabase/connect", json=payload, headers=headers)
    assert conn.status_code == 200
    assert conn.json()["integration"]["status"] == "connected"

    # 2. Test connection
    test_ok = client.post("/api/integrations/supabase/test", headers=headers)
    assert test_ok.status_code == 200
    assert test_ok.json()["success"] is True

    # 3. Adapter execution
    adapter = get_integration_adapter("supabase", ORG_ID)
    res = adapter.execute("query_table", {"table": "campaign_analytics"})
    assert res["success"] is True
    assert res["table"] == "campaign_analytics"

    # 4. Disconnect
    disc = client.delete("/api/integrations/supabase", headers=headers)
    assert disc.status_code == 200
    assert disc.json()["status"] == "disconnected"


def test_stripe_integration_lifecycle():
    """Verify Stripe connect, test, execute, disconnect."""
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Connect
    payload = {"config": {"secret_key": "sk_test_51MzSandboxTestStripeKey9988"}}
    conn = client.post("/api/integrations/stripe/connect", json=payload, headers=headers)
    assert conn.status_code == 200
    assert conn.json()["integration"]["status"] == "connected"

    # 2. Test
    test_ok = client.post("/api/integrations/stripe/test", headers=headers)
    assert test_ok.status_code == 200
    assert test_ok.json()["success"] is True

    # 3. Execution
    adapter = get_integration_adapter("stripe", ORG_ID)
    res = adapter.execute("create_payment_link", {"amount": 2500})
    assert res["success"] is True
    assert "stripe.com" in res["payment_link"]

    # 4. Disconnect
    disc = client.delete("/api/integrations/stripe", headers=headers)
    assert disc.status_code == 200


def test_linear_integration_lifecycle():
    """Verify Linear connect, test, execute, disconnect."""
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"config": {"api_key": "lin_api_sandbox_personal_token_7766"}}
    conn = client.post("/api/integrations/linear/connect", json=payload, headers=headers)
    assert conn.status_code == 200

    test_ok = client.post("/api/integrations/linear/test", headers=headers)
    assert test_ok.status_code == 200
    assert test_ok.json()["success"] is True

    adapter = get_integration_adapter("linear", ORG_ID)
    res = adapter.execute("create_issue", {"title": "Design Hero Graphic", "issue_number": 402})
    assert res["success"] is True
    assert res["issue_id"] == "LIN-402"

    disc = client.delete("/api/integrations/linear", headers=headers)
    assert disc.status_code == 200


def test_posthog_integration_lifecycle():
    """Verify PostHog connect, test, execute, disconnect."""
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"config": {"project_api_key": "phc_sandbox_posthog_project_key_5544"}}
    conn = client.post("/api/integrations/posthog/connect", json=payload, headers=headers)
    assert conn.status_code == 200

    test_ok = client.post("/api/integrations/posthog/test", headers=headers)
    assert test_ok.status_code == 200
    assert test_ok.json()["success"] is True

    adapter = get_integration_adapter("posthog", ORG_ID)
    res = adapter.execute("capture_event", {"event": "ad_campaign_launched", "distinct_id": "client_99"})
    assert res["success"] is True
    assert res["event"] == "ad_campaign_launched"

    disc = client.delete("/api/integrations/posthog", headers=headers)
    assert disc.status_code == 200


def test_cloudflare_integration_lifecycle():
    """Verify Cloudflare connect, test, execute, disconnect."""
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"config": {"api_token": "cf_token_sandbox_global_edge_token_1122", "account_id": "cf_act_99887766"}}
    conn = client.post("/api/integrations/cloudflare/connect", json=payload, headers=headers)
    assert conn.status_code == 200

    test_ok = client.post("/api/integrations/cloudflare/test", headers=headers)
    assert test_ok.status_code == 200
    assert test_ok.json()["success"] is True

    adapter = get_integration_adapter("cloudflare", ORG_ID)
    res = adapter.execute("upload_r2_asset", {"asset_name": "marketing_reel_7c1c.mp4"})
    assert res["success"] is True
    assert "r2.cloudflare.com" in res["r2_url"]

    disc = client.delete("/api/integrations/cloudflare", headers=headers)
    assert disc.status_code == 200
