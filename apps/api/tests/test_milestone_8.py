import asyncio
import pytest
import jsonschema
from fastapi.testclient import TestClient

from main import app
from database import reset_db_for_tests
from agents.registry import list_agents, get_agent, load_registry
from orchestrator.om_samah import OmSamahOrchestrator

client = TestClient(app)

EXPECTED_DEPARTMENTS = {
    "marketing": 6,
    "creative": 6,
    "video": 5,
    "engineering": 6,
    "research": 5,
    "sales": 4,
    "operations": 3,
    "quality": 3,
}


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


def test_agent_registry_loads_38_agents():
    """Verify registry loads exactly 38 agents across the 8 canonical departments."""
    agents = list_agents()
    assert len(agents) == 38, f"Expected 38 agents in registry, got {len(agents)}"

    dept_counts = {}
    for agent in agents:
        dept = agent.department
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    for dept, expected_count in EXPECTED_DEPARTMENTS.items():
        assert dept in dept_counts, f"Department '{dept}' missing from agents registry"
        assert dept_counts[dept] == expected_count, (
            f"Department '{dept}' expected {expected_count} agents, got {dept_counts[dept]}"
        )


def test_all_38_agents_have_valid_schemas():
    """Verify all 38 agents have valid JSON Schemas and compliant sample_input."""
    agents = list_agents()
    for agent in agents:
        assert agent.id, "Agent must have an id"
        assert agent.name, f"Agent {agent.id} missing name"
        assert agent.system_prompt, f"Agent {agent.id} missing system_prompt"
        assert len(agent.tools) > 0, f"Agent {agent.id} must define at least one tool"
        assert len(agent.quality_criteria) > 0, f"Agent {agent.id} missing quality_criteria"
        assert agent.max_tokens > 0, f"Agent {agent.id} invalid max_tokens"

        # Validate input_schema
        assert isinstance(agent.input_schema, dict), f"Agent {agent.id} input_schema must be dict"
        jsonschema.Draft7Validator.check_schema(agent.input_schema)

        # Validate output_schema
        assert isinstance(agent.output_schema, dict), f"Agent {agent.id} output_schema must be dict"
        jsonschema.Draft7Validator.check_schema(agent.output_schema)

        # Validate sample_input strictly against input_schema
        assert agent.sample_input is not None, f"Agent {agent.id} must provide sample_input"
        jsonschema.validate(instance=agent.sample_input, schema=agent.input_schema)


def test_execute_sample_from_new_agents():
    """Execute 3 new agents (one SEO, one Video, one Security) and verify output conformance."""
    test_agent_ids = ["seo-specialist", "video-editor", "security-engineer"]
    user_context = {"id": "test-user-1", "organization_id": "00000000-0000-0000-0000-000000000001", "role": "owner"}
    
    for agent_id in test_agent_ids:
        agent = get_agent(agent_id)
        assert agent is not None, f"Agent {agent_id} not found in registry"

        result = asyncio.run(agent.execute(task_input=agent.sample_input, user=user_context))
        assert result is not None
        assert "output" in result
        assert "deliverable" in result
        assert result["deliverable"]["quality_score"] >= 80

        # Output must strictly validate against output_schema
        jsonschema.validate(instance=result["output"], schema=agent.output_schema)


def test_orchestrator_selector_scenarios():
    """Test Om Samah dynamically selects appropriate specialized agents across distinct briefs."""
    orchestrator = OmSamahOrchestrator(
        workflow_id="wf-test-selector-001",
        user={"id": "user-1", "organization_id": "org-1", "role": "owner"}
    )

    # Scenario 1: Video Production
    video_plan = orchestrator.analyze_request("Produce a high-end 60s promotional video for Cairo Tech")
    assert "video" in video_plan["complexity"].lower()
    video_agent_ids = [step["assigned_agent_id"] for step in video_plan["steps"]]
    assert "scriptwriter" in video_agent_ids
    assert "storyboard-artist" in video_agent_ids
    assert "video-editor" in video_agent_ids
    assert "sound-designer" in video_agent_ids
    assert "video-director" in video_agent_ids
    assert video_plan["steps"][-1]["requires_approval"] is True

    # Scenario 2: Engineering & Tech Platform
    tech_plan = orchestrator.analyze_request("Develop an API backend and landing page website with security audit for Nexa")
    assert "engineering" in tech_plan["complexity"].lower()
    tech_agent_ids = [step["assigned_agent_id"] for step in tech_plan["steps"]]
    assert "mahmoud" in tech_agent_ids
    assert "frontend-dev" in tech_agent_ids
    assert "backend-dev" in tech_agent_ids
    assert "security-engineer" in tech_agent_ids
    assert "qa-automation-engineer" in tech_agent_ids
    assert tech_plan["steps"][-1]["requires_approval"] is True

    # Scenario 3: B2B Sales & CRM
    sales_plan = orchestrator.analyze_request("Setup enterprise B2B sales leads outreach and CRM pipeline automation for RetailCo")
    assert "sales" in sales_plan["complexity"].lower()
    sales_agent_ids = [step["assigned_agent_id"] for step in sales_plan["steps"]]
    assert "market-researcher" in sales_agent_ids
    assert "lead-qualifier" in sales_agent_ids
    assert "account-executive" in sales_agent_ids
    assert "crm-specialist" in sales_agent_ids
    assert "sales-manager" in sales_agent_ids
    assert sales_plan["steps"][-1]["requires_approval"] is True


def test_orchestrator_selector_error_handling():
    """Om Samah must raise ValueError on empty or invalid user requests."""
    orchestrator = OmSamahOrchestrator(
        workflow_id="wf-test-err-001",
        user={"id": "user-1", "organization_id": "org-1", "role": "owner"}
    )

    with pytest.raises(ValueError, match="empty"):
        orchestrator.analyze_request("")

    with pytest.raises(ValueError, match="empty"):
        orchestrator.analyze_request("   ")

    with pytest.raises(ValueError, match="short"):
        orchestrator.analyze_request("hi")


def test_api_agents_endpoint_returns_38_agents():
    """Verify GET /api/agents returns all 38 agents with full schemas."""
    token = get_auth_token("owner")
    res = client.get("/api/agents", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 38
    agents_list = data["agents"]
    assert len(agents_list) == 38
    agent_ids = {a["id"] for a in agents_list}
    assert "seo-specialist" in agent_ids
    assert "video-editor" in agent_ids
    assert "security-engineer" in agent_ids
    assert "sales-manager" in agent_ids

