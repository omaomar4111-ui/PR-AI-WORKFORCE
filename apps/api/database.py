from typing import Optional, Dict, Any, List, Set
import datetime
import uuid

# In-memory storage for development and testing
MOCK_USERS: Dict[str, Dict[str, Any]] = {
    "owner@pragency.eg": {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "owner@pragency.eg",
        "full_name": "Agency Principal",
        "password": "Password123!",
        "role": "owner",
        "organization_id": "00000000-0000-0000-0000-000000000001",
        "organization_name": "PR Agency Internal",
        "is_active": True,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    },
    "member@pragency.eg": {
        "id": "22222222-2222-2222-2222-222222222222",
        "email": "member@pragency.eg",
        "full_name": "Team Member",
        "password": "Password123!",
        "role": "member",
        "organization_id": "00000000-0000-0000-0000-000000000001",
        "organization_name": "PR Agency Internal",
        "is_active": True,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
}

MOCK_ORGANIZATIONS: Dict[str, Dict[str, Any]] = {
    "00000000-0000-0000-0000-000000000001": {
        "id": "00000000-0000-0000-0000-000000000001",
        "name": "PR Agency Internal",
        "slug": "pr-agency",
        "logo_url": None,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
}

# Key: client_id -> client dict
CLIENTS_DB: Dict[str, Dict[str, Any]] = {}

# Key: project_id -> project dict
PROJECTS_DB: Dict[str, Dict[str, Any]] = {}

# Key: task_id -> task dict
TASKS_DB: Dict[str, Dict[str, Any]] = {}

# Key: task_id -> list of depends_on_task_id
TASK_DEPENDENCIES_DB: Dict[str, List[str]] = {}

# List of audit log event dicts
TASK_EVENTS_DB: List[Dict[str, Any]] = []

# List of approval requests
TASK_APPROVALS_DB: List[Dict[str, Any]] = []

# Key: deliverable_id -> deliverable dict (Milestone 4)
DELIVERABLES_DB: Dict[str, Dict[str, Any]] = {}

# Milestone 5: Workflows, steps, execution logs
WORKFLOWS_DB: Dict[str, Dict[str, Any]] = {}
WORKFLOW_STEPS_DB: Dict[str, Dict[str, Any]] = {}
EXECUTION_LOGS_DB: List[Dict[str, Any]] = []

# Status to Progress mapping per Milestone 3 requirements
STATUS_PROGRESS: Dict[str, int] = {
    "pending": 0,
    "planning": 10,
    "assigned": 20,
    "in_progress": 50,
    "review": 80,
    "needs_approval": 90,
    "completed": 100,
    "failed": 0,
    "cancelled": 0,
}


def reset_db_for_tests():
    """Helper for clean unit tests."""
    CLIENTS_DB.clear()
    PROJECTS_DB.clear()
    TASKS_DB.clear()
    TASK_DEPENDENCIES_DB.clear()
    TASK_EVENTS_DB.clear()
    TASK_APPROVALS_DB.clear()
    DELIVERABLES_DB.clear()
    WORKFLOWS_DB.clear()
    WORKFLOW_STEPS_DB.clear()
    EXECUTION_LOGS_DB.clear()


# ── User Helpers ─────────────────────────────────────────────────────────────
def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    norm_email = email.strip().lower()
    return MOCK_USERS.get(norm_email)


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    for user in MOCK_USERS.values():
        if user["id"] == user_id:
            return user
    return None


def get_all_users() -> List[Dict[str, Any]]:
    return [
        {
            "id": u["id"],
            "email": u["email"],
            "full_name": u["full_name"],
            "role": u["role"]
        }
        for u in MOCK_USERS.values()
    ]


def create_user(
    email: str,
    password: str,
    full_name: str,
    role: str = "member",
    org_id: str = "00000000-0000-0000-0000-000000000001"
) -> Dict[str, Any]:
    norm_email = email.strip().lower()
    if norm_email in MOCK_USERS:
        raise ValueError("User already exists")
    
    new_user = {
        "id": str(uuid.uuid4()),
        "email": norm_email,
        "full_name": full_name,
        "password": password,
        "role": role,
        "organization_id": org_id,
        "organization_name": MOCK_ORGANIZATIONS.get(org_id, {}).get("name", "PR Agency"),
        "is_active": True,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    MOCK_USERS[norm_email] = new_user
    return new_user


# ── Clients CRUD with RLS ────────────────────────────────────────────────────
def can_access_client(client: Dict[str, Any], user: Dict[str, Any]) -> bool:
    if client.get("organization_id") != user.get("organization_id"):
        return False
    if user.get("role") == "owner":
        return True
    return client.get("assigned_to") == user.get("id")


def create_client(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    client_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    assigned_to = data.get("assigned_to")
    if user.get("role") == "member" and not assigned_to:
        assigned_to = user.get("id")

    client = {
        "id": client_id,
        "organization_id": user.get("organization_id", "00000000-0000-0000-0000-000000000001"),
        "name": data["name"],
        "industry": data.get("industry", "PR & Communications"),
        "brand_color": data.get("brand_color", "#8b5cf6"),
        "logo_url": data.get("logo_url"),
        "contact_name": data.get("contact_name"),
        "contact_email": data.get("contact_email"),
        "contact_phone": data.get("contact_phone"),
        "assigned_to": assigned_to,
        "created_at": now,
        "updated_at": now,
    }
    CLIENTS_DB[client_id] = client
    return client


def list_clients(user: Dict[str, Any], search: Optional[str] = None) -> List[Dict[str, Any]]:
    results = []
    for client in CLIENTS_DB.values():
        if can_access_client(client, user):
            if search:
                term = search.lower()
                name_match = term in client["name"].lower()
                ind_match = client.get("industry") and term in client["industry"].lower()
                contact_match = client.get("contact_name") and term in client["contact_name"].lower()
                if not (name_match or ind_match or contact_match):
                    continue
            c_copy = dict(client)
            if c_copy.get("assigned_to"):
                assigned_user = get_user_by_id(c_copy["assigned_to"])
                c_copy["assigned_user_name"] = assigned_user["full_name"] if assigned_user else "Assigned Member"
            results.append(c_copy)
    
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results


def get_client(client_id: str, user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = CLIENTS_DB.get(client_id)
    if not client or not can_access_client(client, user):
        return None
    
    c_copy = dict(client)
    if c_copy.get("assigned_to"):
        assigned_user = get_user_by_id(c_copy["assigned_to"])
        c_copy["assigned_user_name"] = assigned_user["full_name"] if assigned_user else "Assigned Member"
    
    linked_projects = [
        p for p in PROJECTS_DB.values()
        if p.get("client_id") == client_id and can_access_project(p, user)
    ]
    c_copy["projects"] = linked_projects
    return c_copy


def update_client(client_id: str, data: Dict[str, Any], user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = CLIENTS_DB.get(client_id)
    if not client or not can_access_client(client, user):
        return None
    
    for field in ["name", "industry", "brand_color", "logo_url", "contact_name", "contact_email", "contact_phone", "assigned_to"]:
        if field in data and data[field] is not None:
            client[field] = data[field]
            
    client["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return client


def delete_client(client_id: str, user: Dict[str, Any]) -> bool:
    client = CLIENTS_DB.get(client_id)
    if not client or not can_access_client(client, user):
        return False
    
    # Cascade projects & their tasks
    projects_to_delete = [pid for pid, p in PROJECTS_DB.items() if p.get("client_id") == client_id]
    for pid in projects_to_delete:
        tasks_to_delete = [tid for tid, t in TASKS_DB.items() if t.get("project_id") == pid]
        for tid in tasks_to_delete:
            del TASKS_DB[tid]
            if tid in TASK_DEPENDENCIES_DB:
                del TASK_DEPENDENCIES_DB[tid]
        del PROJECTS_DB[pid]
        
    del CLIENTS_DB[client_id]
    return True


# ── Projects CRUD with RLS ───────────────────────────────────────────────────
def can_access_project(project: Dict[str, Any], user: Dict[str, Any]) -> bool:
    if project.get("organization_id") != user.get("organization_id"):
        return False
    if user.get("role") == "owner":
        return True
    
    if project.get("assigned_to") == user.get("id"):
        return True
        
    client = CLIENTS_DB.get(project.get("client_id"))
    if client and client.get("assigned_to") == user.get("id"):
        return True
        
    return False


def create_project(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    client_id = data["client_id"]
    client = CLIENTS_DB.get(client_id)
    if not client or not can_access_client(client, user):
        raise ValueError("Client not found or inaccessible")
        
    project_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    assigned_to = data.get("assigned_to")
    if user.get("role") == "member" and not assigned_to:
        assigned_to = user.get("id")

    project = {
        "id": project_id,
        "organization_id": user.get("organization_id", "00000000-0000-0000-0000-000000000001"),
        "client_id": client_id,
        "client_name": client["name"],
        "name": data["name"],
        "description": data.get("description", ""),
        "status": data.get("status", "active"),
        "retainer_amount": float(data.get("retainer_amount", 0.0)),
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "assigned_to": assigned_to,
        "created_at": now,
        "updated_at": now,
    }
    PROJECTS_DB[project_id] = project
    return project


def list_projects(
    user: Dict[str, Any],
    client_id: Optional[str] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    results = []
    for project in PROJECTS_DB.values():
        if can_access_project(project, user):
            if client_id and project.get("client_id") != client_id:
                continue
            if status and project.get("status") != status:
                continue
            p_copy = dict(project)
            client = CLIENTS_DB.get(p_copy.get("client_id"))
            if client:
                p_copy["client_name"] = client["name"]
                p_copy["client_brand_color"] = client.get("brand_color", "#8b5cf6")
            
            # Attach progress calculation
            progress_info = get_project_progress(p_copy["id"], user)
            p_copy["progress_percentage"] = progress_info["progress_percentage"]
            p_copy["task_count"] = progress_info["total_tasks"]
            results.append(p_copy)
            
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results


def get_project(project_id: str, user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    project = PROJECTS_DB.get(project_id)
    if not project or not can_access_project(project, user):
        return None
    
    p_copy = dict(project)
    client = CLIENTS_DB.get(p_copy.get("client_id"))
    if client:
        p_copy["client_name"] = client["name"]
        p_copy["client_brand_color"] = client.get("brand_color", "#8b5cf6")
        p_copy["client_industry"] = client.get("industry")
        
    progress_info = get_project_progress(project_id, user)
    p_copy["progress_percentage"] = progress_info["progress_percentage"]
    p_copy["task_count"] = progress_info["total_tasks"]
    return p_copy


def update_project(project_id: str, data: Dict[str, Any], user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    project = PROJECTS_DB.get(project_id)
    if not project or not can_access_project(project, user):
        return None
        
    for field in ["name", "description", "status", "retainer_amount", "start_date", "end_date", "assigned_to"]:
        if field in data and data[field] is not None:
            if field == "retainer_amount":
                project[field] = float(data[field])
            else:
                project[field] = data[field]
                
    project["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return project


def delete_project(project_id: str, user: Dict[str, Any]) -> bool:
    project = PROJECTS_DB.get(project_id)
    if not project or not can_access_project(project, user):
        return False
        
    tasks_to_delete = [tid for tid, t in TASKS_DB.items() if t.get("project_id") == project_id]
    for tid in tasks_to_delete:
        del TASKS_DB[tid]
        if tid in TASK_DEPENDENCIES_DB:
            del TASK_DEPENDENCIES_DB[tid]
            
    del PROJECTS_DB[project_id]
    return True


# ── Tasks CRUD, Dependencies, Events, and Progress ───────────────────────────
def can_access_task(task: Dict[str, Any], user: Dict[str, Any]) -> bool:
    """RLS check: Owner sees all tasks in org. Member sees tasks assigned to them or their assigned projects."""
    if task.get("org_id") != user.get("organization_id"):
        return False
    if user.get("role") == "owner":
        return True
    if task.get("assigned_to") == user.get("id"):
        return True
    project = PROJECTS_DB.get(task.get("project_id"))
    if project and can_access_project(project, user):
        return True
    return False


def log_task_event(
    task_id: str,
    event_type: str,
    actor_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    event = {
        "id": str(uuid.uuid4()),
        "task_id": task_id,
        "event_type": event_type,
        "actor_id": actor_id,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "metadata": metadata or {}
    }
    TASK_EVENTS_DB.append(event)
    return event


def create_task(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    project_id = data["project_id"]
    project = PROJECTS_DB.get(project_id)
    if not project or not can_access_project(project, user):
        raise ValueError("Project not found or inaccessible")

    task_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    status = data.get("status", "pending")
    priority = data.get("priority", "medium")

    assigned_to = data.get("assigned_to")
    if user.get("role") == "member" and not assigned_to:
        assigned_to = user.get("id")

    task = {
        "id": task_id,
        "org_id": user.get("organization_id", "00000000-0000-0000-0000-000000000001"),
        "project_id": project_id,
        "project_name": project["name"],
        "title": data["title"],
        "description": data.get("description", ""),
        "status": status,
        "priority": priority,
        "assigned_to": assigned_to,
        "due_date": data.get("due_date"),
        "progress_percentage": STATUS_PROGRESS.get(status, 0),
        "created_at": now,
        "updated_at": now,
    }
    TASKS_DB[task_id] = task

    # Save dependencies
    dependencies = data.get("dependencies", [])
    if dependencies:
        TASK_DEPENDENCIES_DB[task_id] = list(dependencies)
    else:
        TASK_DEPENDENCIES_DB[task_id] = []

    # Log task creation event
    log_task_event(
        task_id=task_id,
        event_type="task_created",
        actor_id=user.get("id"),
        metadata={"title": task["title"], "status": status, "priority": priority}
    )

    t_copy = dict(task)
    t_copy["dependencies"] = TASK_DEPENDENCIES_DB[task_id]
    if assigned_to:
        u = get_user_by_id(assigned_to)
        t_copy["assigned_user_name"] = u["full_name"] if u else "Assigned Member"
    return t_copy


def list_tasks(
    user: Dict[str, Any],
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None
) -> List[Dict[str, Any]]:
    results = []
    for task in TASKS_DB.values():
        if can_access_task(task, user):
            if project_id and task.get("project_id") != project_id:
                continue
            if status and task.get("status") != status:
                continue
            if priority and task.get("priority") != priority:
                continue
            if assigned_to and task.get("assigned_to") != assigned_to:
                continue
                
            t_copy = dict(task)
            t_copy["progress_percentage"] = STATUS_PROGRESS.get(t_copy.get("status", "pending"), 0)
            t_copy["dependencies"] = TASK_DEPENDENCIES_DB.get(t_copy["id"], [])
            
            # Project name
            p = PROJECTS_DB.get(t_copy.get("project_id"))
            if p:
                t_copy["project_name"] = p["name"]
                
            # Assigned user name
            if t_copy.get("assigned_to"):
                u = get_user_by_id(t_copy["assigned_to"])
                t_copy["assigned_user_name"] = u["full_name"] if u else "Assigned Member"
                
            results.append(t_copy)
            
    # Sort by created_at desc
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results


def get_task(task_id: str, user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    task = TASKS_DB.get(task_id)
    if not task or not can_access_task(task, user):
        return None

    t_copy = dict(task)
    t_copy["progress_percentage"] = STATUS_PROGRESS.get(t_copy.get("status", "pending"), 0)
    t_copy["dependencies"] = TASK_DEPENDENCIES_DB.get(task_id, [])

    p = PROJECTS_DB.get(t_copy.get("project_id"))
    if p:
        t_copy["project_name"] = p["name"]

    if t_copy.get("assigned_to"):
        u = get_user_by_id(t_copy["assigned_to"])
        t_copy["assigned_user_name"] = u["full_name"] if u else "Assigned Member"

    # Fetch event history
    events = [e for e in TASK_EVENTS_DB if e.get("task_id") == task_id]
    events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    t_copy["events"] = events

    # Fetch approvals
    approvals = [a for a in TASK_APPROVALS_DB if a.get("task_id") == task_id]
    t_copy["approvals"] = approvals

    return t_copy


def update_task(task_id: str, data: Dict[str, Any], user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    task = TASKS_DB.get(task_id)
    if not task or not can_access_task(task, user):
        return None

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    old_status = task.get("status")

    # Status change
    if "status" in data and data["status"] and data["status"] != old_status:
        new_status = data["status"]
        task["status"] = new_status
        task["progress_percentage"] = STATUS_PROGRESS.get(new_status, 0)
        log_task_event(
            task_id=task_id,
            event_type="status_change",
            actor_id=user.get("id"),
            metadata={
                "old_status": old_status,
                "new_status": new_status,
                "progress_percentage": task["progress_percentage"]
            }
        )

    # Priority change
    if "priority" in data and data["priority"] and data["priority"] != task.get("priority"):
        log_task_event(
            task_id=task_id,
            event_type="priority_change",
            actor_id=user.get("id"),
            metadata={"old_priority": task.get("priority"), "new_priority": data["priority"]}
        )
        task["priority"] = data["priority"]

    # Assignee change
    if "assigned_to" in data and data["assigned_to"] != task.get("assigned_to"):
        log_task_event(
            task_id=task_id,
            event_type="assignment_change",
            actor_id=user.get("id"),
            metadata={"assigned_to": data["assigned_to"]}
        )
        task["assigned_to"] = data["assigned_to"]

    # Other updatable fields
    for field in ["title", "description", "due_date"]:
        if field in data and data[field] is not None:
            task[field] = data[field]

    # Dependencies update
    if "dependencies" in data and data["dependencies"] is not None:
        TASK_DEPENDENCIES_DB[task_id] = list(data["dependencies"])
        log_task_event(
            task_id=task_id,
            event_type="dependencies_updated",
            actor_id=user.get("id"),
            metadata={"dependencies": list(data["dependencies"])}
        )

    task["updated_at"] = now
    return get_task(task_id, user)


def delete_task(task_id: str, user: Dict[str, Any]) -> bool:
    task = TASKS_DB.get(task_id)
    if not task or not can_access_task(task, user):
        return False

    if task_id in TASK_DEPENDENCIES_DB:
        del TASK_DEPENDENCIES_DB[task_id]

    del TASKS_DB[task_id]
    return True


def get_project_progress(project_id: str, user: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate weighted project progress based on constituent tasks."""
    project = PROJECTS_DB.get(project_id)
    if not project or not can_access_project(project, user):
        return {"project_id": project_id, "total_tasks": 0, "completed_tasks": 0, "progress_percentage": 0.0}

    tasks = [t for t in TASKS_DB.values() if t.get("project_id") == project_id and can_access_task(t, user)]
    total_tasks = len(tasks)
    if total_tasks == 0:
        return {"project_id": project_id, "total_tasks": 0, "completed_tasks": 0, "progress_percentage": 0.0}

    completed_tasks = sum(1 for t in tasks if t.get("status") == "completed")
    total_score = sum(STATUS_PROGRESS.get(t.get("status", "pending"), 0) for t in tasks)
    progress_percentage = round(total_score / total_tasks, 1)

    return {
        "project_id": project_id,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "progress_percentage": progress_percentage
    }


# ── Dashboard Stats ──────────────────────────────────────────────────────────
def get_dashboard_stats(user: Dict[str, Any]) -> Dict[str, Any]:
    accessible_clients = [c for c in CLIENTS_DB.values() if can_access_client(c, user)]
    accessible_projects = [p for p in PROJECTS_DB.values() if can_access_project(p, user)]
    accessible_tasks = [t for t in TASKS_DB.values() if can_access_task(t, user)]
    
    active_projects = [p for p in accessible_projects if p.get("status") == "active"]
    total_retainer = sum(float(p.get("retainer_amount", 0.0)) for p in active_projects)
    
    recent_clients = sorted(accessible_clients, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    
    recent_projects = sorted(accessible_projects, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    for p in recent_projects:
        cl = CLIENTS_DB.get(p.get("client_id"))
        p["client_name"] = cl["name"] if cl else "Unknown Client"
        p["client_brand_color"] = cl.get("brand_color", "#8b5cf6") if cl else "#8b5cf6"
        prog = get_project_progress(p["id"], user)
        p["progress_percentage"] = prog["progress_percentage"]

    return {
        "total_clients": len(accessible_clients),
        "active_projects": len(active_projects),
        "total_projects": len(accessible_projects),
        "total_retainer": total_retainer,
        "total_tasks": len(accessible_tasks),
        "recent_clients": recent_clients,
        "recent_projects": recent_projects
    }


# ── Milestone 4: Deliverables CRUD ───────────────────────────────────────────
def can_access_deliverable(deliverable: Dict[str, Any], user: Dict[str, Any]) -> bool:
    if deliverable.get("organization_id") != user.get("organization_id"):
        return False
    if user.get("role") == "owner":
        return True
    proj_id = deliverable.get("project_id")
    if proj_id and proj_id in PROJECTS_DB:
        return can_access_project(PROJECTS_DB[proj_id], user)
    return True


def create_deliverable(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    org_id = user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    deliv_id = data.get("id") or str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    deliverable = {
        "id": deliv_id,
        "organization_id": org_id,
        "project_id": data.get("project_id"),
        "task_id": data.get("task_id"),
        "agent_id": data["agent_id"],
        "agent_name": data["agent_name"],
        "title": data["title"],
        "file_type": data.get("file_type", "json"),
        "file_url": data.get("file_url", f"/storage/deliverables/{deliv_id}.json"),
        "content_json": data.get("content_json", {}),
        "raw_content": data.get("raw_content", ""),
        "quality_score": data.get("quality_score", 95),
        "status": data.get("status", "delivered"),
        "created_at": data.get("created_at") or now,
        "updated_at": now,
    }
    DELIVERABLES_DB[deliv_id] = deliverable
    
    # Also log to task_events if linked to a task
    if deliverable.get("task_id") and deliverable["task_id"] in TASKS_DB:
        log_task_event(
            task_id=deliverable["task_id"],
            event_type="deliverable_produced",
            actor_id=user.get("id"),
            metadata={
                "deliverable_id": deliv_id,
                "agent_id": deliverable["agent_id"],
                "title": deliverable["title"],
                "quality_score": deliverable["quality_score"],
            }
        )
        
    return dict(deliverable)


def list_deliverables(
    user: Dict[str, Any],
    project_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    task_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    results = []
    for d in DELIVERABLES_DB.values():
        if can_access_deliverable(d, user):
            if project_id and d.get("project_id") != project_id:
                continue
            if agent_id and d.get("agent_id") != agent_id:
                continue
            if task_id and d.get("task_id") != task_id:
                continue
            d_copy = dict(d)
            if d.get("project_id") and d["project_id"] in PROJECTS_DB:
                d_copy["project_name"] = PROJECTS_DB[d["project_id"]]["name"]
            results.append(d_copy)
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results


def get_deliverable(deliverable_id: str, user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    d = DELIVERABLES_DB.get(deliverable_id)
    if not d or not can_access_deliverable(d, user):
        return None
    d_copy = dict(d)
    if d.get("project_id") and d["project_id"] in PROJECTS_DB:
        d_copy["project_name"] = PROJECTS_DB[d["project_id"]]["name"]
    return d_copy


def update_deliverable(
    deliverable_id: str,
    updates: Dict[str, Any],
    user: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    d = DELIVERABLES_DB.get(deliverable_id)
    if not d or not can_access_deliverable(d, user):
        return None
        
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for k, v in updates.items():
        if k in ["title", "status", "quality_score", "raw_content", "content_json"]:
            d[k] = v
    d["updated_at"] = now
    
    d_copy = dict(d)
    if d.get("project_id") and d["project_id"] in PROJECTS_DB:
        d_copy["project_name"] = PROJECTS_DB[d["project_id"]]["name"]
    return d_copy


# ── Milestone 5: Workflows & Execution Logs CRUD ─────────────────────────────
def can_access_workflow(wf: Dict[str, Any], user: Dict[str, Any]) -> bool:
    if wf.get("org_id") != user.get("organization_id"):
        return False
    if user.get("role") == "owner":
        return True
    proj_id = wf.get("project_id")
    if proj_id and proj_id in PROJECTS_DB:
        return can_access_project(PROJECTS_DB[proj_id], user)
    return True


def create_workflow(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    wf_id = data.get("id") or str(uuid.uuid4())
    org_id = user.get("organization_id", "00000000-0000-0000-0000-000000000001")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    wf = {
        "id": wf_id,
        "org_id": org_id,
        "project_id": data.get("project_id"),
        "user_request": data["user_request"],
        "status": data.get("status", "planning"),
        "compiled_deliverable_id": None,
        "created_at": now,
        "completed_at": None,
    }
    WORKFLOWS_DB[wf_id] = wf
    
    # Log workflow initialization
    log_execution(
        workflow_id=wf_id,
        step_id=None,
        event_type="workflow_created",
        message="Workflow initialized by Om Samah CEO Orchestrator",
        metadata={"user_request": wf["user_request"]}
    )
    
    wf_copy = dict(wf)
    if wf.get("project_id") and wf["project_id"] in PROJECTS_DB:
        wf_copy["project_name"] = PROJECTS_DB[wf["project_id"]]["name"]
    wf_copy["steps"] = []
    return wf_copy


def get_workflow(workflow_id: str, user: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    wf = WORKFLOWS_DB.get(workflow_id)
    if not wf:
        return None
    if user and not can_access_workflow(wf, user):
        return None
        
    wf_copy = dict(wf)
    if wf.get("project_id") and wf["project_id"] in PROJECTS_DB:
        wf_copy["project_name"] = PROJECTS_DB[wf["project_id"]]["name"]
    wf_copy["steps"] = get_workflow_steps(workflow_id)
    return wf_copy


def list_workflows(user: Dict[str, Any], project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    results = []
    for wf in WORKFLOWS_DB.values():
        if can_access_workflow(wf, user):
            if project_id and wf.get("project_id") != project_id:
                continue
            wf_copy = dict(wf)
            if wf.get("project_id") and wf["project_id"] in PROJECTS_DB:
                wf_copy["project_name"] = PROJECTS_DB[wf["project_id"]]["name"]
            wf_copy["steps"] = get_workflow_steps(wf["id"])
            results.append(wf_copy)
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results


def update_workflow(workflow_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    wf = WORKFLOWS_DB.get(workflow_id)
    if not wf:
        return None
    for k, v in updates.items():
        if k in ["status", "compiled_deliverable_id", "completed_at"]:
            wf[k] = v
    wf_copy = dict(wf)
    if wf.get("project_id") and wf["project_id"] in PROJECTS_DB:
        wf_copy["project_name"] = PROJECTS_DB[wf["project_id"]]["name"]
    wf_copy["steps"] = get_workflow_steps(workflow_id)
    return wf_copy


def create_workflow_step(data: Dict[str, Any]) -> Dict[str, Any]:
    step_id = data.get("id") or str(uuid.uuid4())
    step = {
        "id": step_id,
        "workflow_id": data["workflow_id"],
        "step_order": data.get("step_order", 0),
        "task_id": data.get("task_id"),
        "assigned_agent_id": data["assigned_agent_id"],
        "assigned_agent_name": data["assigned_agent_name"],
        "title": data["title"],
        "status": data.get("status", "pending"),
        "depends_on": data.get("depends_on", []),
        "input": data.get("input", {}),
        "output": data.get("output", {}),
        "quality_score": data.get("quality_score", 95),
        "requires_approval": data.get("requires_approval", False),
        "approval_status": data.get("approval_status", "none"),
        "approval_notes": data.get("approval_notes"),
        "retry_count": data.get("retry_count", 0),
        "deliverable_id": data.get("deliverable_id"),
        "started_at": data.get("started_at"),
        "completed_at": data.get("completed_at"),
    }
    WORKFLOW_STEPS_DB[step_id] = step
    return dict(step)


def get_workflow_steps(workflow_id: str) -> List[Dict[str, Any]]:
    steps = [dict(s) for s in WORKFLOW_STEPS_DB.values() if s.get("workflow_id") == workflow_id]
    steps.sort(key=lambda x: x.get("step_order", 0))
    return steps


def get_workflow_step(step_id: str) -> Optional[Dict[str, Any]]:
    s = WORKFLOW_STEPS_DB.get(step_id)
    return dict(s) if s else None


def update_workflow_step(step_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    step = WORKFLOW_STEPS_DB.get(step_id)
    if not step:
        return None
    for k, v in updates.items():
        if k in [
            "status", "output", "input", "quality_score", "approval_status",
            "approval_notes", "retry_count", "deliverable_id", "started_at", "completed_at"
        ]:
            step[k] = v
    return dict(step)


def log_execution(
    workflow_id: str,
    step_id: Optional[str],
    event_type: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    log_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    entry = {
        "id": log_id,
        "workflow_id": workflow_id,
        "step_id": step_id,
        "event_type": event_type,
        "message": message,
        "metadata": metadata or {},
        "timestamp": now,
    }
    EXECUTION_LOGS_DB.append(entry)
    return entry


def get_execution_logs(workflow_id: str) -> List[Dict[str, Any]]:
    logs = [dict(l) for l in EXECUTION_LOGS_DB if l.get("workflow_id") == workflow_id]
    logs.sort(key=lambda x: x.get("timestamp", ""))
    return logs



