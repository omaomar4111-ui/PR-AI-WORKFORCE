# 🚂 Railway Production & Staging Deployment Guide

This guide explains how to deploy the **PR AI WORKFORCE** platform on [Railway](https://railway.app) using the multi-stage Dockerfiles and configuration files.

---

## 🏗️ 1. Architecture Overview on Railway

The application is deployed as **two independent containerized services** connected within a single Railway project:

```mermaid
flowchart TD
    subgraph RailwayProject [Railway Project — Western Europe eu-west-1]
        WebService["Service 1: Web Frontend\n(Dockerfile.web / Node.js 20)\nPort 3000"]
        ApiService["Service 2: FastAPI Gateway\n(Dockerfile.api / Python 3.11)\nPort 8000"]
    end

    subgraph ExternalCoLocated [External Co-located Services — eu-west-1]
        Supabase["Supabase PostgreSQL 17\n(aws-0-eu-west-1.pooler.supabase.com:6543)"]
        Upstash["Upstash Redis 7 TLS\n(happy-*.upstash.io:6379)"]
    end

    Users["Internet Users"] -->|HTTPS| WebService
    WebService -->|Internal Private Network or HTTPS| ApiService
    ApiService -->|Sub-4ms RTT| Supabase
    ApiService -->|Sub-3ms RTT| Upstash
```

---

## 🚀 2. Step-by-Step Setup Instructions

### Step 1: Create a New Project on Railway
1. Log in to [Railway Console](https://railway.app).
2. Click **+ New Project**.
3. Choose **Deploy from GitHub repo**.
4. Select your private repository: `PR-AI-WORKFORCE`.

---

### Step 2: Configure Service 1 — FastAPI Gateway (`api`)
1. In the Railway project canvas, click on the deployed service and rename it to **`api`**.
2. Go to **Settings** → **Build**:
   - **Builder:** `Dockerfile`
   - **Dockerfile Path:** `Dockerfile.api`
3. Go to **Settings** → **Deploy**:
   - **Custom Start Command:** Leave empty (defaults to `Dockerfile.api` CMD) or `uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT`
   - **Healthcheck Path:** `/health`
   - **Healthcheck Timeout:** `100` seconds
   - **Restart Policy:** `On Failure` (Max Retries: `3`)
4. Go to **Settings** → **Networking**:
   - Click **Generate Domain** (e.g. `pr-api-production.up.railway.app`).
   - Copy this URL (this will be your `NEXT_PUBLIC_API_URL`).
5. Go to **Variables** and add:

| Variable Name | Example / Format | Notes |
|:---|:---|:---|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[PASS]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres` | Supabase Transaction Pooler URI |
| `REDIS_URL` | `rediss://default:[TOKEN]@happy-*.upstash.io:6379` | Upstash Redis TLS URI |
| `APP_SECRET` | 64-hex generated token | From `python scripts/generate_secrets.py` |
| `JWT_SECRET` | 64-hex generated token | From `python scripts/generate_secrets.py` |
| `ALLOWED_ORIGINS` | `https://pr-web-production.up.railway.app` | Comma-separated domains allowed for CORS |
| `OTEL_EXPORTER` | `console` (or `otlp`) | Observability exporter |
| `LOG_LEVEL` | `INFO` | Logging level |

---

### Step 3: Configure Service 2 — Web Frontend (`web`)
1. In the Railway canvas, click **+ Create** → **GitHub Repo** → select `PR-AI-WORKFORCE` again.
2. Rename the new service to **`web`**.
3. Go to **Settings** → **Build**:
   - **Builder:** `Dockerfile`
   - **Dockerfile Path:** `Dockerfile.web`
4. Go to **Settings** → **Deploy**:
   - **Healthcheck Path:** `/`
   - **Healthcheck Timeout:** `100` seconds
5. Go to **Settings** → **Networking**:
   - Click **Generate Domain** (e.g. `pr-web-production.up.railway.app`).
6. Go to **Variables** and add:

| Variable Name | Example / Format | Notes |
|:---|:---|:---|
| `NEXT_PUBLIC_API_URL` | `https://pr-api-production.up.railway.app` | Public Gateway URL |
| `INTERNAL_API_URL` | `http://api.railway.internal:8000` | Railway Private Network URL for server-side calls |
| `NODE_ENV` | `production` | Production mode |

---

### Step 4: Region Co-Location Configuration
To achieve sub-5ms roundtrips:
1. In each service (**api** and **web**), go to **Settings** → **General**.
2. Under **Region**, select **Europe (West) / Ireland (eu-west-1)** or **Netherlands (europe-west4)**.
3. This ensures minimal network transit to Supabase Dublin (`aws-0-eu-west-1`) and Upstash Dublin (`eu-west-1`).

---

## 🧪 3. Post-Deployment Verification

Once Railway finishes building and deploying both services:

1. **Run Staging Smoke Tests:**
   ```bash
   python scripts/smoke_test_staging.py --base-url https://pr-api-production.up.railway.app
   ```
   *Verifies `/health`, `/health/redis`, `/api/telemetry/vitals`, unauthorized 401s, and rate limiting.*

2. **Measure Production Latency:**
   ```bash
   python scripts/measure_prod_infra.py --api-url https://pr-api-production.up.railway.app
   ```
   *Records TTFB, DNS resolution time, and network latency vs local baseline.*

---

## 🛠️ 4. Maintenance & Operations

- **Logs:** View real-time structured logs under the **Deployments** → **View Logs** tab in Railway.
- **Scaling:** Railway automatically handles vertical memory and CPU scaling. For horizontal replicas, adjust the replica count in **Settings** → **Deploy**.
- **Rollback:** Every Git push generates an immutable deployment. You can instantly roll back to any previous deployment with one click in the Railway UI.
