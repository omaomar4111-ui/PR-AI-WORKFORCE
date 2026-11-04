from typing import Optional, Dict, Any, List
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


def reset_db_for_tests():
    """Helper for clean unit tests."""
    CLIENTS_DB.clear()
    PROJECTS_DB.clear()


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
    """RLS check: Owner sees all in their org. Member sees only assigned clients."""
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
        # Default self-assignment for members
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
            # Attach assigned user info for UI
            c_copy = dict(client)
            if c_copy.get("assigned_to"):
                assigned_user = get_user_by_id(c_copy["assigned_to"])
                c_copy["assigned_user_name"] = assigned_user["full_name"] if assigned_user else "Assigned Member"
            results.append(c_copy)
    
    # Sort by created_at desc
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
    
    # Fetch linked projects
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
    
    # Allowed update fields
    for field in ["name", "industry", "brand_color", "logo_url", "contact_name", "contact_email", "contact_phone", "assigned_to"]:
        if field in data and data[field] is not None:
            client[field] = data[field]
            
    client["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return client


def delete_client(client_id: str, user: Dict[str, Any]) -> bool:
    client = CLIENTS_DB.get(client_id)
    if not client or not can_access_client(client, user):
        return False
    
    # Delete cascaded projects
    projects_to_delete = [pid for pid, p in PROJECTS_DB.items() if p.get("client_id") == client_id]
    for pid in projects_to_delete:
        del PROJECTS_DB[pid]
        
    del CLIENTS_DB[client_id]
    return True


# ── Projects CRUD with RLS ───────────────────────────────────────────────────
def can_access_project(project: Dict[str, Any], user: Dict[str, Any]) -> bool:
    """RLS check: Owner sees all projects in org. Member sees assigned project or project for assigned client."""
    if project.get("organization_id") != user.get("organization_id"):
        return False
    if user.get("role") == "owner":
        return True
    
    # Direct project assignment
    if project.get("assigned_to") == user.get("id"):
        return True
        
    # Or client assignment
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
            # Ensure fresh client_name
            client = CLIENTS_DB.get(p_copy.get("client_id"))
            if client:
                p_copy["client_name"] = client["name"]
                p_copy["client_brand_color"] = client.get("brand_color", "#8b5cf6")
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
        
    del PROJECTS_DB[project_id]
    return True


# ── Dashboard Stats ──────────────────────────────────────────────────────────
def get_dashboard_stats(user: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate real stats from database based on user's organization and RLS."""
    accessible_clients = [c for c in CLIENTS_DB.values() if can_access_client(c, user)]
    accessible_projects = [p for p in PROJECTS_DB.values() if can_access_project(p, user)]
    
    active_projects = [p for p in accessible_projects if p.get("status") == "active"]
    total_retainer = sum(float(p.get("retainer_amount", 0.0)) for p in active_projects)
    
    # Recent clients (latest 5)
    recent_clients = sorted(accessible_clients, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    
    # Recent projects (latest 5)
    recent_projects = sorted(accessible_projects, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    for p in recent_projects:
        cl = CLIENTS_DB.get(p.get("client_id"))
        p["client_name"] = cl["name"] if cl else "Unknown Client"
        p["client_brand_color"] = cl.get("brand_color", "#8b5cf6") if cl else "#8b5cf6"

    return {
        "total_clients": len(accessible_clients),
        "active_projects": len(active_projects),
        "total_projects": len(accessible_projects),
        "total_retainer": total_retainer,
        "recent_clients": recent_clients,
        "recent_projects": recent_projects
    }
