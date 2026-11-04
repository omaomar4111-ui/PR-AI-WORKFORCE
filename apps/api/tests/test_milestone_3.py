import pytest
import sys
import os
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app
from database import reset_db_for_tests, STATUS_PROGRESS

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_database():
    reset_db_for_tests()
    yield
    reset_db_for_tests()


def get_token(email="owner@pragency.eg", password="Password123!"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def create_sample_project(headers):
    # Create client
    c_resp = client.post("/api/clients", json={"name": "Test Client M3"}, headers=headers)
    client_id = c_resp.json()["client"]["id"]
    # Create project
    p_resp = client.post("/api/projects", json={
        "client_id": client_id,
        "name": "M3 Task Project",
        "retainer_amount": 10000.0
    }, headers=headers)
    return p_resp.json()["project"]["id"]


# ── Tasks CRUD & Status Progress Tests ───────────────────────────────────────
def test_tasks_crud_and_status_progress():
    owner_token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {owner_token}"}
    project_id = create_sample_project(headers)

    # 1. Create Task A
    t_resp = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Develop Crisis PR Playbook",
        "description": "Drafting emergency response protocols",
        "status": "pending",
        "priority": "high"
    }, headers=headers)
    assert t_resp.status_code == 201
    task_a = t_resp.json()["task"]
    task_a_id = task_a["id"]
    assert task_a["progress_percentage"] == 0

    # 2. Read Single Task
    detail_resp = client.get(f"/api/tasks/{task_a_id}", headers=headers)
    assert detail_resp.status_code == 200
    task_data = detail_resp.json()["task"]
    assert task_data["title"] == "Develop Crisis PR Playbook"
    assert len(task_data["events"]) >= 1
    assert task_data["events"][0]["event_type"] == "task_created"

    # 3. Patch Status -> in_progress (50%)
    patch_resp = client.patch(f"/api/tasks/{task_a_id}", json={
        "status": "in_progress"
    }, headers=headers)
    assert patch_resp.status_code == 200
    updated_a = patch_resp.json()["task"]
    assert updated_a["status"] == "in_progress"
    assert updated_a["progress_percentage"] == 50

    # Verify event logged
    events = updated_a["events"]
    status_events = [e for e in events if e["event_type"] == "status_change"]
    assert len(status_events) == 1
    assert status_events[0]["metadata"]["old_status"] == "pending"
    assert status_events[0]["metadata"]["new_status"] == "in_progress"

    # 4. Patch Status -> review (80%)
    p_rev = client.patch(f"/api/tasks/{task_a_id}", json={"status": "review"}, headers=headers)
    assert p_rev.json()["task"]["progress_percentage"] == 80

    # 5. Patch Status -> completed (100%)
    p_comp = client.patch(f"/api/tasks/{task_a_id}", json={"status": "completed"}, headers=headers)
    assert p_comp.json()["task"]["progress_percentage"] == 100

    # 6. Delete Task
    del_resp = client.delete(f"/api/tasks/{task_a_id}", headers=headers)
    assert del_resp.status_code == 200
    assert client.get(f"/api/tasks/{task_a_id}", headers=headers).status_code == 404


# ── Project Progress Weighted Average ────────────────────────────────────────
def test_project_weighted_progress_calculation():
    owner_token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {owner_token}"}
    project_id = create_sample_project(headers)

    # Initially 0% progress
    prog_0 = client.get(f"/api/projects/{project_id}/progress", headers=headers).json()["progress"]
    assert prog_0["total_tasks"] == 0
    assert prog_0["progress_percentage"] == 0.0

    # Task 1: pending (0%)
    client.post("/api/tasks", json={"project_id": project_id, "title": "Task 1", "status": "pending"}, headers=headers)

    # Task 2: in_progress (50%)
    client.post("/api/tasks", json={"project_id": project_id, "title": "Task 2", "status": "in_progress"}, headers=headers)

    # Task 3: completed (100%)
    client.post("/api/tasks", json={"project_id": project_id, "title": "Task 3", "status": "completed"}, headers=headers)

    # Average = (0 + 50 + 100) / 3 = 50.0%
    prog_calc = client.get(f"/api/projects/{project_id}/progress", headers=headers).json()["progress"]
    assert prog_calc["total_tasks"] == 3
    assert prog_calc["completed_tasks"] == 1
    assert prog_calc["progress_percentage"] == 50.0


# ── Task Dependencies Test ───────────────────────────────────────────────────
def test_task_dependencies():
    owner_token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {owner_token}"}
    project_id = create_sample_project(headers)

    # Create Task A (Prerequisite)
    tA = client.post("/api/tasks", json={"project_id": project_id, "title": "Market Research"}, headers=headers).json()["task"]

    # Create Task B depending on Task A
    tB = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Campaign Launch",
        "dependencies": [tA["id"]]
    }, headers=headers).json()["task"]

    assert tB["dependencies"] == [tA["id"]]

    # Verify get_task preserves dependencies
    get_tB = client.get(f"/api/tasks/{tB['id']}", headers=headers).json()["task"]
    assert tA["id"] in get_tB["dependencies"]


# ── RLS Isolation for Tasks ──────────────────────────────────────────────────
def test_task_rls_member_isolation():
    owner_token = get_token("owner@pragency.eg")
    member_token = get_token("member@pragency.eg")

    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    member_headers = {"Authorization": f"Bearer {member_token}"}

    project_id = create_sample_project(owner_headers)

    # Owner creates Task 1 (unassigned)
    t1 = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Confidential Executive Task",
        "assigned_to": None
    }, headers=owner_headers).json()["task"]

    # Owner creates Task 2 (assigned to member: 22222222-2222-2222-2222-222222222222)
    t2 = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Member Assigned Writing Task",
        "assigned_to": "22222222-2222-2222-2222-222222222222"
    }, headers=owner_headers).json()["task"]

    # Member lists tasks
    member_tasks = client.get("/api/tasks", headers=member_headers).json()["tasks"]
    task_ids = [t["id"] for t in member_tasks]
    assert t2["id"] in task_ids
    assert t1["id"] not in task_ids

    # Member cannot patch unassigned task
    forbidden_patch = client.patch(f"/api/tasks/{t1['id']}", json={"status": "completed"}, headers=member_headers)
    assert forbidden_patch.status_code == 404


# ── WebSocket Broadcast Test ─────────────────────────────────────────────────
def test_websocket_tasks_sync():
    owner_token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {owner_token}"}
    project_id = create_sample_project(headers)

    with client.websocket_connect("/ws/tasks") as websocket:
        # Send heartbeat ping
        websocket.send_text("ping")
        data = websocket.receive_text()
        response = json.loads(data)
        assert response["type"] == "pong"

        # Create task via REST API and verify broadcast received
        t_resp = client.post("/api/tasks", json={
            "project_id": project_id,
            "title": "Realtime Sync Task",
            "status": "pending"
        }, headers=headers)
        assert t_resp.status_code == 201

        # Receive WebSocket broadcast
        broadcast_data = websocket.receive_text()
        msg = json.loads(broadcast_data)
        assert msg["type"] == "task_created"
        assert msg["task"]["title"] == "Realtime Sync Task"
