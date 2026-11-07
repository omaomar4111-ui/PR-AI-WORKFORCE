#!/usr/bin/env python3
"""
PR AI WORKFORCE - Setup Upstash Redis URL
Prompts user to paste rediss:// URL securely using getpass (hidden input).
Updates .env.production without exposing credentials.
"""

import os
import sys
import getpass
from pathlib import Path

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ENV_PATH = Path(__file__).resolve().parent.parent / ".env.production"

def setup_redis():
    print("═══════════════════════════════════════════════════════════════")
    print("⚡ UPSTASH REDIS URL SECURE SETUP")
    print("═══════════════════════════════════════════════════════════════")

    redis_url = None
    # 1. If passed via CLI argument or stdin pipe, allow seamless automation
    if len(sys.argv) > 1 and sys.argv[1].strip():
        redis_url = sys.argv[1].strip()
    elif not sys.stdin.isatty():
        line = sys.stdin.readline()
        if line:
            redis_url = line.strip()

    # 2. Otherwise prompt interactively via getpass (input hidden)
    if not redis_url:
        try:
            redis_url = getpass.getpass("Paste your Upstash REDIS_URL (input hidden): ")
        except Exception:
            redis_url = input("Paste your Upstash REDIS_URL: ")

    if not redis_url:
        print("❌ Error: REDIS_URL cannot be empty.")
        sys.exit(1)

    redis_url = redis_url.strip().strip('"').strip("'")
    if not redis_url.startswith("rediss://") and not redis_url.startswith("redis://"):
        print("❌ Error: Invalid URL scheme. Must start with rediss:// (TLS) or redis://")
        sys.exit(1)

    if not ENV_PATH.exists():
        print(f"❌ Error: {ENV_PATH} not found.")
        sys.exit(1)

    # 3. Read .env.production and replace REDIS_URL line
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    updated = False
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("REDIS_URL="):
            new_lines.append(f"REDIS_URL={redis_url}\n")
            updated = True
        else:
            new_lines.append(line)

    if not updated:
        new_lines.append(f"REDIS_URL={redis_url}\n")

    # 4. Save file
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print("✅ .env.production updated successfully with REDIS_URL.")
    print("═══════════════════════════════════════════════════════════════\n")

if __name__ == "__main__":
    setup_redis()
