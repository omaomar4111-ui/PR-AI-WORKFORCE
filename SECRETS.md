# 🔒 Production Secrets & Key Rotation Protocol (PR AI WORKFORCE)

This document establishes the official secrets catalog, storage locations, rotation procedures, and access control policies for the PR AI Workforce platform.

> ⚠️ **Zero-Secret Policy:** This file contains **NO** plaintext credentials, tokens, or connection strings. It serves strictly as an operational runbook and governance matrix.

---

## 📋 1. Production Secrets Matrix

| # | Secret Identifier | Scope & Component | Where Stored | Rotation Frequency | Rotation Procedure | Access / Owner |
|:---:|:---|:---|:---|:---:|:---|:---:|
| **1** | `SUPABASE_DB_PASSWORD` | PostgreSQL Database & Vector Store | Supabase Dashboard + Railway Environment | Immediate (Prior to Launch), then 90 days | Dashboard → Settings → Database → Reset Password | Lead Architect / Omar |
| **2** | `REDIS_URL` | Distributed Cache & Async Queue | Upstash Console + Railway Environment | Immediate (Prior to Launch), then 90 days | Console → Database Details → Reset Password / Rotate Token | Lead Architect / Omar |
| **3** | `JWT_SECRET` | Auth Token Signatures & Verification | Railway Environment Variables | Immediate, then 90 days | Run `python scripts/generate_secrets.py` | Lead Architect / Omar |
| **4** | `APP_SECRET` | Backend Application Encryption Key | Railway Environment Variables | Immediate, then 90 days | Run `python scripts/generate_secrets.py` | Lead Architect / Omar |
| **5** | `SUPABASE_SERVICE_ROLE_KEY` | Backend Admin Operations (Bypasses RLS) | Railway Environment Variables | On compromise or 180 days | Dashboard → Settings → API → Rotate JWT Secret | Lead Architect / Omar |

---

## 🔄 2. Step-by-Step Secrets Rotation Procedures

### Procedure 1: Supabase Database Password Rotation
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select the `PR-AI-WORKFORCE` project.
3. Navigate to **Project Settings** (gear icon) → **Database**.
4. Scroll down to **Database password** and click **Reset Database Password**.
5. Generate a high-entropy password (min 24 characters, alphanumeric + symbols).
6. Update the connection string:
   - Construct transaction pooler URL: `postgresql://postgres.[project-ref]:[new-password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
   - Update in Railway production environment variables: `DATABASE_URL` and `DATABASE_POOLER_URL`.
   - Update in local developer `.env.production` (never commit).
7. Trigger backend redeployment and verify with:
   ```bash
   curl -s https://api.yourdomain.com/health
   # Verify: "database": "connected (PostgreSQL 17)"
   ```

### Procedure 2: Upstash Redis Token Rotation
1. Log in to the [Upstash Console](https://console.upstash.com/).
2. Select your Redis database instance.
3. Under **Database Details**, locate the **Password / REST Token** section.
4. Click **Reset Password** / **Rotate Token**.
5. Copy the new `rediss://default:[token]@[host]:6379` connection string.
6. Update `REDIS_URL` in Railway environment variables.
7. Verify live cache connectivity:
   ```bash
   curl -s https://api.yourdomain.com/health/redis
   # Verify: "status": "connected", "ping": true
   ```

### Procedure 3: Internal Cryptographic Secrets (`JWT_SECRET`, `APP_SECRET`)
1. In a secure terminal on your local machine, execute:
   ```bash
   python scripts/generate_secrets.py
   ```
2. The script outputs fresh 256-bit cryptographically secure hexadecimal strings.
3. Copy the output values directly into your password manager and update Railway production settings:
   - `JWT_SECRET = <generated-64-hex>`
   - `APP_SECRET = <generated-64-hex>`
4. Close the terminal window to clear stdout history.

---

## 🛡️ 3. Security Hygiene Checklist

- [x] All production environment variables are stored strictly in Railway / cloud hosting dashboards, never committed to Git.
- [x] `.env.production` is strictly excluded in `.gitignore` (verified: 0 commits in git history).
- [x] No hardcoded passwords, tokens, or fallback secrets exist in codebase source files (verified: 0 findings).
- [x] Database credentials connect strictly via PgBouncer Pooler on port `6543` using TLS.
- [x] Redis connects strictly via `rediss://` with TLS 1.3 enforced.

---

## ⏳ 4. Pending Activation

- [ ] `.github/workflows/retention.yml` — pending GitHub remote push
- [ ] `.github/workflows/performance.yml` — pending GitHub remote push
- [ ] `SUPABASE_SERVICE_ROLE_KEY` rotation — deferred until pre-launch maintenance window

