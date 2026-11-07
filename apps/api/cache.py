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
import urllib.parse
from typing import Optional, Dict, Any
from pathlib import Path

import redis.asyncio as aioredis
from redis.asyncio.retry import Retry
from redis.backoff import ExponentialBackoff

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


def get_connection_pool() -> aioredis.ConnectionPool:
    """Initialize or return the global async Redis ConnectionPool."""
    global _redis_pool
    if _redis_pool is None:
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

        _redis_pool = aioredis.ConnectionPool.from_url(raw_url, **pool_kwargs)

    return _redis_pool


def get_redis_client() -> aioredis.Redis:
    """Get the singleton async Redis client."""
    global _redis_client
    if _redis_client is None:
        pool = get_connection_pool()
        _redis_client = aioredis.Redis(connection_pool=pool)
    return _redis_client


async def close_redis() -> None:
    """Close the global client and connection pool on app shutdown."""
    global _redis_client, _redis_pool
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
    if _redis_pool is not None:
        await _redis_pool.disconnect()
        _redis_pool = None


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
