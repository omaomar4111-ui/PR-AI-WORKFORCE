from fastapi.testclient import TestClient
from main import app, otel_tracer

client = TestClient(app)

def test_opentelemetry_headers_and_latency_propagation():
    """Verify OpenTelemetry distributed traceparent headers and response time on API responses."""
    resp = client.get("/health")
    assert resp.status_code == 200
    # W3C traceparent header must be present
    assert "traceparent" in resp.headers, "traceparent header must be present in response"
    traceparent = resp.headers["traceparent"]
    assert traceparent.startswith("00-"), "traceparent must start with version 00"
    parts = traceparent.split("-")
    assert len(parts) == 4, f"traceparent must have 4 segments, got {parts}"
    assert len(parts[1]) == 32, "trace_id must be 32 hex chars"
    assert len(parts[2]) == 16, "span_id must be 16 hex chars"

    # x-trace-id header
    assert "x-trace-id" in resp.headers
    assert resp.headers["x-trace-id"] == parts[1]

    # x-response-time header
    assert "x-response-time" in resp.headers
    assert resp.headers["x-response-time"].endswith("ms")

def test_opentelemetry_custom_span_creation():
    """Verify that custom internal spans can be created via otel_tracer."""
    with otel_tracer.start_as_current_span("unit-test-span") as span:
        span.set_attribute("test.key", "test_value")
        ctx = span.get_span_context()
        assert ctx.trace_id != 0
        assert ctx.span_id != 0
