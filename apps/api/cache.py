"""
Redis cache layer — awaiting REDIS_URL from Upstash.
Do NOT call any function below until REDIS_URL is set.
"""
import os

REDIS_URL = os.getenv("REDIS_URL", "")
if not REDIS_URL:
    raise RuntimeError("REDIS_URL not configured. Set it in .env.production")

# Functions will be implemented in Phase 2.
# This file exists so structure is ready.
