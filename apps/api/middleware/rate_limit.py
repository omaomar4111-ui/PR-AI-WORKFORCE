import time
import json
import logging
from typing import Dict, List, Optional, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("rate_limit")

# In-memory sliding window cache: key -> list of float timestamps
_MEMORY_RATE_LIMITS: Dict[str, List[float]] = {}
# In-memory failed attempts tracking: ip -> list of failed attempt timestamps
_MEMORY_FAILED_LOGINS: Dict[str, List[float]] = {}
# In-memory locked IPs: ip -> lock expiry timestamp
_MEMORY_LOCKED_IPS: Dict[str, float] = {}

RATE_LIMIT_ENABLED = True
AUTH_LOCKOUT_THRESHOLD = 10
AUTH_LOCKOUT_SECONDS = 900.0  # 15 minutes


def reset_rate_limits():
    """Clears all in-memory rate limiting and lockout counters (used in unit tests)."""
    global _MEMORY_RATE_LIMITS, _MEMORY_FAILED_LOGINS, _MEMORY_LOCKED_IPS
    _MEMORY_RATE_LIMITS.clear()
    _MEMORY_FAILED_LOGINS.clear()
    _MEMORY_LOCKED_IPS.clear()


async def check_lockout(client_ip: str) -> Tuple[bool, int]:
    """
    Checks if client IP is locked out due to excessive failed attempts.
    Checks memory first, then Redis for production environments.
    """
    now = time.time()
    lock_exp = _MEMORY_LOCKED_IPS.get(client_ip)
    if lock_exp and lock_exp > now:
        return True, max(1, int(lock_exp - now))
    elif lock_exp:
        del _MEMORY_LOCKED_IPS[client_ip]

    if client_ip != "testclient":
        try:
            from cache import get_redis_client
            redis = await get_redis_client()
            if redis:
                lock_key = f"rl:auth:lockout:{client_ip}"
                ttl = await redis.ttl(lock_key)
                if ttl and ttl > 0:
                    return True, ttl
        except Exception as e:
            logger.debug(f"Redis lockout check fallback: {e}")

    return False, 0


async def record_failed_login(client_ip: str) -> bool:
    """
    Records a failed login attempt for client IP.
    Locks out for 15 minutes if 10 failed attempts threshold is reached.
    """
    now = time.time()
    cutoff = now - AUTH_LOCKOUT_SECONDS

    attempts = _MEMORY_FAILED_LOGINS.get(client_ip, [])
    attempts = [ts for ts in attempts if ts > cutoff]
    attempts.append(now)
    _MEMORY_FAILED_LOGINS[client_ip] = attempts

    locked = len(attempts) >= AUTH_LOCKOUT_THRESHOLD
    if locked:
        _MEMORY_LOCKED_IPS[client_ip] = now + AUTH_LOCKOUT_SECONDS

    if client_ip != "testclient":
        try:
            from cache import get_redis_client
            redis = await get_redis_client()
            if redis:
                fail_key = f"rl:auth:failed:{client_ip}"
                pipe = redis.pipeline()
                pipe.incr(fail_key)
                pipe.expire(fail_key, int(AUTH_LOCKOUT_SECONDS))
                res = await pipe.execute()
                if res and res[0] >= AUTH_LOCKOUT_THRESHOLD:
                    await redis.set(f"rl:auth:lockout:{client_ip}", "1", ex=int(AUTH_LOCKOUT_SECONDS))
                    locked = True
        except Exception as e:
            logger.debug(f"Redis record failed login fallback: {e}")

    return locked


async def clear_failed_logins(client_ip: str):
    """Clears failed login attempts for client IP on successful login."""
    _MEMORY_FAILED_LOGINS.pop(client_ip, None)
    _MEMORY_LOCKED_IPS.pop(client_ip, None)

    if client_ip != "testclient":
        try:
            from cache import get_redis_client
            redis = await get_redis_client()
            if redis:
                await redis.delete(f"rl:auth:failed:{client_ip}", f"rl:auth:lockout:{client_ip}")
        except Exception:
            pass


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Production Rate Limiting & Account Lockout Middleware.
    Limits:
    - 5 requests/minute for auth endpoints (/auth/login and /auth/register)
    - 15-minute lockout after 10 failed login attempts (backed by Redis + Memory fallback)
    - 10 requests/minute for agent execution endpoints
    - 60 requests/minute for general /api endpoints
    Returns HTTP 429 Too Many Requests with Retry-After header.
    """

    async def dispatch(self, request: Request, call_next):
        if not RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path
        client_ip = request.client.host if request.client else "127.0.0.1"

        # Determine route-specific rate limit
        limit: Optional[int] = None
        category = "general"

        if path.startswith("/api/auth/login") or path.startswith("/api/auth/register"):
            limit = 5
            category = "auth"
        elif "/execute" in path:
            limit = 10
            category = "execute"
        elif path.startswith("/api/") and not path.startswith("/api/docs"):
            limit = 60
            category = "api"

        # Allow tests or internal tasks with explicit bypass header
        if request.headers.get("X-Test-Bypass-Rate-Limit") == "true":
            response = await call_next(request)
            if category == "auth" and path.startswith("/api/auth/login"):
                if response.status_code == 401:
                    await record_failed_login(client_ip)
                elif response.status_code == 200:
                    await clear_failed_logins(client_ip)
            return response

        # Allow automated unit tests to run unthrottled unless explicitly testing rate limits
        is_testclient = request.client and request.client.host == "testclient"
        if is_testclient and request.headers.get("X-Test-Enforce-Rate-Limit") != "true":
            response = await call_next(request)
            if category == "auth" and path.startswith("/api/auth/login"):
                if response.status_code == 401:
                    await record_failed_login(client_ip)
                elif response.status_code == 200:
                    await clear_failed_logins(client_ip)
            return response

        # If not an API endpoint (e.g. /health, /docs, websocket), skip rate limiting
        if limit is None:
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        client_id = f"{client_ip}:{auth_header[-16:]}" if len(auth_header) > 16 else client_ip
        cache_key = f"rl:{category}:{client_id}"

        # Check account lockout for auth category
        if category == "auth":
            is_locked, retry_after_lock = await check_lockout(client_ip)
            if is_locked:
                error_body = json.dumps({
                    "detail": "Account temporarily locked due to excessive failed attempts (10+). Try again in 15 minutes.",
                    "locked": True,
                    "retry_after": retry_after_lock,
                })
                return Response(
                    content=error_body,
                    status_code=429,
                    media_type="application/json",
                    headers={
                        "Retry-After": str(retry_after_lock),
                        "X-RateLimit-Locked": "true",
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                    },
                )

        now = time.time()
        window_seconds = 60.0

        # Retrieve and clean timestamps within window
        timestamps = _MEMORY_RATE_LIMITS.get(cache_key, [])
        cutoff = now - window_seconds
        timestamps = [ts for ts in timestamps if ts > cutoff]

        if len(timestamps) >= limit:
            oldest = timestamps[0]
            retry_after = max(1, int(window_seconds - (now - oldest)))
            error_body = json.dumps({
                "detail": f"Too many requests on {category} endpoint. Rate limit exceeded ({limit}/min).",
                "limit": limit,
                "retry_after": retry_after,
            })
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(oldest + window_seconds)),
            }
            return Response(
                content=error_body,
                status_code=429,
                media_type="application/json",
                headers=headers,
            )

        # Record this request
        timestamps.append(now)
        _MEMORY_RATE_LIMITS[cache_key] = timestamps

        # Process request
        response = await call_next(request)

        # Attach standard rate limit headers
        remaining = max(0, limit - len(timestamps))
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        # Track failed vs successful login attempts for lockout defense
        if category == "auth" and path.startswith("/api/auth/login"):
            if response.status_code == 401:
                await record_failed_login(client_ip)
            elif response.status_code == 200:
                await clear_failed_logins(client_ip)

        return response
