import pytest
from fastapi.testclient import TestClient
from main import app
from database import reset_db_for_tests, MOCK_USERS

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_state():
    reset_db_for_tests()
    MOCK_USERS["owner@pragency.eg"]["password"] = "Password123!"
    MOCK_USERS["member@pragency.eg"]["password"] = "Password123!"
    yield
    reset_db_for_tests()


def get_token(email: str = "owner@pragency.eg") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_get_departments_authenticated():
    token = get_token("member@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/departments", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 8
    depts = {d["id"]: d for d in data["departments"]}
    assert "video" in depts
    assert "creative" in depts
    assert "engineering" in depts
    # Verify agent count and roster
    video_dept = depts["video"]
    assert video_dept["agent_count"] >= 3
    assert any(a["id"] == "scriptwriter" for a in video_dept["agents"])


def test_post_department_owner_success():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "id": "growth-experiments",
        "name": "Growth & Viral Experiments",
        "name_ar": "النمو والتجارب الفيروسية",
        "slug": "growth-experiments",
        "description": "Rapid viral hypothesis testing and algorithmic distribution optimization.",
        "icon": "Rocket",
    }
    res = client.post("/api/departments", headers=headers, json=payload)
    assert res.status_code == 201
    created = res.json()["department"]
    assert created["id"] == "growth-experiments"
    assert created["name"] == "Growth & Viral Experiments"


def test_post_department_duplicate_slug_rejected():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "id": "video-dup",
        "name": "Duplicate Video",
        "slug": "video",  # Existing slug
    }
    res = client.post("/api/departments", headers=headers, json=payload)
    assert res.status_code == 400
    assert "already in use" in res.json()["detail"].lower()


def test_post_department_member_forbidden():
    token = get_token("member@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "id": "unauthorized-dept",
        "name": "Unauthorized Dept",
    }
    res = client.post("/api/departments", headers=headers, json=payload)
    assert res.status_code == 403


def test_put_department_owner_success():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/departments/video",
        headers=headers,
        json={"name": "Cinematic & Studio Video Production"}
    )
    assert res.status_code == 200
    updated = res.json()["department"]
    assert updated["name"] == "Cinematic & Studio Video Production"


def test_put_department_member_forbidden():
    token = get_token("member@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/departments/video",
        headers=headers,
        json={"name": "Member Renamed Video"}
    )
    assert res.status_code == 403


def test_delete_department_owner_success():
    token = get_token("owner@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    # Create temporary dept then delete it
    client.post(
        "/api/departments",
        headers=headers,
        json={"id": "temp-dept", "name": "Temporary Dept", "slug": "temp-dept"}
    )

    del_res = client.delete("/api/departments/temp-dept", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Confirm not found
    del_res2 = client.delete("/api/departments/temp-dept", headers=headers)
    assert del_res2.status_code == 404


def test_delete_department_member_forbidden():
    token = get_token("member@pragency.eg")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.delete("/api/departments/video", headers=headers)
    assert res.status_code == 403
