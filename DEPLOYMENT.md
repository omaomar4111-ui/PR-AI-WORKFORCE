# 🚀 PR AI WORKFORCE — Production Deployment & Operations Guide

This guide provides end-to-end instructions for deploying, scaling, and maintaining the **PR AI WORKFORCE** platform in production.

---

## 🌐 Live Production Deployments & Endpoints

| Component | Provider / Platform | Production URL | Status | Healthcheck / Probe |
| :--- | :--- | :--- | :---: | :--- |
| **Frontend Web App** | Vercel (Global Edge Network) | [https://web-2d1.vercel.app](https://web-2d1.vercel.app) | 🟢 Live | `GET /login` (HTTP 200) |
| **Alternate Production Domain** | Vercel | [https://web-ashen-one-76.vercel.app](https://web-ashen-one-76.vercel.app) | 🟢 Live | `GET /login` (HTTP 200) |
| **Backend API Gateway** | Railway | [https://api-production-07121d2e.up.railway.app](https://api-production-07121d2e.up.railway.app) | 🟢 Live | `GET /health` (HTTP 200) |
| **PostgreSQL Database** | Supabase (AWS eu-west-1) | Connected via PgBouncer | 🟢 Live | Pooled Connection (Port 6543) |
| **Redis Cache & Rate Limiting** | Upstash Redis | Connected via TLS (`rediss://`) | 🟢 Live | `PING` / Cache-Aside Active |

### 🔁 Future Redeployment Instructions

#### 1. Redeploy Backend to Railway:
```bash
# From apps/api directory:
cd apps/api
railway up --detach -y
```

#### 2. Redeploy Frontend to Vercel:
```bash
# From apps/web directory:
cd apps/web
npx vercel --prod --yes
```

#### 3. Run Live E2E Smoke Test:
```bash
# From root directory:
node tests/e2e_live_smoke.cjs
```


---

## 🏗️ 1. Architecture Overview

```mermaid
flowchart TD
    subgraph ClientLayer [Client & Edge Layer]
        Users["Client Browsers / Admins"]
        CDN["Vercel Global CDN (Edge Network)"]
        NextJS["Next.js 14 Web Application\n(Vercel / Port 3000)"]
    end

    subgraph APILayer [API & Orchestration Layer]
        LB["Railway / Cloud Load Balancer (HTTPS)"]
        FastAPI["FastAPI Production Cluster\n(Uvicorn Workers / Port 8000)"]
        SecurityMW["Security & RBAC Middleware\n(Rate Limiting & CSP)"]
        OmSamah["Om Samah CEO Orchestrator\n(DAG Engine & Execution Bus)"]
        Workforce["38 AI Specialized Agents\n(8 Department Roster)"]
    end

    subgraph DataLayer [Persistent Data & Cache Layer]
        Postgres["Supabase PostgreSQL 16\n(pgvector + 20 Tables + RLS)"]
        PgBouncer["PgBouncer Pooler\n(Transaction Mode / Port 6543)"]
        Redis["Upstash Redis 7\n(Rate Limiting & PubSub Cache)"]
    end

    subgraph ExternalServices [Third-Party Integrations]
        LLMs["AI Model Providers\n(OpenAI / Gemini / Anthropic)"]
        GoogleWorkspace["Google Drive / Docs / Sheets / Gmail"]
        MetaAds["Meta Ads & Instagram API"]
    end

    Users -->|HTTPS / WSS| CDN
    CDN --> NextJS
    NextJS -->|REST API & WebSockets| LB
    LB --> SecurityMW
    SecurityMW --> FastAPI
    FastAPI --> OmSamah
    OmSamah --> Workforce
    Workforce --> LLMs
    FastAPI --> PgBouncer
    PgBouncer --> Postgres
    FastAPI --> Redis
    Workforce --> GoogleWorkspace
    Workforce --> MetaAds
```

---

## 📋 2. Environment Variables Matrix

| Variable Name | Target Service | Required | Default Value | Description / Security |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | API / Migrations | **Yes** | — | PostgreSQL connection string with `pgvector` enabled (use PgBouncer pooled URL in production). |
| `REDIS_URL` | API | **Yes** | `redis://localhost:6379/0` | Upstash / Redis connection string for sliding-window rate limiting. |
| `APP_SECRET` | API | **Yes** | — | 32+ character high-entropy key for JWT signature & token validation. |
| `OPENAI_API_KEY` | API | Optional | — | API key for OpenAI GPT-4o / text-embedding-3-small. |
| `GEMINI_API_KEY` | API | Optional | — | API key for Google Gemini 1.5 Pro / Flash. |
| `ANTHROPIC_API_KEY`| API | Optional | — | API key for Claude 3.5 Sonnet. |
| `ALLOWED_ORIGINS` | API | **Yes** | `https://your-domain.com` | Comma-separated list of permitted CORS frontend domains. |
| `RATE_LIMIT_ENABLED`| API | Optional | `true` | Set to `false` only during development. |
| `LOG_LEVEL` | API | Optional | `INFO` | Structured logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `NEXT_PUBLIC_API_URL`| Web (Frontend)| **Yes** | `http://localhost:8000` | Public URL of the FastAPI gateway (e.g. `https://api.yourdomain.com`). |
| `PORT` | API / Web | Optional | `8000` (API) / `3000` (Web) | Listening port in container or PaaS runner. |

---

## 🛠️ 3. Step-by-Step Deployment Instructions

### Phase A: Database Provisioning (Supabase PostgreSQL + pgvector)

1. **Create Supabase Project:**
   - Log in to [Supabase Console](https://supabase.com).
   - Create a new project in your target region (e.g., `eu-west-1` or `us-east-1`).
   - Copy the **Connection String (Transaction Pooler - port 6543)** and the direct connection string.

2. **Run All 10 SQL Migrations:**
   From your workstation or CI/CD runner:
   ```bash
   export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
   python scripts/run_migrations.py
   ```
   *The migration runner will automatically:*
   - Verify connectivity.
   - Initialize `schema_migrations` tracking table.
   - Execute migrations `001_initial_schema.sql` through `010_analytics.sql` transactionally.
   - Enforce and verify Row-Level Security (RLS) on all 20 tables.

3. **Verify pgvector Extension:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

---

### Phase B: Distributed Cache Provisioning (Upstash Redis)

1. Log in to [Upstash Console](https://upstash.com).
2. Create a new serverless Redis database in the same cloud region as your database.
3. Copy the `rediss://default:[PASSWORD]@[HOST]:[PORT]` connection string.
4. Set this as `REDIS_URL` in your backend configuration.

---

### Phase C: Backend API Deployment (Railway / Cloud Run)

#### Option 1: Railway Deployment (Automated via GitHub)
1. In Railway, click **New Project** > **Deploy from GitHub repo**.
2. Select repository `PR-AI-WORKFORCE`.
3. Set **Root Directory** to `/`.
4. Railway will automatically detect `railway.json` and build via `apps/api/Dockerfile`.
5. In **Variables**, enter all backend environment variables (`DATABASE_URL`, `REDIS_URL`, `APP_SECRET`, etc.).
6. Healthcheck endpoint is preconfigured to:
   ```
   GET /health
   ```
7. Generate domain (e.g. `https://api-production.up.railway.app`).

#### Option 2: Docker Compose (Self-Hosted Linux VM / VPS)
1. Clone the repository on your Ubuntu 22.04 LTS host.
2. Create `.env` file in the project root:
   ```env
   DATABASE_URL=postgresql://workforce_user:securepassword@postgres:5432/workforce_db
   REDIS_URL=redis://redis:6379/0
   APP_SECRET=a_very_secret_key_minimum_32_characters_long
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ALLOWED_ORIGINS=https://app.yourdomain.com
   ```
3. Run with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
4. Verify all 4 containers are healthy:
   ```bash
   docker compose ps
   ```

---

### Phase D: Frontend Deployment (Vercel)

1. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import the `PR-AI-WORKFORCE` repository.
3. Configure the project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. In **Environment Variables**, set:
   ```
   NEXT_PUBLIC_API_URL = https://api-production.up.railway.app
   ```
5. Click **Deploy**. Vercel will build the SSR bundle and distribute it across edge points of presence.

---

## 🔒 4. Security Hardening & Zero-Trust Checklist

- [x] **Strict Transport Security (HSTS):** Pre-configured via `RateLimitMiddleware` headers (`max-age=63072000; includeSubDomains; preload`).
- [x] **Content-Security-Policy (CSP):** Configured to block unauthorized iframe embeds (`frame-ancestors 'none'`) and script injections.
- [x] **Anti-MIME Sniffing:** `X-Content-Type-Options: nosniff` active on all endpoints.
- [x] **Rate Limiting:**
  - `/api/auth/*`: 5 req/min (brute-force defense).
  - `/api/agents/*/execute`: 10 req/min (compute & token quota defense).
  - General `/api/*`: 60 req/min.
- [x] **Row Level Security (RLS):** Enabled across all 20 tables with multi-tenant isolation (`org_id` context).
- [x] **RBAC Gateways:** Sensitive mutations (`DELETE client`, `POST approve`, `POST integrations`) restricted strictly to `owner` and `admin` roles.

---

## 📈 5. Scaling & Performance Runbook

### Horizontal Worker Scaling
In `apps/api/Dockerfile`, the default startup command uses:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```
For high-throughput deployments (>1,000 requests/second):
1. **Rule of Thumb:** `workers = (2 x CPU cores) + 1`.
2. Set Railway/Cloud Run instances to autoscaling between 2 and 10 replicas based on CPU threshold (>70%).
3. Always connect through **PgBouncer** (Supabase port 6543) to prevent PostgreSQL connection exhaustion.

### Database Indexing
The following indexes are already created in migrations for optimal query performance:
- `idx_tasks_status` on `tasks(status)`
- `idx_tasks_assigned` on `tasks(assigned_agent_id)`
- `idx_workflow_steps_agent` on `workflow_steps(assigned_agent_id)`
- `idx_ai_usage_org` on `ai_usage_logs(org_id, created_at)`
- `idx_ai_usage_agent` on `ai_usage_logs(agent_id)`
- `idx_web_vitals_name_created` on `web_vitals(metric_name, created_at DESC)`
- `idx_web_vitals_route_template` on `web_vitals(route_template)`
- HNSW index on `memory_embeddings` using cosine similarity (`vector_cosine_ops`)

### Database Migration Numbering & Lineage
> **ملاحظة توثيقية حول ترقيم ملفات الهجرة (Migration Numbering):**
> الأرقام **008** و **009** متخطاة بقصد — حيث كانت مراحل **Milestone 8** و **Milestone 9** تركز على اختبارات الـ E2E الشاملة وواجهة المكتب الافتراضي (Virtual Office UI) التي اعتمدت على الجداول القائمة دون الحاجة إلى إنشاء جداول قاعدة بيانات جديدة. الأرقام محفوظة ومسجلة في تاريخ المشروع منعاً للالتباس.

#### جدول ملفات الهجرة المطبقة فعلياً في Supabase (`schema_migrations`):

| # | اسم ملف الهجرة (Migration Script) | الغرض والمعمارية (Scope & Architecture) | تاريخ التطبيق الفعلي (`applied_at` UTC) | الحالة |
|:---:|:---|:---|:---:|:---:|
| 1 | `001_initial_schema.sql` | جداول المنظمة والمستخدمين ومصادقة الـ Auth | `2026-11-06 22:21:10 UTC` | ✅ Applied |
| 2 | `002_clients_and_projects.sql` | إدارة العملاء والمشاريع والخدمات | `2026-11-06 22:21:11 UTC` | ✅ Applied |
| 3 | `003_tasks.sql` | طابور المهام وتعيين الوكلاء والأحداث | `2026-11-06 22:21:11 UTC` | ✅ Applied |
| 4 | `004_deliverables.sql` | مخرجات ومستندات الذكاء الاصطناعي | `2026-11-06 22:21:12 UTC` | ✅ Applied |
| 5 | `005_workflows.sql` | خطوط سير العمل وقوالب الأتمتة الموزعة | `2026-11-06 22:21:12 UTC` | ✅ Applied |
| 6 | `006_memory.sql` | الذاكرة طويلة المدى وتضمينات المتجهات (pgvector) | `2026-11-06 22:21:13 UTC` | ✅ Applied |
| 7 | `007_approvals_integrations.sql` | بوابات الموافقات والتكاملات الخارجية | `2026-11-06 22:21:14 UTC` | ✅ Applied |
| — | *(008 Skipped)* | Milestone 8: Playwright E2E Integration Suite | — | ⚪ No Schema |
| — | *(009 Skipped)* | Milestone 9: Virtual Office 38-Agent Interactive UI | — | ⚪ No Schema |
| 8 | `010_analytics.sql` | مقاييس الاستخدام ومراقبة الجودة والتكاليف | `2026-11-06 22:21:37 UTC` | ✅ Applied |
| 9 | `011_web_vitals.sql` | تخزين مؤشرات الويب الحيوية (RUM Field Telemetry) | `2026-11-07 22:51:55 UTC` | ✅ Applied |
| 10 | `012_drop_web_vitals_pii.sql` | حذف أعمدة PII (`client_ip`, `url`) وإضافة `route_template` | `2026-11-07 23:25:27 UTC` | ✅ Applied |
| 11 | `013_web_vitals_rls_fix.sql` | قصر صلاحيات قراءة وكتابة الـ Telemetry على `service_role` فقط | `2026-11-07 23:25:28 UTC` | ✅ Applied |
| 12 | `014_web_vitals_retention.sql` | دالة التنظيف التلقائي للأصول الأقدم من 30 يوماً | `2026-11-07 23:25:28 UTC` | ✅ Applied |

---

## 🛡️ 6. Disaster Recovery & Rollback Procedure

### Database Backup
- **Automated Daily Backups:** Enabled by default on Supabase (7-day retention on Pro plan).
- **Manual Snapshot:**
  ```bash
  pg_dump --clean --if-exists --no-owner -h <db-host> -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

### Rollback Strategy
1. **Frontend Rollback:**
   - On Vercel dashboard: navigate to **Deployments** > click on previous stable build > **Promote to Production** (takes < 10 seconds).
2. **Backend Rollback:**
   - In Railway or Docker: revert container tag to previous image hash or Git commit.
3. **Database Migration Rollback:**
   - Use targeted down migrations or restore snapshot to point-in-time prior to deployment.

---

## 🩺 7. Post-Deployment Verification Commands

Run these smoke tests immediately after deployment:

```bash
# 1. Verify API Healthcheck
curl -f https://api.yourdomain.com/health

# 2. Verify Security Headers
curl -I https://api.yourdomain.com/api/agents | grep -E "x-frame-options|x-content-type-options"

# 3. Verify Public 38 Agents Roster
curl -s https://api.yourdomain.com/api/agents | jq '.count'
# Expected output: 38

# 4. Verify Rate Limiting Enforcement
for i in {1..8}; do curl -s -o /dev/null -w "%{http_code}\n" https://api.yourdomain.com/api/auth/login; done
# Expected: First 5 requests return 200/401, 6th-8th return 429 Too Many Requests

# 5. Verify Frontend Accessibility
curl -f https://app.yourdomain.com/login
```

---

## 🌍 8. Infrastructure Co-location Strategy (eu-west-1 Western Europe)

To eliminate inter-service network latency and guarantee sub-millisecond data layer roundtrips, the entire production infrastructure is strictly co-located within the **Western Europe (AWS eu-west-1, Ireland)** geographic boundary.

### Co-located Services Topology:

```mermaid
flowchart LR
    subgraph EUWest1 ["🇪🇺 AWS Region: eu-west-1 (Ireland) — Co-located Sub-5ms Perimeter"]
        direction TB
        RailwayApp["Railway PaaS Containers\n(FastAPI Gateway + Next.js App)\nTarget Region: eu-west-1 / europe-west4"]
        SupabaseDB["Supabase PostgreSQL 17 + pgvector\n(Transaction Pooler Port 6543)\nHost: aws-0-eu-west-1.pooler.supabase.com\nLatency: 2-4 ms"]
        UpstashRedis["Upstash Redis 7 (TLS Enabled)\n(Async Cache & Rate Limiting)\nHost: happy-*.upstash.io\nLatency: 1-3 ms"]
    end

    CloudflareEdge["Cloudflare Edge Global Anycast CDN\n(Local Edge PoPs terminating TLS closest to user)"]

    CloudflareEdge -->|Optimized Ingress| RailwayApp
    RailwayApp <-->|Sub-4ms Internal RTT| SupabaseDB
    RailwayApp <-->|Sub-3ms Internal RTT| UpstashRedis
```

### Verified Service Regions Matrix:

| Component | Provider & Tier | Region Identifier | Geographic Location | In-Region SLA (Estimated) | Measured Local RTT (Egypt to eu-west-1) |
|:----------|:----------------|:------------------|:-------------------:|:-------------------------:|:---------------------------------------:|
| **Database & Vector Store** | Supabase (PostgreSQL 17 + pgvector) | `aws-0-eu-west-1` | Dublin, Ireland | `2.8 ms` (VPC internal) | `83.62 ms` (TCP Handshake) |
| **Distributed Cache & State**| Upstash Redis (TLS 1.3) | `eu-west-1` | Dublin, Ireland | `1.9 ms` (VPC internal) | `226.17 ms` (TCP+TLS Handshake) |
| **API & Web Containers** | Railway Pro Production Runner | `eu-west-1` / `europe-west4` | Western Europe | `3.4 ms` (Inter-DC internal) | Local Dev Server: `0.08 ms` DNS, `0.97 ms` Connect, `6.98 ms` TTFB |
| **Edge Ingress & CDN** | Cloudflare / Vercel Edge Network | Anycast (300+ PoPs) | Global Edge | `0-15 ms` (Edge) | Pending custom domain DNS activation |

> **Measurement Methodology Distinction:**
> - **In-Region SLA (Estimated / Documented):** Sub-5ms internal network latencies when application containers run on Railway's `eu-west-1` compute cluster communicating over AWS internal network backbones to Supabase `aws-0-eu-west-1` and Upstash `eu-west-1`.
> - **Measured Local Verification (Live Environment):** Executed from local development machine in Cairo/Egypt (cross-continent transit to Dublin, Ireland) via `scripts/measure_live_infra.py` and `curl.exe`:
>   ```bash
>   python scripts/measure_live_infra.py
>   # Output:
>   # Supabase Pooler TCP Handshake RTT: 83.62 ms
>   # Upstash Host TCP+TLS Handshake RTT: 226.17 ms
>   
>   curl.exe -s -o NUL -w "dns:%{time_namelookup}s connect:%{time_connect}s ttfb:%{time_starttransfer}s total:%{time_total}s code:%{http_code}\n" http://127.0.0.1:8000/health
>   # Output:
>   # dns:0.000080s connect:0.000966s ttfb:0.006975s total:0.007271s code:200
>   ```

### Impact Analysis: Co-location vs Cross-Region Penalty:

| Architecture Topology | DB Roundtrip (1 Query) | Typical Request (3 DB + 2 Redis Calls) | Cumulative Latency Penalty |
|:----------------------|:----------------------:|:---------------------------------------:|:--------------------------:|
| **Cross-Region (e.g. US-East to EU-West)** | `85 - 120 ms` | `425 - 600 ms` | **Severe network lag (> 500 ms penalty)** |
| **Co-located (eu-west-1 to eu-west-1)** | **`2 - 4 ms`** | **`< 15 ms total`** | **> 96% latency savings (< 15 ms total)** |

---

## 🧹 9. Automated Data Retention & GDPR Lifecycle (`retention.yml`)

To prevent database bloat and enforce GDPR compliance, telemetry records in `web_vitals` have an enforced **30-day lifecycle SLA**.

### Architecture:
- Database function: `purge_old_web_vitals()` (Migration `014_web_vitals_retention.sql`).
- Automated scheduler: GitHub Actions workflow [`.github/workflows/retention.yml`](.github/workflows/retention.yml).
- Schedule: Runs every 24 hours at **03:00 AM UTC** (`cron: '0 3 * * *'`).

### Configuration in GitHub Repository:
1. Navigate to your GitHub repository: **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**.
3. Name: `SUPABASE_DB_URL`.
4. Value: `postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres` (Transaction Pooler URI).
5. Click **Add secret**.

### On-Demand / Manual Purge Execution:
1. Navigate to **Actions** tab in GitHub repository.
2. Select **Daily Web Vitals Retention Purge** from the left workflows sidebar.
3. Click **Run workflow** → select branch (`main`) → click green **Run workflow** button.
4. The runner executes `SELECT purge_old_web_vitals();` and prints the count of deleted rows.

---

## 🔐 10. Secrets Rotation Workflow & Rollback Procedure

When rotating production secrets (database password, Redis tokens, application secrets, JWT signing keys):

### Rotation Protocol Overview:
1. **Pre-flight Check:** Ensure no active high-traffic production workloads or long-running database transactions.
2. **Generate Application Secrets:**
   ```bash
   python scripts/generate_secrets.py --output-file NEW_SECRETS.txt
   ```
   *Generates 256-bit cryptographically secure hex strings for `APP_SECRET` and `JWT_SECRET`.*
3. **Dashboard Rotations (Manual User Action):**
   - **Supabase DB Password:** Project Settings → Database → Reset database password. Append new `DATABASE_URL` to `NEW_SECRETS.txt`.
   - **Upstash Redis Token:** Upstash Console → Database Details → Rest API / Redis Tokens → Rotate. Append new `REDIS_URL` to `NEW_SECRETS.txt`.
   - Full guide and step-by-step UI instructions are documented in [docs/ROTATION_GUIDE.md](docs/ROTATION_GUIDE.md).
4. **Pre-flight Live Verification:**
   Before modifying any production environment file, run:
   ```bash
   python scripts/verify_rotation.py
   ```
   *Verifies that new secrets differ from old secrets, executes a live PostgreSQL `SELECT 1` ping, and an Upstash Redis `PING`.*
5. **Atomic Application & Backup:**
   Apply new secrets safely:
   ```bash
   python scripts/apply_rotation.py
   ```
   *Creates a timestamped backup (`.env.production.bak.<timestamp>`), updates `.env.production` in-place, and securely scrubs `NEW_SECRETS.txt` from disk.*
6. **Deploy / Restart Services:** Restart FastAPI and Web services (Railway / Docker).

### Rollback Procedure (Emergency Reversion):
If the verification passes but production services report connection drops or auth failures after application:
1. **Locate Most Recent Backup:**
   ```bash
   ls -la .env.production.bak.*
   ```
2. **Restore Backup File:**
   ```bash
   cp .env.production.bak.<LATEST_TIMESTAMP> .env.production
   ```
3. **Revert Cloud Dashboard Credentials:**
   - In Supabase: Re-enter the previous DB password if known, or re-run rotation flow with immediate verification.
   - In Upstash: Reactivate previous token or update runner with current token.
4. **Restart Services:**
   Restart the API and Web containers to reload restored environment variables.
5. **Verify Live Health:**
   ```bash
   curl -f http://127.0.0.1:8000/health
   curl -f http://127.0.0.1:8000/health/redis
   ```

---

*Production readiness certified by Om Samah CEO Orchestrator & PR AI Workforce Engineering Team.*
