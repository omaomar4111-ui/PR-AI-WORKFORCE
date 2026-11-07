#!/usr/bin/env python3
"""
PR AI WORKFORCE - Secrets Rotation Pre-Flight Verifier
Validates credentials inside NEW_SECRETS.txt, confirms non-identity with .env.production,
and verifies live database and Redis connectivity before applying changes.
"""

import os
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
NEW_SECRETS_PATH = ROOT_DIR / "NEW_SECRETS.txt"
ENV_PROD_PATH = ROOT_DIR / ".env.production"


def parse_env_file(filepath: Path) -> dict:
    values = {}
    if not filepath.exists():
        return values
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip().strip('"').strip("'")
    return values


def verify_rotation():
    print("=" * 70)
    print("🔍 PRE-FLIGHT VERIFICATION: SECRETS ROTATION")
    print("=" * 70)

    if not NEW_SECRETS_PATH.exists():
        print(f"❌ خطأ: لم يتم العثور على ملف '{NEW_SECRETS_PATH.name}'.")
        print("اتبع التعليمات في docs/ROTATION_GUIDE.md لإنشاء الملف أولاً.")
        sys.exit(1)

    new_secrets = parse_env_file(NEW_SECRETS_PATH)
    old_secrets = parse_env_file(ENV_PROD_PATH)

    required_keys = [
        "NEW_DATABASE_URL",
        "NEW_REDIS_URL",
        "NEW_JWT_SECRET",
        "NEW_APP_SECRET",
        "NEW_SESSION_SECRET"
    ]

    all_passed = True
    results = []

    # 1. Check required keys presence
    for k in required_keys:
        if k in new_secrets and new_secrets[k]:
            results.append((k, "PRESENT", "PASS"))
        else:
            results.append((k, "MISSING OR EMPTY", "FAIL"))
            all_passed = False

    # 2. Check non-identity with old secrets (rotation proof)
    key_mapping = {
        "NEW_DATABASE_URL": "DATABASE_URL",
        "NEW_REDIS_URL": "REDIS_URL",
        "NEW_APP_SECRET": "APP_SECRET",
    }
    for new_k, old_k in key_mapping.items():
        if new_k in new_secrets and old_k in old_secrets:
            if new_secrets[new_k] != old_secrets[old_k]:
                results.append((f"DIFF: {new_k} != {old_k}", "ROTATED (VALUE CHANGED)", "PASS"))
            else:
                results.append((f"DIFF: {new_k} == {old_k}", "IDENTICAL TO OLD SECRET", "FAIL"))
                all_passed = False

    # 3. Test Database Connectivity
    db_url = new_secrets.get("NEW_DATABASE_URL")
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url, connect_timeout=5)
            cur = conn.cursor()
            cur.execute("SELECT 1;")
            cur.fetchone()
            conn.close()
            results.append(("LIVE DB CONNECTION", "PostgreSQL Ping (SELECT 1) Successful", "PASS"))
        except Exception as e:
            results.append(("LIVE DB CONNECTION", f"Connection Failed: {type(e).__name__}", "FAIL"))
            all_passed = False
    else:
        results.append(("LIVE DB CONNECTION", "Skipped (no NEW_DATABASE_URL)", "FAIL"))
        all_passed = False

    # 4. Test Redis Connectivity
    redis_url = new_secrets.get("NEW_REDIS_URL")
    if redis_url:
        try:
            import redis
            r = redis.from_url(redis_url, socket_timeout=5, ssl_cert_reqs="required" if "rediss://" in redis_url else None)
            if r.ping():
                results.append(("LIVE REDIS CONNECTION", "Upstash Redis PING Successful", "PASS"))
            else:
                results.append(("LIVE REDIS CONNECTION", "Ping returned False", "FAIL"))
                all_passed = False
        except Exception as e:
            results.append(("LIVE REDIS CONNECTION", f"Connection Failed: {type(e).__name__}", "FAIL"))
            all_passed = False
    else:
        results.append(("LIVE REDIS CONNECTION", "Skipped (no NEW_REDIS_URL)", "FAIL"))
        all_passed = False

    # Print summary table
    print(f"{'Check / Step':<35} | {'Result / Detail':<30} | {'Status'}")
    print("-" * 75)
    for name, detail, status in results:
        status_symbol = "✅ PASS" if status == "PASS" else "❌ FAIL"
        print(f"{name:<35} | {detail:<30} | {status_symbol}")
    print("=" * 75)

    if all_passed:
        print("🎉 كل فحوصات التحقق نجحت بنسبة 100%! الأسرار الجديدة صالحة ومطابقة للإنتاج.")
        print("يمكنك الآن تشغيل: python scripts/apply_rotation.py لتطبيقها على .env.production.")
        sys.exit(0)
    else:
        print("❌ فشل واحد أو أكثر من فحوصات التحقق. راجع الأخطاء في الجدول أعلاه ولا تطبق الأسرار.")
        sys.exit(1)


if __name__ == "__main__":
    verify_rotation()
