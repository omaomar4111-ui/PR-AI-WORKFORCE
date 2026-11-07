#!/usr/bin/env python3
"""
PR AI WORKFORCE - Supabase Password Rotation Helper
Safely updates .env.production with a new URL-encoded database password.
Never prints or logs the raw password.
"""

import os
import sys
import getpass
import urllib.parse
from pathlib import Path

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ENV_PATH = Path(__file__).resolve().parent.parent / ".env.production"

def rotate_password():
    print("═══════════════════════════════════════════════════════════════")
    print("🔐 SUPABASE DATABASE PASSWORD ROTATION TOOL")
    print("═══════════════════════════════════════════════════════════════")
    print("This tool will URL-encode your new Supabase database password and")
    print("update DATABASE_URL and DATABASE_POOLER_URL inside .env.production.\n")

    if not ENV_PATH.exists():
        print(f"❌ Error: {ENV_PATH} not found.")
        sys.exit(1)

    # 1. Prompt for password hidden
    new_password = getpass.getpass("Enter new Supabase database password (input hidden): ")
    if not new_password or len(new_password.strip()) < 6:
        print("❌ Error: Password cannot be empty and must be at least 6 characters.")
        sys.exit(1)

    confirm_password = getpass.getpass("Confirm new password: ")
    if new_password != confirm_password:
        print("❌ Error: Passwords do not match.")
        sys.exit(1)

    encoded_pw = urllib.parse.quote_plus(new_password)

    # 2. Read existing .env.production
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    updated_lines = []
    updated_db = False
    updated_pooler = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("DATABASE_URL="):
            # Parse existing URL to retain user, host, port, dbname
            prefix, url_val = line.split("=", 1)
            raw_url = url_val.strip().strip('"').strip("'")
            parsed = urllib.parse.urlsplit(raw_url)
            username = parsed.username or "postgres"
            hostname = parsed.hostname or "aws-0-eu-west-1.pooler.supabase.com"
            port = parsed.port or 5432
            path = parsed.path or "/postgres"
            new_url = f"{parsed.scheme}://{username}:{encoded_pw}@{hostname}:{port}{path}"
            updated_lines.append(f"DATABASE_URL={new_url}\n")
            updated_db = True
        elif stripped.startswith("DATABASE_POOLER_URL="):
            prefix, url_val = line.split("=", 1)
            raw_url = url_val.strip().strip('"').strip("'")
            parsed = urllib.parse.urlsplit(raw_url)
            username = parsed.username or "postgres"
            hostname = parsed.hostname or "aws-0-eu-west-1.pooler.supabase.com"
            port = parsed.port or 6543
            path = parsed.path or "/postgres"
            new_url = f"{parsed.scheme}://{username}:{encoded_pw}@{hostname}:{port}{path}"
            updated_lines.append(f"DATABASE_POOLER_URL={new_url}\n")
            updated_pooler = True
        else:
            updated_lines.append(line)

    if not updated_db:
        # Fallback if DATABASE_URL was missing
        default_db = f"postgresql://postgres.qqmfwkvwrsogveqwfuem:{encoded_pw}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
        updated_lines.append(f"DATABASE_URL={default_db}\n")

    if not updated_pooler:
        default_pooler = f"postgresql://postgres.qqmfwkvwrsogveqwfuem:{encoded_pw}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
        updated_lines.append(f"DATABASE_POOLER_URL={default_pooler}\n")

    # 3. Write back .env.production
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.writelines(updated_lines)

    print("\n✅ .env.production updated successfully with URL-encoded password.")
    print("═══════════════════════════════════════════════════════════════")
    print("📋 CRITICAL NEXT STEPS:")
    print("1. Update Railway Variables manually:")
    print("   - Open Railway Dashboard -> apps/api service -> Variables")
    print("   - Update DATABASE_URL and DATABASE_POOLER_URL with the new connection strings.")
    print("2. Verify live connection:")
    print("   - Run: python scripts/smoke_test_production_db.py")
    print("═══════════════════════════════════════════════════════════════")

if __name__ == "__main__":
    rotate_password()
