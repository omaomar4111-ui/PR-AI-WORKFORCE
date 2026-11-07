#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# Load from .env.production
env_path = Path(__file__).resolve().parent.parent / ".env.production"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_migrations import run_migrations

success = run_migrations(dry_run=False)
if success:
    print("Migration 011 applied successfully!")
else:
    print("Migration execution finished.")
