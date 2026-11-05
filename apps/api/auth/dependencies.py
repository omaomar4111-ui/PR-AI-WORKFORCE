from typing import Optional, Dict, Any, List
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.tokens import verify_jwt_token
from database import get_user_by_id

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Dict[str, Any]:
    """Validates Bearer token and returns active user account."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication credentials were not provided"
        )
    
    token = credentials.credentials
    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
        
    user_id = payload.get("sub")
    user = get_user_by_id(user_id)
    if not user or not user.get("is_active"):
        raise HTTPException(
            status_code=401,
            detail="User account is inactive or not found"
        )
        
    return user


def require_role(allowed_roles: List[str]):
    """
    Enforces Role-Based Access Control (RBAC).
    Raises HTTP 403 Forbidden if current user's role is not within allowed_roles.
    """
    async def role_checker(
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        user_role = current_user.get("role", "member")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access forbidden: requires one of {allowed_roles}, but current role is '{user_role}'"
            )
        return current_user
    return role_checker


async def require_org_member(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Ensures user belongs to a valid tenant organization."""
    if not current_user.get("organization_id"):
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: user is not assigned to an active organization"
        )
    return current_user
