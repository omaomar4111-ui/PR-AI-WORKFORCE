import os
import json
import asyncio
import pytest
from fastapi.testclient import TestClient

from main import app
from database import reset_db_for_tests, DELIVERABLES_DB, CLIENTS_DB, PROJECTS_DB, create_client, create_project
from agents.registry import list_agents, get_agent, get_all_agents_dict
from agents.base import BaseAgent

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


def test_agent_registry_loads_8_agents():
    agents = list_agents()
    assert len(agents) >= 8, f"Expected at least 8 agents, found {len(agents)}"

    expected_ids = {
        "dr-ibrahim",
        "ragaa",
        "fawzyia",
        "copywriter",
        "media-buyer",
        "sales-manager",
        "mahmoud",
        "qa-lead"
    }

    loaded_ids = {a.id for a in agents}
    assert expected_ids.issubset(loaded_ids)

    # Verify each agent contract
    for agent in agents:
        assert isinstance(agent, BaseAgent)
        assert agent.id
        assert agent.name
        assert agent.department
        assert len(agent.system_prompt) > 20
        assert isinstance(agent.tools, list) and len(agent.tools) > 0
        assert isinstance(agent.input_schema, dict) and agent.input_schema.get("type") == "object"
        assert isinstance(agent.output_schema, dict) and agent.output_schema.get("type") == "object"
        assert isinstance(agent.quality_criteria, list) and len(agent.quality_criteria) > 0
        assert agent.max_tokens >= 3000
        assert isinstance(agent.requires_approval_for, list)


def test_all_8_agents_execution_and_schema_validation():
    async def _run():
        token = get_auth_token("owner")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create prerequisite client & project
        client_res = client.post("/api/clients", json={"name": "Al-Ahram Media Group", "industry": "Publishing"}, headers=headers)
        assert client_res.status_code in [200, 201]
        client_id = client_res.json()["client"]["id"]

        proj_res = client.post("/api/projects", json={"client_id": client_id, "name": "AI PR Initiative", "retainer_amount": 18000}, headers=headers)
        assert proj_res.status_code in [200, 201]
        project_id = proj_res.json()["project"]["id"]

        user_info = {
            "id": "11111111-1111-1111-1111-111111111111",
            "organization_id": "00000000-0000-0000-0000-000000000001",
            "role": "owner"
        }

        agents = list_agents()
        assert len(agents) >= 8

        for agent in agents:
            sample_input = agent.sample_input
            assert sample_input, f"Agent {agent.id} missing sample_input"

            # Execute
            result = await agent.execute(
                task_input=sample_input,
                user=user_info,
                project_id=project_id,
                title=f"Test Run: {agent.name}"
            )

            # 1. Output structure check
            assert "deliverable" in result
            assert "output" in result
            assert "agent" in result

            deliverable = result["deliverable"]
            output = result["output"]

            # 2. Output schema validation
            agent.validate_output(output)

            # 3. Deliverable saved in DB & File
            assert deliverable["id"] in DELIVERABLES_DB
            assert deliverable["agent_id"] == agent.id
            assert deliverable["quality_score"] >= 80

            storage_file = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "storage",
                "deliverables",
                f"{deliverable['id']}.json"
            )
            assert os.path.exists(storage_file), f"Deliverable file {storage_file} must exist on disk"

            with open(storage_file, "r", encoding="utf-8") as f:
                file_data = json.load(f)
                assert file_data == output

    asyncio.run(_run())


def test_agent_input_schema_rejection():
    async def _run():
        agent = get_agent("dr-ibrahim")
        assert agent is not None

        user_info = {
            "id": "11111111-1111-1111-1111-111111111111",
            "organization_id": "00000000-0000-0000-0000-000000000001",
            "role": "owner"
        }

        # Missing required field 'industry' and 'research_objectives'
        invalid_input = {
            "client_name": "Incomplete Client"
        }

        with pytest.raises(ValueError) as excinfo:
            await agent.execute(task_input=invalid_input, user=user_info)
        assert "Input validation error" in str(excinfo.value)

    asyncio.run(_run())


def test_qa_lead_auditing_agent_output():
    async def _run():
        user_info = {
            "id": "11111111-1111-1111-1111-111111111111",
            "organization_id": "00000000-0000-0000-0000-000000000001",
            "role": "owner"
        }

        # 1. Run Ragaa
        ragaa = get_agent("ragaa")
        ragaa_result = await ragaa.execute(task_input=ragaa.sample_input, user=user_info)

        # 2. Audit with QA Lead
        qa_lead = get_agent("qa-lead")
        qa_input = {
            "deliverable_title": ragaa_result["deliverable"]["title"],
            "agent_tested": "ragaa",
            "original_brief": "Create an enterprise brand positioning strategy for Nile Media.",
            "agent_output": ragaa_result["output"],
            "quality_criteria": ragaa.quality_criteria
        }

        qa_result = await qa_lead.execute(task_input=qa_input, user=user_info)
        qa_output = qa_result["output"]

        assert qa_output["verdict"] in ["APPROVED", "NEEDS_REVISION"]
        assert qa_output["overall_score"] >= 80
        assert len(qa_output["checklist_results"]) > 0

    asyncio.run(_run())


def test_agents_and_deliverables_rest_api():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List agents
    res = client.get("/api/agents", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 8
    assert len(data["agents"]) >= 8

    # 2. Get single agent
    res = client.get("/api/agents/copywriter", headers=headers)
    assert res.status_code == 200
    agent_data = res.json()["agent"]
    assert agent_data["id"] == "copywriter"
    assert agent_data["name"] == "Copywriter"
    assert len(agent_data["tools"]) > 0

    # 3. Execute agent via REST
    exec_res = client.post(
        "/api/agents/copywriter/execute",
        headers=headers,
        json={
            "input": {
                "topic": "Autonomous Agency Launch",
                "format": "press_release",
                "tone": "inspiring",
                "key_takeaways": ["10x speed", "Full human governance", "Bilingual excellence"]
            },
            "title": "REST API Execution Test"
        }
    )
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert "deliverable" in exec_data
    deliv_id = exec_data["deliverable"]["id"]

    # 4. List deliverables
    deliv_res = client.get("/api/deliverables", headers=headers)
    assert deliv_res.status_code == 200
    deliv_list = deliv_res.json()["deliverables"]
    assert len(deliv_list) >= 1
    assert any(d["id"] == deliv_id for d in deliv_list)

    # 5. Fetch single deliverable
    single_res = client.get(f"/api/deliverables/{deliv_id}", headers=headers)
    assert single_res.status_code == 200
    assert single_res.json()["deliverable"]["id"] == deliv_id

    # 6. Fetch raw static JSON file
    file_res = client.get(f"/storage/deliverables/{deliv_id}.json")
    assert file_res.status_code == 200
    assert file_res.json()["headline"]
