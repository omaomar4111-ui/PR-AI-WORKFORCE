#!/usr/bin/env python3
"""
PR AI WORKFORCE — Automated Supabase Database Backup
Dumps database schema and data to compressed backup archives with SHA256 integrity verification.
Supports:
1. Native `pg_dump` binary (recommended, used in GitHub Actions CI/CD).
2. Python DB-API fallback dumper (when pg_dump CLI is not installed locally).
Enforces 7-day automated backup retention pruning.
"""

import argparse
import datetime
import gzip
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, Dict, Any
from urllib.parse import urlparse

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def mask_conn_str(url: str) -> str:
    """Masks credentials in connection string for safe reporting."""
    if not url:
        return "N/A"
    try:
        p = urlparse(url)
        masked_netloc = f"{p.username or 'user'}:****@{p.hostname or 'host'}:{p.port or 5432}"
        return f"{p.scheme}://{masked_netloc}{p.path}"
    except Exception:
        return "postgresql://****:****@****:****/postgres"


def resolve_database_url() -> Optional[str]:
    """Finds the database connection string from environment or .env.production."""
    url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if url:
        return url

    env_paths = [
        Path.cwd() / ".env.production",
        Path(__file__).resolve().parent.parent / ".env.production",
        Path.cwd() / ".env",
    ]
    for p in env_paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("SUPABASE_DB_URL=") and not line.startswith("#"):
                            return line.split("=", 1)[1].strip().strip('"').strip("'")
                        elif line.startswith("DATABASE_URL=") and not line.startswith("#"):
                            return line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception:
                pass
    return None


def prune_old_backups(backup_dir: Path, retention_days: int = 7) -> int:
    """Removes backups older than retention_days."""
    now = time.time()
    cutoff = now - (retention_days * 86400)
    pruned_count = 0

    for file_path in backup_dir.glob("db_*"):
        if file_path.is_file():
            if file_path.stat().st_mtime < cutoff:
                try:
                    file_path.unlink()
                    pruned_count += 1
                except Exception as e:
                    print(f"  ⚠️ Warning: Failed to prune {file_path.name}: {e}")
    return pruned_count


def compute_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def dump_with_pg_dump(db_url: str, output_path: Path) -> bool:
    """Executes native pg_dump command."""
    p = urlparse(db_url)
    env = os.environ.copy()
    if p.password:
        env["PGPASSWORD"] = p.password

    cmd = [
        "pg_dump",
        "-h", p.hostname or "localhost",
        "-p", str(p.port or 5432),
        "-U", p.username or "postgres",
        "-d", p.path.lstrip("/") or "postgres",
        "--no-owner",
        "--no-privileges",
        "-Fc",  # PostgreSQL custom format
        "-f", str(output_path)
    ]

    try:
        res = subprocess.run(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode == 0:
            return True
        else:
            print(f"  ⚠️ pg_dump returned exit code {res.returncode}: {res.stderr.strip()}")
            return False
    except FileNotFoundError:
        return False
    except Exception as e:
        print(f"  ⚠️ pg_dump error: {e}")
        return False


def dump_with_python_fallback(db_url: str, output_path: Path) -> bool:
    """Fallback database dumper using psycopg2 / sqlalchemy to export JSON/SQL data."""
    try:
        from sqlalchemy import create_engine, text
    except ImportError:
        print("  ❌ Fallback requires sqlalchemy package.")
        return False

    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            # Query all table names
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = [row[0] for row in conn.execute(tables_query)]

            backup_data = {
                "metadata": {
                    "backup_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "total_tables": len(tables),
                    "generator": "PR AI Workforce Python Fallback Dumper v1.0",
                },
                "tables": {}
            }

            for t in tables:
                rows_query = text(f'SELECT * FROM "{t}";')
                result = conn.execute(rows_query)
                cols = list(result.keys())
                rows = []
                for row in result:
                    row_dict = {}
                    for col, val in zip(cols, row):
                        if isinstance(val, (datetime.datetime, datetime.date)):
                            row_dict[col] = val.isoformat()
                        elif isinstance(val, (bytes, memoryview)):
                            row_dict[col] = "<binary>"
                        else:
                            row_dict[col] = val
                    rows.append(row_dict)
                backup_data["tables"][t] = rows

        # Write gzip compressed json
        with gzip.open(output_path, "wt", encoding="utf-8") as f:
            json.dump(backup_data, f, indent=2, default=str)

        return True
    except Exception as e:
        print(f"  ❌ Fallback dump failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="PR AI Workforce Supabase Database Backup Runner")
    parser.add_argument("--retention-days", type=int, default=7, help="Days to retain backup archives (default: 7)")
    parser.add_argument("--output-dir", type=str, default="backups", help="Target output directory for backups")
    args = parser.parse_args()

    db_url = resolve_database_url()
    if not db_url:
        print("❌ Error: No database URL found in SUPABASE_DB_URL, DATABASE_URL, or .env.production.")
        sys.exit(1)

    backup_dir = Path(args.output_dir).resolve()
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    has_pg_dump = shutil.which("pg_dump") is not None

    print("=" * 75)
    print("📦 SUPABASE DATABASE BACKUP RUNNER")
    print("=" * 75)
    print(f"  Target DB       : {mask_conn_str(db_url)}")
    print(f"  Output Dir      : {backup_dir}")
    print(f"  Backup Tool     : {'Native pg_dump CLI' if has_pg_dump else 'Python Database Dumper (fallback)'}")
    print("-" * 75)

    archive_name = f"db_{timestamp}.dump.gz"
    output_path = backup_dir / archive_name

    if has_pg_dump:
        success = dump_with_pg_dump(db_url, output_path)
    else:
        success = dump_with_python_fallback(db_url, output_path)

    if not success:
        print("❌ Backup operation failed!")
        sys.exit(1)

    file_size_bytes = output_path.stat().st_size
    file_size_mb = file_size_bytes / (1024 * 1024)
    sha256_hash = compute_sha256(output_path)

    # Save SHA256 checksum file
    checksum_path = backup_dir / f"{archive_name}.sha256"
    with open(checksum_path, "w", encoding="utf-8") as f:
        f.write(f"{sha256_hash}  {archive_name}\n")

    # Prune old backups
    pruned = prune_old_backups(backup_dir, args.retention_days)

    print("✅ BACKUP CREATED SUCCESSFULLY")
    print(f"  Archive File    : {archive_name}")
    print(f"  Archive Size    : {file_size_mb:.3f} MB ({file_size_bytes:,} bytes)")
    print(f"  SHA256 Checksum : {sha256_hash}")
    print(f"  Checksum File   : {checksum_path.name}")
    print(f"  Pruned Backups  : {pruned} archive(s) older than {args.retention_days} days pruned")
    print("=" * 75)


if __name__ == "__main__":
    main()
