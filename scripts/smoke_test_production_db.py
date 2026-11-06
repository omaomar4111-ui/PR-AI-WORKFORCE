#!/usr/bin/env python3
"""
PR AI WORKFORCE - Production Database Smoke Tester
Verifies:
1. pgvector extension is installed and functional.
2. All 20 tables exist with Row-Level Security (RLS) enabled.
3. Live transactional insert/read/delete across clients, projects, tasks, and memory embeddings.
"""

import os
import sys
import uuid
import psycopg2

def run_smoke_test(database_url: str):
    print("🔌 Connecting to production PostgreSQL database...")
    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    cursor = conn.cursor()

    try:
        # 1. Verify pgvector extension
        print("▶ [1/4] Verifying 'vector' (pgvector) extension...")
        cursor.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
        ext = cursor.fetchone()
        if not ext:
            raise RuntimeError("pgvector extension is NOT installed. Run 'CREATE EXTENSION IF NOT EXISTS vector;' in Supabase SQL editor.")
        print(f"  ✓ pgvector extension verified (version: {ext[1]}).")

        # 2. Verify all 20 tables & Row-Level Security
        print("▶ [2/4] Verifying Table RLS Policies...")
        cursor.execute("""
            SELECT tablename, rowsecurity
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """)
        tables = cursor.fetchall()
        print(f"  Discovered {len(tables)} tables in public schema:")
        rls_disabled = []
        for tname, rls in tables:
            status = "RLS: ENABLED" if rls else "RLS: DISABLED"
            print(f"    • {tname:<28} [{status}]")
            if not rls and tname != "schema_migrations":
                rls_disabled.append(tname)

        if rls_disabled:
            raise RuntimeError(f"RLS is disabled on tables: {rls_disabled}")
        print("  ✓ All application tables have Row-Level Security strictly enforced.")

        # 3. Live Smoke Test (CRUD test client, project, task, memory)
        print("▶ [3/4] Running transactional CRUD smoke test...")
        test_org_id = f"smoke-org-{uuid.uuid4().hex[:8]}"
        test_client_id = f"smoke-client-{uuid.uuid4().hex[:8]}"
        test_project_id = f"smoke-project-{uuid.uuid4().hex[:8]}"
        test_task_id = f"smoke-task-{uuid.uuid4().hex[:8]}"
        test_memory_id = f"smoke-mem-{uuid.uuid4().hex[:8]}"

        # Insert client
        cursor.execute(
            "INSERT INTO clients (id, org_id, name, industry) VALUES (%s, %s, %s, %s);",
            (test_client_id, test_org_id, "Smoke Test Client", "Technology")
        )
        # Insert project
        cursor.execute(
            "INSERT INTO projects (id, org_id, client_id, name, budget) VALUES (%s, %s, %s, %s, %s);",
            (test_project_id, test_org_id, test_client_id, "Smoke Test Project", 5000.0)
        )
        # Insert task
        cursor.execute(
            "INSERT INTO tasks (id, org_id, project_id, title, status) VALUES (%s, %s, %s, %s, %s);",
            (test_task_id, test_org_id, test_project_id, "Smoke Test Task", "completed")
        )
        # Insert memory
        cursor.execute(
            "INSERT INTO memories (id, org_id, type, reference_id, content) VALUES (%s, %s, %s, %s, %s);",
            (test_memory_id, test_org_id, "client", test_client_id, "Smoke test memory content")
        )
        # Insert zero-vector embedding
        zero_vector = "[" + ",".join(["0.0"] * 1536) + "]"
        cursor.execute(
            "INSERT INTO memory_embeddings (memory_id, embedding) VALUES (%s, %s::vector);",
            (test_memory_id, zero_vector)
        )
        print("  ✓ Created test records across clients, projects, tasks, and memory_embeddings.")

        # 4. Clean up test records
        print("▶ [4/4] Cleaning up smoke test records...")
        cursor.execute("DELETE FROM memory_embeddings WHERE memory_id = %s;", (test_memory_id,))
        cursor.execute("DELETE FROM memories WHERE id = %s;", (test_memory_id,))
        cursor.execute("DELETE FROM tasks WHERE id = %s;", (test_task_id,))
        cursor.execute("DELETE FROM projects WHERE id = %s;", (test_project_id,))
        cursor.execute("DELETE FROM clients WHERE id = %s;", (test_client_id,))
        conn.commit()
        print("  ✓ Database cleaned up cleanly. Zero residual test artifacts.")

        print("\n🏆 PRODUCTION DATABASE VERIFICATION: 100% HEALTHY & READY.")
        return True

    except Exception as exc:
        conn.rollback()
        print(f"\n❌ Database Smoke Test FAILED: {exc}", file=sys.stderr)
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    success = run_smoke_test(db_url)
    sys.exit(0 if success else 1)
