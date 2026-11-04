"""
PR AI WORKFORCE - Milestone 1 Verification Suite
Automated End-to-End Verification for Milestone 1 Acceptance Criteria.
"""
import sys
import os
import unittest
from pathlib import Path

# Add apps/api to path
BASE_DIR = Path(__file__).resolve().parent.parent
API_DIR = BASE_DIR / "apps" / "api"
WEB_DIR = BASE_DIR / "apps" / "web"
DB_DIR = BASE_DIR / "database"

sys.path.insert(0, str(API_DIR))

from fastapi.testclient import TestClient
from main import app


class TestMilestone1AcceptanceCriteria(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_monorepo_structure_exists(self):
        """Criterion 1: Monorepo scaffolding exists."""
        self.assertTrue((BASE_DIR / "apps" / "api").is_dir(), "apps/api missing")
        self.assertTrue((BASE_DIR / "apps" / "web").is_dir(), "apps/web missing")
        self.assertTrue((BASE_DIR / "database").is_dir(), "database missing")
        self.assertTrue((BASE_DIR / "packages").is_dir(), "packages missing")
        self.assertTrue((BASE_DIR / "docker-compose.yml").is_file(), "docker-compose.yml missing")
        self.assertTrue((BASE_DIR / ".env.example").is_file(), ".env.example missing")

    def test_02_database_schema_and_rls(self):
        """Criterion 4: DB schema contains users, organizations, organization_members with RLS."""
        schema_file = DB_DIR / "schema.sql"
        self.assertTrue(schema_file.is_file(), "database/schema.sql missing")
        
        content = schema_file.read_text(encoding="utf-8")
        self.assertIn("organizations", content)
        self.assertIn("users", content)
        self.assertIn("organization_members", content)
        self.assertIn("ROW LEVEL SECURITY", content)
        self.assertIn("owner", content)
        self.assertIn("member", content)

    def test_03_docker_compose_pgvector_and_redis(self):
        """Criterion 7: docker-compose.yml defines Postgres with pgvector + Redis."""
        compose_file = BASE_DIR / "docker-compose.yml"
        content = compose_file.read_text(encoding="utf-8")
        self.assertIn("pgvector/pgvector", content)
        self.assertIn("redis", content)
        self.assertIn("5432", content)
        self.assertIn("6379", content)

    def test_04_fastapi_health_endpoint(self):
        """Criterion 3: FastAPI /health endpoint returns 200 OK."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("version"), "1.0.0")

    def test_05_auth_flow_owner_and_member(self):
        """Criterion 5: Email/password JWT authentication works for owner and member."""
        # Test Owner Login
        owner_resp = self.client.post("/api/auth/login", json={
            "email": "owner@pragency.eg",
            "password": "Password123!"
        })
        self.assertEqual(owner_resp.status_code, 200)
        owner_data = owner_resp.json()
        self.assertIn("access_token", owner_data)
        self.assertEqual(owner_data["user"]["role"], "owner")
        self.assertEqual(owner_data["user"]["email"], "owner@pragency.eg")

        # Test Member Login
        member_resp = self.client.post("/api/auth/login", json={
            "email": "member@pragency.eg",
            "password": "Password123!"
        })
        self.assertEqual(member_resp.status_code, 200)
        member_data = member_resp.json()
        self.assertIn("access_token", member_data)
        self.assertEqual(member_data["user"]["role"], "member")

        # Test Invalid Credentials
        bad_resp = self.client.post("/api/auth/login", json={
            "email": "owner@pragency.eg",
            "password": "WrongPassword!"
        })
        self.assertEqual(bad_resp.status_code, 401)

        # Test Protected /me endpoint with valid token
        token = owner_data["access_token"]
        me_resp = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_resp.status_code, 200)
        self.assertEqual(me_resp.json()["user"]["email"], "owner@pragency.eg")

        # Test Protected /me endpoint without token (should be 401)
        unauth_resp = self.client.get("/api/auth/me")
        self.assertEqual(unauth_resp.status_code, 401)

    def test_06_frontend_bilingual_and_theme_setup(self):
        """Criterion 2 & 6: Next.js frontend has Tailwind purple/black theme & bilingual UI."""
        tailwind_file = WEB_DIR / "tailwind.config.js"
        self.assertTrue(tailwind_file.is_file(), "tailwind.config.js missing")
        tailwind_content = tailwind_file.read_text(encoding="utf-8")
        self.assertIn("#8b5cf6", tailwind_content)
        self.assertIn("#0d0e12", tailwind_content)

        login_file = WEB_DIR / "app" / "login" / "page.tsx"
        self.assertTrue(login_file.is_file(), "app/login/page.tsx missing")
        login_content = login_file.read_text(encoding="utf-8")
        # Check bilingual support
        self.assertIn("العربية", login_content)
        self.assertIn("English", login_content)
        self.assertIn("dir={isAr ? \"rtl\" : \"ltr\"}", login_content)

        dashboard_file = WEB_DIR / "app" / "dashboard" / "page.tsx"
        self.assertTrue(dashboard_file.is_file(), "app/dashboard/page.tsx missing")
        dash_content = dashboard_file.read_text(encoding="utf-8")
        self.assertIn("PR AI WORKFORCE", dash_content)
        self.assertIn("dir={isAr ? \"rtl\" : \"ltr\"}", dash_content)


if __name__ == "__main__":
    unittest.main()
