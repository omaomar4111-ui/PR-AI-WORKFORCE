#!/usr/bin/env python3
import os
import dotenv
import psycopg2

dotenv.load_dotenv(".env.production")
url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_POOLER_URL")

conn = psycopg2.connect(url)
cur = conn.cursor()

# 1. Insert row older than 31 days
cur.execute("INSERT INTO web_vitals (metric_name, metric_value, rating, created_at) VALUES ('LCP', 100, 'good', NOW() - INTERVAL '31 days');")
conn.commit()

# 2. Call purge function
cur.execute("SELECT purge_old_web_vitals();")
purged_count = cur.fetchone()[0]
conn.commit()

# 3. Verify zero old rows remain
cur.execute("SELECT COUNT(*) FROM web_vitals WHERE created_at < NOW() - INTERVAL '30 days';")
old_remaining = cur.fetchone()[0]

conn.close()

print(f"Purge result: {purged_count} row(s) deleted.")
print(f"Remaining rows older than 30 days: {old_remaining}")
assert purged_count >= 1, "Expected purge_old_web_vitals to delete at least 1 record"
assert old_remaining == 0, "Expected 0 records older than 30 days remaining"
print("RETENTION PURGE VERIFICATION: PASSED")
