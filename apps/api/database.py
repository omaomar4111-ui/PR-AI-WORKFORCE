from typing import Optional, Dict, Any, List
import datetime
import uuid

# In-memory storage for test/dev fallback
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

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    norm_email = email.strip().lower()
    return MOCK_USERS.get(norm_email)

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    for user in MOCK_USERS.values():
        if user["id"] == user_id:
            return user
    return None

def create_user(email: str, password: str, full_name: str, role: str = "member", org_id: str = "00000000-0000-0000-0000-000000000001") -> Dict[str, Any]:
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
