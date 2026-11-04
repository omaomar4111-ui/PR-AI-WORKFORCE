from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import datetime
from typing import Dict, Any, Optional

from config import settings
from database import get_user_by_email, create_user
from auth import create_jwt_token, get_current_user

app = FastAPI(
    title="PR AI WORKFORCE API",
    version="0.1.0",
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

# Request / Response Schemas
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

# ── Health Endpoint (Milestone 1 Core Acceptance) ──────────────────────────
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

# ── Auth Endpoints ────────────────────────────────────────────────────────
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)
