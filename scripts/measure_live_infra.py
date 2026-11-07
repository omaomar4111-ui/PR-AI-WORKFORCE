#!/usr/bin/env python3
import os
import time
import socket
import ssl
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env.production"
env_vars = {}
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")

print("=== LIVE INFRASTRUCTURE MEASUREMENT ===")

# 1. Measure Upstash Redis (eu-west-1)
redis_url = env_vars.get("REDIS_URL")
if redis_url:
    try:
        import redis
        t0 = time.perf_counter()
        r = redis.from_url(redis_url, socket_timeout=5)
        r.ping()
        t_redis = (time.perf_counter() - t0) * 1000
        print(f"• Upstash Redis (TLS ping): {t_redis:.2f} ms")
    except Exception as e:
        print(f"• Upstash Redis error: {e}")
else:
    print("• REDIS_URL not set")

# 2. Measure Supabase PostgreSQL (eu-west-1)
db_url = env_vars.get("DATABASE_POOLER_URL") or env_vars.get("DATABASE_URL")
if db_url:
    try:
        import psycopg2
        t0 = time.perf_counter()
        conn = psycopg2.connect(db_url, connect_timeout=5)
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        cur.fetchone()
        conn.close()
        t_db = (time.perf_counter() - t0) * 1000
        print(f"• Supabase PostgreSQL (connect + SELECT 1): {t_db:.2f} ms")
    except Exception as e:
        print(f"• Supabase DB error: {e}")
else:
    print("• DATABASE_URL not set")

# 3. Measure TCP handshake directly to hosts
def measure_tcp(host, port, use_ssl=False):
    t0 = time.perf_counter()
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5.0)
    sock.connect((host, port))
    if use_ssl:
        ctx = ssl.create_default_context()
        sock = ctx.wrap_socket(sock, server_hostname=host)
    rtt = (time.perf_counter() - t0) * 1000
    sock.close()
    return rtt

try:
    r_tcp = measure_tcp("happy-cod-101575.upstash.io", 6379, use_ssl=True)
    print(f"• Upstash Host TCP+TLS Handshake RTT: {r_tcp:.2f} ms")
except Exception as e:
    print(f"• Upstash TCP error: {e}")

try:
    db_tcp = measure_tcp("aws-0-eu-west-1.pooler.supabase.com", 6543, use_ssl=False)
    print(f"• Supabase Pooler TCP Handshake RTT: {db_tcp:.2f} ms")
except Exception as e:
    print(f"• Supabase TCP error: {e}")
