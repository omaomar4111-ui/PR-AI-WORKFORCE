#!/usr/bin/env python3
"""
PR AI WORKFORCE - Upstash Redis Connection Verifier
Verifies:
1. Valid REDIS_URL format with TLS (rediss://).
2. Successful PING with roundtrip latency.
3. SET with TTL, GET value verification, and DEL cleanup.
4. Prints host, latency, and Redis server version with zero secret leakage.
"""

import os
import sys
import time
import urllib.parse
from pathlib import Path

# Ensure utf-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def load_env_production():
    """Load REDIS_URL from .env.production if not already in os.environ."""
    if os.getenv("REDIS_URL"):
        return os.getenv("REDIS_URL")
    
    env_file = Path(__file__).resolve().parent.parent / ".env.production"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("REDIS_URL=") and not line.startswith("#"):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    return val
    return ""

def verify_redis():
    redis_url = load_env_production()
    if not redis_url:
        print("❌ ERROR: REDIS_URL not found in environment or .env.production")
        print("   Please follow docs/UPSTASH_SETUP.md to configure your Upstash Redis database.")
        sys.exit(1)

    parsed = urllib.parse.urlparse(redis_url)
    masked_host = parsed.hostname or "unknown-host"
    port = parsed.port or 6379
    scheme = parsed.scheme

    print("═══════════════════════════════════════════════════════════════")
    print("🔍 UPSTASH REDIS CONNECTION VERIFICATION")
    print("═══════════════════════════════════════════════════════════════")
    print(f"  Target Host: {masked_host}:{port}")
    print(f"  Protocol:    {scheme} (TLS {'Enforced' if scheme == 'rediss' else 'Not Enforced'})")

    if scheme != "rediss":
        print("  ⚠️ Warning: Upstash requires TLS. Use rediss:// connection string.")

    try:
        import redis
    except ImportError:
        print("❌ ERROR: 'redis' package is not installed. Install via: pip install redis")
        sys.exit(1)

    try:
        # Connect using TLS
        client = redis.from_url(
            redis_url,
            ssl_cert_reqs="required" if scheme == "rediss" else None,
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5
        )

        # 1. PING & Latency Test
        t0 = time.perf_counter()
        pong = client.ping()
        latency_ms = (time.perf_counter() - t0) * 1000

        if not pong:
            print("❌ ERROR: PING failed to receive PONG response.")
            sys.exit(1)

        print(f"  ✓ PING successful (Latency: {latency_ms:.2f} ms)")

        # 2. Server Info / Version
        try:
            info = client.info("server")
            redis_version = info.get("redis_version", "unknown")
            print(f"  ✓ Redis Engine Version: {redis_version}")
        except Exception:
            redis_version = "Upstash Managed"
            print(f"  ✓ Redis Engine Version: {redis_version}")

        # 3. SET with TTL, GET, and DEL
        test_key = "pr_workforce:smoke_test"
        test_val = "ok_verified"
        
        client.set(test_key, test_val, ex=15)
        retrieved = client.get(test_key)
        ttl = client.ttl(test_key)

        if retrieved != test_val:
            print(f"❌ ERROR: Value mismatch. Expected {test_val}, got {retrieved}")
            sys.exit(1)

        print(f"  ✓ Cache Write/Read verified (TTL: {ttl}s)")

        # Clean up
        client.delete(test_key)
        print("  ✓ Cleanup complete (test key deleted)")

        print("═══════════════════════════════════════════════════════════════")
        print("✅ REDIS CONNECTION VERIFIED SUCCESSFULLY")
        print("   Ready for Phase 2 Caching Layer.")
        print("═══════════════════════════════════════════════════════════════")
        sys.exit(0)

    except Exception as e:
        print(f"❌ CONNECTION FAILED: {type(e).__name__}: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    verify_redis()
