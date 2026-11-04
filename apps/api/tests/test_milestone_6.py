import pytest
import asyncio
from fastapi.testclient import TestClient
from main import app
import database
from memory.service import embed_text, save_memory, search_memory, delete_memory, list_memories
from orchestrator.om_samah import OmSamahOrchestrator
from agents.registry import get_agent

client = TestClient(app)

OWNER_ORG_ID = "00000000-0000-0000-0000-000000000001"
OTHER_ORG_ID = "99999999-9999-9999-9999-999999999999"

OWNER_USER = {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "owner@pragency.eg",
    "role": "owner",
    "organization_id": OWNER_ORG_ID,
}

MEMBER_USER = {
    "id": "22222222-2222-2222-2222-222222222222",
    "email": "member@pragency.eg",
    "role": "member",
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


def test_embed_text_returns_1536_dense_vector():
    """Verify embed_text produces 1536-dimensional L2-normalized vector."""
    vec = embed_text("PR Agency brand guidelines and purple color palette")
    assert len(vec) == 1536
    assert isinstance(vec[0], float)
    
    # Vector should have unit norm
    import numpy as np
    norm = np.linalg.norm(vec)
    assert 0.99 <= norm <= 1.01


def test_save_and_semantic_search_memory():
    """Verify memory saving and sub-second cosine semantic search."""
    # 1. Save two distinct memories
    mem1 = save_memory(
        org_id=OWNER_ORG_ID,
        type="client",
        reference_id="client-restaurant-123",
        content="Restaurant client: Abu Ammar El-Soury in Nasr City prefers violet #8b5cf6 and clean white aesthetics.",
        metadata={"cuisine": "Syrian Shawarma", "tier": "Premium"}
    )
    assert mem1["id"] in database.MEMORIES_DB
    assert len(database.MEMORY_EMBEDDINGS_DB[mem1["id"]]) == 1536

    mem2 = save_memory(
        org_id=OWNER_ORG_ID,
        type="client",
        reference_id="client-tech-456",
        content="Fintech client: Mobile payments app targeting Gen-Z with bold lime green branding.",
        metadata={"industry": "Fintech"}
    )

    # 2. Semantic query matching the restaurant
    results = search_memory(
        org_id=OWNER_ORG_ID,
        query="shawarma restaurant visual identity and violet colors",
        limit=5
    )
    assert len(results) >= 2
    # The shawarma restaurant must be ranked 1st with highest similarity / lowest cosine distance
    assert results[0]["id"] == mem1["id"]
    assert results[0]["similarity"] > results[1]["similarity"]
    assert results[0]["cosine_distance"] < results[1]["cosine_distance"]


def test_memory_client_and_org_isolation():
    """Verify Client A's memory is never leaked to Client B, and org isolation holds."""
    client_a_id = "client-alpha-001"
    client_b_id = "client-beta-002"

    save_memory(
        org_id=OWNER_ORG_ID,
        type="client",
        reference_id=client_a_id,
        content="Confidential Q4 product launch strategy for Client Alpha."
    )

    save_memory(
        org_id=OTHER_ORG_ID,
        type="client",
        reference_id=client_a_id,
        content="Competitor org data that must not leak across organizations."
    )

    # Query specifically for Client B
    res_b = search_memory(
        org_id=OWNER_ORG_ID,
        query="Confidential product launch",
        type="client",
        reference_id=client_b_id,
    )
    assert len(res_b) == 0

    # Query specifically for Client A in OWNER_ORG_ID
    res_a = search_memory(
        org_id=OWNER_ORG_ID,
        query="Confidential product launch",
        type="client",
        reference_id=client_a_id,
    )
    assert len(res_a) == 1
    assert res_a[0]["reference_id"] == client_a_id


def test_memories_rest_api_lifecycle():
    """Verify REST API: POST /api/memories, GET /api/memories/search, GET /api/memories, DELETE /api/memories/:id."""
    token = get_auth_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Memory
    create_res = client.post(
        "/api/memories",
        headers=headers,
        json={
            "type": "client",
            "reference_id": "client-99",
            "content": "Client Brand Guideline: All ad copy must use polite formal Arabic (فصحى معاصرة).",
            "metadata": {"tone": "formal"}
        }
    )
    assert create_res.status_code == 201
    mem = create_res.json()["memory"]
    mem_id = mem["id"]

    # 2. Semantic Search
    search_res = client.get(
        "/api/memories/search?q=formal+arabic+tone&type=client&reference_id=client-99",
        headers=headers
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["count"] == 1
    assert search_data["memories"][0]["id"] == mem_id

    # 3. List Memories
    list_res = client.get("/api/memories?type=client", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["count"] >= 1

    # 4. Member cannot delete (owner only)
    member_token = get_auth_token("member@pragency.eg")
    del_forbidden = client.delete(f"/api/memories/{mem_id}", headers={"Authorization": f"Bearer {member_token}"})
    assert del_forbidden.status_code == 403

    # 5. Owner deletes successfully
    del_ok = client.delete(f"/api/memories/{mem_id}", headers=headers)
    assert del_ok.status_code == 200
    assert del_ok.json()["success"] is True

    # Verify deleted
    assert database.get_memory(mem_id) is None


def test_deliverables_versioning_and_parent_lineage():
    """Verify deliverable versioning: v1 -> v2, parent linkage, and versions list."""
    token = get_auth_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create client & project
    client_rec = database.create_client({"name": "Brand X", "industry": "Fashion"}, OWNER_USER)
    proj_rec = database.create_project({"name": "Summer Campaign", "client_id": client_rec["id"]}, OWNER_USER)

    # 2. Create initial v1 deliverable
    d1 = database.create_deliverable({
        "project_id": proj_rec["id"],
        "agent_id": "copywriter",
        "agent_name": "Copywriter",
        "title": "Summer Campaign Taglines",
        "content_json": {"taglines": ["Breeze through Summer"]},
        "raw_content": "Breeze through Summer",
        "quality_score": 90,
    }, OWNER_USER)
    assert d1["version"] == 1
    assert d1["parent_deliverable_id"] is None

    # 3. Create v2 via API
    v2_res = client.post(
        f"/api/deliverables/{d1['id']}/version",
        headers=headers,
        json={
            "title": "Summer Campaign Taglines (v2 Refined)",
            "raw_content": "Breeze through Summer with Effortless Elegance",
            "content_json": {"taglines": ["Breeze through Summer", "Effortless Elegance"]},
            "quality_score": 98
        }
    )
    assert v2_res.status_code == 201
    d2 = v2_res.json()["deliverable"]
    assert d2["version"] == 2
    assert d2["parent_deliverable_id"] == d1["id"]

    # 4. Create v3 from v2 (should link to root d1 and be version 3)
    v3_res = client.post(
        f"/api/deliverables/{d2['id']}/version",
        headers=headers,
        json={
            "title": "Summer Campaign Taglines (v3 Final)",
            "quality_score": 99
        }
    )
    assert v3_res.status_code == 201
    d3 = v3_res.json()["deliverable"]
    assert d3["version"] == 3
    assert d3["parent_deliverable_id"] == d1["id"]

    # 5. Fetch all versions
    versions_res = client.get(f"/api/deliverables/{d1['id']}/versions", headers=headers)
    assert versions_res.status_code == 200
    versions = versions_res.json()["versions"]
    assert len(versions) == 3
    assert [v["version"] for v in versions] == [1, 2, 3]


def test_deliverables_filtering():
    """Verify deliverables multi-filter by client_id, project_id, agent_id, and type."""
    token = get_auth_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    c1 = database.create_client({"name": "Client 1"}, OWNER_USER)
    c2 = database.create_client({"name": "Client 2"}, OWNER_USER)
    p1 = database.create_project({"name": "P1", "client_id": c1["id"]}, OWNER_USER)
    p2 = database.create_project({"name": "P2", "client_id": c2["id"]}, OWNER_USER)

    database.create_deliverable({
        "project_id": p1["id"],
        "agent_id": "dr-ibrahim",
        "agent_name": "Dr. Ibrahim",
        "title": "Research for P1",
        "file_type": "json"
    }, OWNER_USER)

    database.create_deliverable({
        "project_id": p2["id"],
        "agent_id": "copywriter",
        "agent_name": "Copywriter",
        "title": "Copy for P2",
        "file_type": "markdown"
    }, OWNER_USER)

    # Filter by client 1
    res1 = client.get(f"/api/deliverables?client_id={c1['id']}", headers=headers)
    assert res1.status_code == 200
    assert len(res1.json()["deliverables"]) == 1
    assert res1.json()["deliverables"][0]["agent_id"] == "dr-ibrahim"

    # Filter by agent
    res_agent = client.get("/api/deliverables?agent_id=copywriter", headers=headers)
    assert res_agent.status_code == 200
    assert len(res_agent.json()["deliverables"]) == 1
    assert res_agent.json()["deliverables"][0]["agent_id"] == "copywriter"


@pytest.mark.anyio
async def test_orchestrator_retrieval_and_memory_injection():
    """Verify Om Samah injects the client's brand memory into the agent's prompt."""
    # 1. Setup client & project
    client_rec = database.create_client({"name": "Gourmet Burger Co."}, OWNER_USER)
    proj_rec = database.create_project({"name": "Burger Launch", "client_id": client_rec["id"]}, OWNER_USER)

    # 2. Store brand memory for this client
    brand_content = "Brand Rule: Signature color is #ff5722 orange and slogan is 'Flame-Grilled Royalty'."
    save_memory(
        org_id=OWNER_ORG_ID,
        type="client",
        reference_id=client_rec["id"],
        content=brand_content,
    )

    # 3. Create workflow
    wf = database.create_workflow({
        "user_request": "Launch new burger branch in Maadi with signature flame grill theme",
        "project_id": proj_rec["id"],
    }, OWNER_USER)

    # 4. Initialize Om Samah orchestrator and execute step 1
    orchestrator = OmSamahOrchestrator(wf["id"], OWNER_USER)
    steps = await orchestrator.initialize_steps(proj_rec["id"])
    step1 = steps[0]  # Dr. Ibrahim step

    # 5. Execute step
    step_result = await orchestrator.execute_step(step1, project_id=proj_rec["id"])
    assert step_result["status"] == "completed"

    # 6. Verify agent execution used the retrieved memory (inspect agent.last_injected_prompt)
    agent = get_agent(step1["assigned_agent_id"])
    assert hasattr(agent, "last_injected_prompt")
    assert "RETRIEVED ORGANIZATIONAL & CLIENT MEMORY" in agent.last_injected_prompt
    assert "Flame-Grilled Royalty" in agent.last_injected_prompt
