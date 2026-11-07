import pytest
import sys
import os
import json
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app
from database import reset_db_for_tests
from agents.registry import get_agent

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


def test_agent_execute_sse_streaming():
    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    agent = get_agent("dr-ibrahim")
    assert agent is not None
    payload = {
        "title": "SSE Streaming Test",
        "input": agent.sample_input
    }

    t0 = time.perf_counter()
    resp = client.post(
        "/api/agents/dr-ibrahim/execute/stream",
        json=payload,
        headers=headers,
    )
    total_duration_ms = (time.perf_counter() - t0) * 1000

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")

    # Parse SSE events from response stream body
    body_text = resp.text
    assert "data: " in body_text

    events = []
    tokens = []
    done_event = None

    for line in body_text.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            json_str = line.replace("data:", "").strip()
            evt = json.loads(json_str)
            events.append(evt)
            if evt.get("type") == "token":
                tokens.append(evt.get("token"))
            elif evt.get("type") == "done":
                done_event = evt

    assert len(events) > 5, f"SSE stream must yield multiple event chunks, got {len(events)}"
    assert len(tokens) > 0, "SSE stream must yield token chunks"
    assert done_event is not None, "SSE stream must conclude with a 'done' event"
    assert "deliverable" in done_event
    assert "output" in done_event
    assert done_event["deliverable"]["agent_id"] == "dr-ibrahim"
