#!/usr/bin/env python3
import psycopg2
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env.production"
env_vars = {}
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

db_url = env_vars.get("DATABASE_POOLER_URL") or env_vars.get("DATABASE_URL")
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT id, metric_name, metric_value, rating, url, trace_id, created_at FROM web_vitals ORDER BY created_at DESC LIMIT 3;")
rows = cur.fetchall()
conn.close()
print("=== PERSISTED WEB VITALS IN SUPABASE POSTGRESQL ===")
for r in rows:
    print("Record:", r)
