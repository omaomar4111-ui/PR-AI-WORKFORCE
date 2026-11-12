import hashlib
import hmac
import base64
import json
import time
from typing import Optional, Dict, Any
from config import settings

def validate_password_strength(password: str) -> None:
    """
    Enforces strong password policy:
    - Minimum 8 characters
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one numeric digit (0-9)
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not any(c.isupper() for c in password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must contain at least one numeric digit")


def create_jwt_token(payload: Dict[str, Any], expires_in: Optional[int] = None) -> str:
    """Generates an HMAC-SHA256 signed JWT access token (defaults to config.ACCESS_TOKEN_EXPIRE_SECONDS)."""
    if expires_in is None:
        expires_in = getattr(settings, "ACCESS_TOKEN_EXPIRE_SECONDS", 900)
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload_copy = {**payload, "iat": now, "exp": now + expires_in}
    
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload_copy).encode()).decode().rstrip("=")
    
    signature = hmac.new(
        settings.APP_SECRET.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def create_refresh_token(payload: Dict[str, Any], expires_in: Optional[int] = None) -> str:
    """Generates an HMAC-SHA256 signed JWT refresh token (defaults to config.REFRESH_TOKEN_EXPIRE_SECONDS: 7 days)."""
    if expires_in is None:
        expires_in = getattr(settings, "REFRESH_TOKEN_EXPIRE_SECONDS", 86400 * 7)
    return create_jwt_token({**payload, "token_type": "refresh"}, expires_in=expires_in)


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies JWT signature and expiry. Returns decoded claims dict if valid."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        
        # Verify signature
        expected_sig = hmac.new(
            settings.APP_SECRET.encode(),
            f"{header_b64}.{payload_b64}".encode(),
            hashlib.sha256
        ).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")
        
        if not hmac.compare_digest(sig_b64, expected_b64):
            return None
        
        # Pad payload base64 if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding
            
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        if payload.get("exp", 0) < int(time.time()):
            return None
            
        return payload
    except Exception:
        return None


try:
    from argon2 import PasswordHasher
    _hasher = PasswordHasher()
except ImportError:
    _hasher = None


def hash_password(password: str) -> str:
    """Hashes password using Argon2id with default secure parameters."""
    if _hasher is not None:
        return _hasher.hash(password)
    salt = settings.APP_SECRET[:16]
    return f"sha256${hashlib.sha256((salt + password).encode()).hexdigest()}"


def verify_password(stored_password: str, provided_password: str) -> bool:
    """Verifies password against Argon2id hash, salted sha256, or legacy plain text."""
    if not stored_password or not provided_password:
        return False
    if stored_password.startswith("$argon2"):
        if _hasher is None:
            return False
        try:
            return _hasher.verify(stored_password, provided_password)
        except Exception:
            return False
    if stored_password.startswith("sha256$"):
        salt = settings.APP_SECRET[:16]
        expected = f"sha256${hashlib.sha256((salt + provided_password).encode()).hexdigest()}"
        return hmac.compare_digest(stored_password, expected)
    return hmac.compare_digest(stored_password, provided_password)


def create_password_reset_token(email: str, expires_in_seconds: int = 900) -> str:
    """Generates a signed, single-use password reset token with 15-minute expiration."""
    now = int(time.time())
    payload = {
        "email": email.strip().lower(),
        "action": "password_reset",
        "iat": now,
        "exp": now + expires_in_seconds,
    }
    return create_jwt_token(payload, expires_in=expires_in_seconds)


def verify_password_reset_token(token: str) -> Optional[str]:
    """Verifies single-use password reset token and returns email if valid."""
    payload = verify_jwt_token(token)
    if not payload:
        return None
    if payload.get("action") != "password_reset":
        return None
    return payload.get("email")
