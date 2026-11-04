import os
import json
import asyncio
import pytest
from fastapi.testclient import TestClient

from main import app
from database import (
    reset_db_for_tests,
    create_client,
    create_project,
    get_workflow,
    get_workflow_steps,
    DELIVERABLES_DB,
    WORKFLOWS_DB,
)
from orchestrator.om_samah import (
    OmSamahOrchestrator,
    approve_workflow_step,
    start_workflow_in_background,
)

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


def test_om_samah_dag_planning():
    """Verifies Om Samah breaks request into a DAG with correct dependencies."""
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    user_info = {
        "id": "11111111-1111-1111-1111-111111111111",
        "organization_id": "00000000-0000-0000-0000-000000000001",
        "role": "owner"
    }

    orchestrator = OmSamahOrchestrator("dummy-wf-id", user_info)
    plan = orchestrator.analyze_request("Launch viral PR campaign for Nile Fintech Platform")

    assert plan["client_name"] == "Nile"
    assert len(plan["steps"]) == 5

    step1 = plan["steps"][0]
    assert step1["assigned_agent_id"] == "dr-ibrahim"
    assert step1["depends_on"] == []

    step2 = plan["steps"][1]
    assert step2["assigned_agent_id"] == "ragaa"
    assert step2["depends_on"] == ["step_1"]

    step3 = plan["steps"][2]
    assert step3["assigned_agent_id"] == "copywriter"
    assert step3["depends_on"] == ["step_2"]

    step4 = plan["steps"][3]
    assert step4["assigned_agent_id"] == "fawzyia"
    assert step4["depends_on"] == ["step_2"]  # Parallel with step 3!

    step5 = plan["steps"][4]
    assert step5["assigned_agent_id"] == "qa-lead"
    assert set(step5["depends_on"]) == {"step_3", "step_4"}
    assert step5["requires_approval"] is True


def test_workflow_execution_parallel_and_human_approval():
    """
    Tests full DAG lifecycle:
    1. Research -> Strategy
    2. Parallel execution of Copywriter + Fawzyia
    3. Pause at QA Lead waiting for human approval
    4. Approve via API/helper
    5. Final compilation into master deliverable
    """
    async def _run():
        token = get_auth_token("owner")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create client and project
        c_res = client.post("/api/clients", json={"name": "Cairo Luxury Group", "industry": "Hospitality"}, headers=headers)
        assert c_res.status_code in [200, 201]
        client_id = c_res.json()["client"]["id"]

        p_res = client.post("/api/projects", json={"client_id": client_id, "name": "Grand Opening PR", "retainer_amount": 25000}, headers=headers)
        assert p_res.status_code in [200, 201]
        project_id = p_res.json()["project"]["id"]

        user_info = {
            "id": "11111111-1111-1111-1111-111111111111",
            "organization_id": "00000000-0000-0000-0000-000000000001",
            "role": "owner"
        }

        # 2. Create workflow record
        wf_res = client.post(
            "/api/workflows",
            headers=headers,
            json={
                "user_request": "Plan luxury grand opening PR campaign for Cairo Luxury Group",
                "project_id": project_id
            }
        )
        assert wf_res.status_code == 201
        wf_data = wf_res.json()["workflow"]
        wf_id = wf_data["id"]

        # 3. Execute DAG with OmSamahOrchestrator on this event loop
        orchestrator = OmSamahOrchestrator(wf_id, user_info)
        orch_task = asyncio.create_task(orchestrator.run(project_id))

        # Wait for workflow to reach waiting_approval state
        max_wait = 15
        waited = 0
        current_wf = None
        while waited < max_wait:
            await asyncio.sleep(0.3)
            waited += 0.3
            current_wf = get_workflow(wf_id, user_info)
            if current_wf and current_wf["status"] == "waiting_approval":
                break

        assert current_wf is not None
        assert current_wf["status"] == "waiting_approval", f"Expected waiting_approval, got {current_wf['status']}"

        # Verify steps 1, 2, 3, 4 are completed
        steps = get_workflow_steps(wf_id)
        assert len(steps) == 5
        s1 = next(s for s in steps if s["assigned_agent_id"] == "dr-ibrahim")
        s2 = next(s for s in steps if s["assigned_agent_id"] == "ragaa")
        s3 = next(s for s in steps if s["assigned_agent_id"] == "copywriter")
        s4 = next(s for s in steps if s["assigned_agent_id"] == "fawzyia")
        s5 = next(s for s in steps if s["assigned_agent_id"] == "qa-lead")

        assert s1["status"] == "completed"
        assert s2["status"] == "completed"
        assert s3["status"] == "completed"
        assert s4["status"] == "completed"
        assert s5["status"] == "waiting_approval"

        # 4. Approve blocked step
        approve_workflow_step(wf_id, s5["id"], approved=True, notes="Executive owner sign-off granted.")

        # Wait for orchestrator task to complete
        await asyncio.wait_for(orch_task, timeout=10.0)

        current_wf = get_workflow(wf_id, user_info)
        assert current_wf["status"] == "completed"
        assert current_wf["compiled_deliverable_id"] is not None

        # Verify compiled deliverable in DB and storage
        compiled_id = current_wf["compiled_deliverable_id"]
        assert compiled_id in DELIVERABLES_DB
        deliv = DELIVERABLES_DB[compiled_id]
        assert deliv["agent_id"] == "om-samah"
        assert deliv["quality_score"] >= 95
        assert "package_components" in deliv["content_json"]

    asyncio.run(_run())


def test_workflows_rest_endpoints():
    token = get_auth_token("owner")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create workflow
    res = client.post(
        "/api/workflows",
        headers=headers,
        json={"user_request": "Fast launch PR rollout for Nile Tech"}
    )
    assert res.status_code == 201
    wf_id = res.json()["workflow"]["id"]

    # 2. Get workflow detail
    detail_res = client.get(f"/api/workflows/{wf_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["workflow"]["id"] == wf_id
    assert len(detail_res.json()["workflow"]["steps"]) == 5

    # 3. List workflows
    list_res = client.get("/api/workflows", headers=headers)
    assert list_res.status_code == 200
    assert any(w["id"] == wf_id for w in list_res.json()["workflows"])

    # 4. Get workflow execution logs
    logs_res = client.get(f"/api/workflows/{wf_id}/logs", headers=headers)
    assert logs_res.status_code == 200
    assert logs_res.json()["count"] > 0
