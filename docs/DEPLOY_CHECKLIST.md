# 📋 PR AI WORKFORCE — Production Deployment & Release Checklist

This checklist must be reviewed and executed before, during, and after any production deployment.

---

## 🎯 Master Production Deployment Checklist

- [ ] Railway project created
- [ ] Backend env vars set
- [ ] Frontend env vars set
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] smoke_test_staging.py PASSED
- [ ] measure_prod_infra.py → Redis < 20ms, DB < 10ms
- [ ] Lighthouse on /dashboard >= 90
- [ ] GitHub push + workflows activated
- [ ] ⏳ Pre-Launch: rotation (ROTATION_GUIDE.md)

---

## 🚦 Phase 1: Pre-Deployment Verification (Gate 1)

All criteria in this section must be satisfied before promoting code to production:

- [ ] **Git Working Tree Clean:**
  - `git status` reports working tree clean.
  - No untracked secret files (`.env*`, `NEW_SECRETS*`) present.
- [ ] **Automated Test Suite Passing:**
  - `python -m pytest` passes 100% of tests (>= 74 unit/integration tests).
  - No tests were skipped or disabled.
- [ ] **Secrets & PII Scan Clean:**
  - `python scripts/scan_secrets.py` reports 0 hardcoded credentials or tokens.
- [ ] **Database Migrations Applied:**
  - Migrations `001_initial_schema.sql` through `014_web_vitals_retention.sql` applied to Supabase PostgreSQL 17.
  - Row-Level Security (RLS) active on all tables.
- [ ] **Cryptographic Secrets Generated:**
  - High-entropy (256-bit) `JWT_SECRET` and `APP_SECRET` generated via `python scripts/generate_secrets.py`.
- [ ] **Docker Builds Verified:**
  - `Dockerfile.api` build succeeds.
  - `Dockerfile.web` build succeeds with Next.js standalone output.

---

## 🚀 Phase 2: Deployment Execution (Gate 2)

Execute deployment steps on Railway:

- [ ] **Railway Project Initialized:**
  - Repository linked to Railway project.
  - Region configured to **Western Europe / Ireland (`eu-west-1`)** for co-location.
- [ ] **FastAPI Gateway (`api`) Configured:**
  - Dockerfile path: `Dockerfile.api`.
  - Health check path: `/health` (timeout: 100s, restart policy: On Failure).
  - Environment variables set: `DATABASE_URL`, `REDIS_URL`, `APP_SECRET`, `JWT_SECRET`, `ALLOWED_ORIGINS`.
- [ ] **Web Frontend (`web`) Configured:**
  - Dockerfile path: `Dockerfile.web`.
  - Health check path: `/` (timeout: 100s).
  - Environment variables set: `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`, `NODE_ENV=production`.
- [ ] **Container Startup:**
  - API container starts cleanly and reports `Application startup complete`.
  - Web container starts and reports Next.js ready on port 3000.

---

## 🧪 Phase 3: Post-Deployment Smoke Verification (Gate 3)

Run automated smoke tests against the live deployment URLs:

- [ ] **Automated Smoke Test Run:**
  ```bash
  python scripts/smoke_test_staging.py --base-url https://[YOUR_RAILWAY_API_URL]
  ```
  - `[PASS]` `GET /health` returns 200 with DB & Redis connected.
  - `[PASS]` `GET /health/redis` returns 200 with active TLS ping.
  - `[PASS]` `POST /api/telemetry/vitals` ingests sample telemetry.
  - `[PASS]` `GET /api/agents` returns 401 Unauthorized without Bearer token.
  - `[PASS]` `GET /api/projects` returns 401 Unauthorized without Bearer token.
  - `[PASS]` Invalid login attempt returns 401/400.
- [ ] **Infrastructure Latency Measurement:**
  ```bash
  python scripts/measure_prod_infra.py --api-url https://[YOUR_RAILWAY_API_URL]
  ```
  - Verify TTFB is within acceptable thresholds.
  - Verify downstream Redis and DB roundtrips are co-located.
- [ ] **Frontend Manual Sanity Check:**
  - Visit `https://[YOUR_RAILWAY_WEB_URL]/login`.
  - Verify UI renders without console errors.
  - Verify PWA service worker registers.
  - Log in with admin credentials and verify Dashboard loads.

---

## 🛡️ Phase 4: Day-2 Operations & Monitoring (Gate 4)

- [ ] **Daily Database Backup Scheduled:**
  - `.github/workflows/backup.yml` active in GitHub Actions.
  - `SUPABASE_DB_URL` configured in GitHub Secrets.
- [ ] **Automated Telemetry Retention Purge Scheduled:**
  - `.github/workflows/retention.yml` runs daily at 03:00 UTC.
- [ ] **Observability & Error Tracking:**
  - OpenTelemetry / structured logs monitored in Railway Logs console.
  - Rate limiting active on authentication and API endpoints.

---

## 🚨 Rollback Triggers & Emergency Procedure

### Immediate Rollback Triggers:
1. `GET /health` returns non-200 or database `disconnected` for > 60 seconds.
2. Error rate on API requests exceeds 2% over 5 minutes.
3. Smoke test fails on critical auth or data endpoints.

### Fast Rollback Steps:
1. In Railway Console: Open the affected service (`api` or `web`).
2. Go to **Deployments** tab.
3. Locate the previous working deployment and click **Rollback**.
4. If database rollback is needed, follow [docs/DR_RUNBOOK.md](DR_RUNBOOK.md).
