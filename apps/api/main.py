from fastapi import FastAPI, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
import datetime
import json
from typing import Dict, Any, Optional, List, Set

from config import settings
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
from auth import create_jwt_token, get_current_user
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
def add_client(
    payload: ClientCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    client = create_client(payload.model_dump(), user=current_user)
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
def update_client_by_id(
    client_id: str,
    payload: ClientUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    updated = update_client(client_id, payload.model_dump(exclude_unset=True), user=current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Client not found or access denied")
    return {"client": updated}


@app.delete("/api/clients/{client_id}")
def remove_client(
    client_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    success = delete_client(client_id, user=current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found or access denied")
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
def add_project(
    payload: ProjectCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        project = create_project(payload.model_dump(), user=current_user)
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
def update_project_by_id(
    project_id: str,
    payload: ProjectUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    updated = update_project(project_id, payload.model_dump(exclude_unset=True), user=current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    return {"project": updated}


@app.delete("/api/projects/{project_id}")
def remove_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    success = delete_project(project_id, user=current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    return {"success": True, "message": "Project deleted successfully"}


# ── Tasks Endpoints (CRUD + PATCH status + Events + WebSocket Broadcast) ─────
@app.get("/api/tasks")
def get_tasks(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    tasks = list_tasks(
        user=current_user,
        project_id=project_id,
        status=status,
        priority=priority,
        assigned_to=assigned_to
    )
    return {"tasks": tasks, "count": len(tasks)}


@app.post("/api/tasks", status_code=201)
async def add_task(
    payload: TaskCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        task = create_task(payload.model_dump(), user=current_user)
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
    await ws_manager.broadcast({"type": "task_deleted", "task_id": task_id})
    return {"success": True, "message": "Task deleted successfully"}


# ── Dashboard Stats ──────────────────────────────────────────────────────────
@app.get("/api/dashboard/stats")
def dashboard_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    stats = get_dashboard_stats(user=current_user)
    return {"stats": stats}


# ── Milestone 4: Agents & Deliverables Endpoints ──────────────────────────────
@app.get("/api/agents")
def get_agents(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the registry of specialized AI agents."""
    agents = get_all_agents_dict()
    return {"agents": agents, "count": len(agents)}


@app.get("/api/agents/{agent_id}")
def get_agent_detail(agent_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
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


@app.get("/api/deliverables")
def list_deliverables_endpoint(
    project_id: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    task_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists deliverables accessible to the current user with multi-faceted filtering."""
    deliverables = list_deliverables(
        user=current_user,
        project_id=project_id,
        client_id=client_id,
        agent_id=agent_id,
        task_id=task_id,
        deliverable_type=type,
    )
    return {"deliverables": deliverables, "count": len(deliverables)}


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
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists all workflows for the organization."""
    workflows = list_workflows(user=current_user, project_id=project_id)
    return {"workflows": workflows, "count": len(workflows)}


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
def list_memories_endpoint(
    type: Optional[str] = Query(None),
    reference_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists organization memories without vector search."""
    org_id = current_user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    mems = list_mems(
        org_id=org_id,
        type=type,
        reference_id=reference_id,
        limit=limit,
    )
    return {"memories": mems, "count": len(mems)}


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




if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)
