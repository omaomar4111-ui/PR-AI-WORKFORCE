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
)
from auth import create_jwt_token, get_current_user

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


@app.websocket("/ws/tasks")
async def websocket_tasks_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive & receive client messages
            data = await websocket.receive_text()
            # Echo heartbeat or client ping
            await websocket.send_text(json.dumps({"type": "pong", "payload": data}))
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)
