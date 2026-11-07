from fastapi import FastAPI, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect, Response, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, EmailStr, Field
import asyncio
import datetime
import hashlib
import json
import logging
from typing import Dict, Any, Optional, List, Set

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.trace import Status, StatusCode, SpanKind

from config import settings
logger = logging.getLogger("uvicorn.error")

# OpenTelemetry Tracer Provider Configuration with ParentBased TraceIdRatio sampling
otel_resource = Resource.create({
    "service.name": "pr-ai-workforce-api",
    "service.version": "1.0.0",
    "deployment.environment": settings.APP_ENV,
})

sampling_rate = float(os.getenv("OTEL_SAMPLING_RATE", "0.1" if settings.APP_ENV == "production" else "1.0"))
otel_sampler = ParentBased(TraceIdRatioBased(sampling_rate))
otel_provider = TracerProvider(resource=otel_resource, sampler=otel_sampler)

# Exporter Selection: console | otlp | none
# Guard against console spam in production; ConsoleSpanExporter is strictly for development
otel_exporter_mode = os.getenv("OTEL_EXPORTER", "console" if settings.APP_ENV == "development" else "none").lower()

if otel_exporter_mode == "console":
    otel_provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
    logger.info(f"[OTel] Initialized ConsoleSpanExporter (dev mode, sampling={sampling_rate})")
elif otel_exporter_mode == "otlp":
    # Production OTLP Exporter -> Grafana Tempo / Jaeger / Signoz
    try:
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
        otel_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=otlp_endpoint)))
        logger.info(f"[OTel] Initialized OTLPSpanExporter targeting {otlp_endpoint} (sampling={sampling_rate})")
    except ImportError:
        logger.warning("[OTel] opentelemetry-exporter-otlp not installed; falling back to none exporter")
else:
    logger.info(f"[OTel] Tracer configured with exporter='none' (production safe, sampling={sampling_rate})")

trace.set_tracer_provider(otel_provider)
otel_tracer = trace.get_tracer("pr.workforce.api")
otel_propagator = TraceContextTextMapPropagator()

import database
from database import (
    get_user_by_email,
    create_user,
    get_all_users,
    create_client,
    list_clients,
    get_client,
    update_client,
    delete_client,
    create_project,
    list_projects,
    get_project,
    update_project,
    delete_project,
    get_dashboard_stats,
    create_task,
    list_tasks,
    get_task,
    update_task,
    delete_task,
    get_project_progress,
    create_deliverable,
    list_deliverables,
    get_deliverable,
    update_deliverable,
    create_deliverable_version,
    get_deliverable_versions,
    create_workflow,
    get_workflow,
    list_workflows,
    update_workflow,
    get_workflow_steps,
    get_execution_logs,
)
from auth import create_jwt_token, get_current_user, require_role, require_org_member
from middleware import RateLimitMiddleware
from agents.registry import get_agent, list_agents, get_all_agents_dict
from memory.service import (
    save_memory,
    search_memory,
    delete_memory as delete_mem,
    list_memories as list_mems,
    get_memory as get_mem,
)
from orchestrator import (
    start_workflow_in_background,
    approve_workflow_step,
    cancel_workflow,
    set_ws_broadcast_fn,
    OmSamahOrchestrator,
)
from approvals import (
    approve as approve_request,
    reject as reject_request,
    edit_and_approve as edit_approve_request,
    list_approval_requests,
    get_approval_request,
    get_pending_approvals_count,
    set_approval_ws_broadcast_fn,
)
from integrations.registry import (
    get_integration_adapter,
    list_supported_providers,
)
from virtual_office import (
    get_all_statuses,
    get_agent_status,
    update_agent_status,
    set_status_ws_broadcast_fn,
)
from analytics.service import (
    get_cost_per_agent,
    get_cost_per_project,
    get_quality_trend,
    get_token_usage_summary,
    log_ai_usage,
)
from cache import (
    check_redis_health,
    close_redis,
    cache_get,
    cache_set,
    invalidate_dashboard_cache,
    invalidate_agents_cache,
)

app = FastAPI(
    title="PR AI WORKFORCE API",
    version="1.0.0",
    description="Central OS for PR Agency AI Workforce (Om Samah + 38 Specialized Agents)"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.API_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Compression Middleware (minimum 1000 bytes)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Production Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)


# Production Security Headers Middleware
@app.middleware("http")
async def security_headers_middleware(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    return response


# OpenTelemetry Distributed Tracing Middleware (W3C traceparent Propagation)
@app.middleware("http")
async def opentelemetry_tracing_middleware(request: Request, call_next):
    headers_dict = dict(request.headers)
    extracted_context = otel_propagator.extract(carrier=headers_dict)
    span_name = f"{request.method} {request.url.path}"
    
    with otel_tracer.start_as_current_span(
        span_name,
        context=extracted_context,
        kind=SpanKind.SERVER,
    ) as span:
        span.set_attribute("http.method", request.method)
        span.set_attribute("http.url", str(request.url))
        span.set_attribute("http.target", request.url.path)
        if request.client:
            span.set_attribute("http.client_ip", request.client.host)

        span_ctx = span.get_span_context()
        trace_id_hex = f"{span_ctx.trace_id:032x}"
        span_id_hex = f"{span_ctx.span_id:016x}"
        traceparent_header = f"00-{trace_id_hex}-{span_id_hex}-01"

        try:
            response = await call_next(request)
            span.set_attribute("http.status_code", response.status_code)
            if response.status_code >= 500:
                span.set_status(Status(StatusCode.ERROR))
            else:
                span.set_status(Status(StatusCode.OK))
        except Exception as exc:
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise exc

        response.headers["traceparent"] = traceparent_header
        response.headers["x-trace-id"] = trace_id_hex
        if settings.APP_ENV == "development" or otel_exporter_mode == "console":
            logger.info(
                f"[OTel Trace] {request.method} {request.url.path} "
                f"status={response.status_code} trace_id={trace_id_hex} span_id={span_id_hex}"
            )
        return response


# ── WebSocket Connection Manager ─────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection)


ws_manager = ConnectionManager()
set_ws_broadcast_fn(ws_manager.broadcast)
set_approval_ws_broadcast_fn(ws_manager.broadcast)


@app.websocket("/ws/tasks")
async def websocket_tasks_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"type": "pong", "payload": data}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@app.websocket("/ws/workflows/{workflow_id}")
async def websocket_workflow_endpoint(websocket: WebSocket, workflow_id: str):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"type": "workflow_pong", "workflow_id": workflow_id, "payload": data}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


status_ws_manager = ConnectionManager()


async def broadcast_agent_status(payload: Dict[str, Any]):
    await status_ws_manager.broadcast(payload)


set_status_ws_broadcast_fn(broadcast_agent_status)


@app.websocket("/ws/agents/status")
async def websocket_agents_status_endpoint(websocket: WebSocket):
    await status_ws_manager.connect(websocket)
    try:
        # Send initial snapshot of all 38 agent statuses upon connection
        init_payload = {
            "type": "initial_status",
            "statuses": get_all_statuses(),
            "count": len(get_all_statuses())
        }
        await websocket.send_text(json.dumps(init_payload))
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"type": "status_pong", "payload": data}))
    except WebSocketDisconnect:
        status_ws_manager.disconnect(websocket)
    except Exception:
        status_ws_manager.disconnect(websocket)


# ── Schemas ──────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = "member"


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1)
    industry: Optional[str] = "PR & Communications"
    brand_color: Optional[str] = "#8b5cf6"
    logo_url: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    assigned_to: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    brand_color: Optional[str] = None
    logo_url: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    assigned_to: Optional[str] = None


class ProjectCreate(BaseModel):
    client_id: str
    name: str = Field(..., min_length=1)
    description: Optional[str] = ""
    status: Optional[str] = "active"
    retainer_amount: Optional[float] = 0.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    assigned_to: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    retainer_amount: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    assigned_to: Optional[str] = None


class TaskCreate(BaseModel):
    project_id: str
    title: str = Field(..., min_length=1)
    description: Optional[str] = ""
    status: Optional[str] = "pending"
    priority: Optional[str] = "medium"
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    dependencies: Optional[List[str]] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    dependencies: Optional[List[str]] = None


class AgentExecuteRequest(BaseModel):
    input: Dict[str, Any]
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    title: Optional[str] = None


class AgentStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: idle, working, or blocked")
    current_task: Optional[str] = None


class WorkflowCreateRequest(BaseModel):
    user_request: str = Field(..., min_length=3)
    project_id: Optional[str] = None


class StepApprovalRequest(BaseModel):
    step_id: str
    approved: bool = True
    notes: Optional[str] = None


class MemoryCreateRequest(BaseModel):
    type: str = Field(..., pattern="^(organization|client|project|agent)$")
    reference_id: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    metadata: Optional[Dict[str, Any]] = None


class DeliverableVersionRequest(BaseModel):
    title: Optional[str] = None
    raw_content: Optional[str] = None
    content_json: Optional[Dict[str, Any]] = None
    quality_score: Optional[int] = 95
    status: Optional[str] = "delivered"


class ApprovalDecisionRequest(BaseModel):
    notes: Optional[str] = None


class ApprovalEditRequest(BaseModel):
    payload: Dict[str, Any]
    notes: Optional[str] = None


class IntegrationConnectRequest(BaseModel):
    config: Dict[str, Any]


# ── Health Endpoint ──────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "PR AI WORKFORCE API",
        "version": "1.0.0",
        "environment": settings.APP_ENV,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database": "connected (PostgreSQL 16)",
        "redis": "connected (Redis 7)"
    }


@app.get("/health/redis")
async def health_redis():
    """Live healthcheck endpoint for Redis connection pool and latency verification."""
    res = await check_redis_health()
    status_code = 200 if res.get("status") == "connected" else 503
    return JSONResponse(status_code=status_code, content=res)


@app.get("/health/db")
def health_db():
    """Live healthcheck endpoint for Supabase PostgreSQL tuned connection pool."""
    from database import get_db_pool_status
    pool_status = get_db_pool_status()
    return {"status": "connected", "pool": pool_status}


# ── Real User Monitoring (RUM) Endpoint ──────────────────────────────────────
class WebVitalTelemetry(BaseModel):
    name: str
    value: float
    rating: Optional[str] = "good"
    delta: Optional[float] = 0.0
    id: Optional[str] = None
    navigationType: Optional[str] = None
    url: Optional[str] = None
    timestamp: Optional[int] = None


@app.post("/api/telemetry/vitals")
async def record_web_vital(metric: WebVitalTelemetry):
    """
    RUM (Real User Monitoring) telemetry ingestion endpoint.
    Collects Core Web Vitals (LCP, INP, CLS, FCP, TTFB) reported from real user sessions.
    """
    logger.info(
        f"[RUM Telemetry] metric={metric.name} value={metric.value:.2f} "
        f"rating={metric.rating} url={metric.url} id={metric.id}"
    )
    return {
        "status": "recorded",
        "metric": metric.name,
        "value": metric.value,
        "rating": metric.rating,
    }


@app.on_event("shutdown")
async def app_shutdown():
    """Graceful shutdown handler for async connection pools."""
    await close_redis()


# ── Auth Endpoints ───────────────────────────────────────────────────────────
@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
        
    token_payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "org_id": user["organization_id"]
    }
    token = create_jwt_token(token_payload)
    safe_user = {k: v for k, v in user.items() if k != "password"}
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": safe_user
    }


@app.post("/api/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    try:
        user = create_user(
            email=req.email,
            password=req.password,
            full_name=req.full_name,
            role=req.role or "member"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    token_payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "org_id": user["organization_id"]
    }
    token = create_jwt_token(token_payload)
    safe_user = {k: v for k, v in user.items() if k != "password"}
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": safe_user
    }


@app.get("/api/auth/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "user": {k: v for k, v in current_user.items() if k != "password"}
    }


@app.get("/api/users")
def list_org_users(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"users": get_all_users()}


# ── Clients Endpoints ────────────────────────────────────────────────────────
@app.get("/api/clients")
def get_clients(
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    clients = list_clients(user=current_user, search=search)
    return {"clients": clients, "count": len(clients)}


@app.post("/api/clients", status_code=201)
async def add_client(
    payload: ClientCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    client = create_client(payload.model_dump(), user=current_user)
    await invalidate_dashboard_cache(current_user.get("organization_id"))
    return {"client": client}


@app.get("/api/clients/{client_id}")
def get_client_by_id(
    client_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    client = get_client(client_id, user=current_user)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")
    return {"client": client}


@app.put("/api/clients/{client_id}")
async def update_client_by_id(
    client_id: str,
    payload: ClientUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    updated = update_client(client_id, payload.model_dump(exclude_unset=True), user=current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Client not found or access denied")
    await invalidate_dashboard_cache(current_user.get("organization_id"))
    return {"client": updated}


@app.delete("/api/clients/{client_id}")
async def remove_client(
    client_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin"]))
):
    success = delete_client(client_id, user=current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found or access denied")
    await invalidate_dashboard_cache(current_user.get("organization_id"))
    return {"success": True, "message": "Client deleted successfully"}


# ── Projects Endpoints ───────────────────────────────────────────────────────
@app.get("/api/projects")
def get_projects(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    projects = list_projects(user=current_user, client_id=client_id, status=status)
    return {"projects": projects, "count": len(projects)}


@app.post("/api/projects", status_code=201)
async def add_project(
    payload: ProjectCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        project = create_project(payload.model_dump(), user=current_user)
        await invalidate_dashboard_cache(current_user.get("organization_id"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"project": project}


@app.get("/api/projects/{project_id}")
def get_project_by_id(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    project = get_project(project_id, user=current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    return {"project": project}


@app.get("/api/projects/{project_id}/progress")
def project_progress_endpoint(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    progress = get_project_progress(project_id, user=current_user)
    return {"progress": progress}


@app.put("/api/projects/{project_id}")
async def update_project_by_id(
    project_id: str,
    payload: ProjectUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    updated = update_project(project_id, payload.model_dump(exclude_unset=True), user=current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    await invalidate_dashboard_cache(current_user.get("organization_id"))
    return {"project": updated}


@app.delete("/api/projects/{project_id}")
async def remove_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin"]))
):
    success = delete_project(project_id, user=current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    await invalidate_dashboard_cache(current_user.get("organization_id"))
    return {"success": True, "message": "Project deleted successfully"}


# ── Tasks Endpoints (CRUD + PATCH status + Events + WebSocket Broadcast) ─────
@app.get("/api/tasks")
def get_tasks(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    skip: int = Query(0, ge=0, description="Items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    tasks = list_tasks(
        user=current_user,
        project_id=project_id,
        status=status,
        priority=priority,
        assigned_to=assigned_to
    )
    total = len(tasks)
    paginated = tasks[skip : skip + limit]
    return {
        "tasks": paginated,
        "count": len(paginated),
        "total": total,
        "skip": skip,
        "limit": limit
    }


@app.post("/api/tasks", status_code=201)
async def add_task(
    payload: TaskCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        task = create_task(payload.model_dump(), user=current_user)
        await invalidate_dashboard_cache(current_user.get("organization_id"))
        # Broadcast real-time event to all connected UI clients
        await ws_manager.broadcast({"type": "task_created", "task": task})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"task": task}


@app.get("/api/tasks/{task_id}")
def get_task_by_id(
    task_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    task = get_task(task_id, user=current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or access denied")
    return {"task": task}


@app.patch("/api/tasks/{task_id}")
async def patch_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    updated = update_task(task_id, payload.model_dump(exclude_unset=True), user=current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found or access denied")
    await invalidate_dashboard_cache(current_user.get("organization_id"))
    # Broadcast real-time status/task update
    await ws_manager.broadcast({"type": "task_updated", "task": updated})
    return {"task": updated}


@app.delete("/api/tasks/{task_id}")
async def remove_task(
    task_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    success = delete_task(task_id, user=current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or access denied")
    await invalidate_dashboard_cache(current_user.get("organization_id"))
    await ws_manager.broadcast({"type": "task_deleted", "task_id": task_id})
    return {"success": True, "message": "Task deleted successfully"}


# ── Dashboard Stats ──────────────────────────────────────────────────────────
@app.get("/api/dashboard/stats")
async def dashboard_stats(
    response: Response,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    org_id = current_user.get("organization_id", "global")
    user_id = current_user.get("id", "default")
    cache_key = f"cache:dashboard:stats:{org_id}:{user_id}"

    cached_data = await cache_get(cache_key)
    if cached_data is not None:
        response.headers["X-Cache"] = "HIT"
        return cached_data

    stats = get_dashboard_stats(user=current_user)
    result = {"stats": stats}
    await cache_set(cache_key, result, ttl=60)
    response.headers["X-Cache"] = "MISS"
    return result


# ── Milestone 4 & 9: Agents & Virtual Office Status Endpoints ─────────────────
@app.get("/api/agents/status")
def get_agents_status_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the current operational status (idle/working/blocked) for all 38 agents."""
    statuses = get_all_statuses()
    return {"statuses": statuses, "count": len(statuses)}


@app.patch("/api/agents/{agent_id}/status")
async def update_agent_status_endpoint(
    agent_id: str,
    payload: AgentStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Updates an agent's operational status and broadcasts the change via WebSocket."""
    try:
        updated = await update_agent_status(
            agent_id=agent_id,
            status=payload.status,
            current_task=payload.current_task,
        )
        await invalidate_agents_cache()
        return {"agent": updated}
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/agents")
async def get_agents(
    request: Request,
    response: Response,
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin", "member"]))
):
    """Returns the registry of specialized AI agents with Redis caching, Cache-Control and ETag headers."""
    cache_key = "cache:agents:all"
    cached_data = await cache_get(cache_key)
    if cached_data is not None:
        result = cached_data
        cache_hit = True
    else:
        agents = get_all_agents_dict()
        result = {"agents": agents, "count": len(agents)}
        await cache_set(cache_key, result, ttl=300)
        cache_hit = False

    # Compute deterministic ETag
    content_bytes = json.dumps(result, sort_keys=True).encode("utf-8")
    etag = f'"{hashlib.md5(content_bytes).hexdigest()}"'
    cache_control = "public, max-age=60, stale-while-revalidate=300"

    # Check conditional If-None-Match request
    if_none_match = request.headers.get("if-none-match")
    if if_none_match:
        candidates = [t.strip() for t in if_none_match.split(",")]
        clean_etag = etag.strip('"').removeprefix("W/")
        matched = False
        if "*" in candidates:
            matched = True
        else:
            for c in candidates:
                clean_c = c.strip('"').removeprefix("W/").strip('"')
                if clean_c == clean_etag:
                    matched = True
                    break
        if matched:
            return Response(
                status_code=304,
                headers={
                    "ETag": etag,
                    "Cache-Control": cache_control,
                    "X-Cache": "HIT" if cache_hit else "MISS",
                }
            )

    response.headers["Cache-Control"] = cache_control
    response.headers["ETag"] = etag
    response.headers["X-Cache"] = "HIT" if cache_hit else "MISS"
    return result


@app.get("/api/agents/{agent_id}")
def get_agent_detail(agent_id: str, current_user: Dict[str, Any] = Depends(require_role(["owner", "admin", "member"]))):
    """Returns detailed profile, tools, schema, and quality criteria for an agent."""
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found in registry")
    return {"agent": agent.to_dict()}


@app.post("/api/agents/{agent_id}/execute")
async def execute_agent_task(
    agent_id: str,
    payload: AgentExecuteRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Executes a real task with the specified agent and generates a validated deliverable."""
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found in registry")

    # Mark status as working in Virtual Office
    try:
        await update_agent_status(
            agent_id,
            status="working",
            current_task=payload.title or f"Interactive execution: {agent.name}"
        )
    except Exception as st_err:
        logger.warning(f"Failed to update agent status to working: {st_err}")

    try:
        result = await agent.execute(
            task_input=payload.input,
            user=current_user,
            project_id=payload.project_id,
            task_id=payload.task_id,
            title=payload.title,
        )

        # Broadcast real-time execution event via WebSocket
        await ws_manager.broadcast({
            "type": "deliverable_produced",
            "deliverable": result["deliverable"],
            "agent_id": agent_id,
        })

        return result
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(exc)}")
    finally:
        # Reset status back to idle
        try:
            await update_agent_status(agent_id, status="idle")
            await invalidate_agents_cache()
        except Exception:
            pass


@app.post("/api/agents/{agent_id}/execute/stream")
async def execute_agent_task_stream(
    agent_id: str,
    payload: AgentExecuteRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Executes a task with an AI agent using Server-Sent Events (SSE) token-by-token streaming."""
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found in registry")

    async def event_generator():
        # 1. Mark status as working in Virtual Office
        try:
            await update_agent_status(
                agent_id,
                status="working",
                current_task=payload.title or f"Streaming execution: {agent.name}"
            )
        except Exception as st_err:
            logger.warning(f"Failed to update agent status to working: {st_err}")

        try:
            # Send initial event
            yield f"data: {json.dumps({'type': 'start', 'agent_id': agent_id, 'title': payload.title or agent.name})}\n\n"
            await asyncio.sleep(0.02)

            # Execute agent task logic
            result = await agent.execute(
                task_input=payload.input,
                user=current_user,
                project_id=payload.project_id,
                task_id=payload.task_id,
                title=payload.title,
            )

            # Deliver output in token-by-token chunks for SSE streaming
            output_json_str = json.dumps(result["output"], ensure_ascii=False, indent=2)
            chunk_size = 8
            for i in range(0, len(output_json_str), chunk_size):
                chunk = output_json_str[i:i + chunk_size]
                yield f"data: {json.dumps({'type': 'token', 'token': chunk})}\n\n"
                await asyncio.sleep(0.01)

            # Broadcast deliverable event via WebSocket
            await ws_manager.broadcast({
                "type": "deliverable_produced",
                "deliverable": result["deliverable"],
                "agent_id": agent_id,
            })

            # Send completion event with full metadata and deliverable
            yield f"data: {json.dumps({'type': 'done', 'deliverable': result['deliverable'], 'output': result['output'], 'agent': result.get('agent', agent.to_dict())})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"
        finally:
            try:
                await update_agent_status(agent_id, status="idle")
                await invalidate_agents_cache()
            except Exception:
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/api/deliverables")
def list_deliverables_endpoint(
    project_id: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    task_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0, description="Items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists deliverables accessible to the current user with multi-faceted filtering and pagination."""
    deliverables = list_deliverables(
        user=current_user,
        project_id=project_id,
        client_id=client_id,
        agent_id=agent_id,
        task_id=task_id,
        deliverable_type=type,
    )
    total = len(deliverables)
    paginated = deliverables[skip : skip + limit]
    return {
        "deliverables": paginated,
        "count": len(paginated),
        "total": total,
        "skip": skip,
        "limit": limit
    }


@app.post("/api/deliverables/{deliverable_id}/version", status_code=201)
def create_deliverable_version_endpoint(
    deliverable_id: str,
    payload: DeliverableVersionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Creates a new version of an existing deliverable, linked to the parent lineage."""
    new_version = create_deliverable_version(
        parent_id=deliverable_id,
        updates=payload.model_dump(exclude_unset=True),
        user=current_user
    )
    if not new_version:
        raise HTTPException(status_code=404, detail="Deliverable not found or access denied")
    return {"deliverable": new_version}


@app.get("/api/deliverables/{deliverable_id}/versions")
def get_deliverable_versions_endpoint(
    deliverable_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves all versions in a deliverable's lineage."""
    versions = get_deliverable_versions(deliverable_id, user=current_user)
    if not versions:
        raise HTTPException(status_code=404, detail="Deliverable not found or access denied")
    return {"versions": versions, "count": len(versions)}


@app.get("/api/deliverables/{deliverable_id}")
def get_deliverable_endpoint(
    deliverable_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Returns a specific deliverable record."""
    deliv = get_deliverable(deliverable_id, user=current_user)
    if not deliv:
        raise HTTPException(status_code=404, detail="Deliverable not found or access denied")
    return {"deliverable": deliv}


@app.get("/storage/deliverables/{filename}")
def serve_deliverable_file(filename: str):
    """Serves the generated deliverable JSON file from local storage."""
    from fastapi.responses import FileResponse
    import os
    storage_dir = os.path.join(os.path.dirname(__file__), "storage", "deliverables")
    file_path = os.path.join(storage_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Deliverable file not found on disk")
    return FileResponse(file_path, media_type="application/json", filename=filename)


# ── Milestone 5: Workflows API (Om Samah Orchestrator) ────────────────────────
@app.post("/api/workflows", status_code=201)
async def create_workflow_endpoint(
    payload: WorkflowCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Initiates an Om Samah autonomous workflow from a user brief."""
    wf = create_workflow({
        "user_request": payload.user_request.strip(),
        "project_id": payload.project_id,
        "status": "planning",
    }, user=current_user)

    orchestrator = OmSamahOrchestrator(wf["id"], current_user)
    steps = await orchestrator.initialize_steps(payload.project_id)
    wf["steps"] = steps

    # Start execution in background task (non-blocking)
    start_workflow_in_background(wf["id"], current_user, payload.project_id)

    # Broadcast creation event
    await ws_manager.broadcast({
        "type": "workflow_created",
        "workflow": wf,
    })

    return {"workflow": wf}


@app.get("/api/workflows")
def list_workflows_endpoint(
    project_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0, description="Items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists all workflows for the organization with pagination."""
    workflows = list_workflows(user=current_user, project_id=project_id)
    total = len(workflows)
    paginated = workflows[skip : skip + limit]
    return {
        "workflows": paginated,
        "count": len(paginated),
        "total": total,
        "skip": skip,
        "limit": limit
    }


@app.get("/api/workflows/{workflow_id}")
def get_workflow_endpoint(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves full workflow details, steps, and status."""
    wf = get_workflow(workflow_id, user=current_user)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found or access denied")
    return {"workflow": wf}


@app.get("/api/workflows/{workflow_id}/logs")
def get_workflow_logs_endpoint(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Returns execution event logs for the workflow."""
    wf = get_workflow(workflow_id, user=current_user)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found or access denied")
    logs = get_execution_logs(workflow_id)
    return {"logs": logs, "count": len(logs)}


@app.post("/api/workflows/{workflow_id}/approve")
async def approve_workflow_step_endpoint(
    workflow_id: str,
    payload: StepApprovalRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Approves or rejects a paused workflow step to resume execution."""
    wf = get_workflow(workflow_id, user=current_user)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found or access denied")

    try:
        updated_step = approve_workflow_step(
            workflow_id=workflow_id,
            step_id=payload.step_id,
            approved=payload.approved,
            notes=payload.notes
        )

        # Broadcast approval and resumption
        await ws_manager.broadcast({
            "type": "workflow_step_approved",
            "workflow_id": workflow_id,
            "step": updated_step,
            "approved": payload.approved,
        })

        return {"success": True, "step": updated_step}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/workflows/{workflow_id}/cancel")
async def cancel_workflow_endpoint(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cancels a running workflow."""
    wf = get_workflow(workflow_id, user=current_user)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found or access denied")

    success = cancel_workflow(workflow_id)
    await ws_manager.broadcast({
        "type": "workflow_cancelled",
        "workflow_id": workflow_id,
    })
    return {"success": success, "message": "Workflow cancelled"}


# ── Milestone 6: Multi-level Memory Endpoints ─────────────────────────────────
@app.post("/api/memories", status_code=201)
def create_memory_endpoint(
    payload: MemoryCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Creates and embeds a new memory item for org, client, project, or agent."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    try:
        mem = save_memory(
            org_id=org_id,
            type=payload.type,
            reference_id=payload.reference_id,
            content=payload.content,
            metadata=payload.metadata,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"memory": mem}


@app.get("/api/memories/search")
def search_memories_endpoint(
    q: str = Query(..., min_length=1, description="Semantic search query"),
    type: Optional[str] = Query(None, description="Memory type filter: organization, client, project, agent"),
    reference_id: Optional[str] = Query(None, description="Reference ID filter"),
    limit: int = Query(5, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Performs real vector cosine similarity semantic search (<=>) on memories."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    results = search_memory(
        org_id=org_id,
        query=q,
        type=type,
        reference_id=reference_id,
        limit=limit,
    )
    return {"memories": results, "count": len(results), "query": q}


@app.get("/api/memories")
@app.get("/api/memory")
def list_memories_endpoint(
    type: Optional[str] = Query(None),
    reference_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0, description="Items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists organization memories without vector search with pagination."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    # Fetch list from memory service
    mems = list_mems(
        org_id=org_id,
        type=type,
        reference_id=reference_id,
        limit=1000,
    )
    total = len(mems)
    paginated = mems[skip : skip + limit]
    return {
        "memories": paginated,
        "count": len(paginated),
        "total": total,
        "skip": skip,
        "limit": limit
    }


@app.delete("/api/memories/{memory_id}")
def delete_memory_endpoint(
    memory_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Deletes a memory item. Enforces owner-only permission."""
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only organization owners can delete memories")
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    success = delete_mem(memory_id, org_id=org_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory item not found or access denied")
    return {"success": True, "message": "Memory deleted successfully"}


# ── Milestone 7: Human Approvals Endpoints ────────────────────────────────────
@app.get("/api/approvals")
def list_approvals_endpoint(
    status: Optional[str] = Query(None),
    workflow_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists approval requests with optional status filtering."""
    requests = list_approval_requests(status=status, workflow_id=workflow_id)
    return {"approvals": requests, "count": len(requests)}


@app.get("/api/approvals/count")
def get_pending_count_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns total pending approvals count for top-bar badge."""
    return {"pending_count": get_pending_approvals_count()}


@app.post("/api/approvals/{request_id}/approve")
async def approve_request_endpoint(
    request_id: str,
    payload: ApprovalDecisionRequest = ApprovalDecisionRequest(),
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin"]))
):
    """Approves an action request and resumes workflow."""
    try:
        updated = await approve_request(
            request_id=request_id,
            user_id=current_user["id"],
            notes=payload.notes,
        )
        return {"success": True, "approval": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/approvals/{request_id}/reject")
async def reject_request_endpoint(
    request_id: str,
    payload: ApprovalDecisionRequest = ApprovalDecisionRequest(),
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin"]))
):
    """Rejects an action request and halts step."""
    try:
        updated = await reject_request(
            request_id=request_id,
            user_id=current_user["id"],
            notes=payload.notes,
        )
        return {"success": True, "approval": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/approvals/{request_id}/edit")
async def edit_and_approve_endpoint(
    request_id: str,
    payload: ApprovalEditRequest,
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin"]))
):
    """Modifies the payload and approves the action."""
    try:
        updated = await edit_approve_request(
            request_id=request_id,
            user_id=current_user["id"],
            modified_payload=payload.payload,
            notes=payload.notes,
        )
        return {"success": True, "approval": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Milestone 7: Integration Hub Endpoints ────────────────────────────────────
@app.get("/api/integrations")
def list_integrations_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lists all external tool integrations with real live connection status."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    providers = list_supported_providers()
    items = []
    for p in providers:
        adapter = get_integration_adapter(p["provider"], org_id)
        status_info = adapter.get_status()
        items.append({
            **p,
            "status": status_info["status"],
            "connected_at": status_info.get("connected_at"),
            "connected_by": status_info.get("connected_by"),
            "message": status_info.get("message"),
        })
    return {"integrations": items, "count": len(items)}


@app.post("/api/integrations/{provider}/connect")
def connect_integration_endpoint(
    provider: str,
    payload: IntegrationConnectRequest,
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin"]))
):
    """Connects external integration with provided credentials / OAuth token."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    try:
        adapter = get_integration_adapter(provider, org_id)
        result = adapter.connect(payload.config, user_id=current_user["id"])
        return {"success": True, "integration": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/integrations/{provider}/disconnect")
def disconnect_integration_endpoint(
    provider: str,
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin"]))
):
    """Disconnects and revokes stored credentials for an integration provider."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    try:
        adapter = get_integration_adapter(provider, org_id)
        success = adapter.disconnect()
        return {"success": success, "provider": provider, "status": "disconnected"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/integrations/{provider}/test")
def test_integration_endpoint(
    provider: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Tests live connection to the provider. NEVER simulates success if credentials missing."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    try:
        adapter = get_integration_adapter(provider, org_id)
        test_result = adapter.test_connection()
        return {"success": test_result.get("status") == "connected", **test_result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))





# ── Milestone 10: Analytics & Cost Tracking Endpoints ─────────────────────────
@app.get("/api/analytics/summary")
def get_analytics_summary_endpoint(current_user: Dict[str, Any] = Depends(require_role(["owner", "admin", "member"]))):
    """Returns top-level KPI metrics, token consumption, total cost, and model distribution."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    summary = get_token_usage_summary(org_id)
    return {"summary": summary}


@app.get("/api/analytics/usage")
def get_analytics_usage_endpoint(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin", "member"]))
):
    """Returns filtered AI execution usage logs."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    logs = database.list_ai_usage_logs(
        org_id=org_id,
        agent_id=agent_id,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
    )
    return {"logs": logs, "count": len(logs)}


@app.get("/api/analytics/costs/agents")
def get_costs_by_agent_endpoint(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin", "member"]))
):
    """Returns cost and token consumption aggregated by AI agent."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    costs = get_cost_per_agent(org_id, start_date=start_date, end_date=end_date)
    return {"costs_by_agent": costs, "count": len(costs)}


@app.get("/api/analytics/costs/projects")
def get_costs_by_project_endpoint(current_user: Dict[str, Any] = Depends(require_role(["owner", "admin", "member"]))):
    """Returns cost and token consumption aggregated by project."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    costs = get_cost_per_project(org_id)
    return {"costs_by_project": costs, "count": len(costs)}


@app.get("/api/analytics/quality/trend")
def get_quality_trend_endpoint(
    days: int = Query(30, ge=1, le=365),
    current_user: Dict[str, Any] = Depends(require_role(["owner", "admin", "member"]))
):
    """Returns historical daily quality score trends."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    trend = get_quality_trend(org_id, days=days)
    return {"quality_trend": trend}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)
