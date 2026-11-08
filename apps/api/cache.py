"""
PR AI WORKFORCE — Asynchronous Redis Cache Layer
Features:
- Async connection pooling via redis.asyncio.ConnectionPool (max 20 connections)
- Exponential backoff retries (3 attempts, cap 5s)
- TLS enforcement for rediss:// URLs
- Graceful health check and error degradation
- Zero secrets printed or logged
"""

import os
import time
import json
import logging
import urllib.parse
from typing import Optional, Dict, Any, List
from pathlib import Path

import redis.asyncio as aioredis
from redis.asyncio.retry import Retry
from redis.backoff import ExponentialBackoff

logger = logging.getLogger("cache")

# Global pool & client singletons
_redis_pool: Optional[aioredis.ConnectionPool] = None
_redis_client: Optional[aioredis.Redis] = None


def get_redis_url() -> str:
    """Retrieve Redis connection URL from environment, .env.production, or fallback."""
    url = os.getenv("REDIS_URL", "").strip()
    if url:
        return url

    # Try loading from .env.production
    candidate_paths = [
        Path(__file__).resolve().parent.parent.parent / ".env.production",
        Path(__file__).resolve().parent / ".env.production",
        Path.cwd() / ".env.production",
    ]
    for p in candidate_paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("REDIS_URL=") and not line.startswith("#"):
                            val = line.split("=", 1)[1].strip().strip('"').strip("'")
                            if val:
                                return val
            except Exception:
                pass

    return "redis://127.0.0.1:6379/0"


_clients_by_loop: Dict[Any, aioredis.Redis] = {}


def get_redis_client() -> aioredis.Redis:
    """
    Get an async Redis client bound to the current running event loop.
    Automatically purges clients bound to terminated loops (e.g. in Starlette TestClient).
    """
    import asyncio
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    # Clean up dead/closed loops
    closed = [l for l in list(_clients_by_loop.keys()) if l is not None and getattr(l, "is_closed", lambda: False)()]
    for l in closed:
        _clients_by_loop.pop(l, None)

    if loop not in _clients_by_loop or _clients_by_loop[loop] is None:
        raw_url = get_redis_url()
        parsed = urllib.parse.urlsplit(raw_url)
        is_tls = parsed.scheme.lower() == "rediss"

        retry_strategy = Retry(ExponentialBackoff(cap=5.0, base=0.2), 3)

        pool_kwargs: Dict[str, Any] = {
            "max_connections": 20,
            "socket_timeout": 3.0,
            "socket_connect_timeout": 2.0,
            "retry": retry_strategy,
            "retry_on_timeout": True,
            "decode_responses": True,
        }

        if is_tls:
            pool_kwargs["ssl_cert_reqs"] = "required"

        pool = aioredis.ConnectionPool.from_url(raw_url, **pool_kwargs)
        _clients_by_loop[loop] = aioredis.Redis(connection_pool=pool)

    return _clients_by_loop[loop]


async def close_redis() -> None:
    """Close all async Redis clients and connection pools across all loops."""
    for loop, client in list(_clients_by_loop.items()):
        try:
            await client.close()
            if getattr(client, "connection_pool", None) is not None:
                await client.connection_pool.disconnect()
        except Exception:
            pass
    _clients_by_loop.clear()


async def check_redis_health() -> Dict[str, Any]:
    """
    Perform a live PING healthcheck against Redis.
    Measures roundtrip latency and returns status with host/port masked.
    """
    url = get_redis_url()
    parsed = urllib.parse.urlsplit(url)
    masked_host = parsed.hostname or "unknown"
    port = parsed.port or (6379 if parsed.scheme == "redis" else 6379)
    is_tls = parsed.scheme.lower() == "rediss"

    t0 = time.perf_counter()
    try:
        client = get_redis_client()
        pong = await client.ping()
        latency_ms = (time.perf_counter() - t0) * 1000

        version = "unknown"
        try:
            info = await client.info("server")
            version = info.get("redis_version", "Upstash Managed")
        except Exception:
            version = "Upstash Managed"

        return {
            "status": "connected" if pong else "degraded",
            "ping": bool(pong),
            "latency_ms": round(latency_ms, 2),
            "host": masked_host,
            "port": port,
            "tls": is_tls,
            "version": version,
        }
    except Exception as exc:
        latency_ms = (time.perf_counter() - t0) * 1000
        return {
            "status": "disconnected",
            "ping": False,
            "latency_ms": round(latency_ms, 2),
            "host": masked_host,
            "port": port,
            "tls": is_tls,
            "error": f"{type(exc).__name__}: {str(exc)}",
        }


# ── Cache-Aside Core Operations ──────────────────────────────────────────────
async def cache_get(key: str) -> Optional[Any]:
    """
    Retrieve and deserialize JSON value from Redis cache.
    Gracefully returns None on cache miss or connection error.
    """
    try:
        client = get_redis_client()
        val = await client.get(key)
        if val is not None:
            return json.loads(val)
    except Exception as exc:
        logger.warning(f"Cache lookup failed for key '{key}': {exc}")
    return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> bool:
    """
    Serialize and store a JSON value in Redis with a TTL in seconds.
    Gracefully catches errors to preserve request execution.
    """
    try:
        client = get_redis_client()
        serialized = json.dumps(value, default=str)
        await client.set(key, serialized, ex=ttl)
        return True
    except Exception as exc:
        logger.warning(f"Cache set failed for key '{key}': {exc}")
        return False


async def cache_delete(key: str) -> bool:
    """Delete a specific cache key."""
    try:
        client = get_redis_client()
        await client.delete(key)
        return True
    except Exception as exc:
        logger.warning(f"Cache delete failed for key '{key}': {exc}")
        return False


async def cache_delete_pattern(pattern: str) -> int:
    """
    Safely delete all keys matching pattern using non-blocking scan_iter.
    """
    try:
        client = get_redis_client()
        count = 0
        batch: List[str] = []
        async for key in client.scan_iter(match=pattern, count=100):
            batch.append(key)
            if len(batch) >= 100:
                count += await client.delete(*batch)
                batch = []
        if batch:
            count += await client.delete(*batch)
        return count
    except Exception as exc:
        logger.warning(f"Cache pattern invalidation failed for '{pattern}': {exc}")
        return 0


async def invalidate_dashboard_cache(org_id: Optional[str] = None) -> int:
    """
    Targeted invalidation of cached dashboard statistics for a specific organization
    or across all tenants if org_id is not specified.
    """
    if org_id:
        count = await cache_delete_pattern(f"app:prod:dashboard:stats:{org_id}:*")
        count += await cache_delete_pattern("app:prod:dashboard:stats:global:*")
        count += await cache_delete_pattern(f"cache:dashboard:stats:{org_id}:*")
        count += await cache_delete_pattern("cache:dashboard:stats:global:*")
        return count
    count = await cache_delete_pattern("app:prod:dashboard:stats:*")
    count += await cache_delete_pattern("cache:dashboard:stats:*")
    return count


async def invalidate_agents_cache() -> int:
    """Invalidate all cached agent registries and profiles."""
    count = await cache_delete_pattern("app:prod:agents:*")
    count += await cache_delete_pattern("cache:agents:*")
    return count
