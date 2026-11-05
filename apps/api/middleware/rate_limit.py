import time
import json
from typing import Dict, List, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# In-memory sliding window cache: key -> list of float timestamps
_MEMORY_RATE_LIMITS: Dict[str, List[float]] = {}
RATE_LIMIT_ENABLED = True


def reset_rate_limits():
    """Clears all in-memory rate limiting counters (used in unit tests)."""
    global _MEMORY_RATE_LIMITS
    _MEMORY_RATE_LIMITS.clear()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Production Rate Limiting Middleware.
    Limits:
    - 5 requests/minute for auth endpoints (brute-force defense)
    - 10 requests/minute for agent execution endpoints
    - 60 requests/minute for general /api endpoints
    Returns HTTP 429 Too Many Requests with Retry-After header.
    """

    async def dispatch(self, request: Request, call_next):
        if not RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Allow automated unit tests to run unthrottled unless explicitly testing rate limits
        is_testclient = request.client and request.client.host == "testclient"
        if is_testclient and request.headers.get("X-Test-Enforce-Rate-Limit") != "true":
            return await call_next(request)

        # Allow tests or internal tasks with explicit bypass header
        if request.headers.get("X-Test-Bypass-Rate-Limit") == "true":
            return await call_next(request)

        path = request.url.path

        # Determine route-specific rate limit
        limit: Optional[int] = None
        category = "general"

        if path.startswith("/api/auth/login"):
            limit = 5
            category = "auth"
        elif "/execute" in path:
            limit = 10
            category = "execute"
        elif path.startswith("/api/") and not path.startswith("/api/docs"):
            limit = 60
            category = "api"

        # If not an API endpoint (e.g. /health, /docs, websocket), skip rate limiting
        if limit is None:
            return await call_next(request)

        # Determine client identifier (IP or Authorization user token hash)
        client_ip = request.client.host if request.client else "127.0.0.1"
        auth_header = request.headers.get("Authorization", "")
        client_id = f"{client_ip}:{auth_header[-16:]}" if len(auth_header) > 16 else client_ip
        cache_key = f"rl:{category}:{client_id}"

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

        return response
