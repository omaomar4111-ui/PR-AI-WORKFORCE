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

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='web_vitals' ORDER BY ordinal_position")
columns = cur.fetchall()
print("=== UPDATED COLUMNS IN WEB_VITALS ===")
for col in columns:
    print("Column:", col)

cur.execute("SELECT polname, polcmd, polroles::regrole[] FROM pg_policy WHERE polrelid='web_vitals'::regclass")
policies = cur.fetchall()
print("\n=== UPDATED RLS POLICIES ===")
for pol in policies:
    print("Policy:", pol)

cur.execute("SELECT COUNT(*) FROM web_vitals;")
print("\n=== RECORD COUNT ===")
print("Total rows:", cur.fetchone()[0])

conn.close()
