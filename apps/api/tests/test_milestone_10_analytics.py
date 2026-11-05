import pytest
from fastapi.testclient import TestClient

from main import app
from database import reset_db_for_tests, create_quality_score
from analytics.service import log_ai_usage
from virtual_office.status_manager import reset_statuses

client = TestClient(app)

DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001"


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


def test_analytics_unauthorized_access():
    """Verify unauthenticated requests to analytics endpoints are rejected with 401."""
    res = client.get("/api/analytics/summary")
    assert res.status_code == 401

    res = client.get("/api/analytics/usage")
    assert res.status_code == 401

    res = client.get("/api/analytics/costs/agents")
    assert res.status_code == 401

    res = client.get("/api/analytics/costs/projects")
    assert res.status_code == 401

    res = client.get("/api/analytics/quality/trend")
    assert res.status_code == 401


def test_analytics_summary_kpis():
    """Verify GET /api/analytics/summary returns accurate aggregated KPIs."""
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    # Initial summary on reset DB
    res = client.get("/api/analytics/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()["summary"]
    assert "total_tokens" in data
    assert "total_cost_usd" in data
    assert "avg_latency_ms" in data
    assert "avg_quality_score" in data
    assert "total_executions" in data
    assert "cost_by_model" in data
    assert "daily_costs" in data

    # Create manual test usage logs via log_ai_usage with matching org_id
    log_ai_usage(
        org_id=DEMO_ORG_ID,
        agent_id="dr-ibrahim",
        model="gemini-1.5-pro",
        prompt_tokens=1000,
        completion_tokens=500,
        latency_ms=1250,
        estimated_cost_usd=0.00375,
    )
    log_ai_usage(
        org_id=DEMO_ORG_ID,
        agent_id="ragaa",
        model="gpt-4o",
        prompt_tokens=2000,
        completion_tokens=1000,
        latency_ms=2100,
        estimated_cost_usd=0.015,
    )

    # Re-fetch summary
    res2 = client.get("/api/analytics/summary", headers=headers)
    assert res2.status_code == 200
    sum2 = res2.json()["summary"]

    assert sum2["total_tokens"] == 4500
    assert sum2["prompt_tokens"] == 3000
    assert sum2["completion_tokens"] == 1500
    assert sum2["total_executions"] == 2
    assert sum2["total_cost_usd"] == pytest.approx(0.0188, abs=1e-3)
    assert sum2["avg_latency_ms"] == 1675
    assert "gemini-1.5-pro" in sum2["cost_by_model"]
    assert "gpt-4o" in sum2["cost_by_model"]


def test_base_agent_auto_logs_usage_on_execution():
    """Verify BaseAgent.execute automatically logs AI usage and quality score."""
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    # Execute Dr. Ibrahim with its schema-compliant input
    valid_input = {
        "client_name": "Nile Media Corp",
        "industry": "Broadcasting & Digital Media",
        "competitors": ["Alpha Streaming", "Rotana Network", "Shahid"],
        "research_objectives": [
            "Identify digital streaming penetration in MENA",
            "Analyze competitor subscription pricing tiers"
        ],
        "target_region": "MENA (Egypt, Saudi Arabia, UAE)"
    }

    exec_res = client.post(
        "/api/agents/dr-ibrahim/execute",
        json={"input": valid_input},
        headers=headers,
    )
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert "deliverable" in exec_data

    # Query usage logs
    logs_res = client.get("/api/analytics/usage", headers=headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()["logs"]
    assert len(logs) >= 1

    latest_log = logs[0]
    assert latest_log["agent_id"] == "dr-ibrahim"
    assert latest_log["total_tokens"] > 0
    assert latest_log["estimated_cost_usd"] > 0
    assert latest_log["latency_ms"] > 0
    assert latest_log["model"] != ""


def test_analytics_usage_filtering_by_agent_and_project():
    """Verify filtering usage logs by agent_id and project_id."""
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    # Insert distinct usage logs
    log_ai_usage(
        org_id=DEMO_ORG_ID,
        agent_id="fawzyia",
        project_id="proj_alpha",
        model="gemini-1.5-pro",
        prompt_tokens=500,
        completion_tokens=300,
        latency_ms=950,
        estimated_cost_usd=0.002,
    )
    log_ai_usage(
        org_id=DEMO_ORG_ID,
        agent_id="mahmoud",
        project_id="proj_beta",
        model="gemini-1.5-flash",
        prompt_tokens=400,
        completion_tokens=200,
        latency_ms=450,
        estimated_cost_usd=0.00009,
    )

    # Filter by agent fawzyia
    res_fawzyia = client.get("/api/analytics/usage?agent_id=fawzyia", headers=headers)
    assert res_fawzyia.status_code == 200
    logs_fawzyia = res_fawzyia.json()["logs"]
    assert len(logs_fawzyia) == 1
    assert logs_fawzyia[0]["agent_id"] == "fawzyia"

    # Filter by project proj_beta
    res_beta = client.get("/api/analytics/usage?project_id=proj_beta", headers=headers)
    assert res_beta.status_code == 200
    logs_beta = res_beta.json()["logs"]
    assert len(logs_beta) == 1
    assert logs_beta[0]["project_id"] == "proj_beta"


def test_costs_by_agent_and_project_aggregation():
    """Verify cost breakdown endpoints aggregate data accurately."""
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    log_ai_usage(
        org_id=DEMO_ORG_ID,
        agent_id="copywriter",
        project_id="proj_social",
        model="gpt-4o",
        prompt_tokens=1000,
        completion_tokens=1000,
        latency_ms=1800,
        estimated_cost_usd=0.0125,
    )
    log_ai_usage(
        org_id=DEMO_ORG_ID,
        agent_id="copywriter",
        project_id="proj_social",
        model="gpt-4o",
        prompt_tokens=500,
        completion_tokens=500,
        latency_ms=1200,
        estimated_cost_usd=0.00625,
    )

    # Agent cost breakdown
    res_agent = client.get("/api/analytics/costs/agents", headers=headers)
    assert res_agent.status_code == 200
    agent_costs = res_agent.json()["costs_by_agent"]
    copywriter_data = next((x for x in agent_costs if x["agent_id"] == "copywriter"), None)
    assert copywriter_data is not None
    assert copywriter_data["execution_count"] == 2
    assert copywriter_data["total_tokens"] == 3000
    assert copywriter_data["total_cost_usd"] == pytest.approx(0.0188, abs=1e-3)

    # Project cost breakdown
    res_proj = client.get("/api/analytics/costs/projects", headers=headers)
    assert res_proj.status_code == 200
    proj_costs = res_proj.json()["costs_by_project"]
    proj_social = next((x for x in proj_costs if x["project_id"] == "proj_social"), None)
    assert proj_social is not None
    assert proj_social["execution_count"] == 2
    assert proj_social["total_cost_usd"] == pytest.approx(0.0188, abs=1e-3)


def test_quality_trend_endpoint():
    """Verify quality trend calculations over specified days."""
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    create_quality_score({
        "deliverable_id": "deliv_1",
        "agent_id": "qa-lead",
        "overall_score": 94,
        "breakdown_json": {"accuracy": 95, "completeness": 94},
    })
    create_quality_score({
        "deliverable_id": "deliv_2",
        "agent_id": "ragaa",
        "overall_score": 88,
        "breakdown_json": {"brand_alignment": 88},
    })

    res = client.get("/api/analytics/quality/trend?days=7", headers=headers)
    assert res.status_code == 200
    trend = res.json()["quality_trend"]
    assert len(trend) >= 1
    point = trend[0]
    assert "date" in point
    assert "avg_quality_score" in point
    assert "evaluations_count" in point
    assert point["evaluations_count"] == 2
    assert point["avg_quality_score"] == pytest.approx(91.0, rel=1e-1)
