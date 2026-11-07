# 🔄 Manual Secrets Rotation Guide (PR AI WORKFORCE)

This operational guide provides the exact step-by-step procedures to manually rotate all production credentials and cryptographic keys before deployment.

---

## 🎯 Architecture & Workflow Overview

```mermaid
flowchart TD
    subgraph Manual_Dashboards ["👤 1. Manual Dashboard Actions (User)"]
        SupabaseReset["Supabase Dashboard\nReset Database Password"]
        UpstashReset["Upstash Console\nReset Redis Password / Token"]
    end

    subgraph Temp_File ["📄 2. Safe Temporary Staging"]
        NewSecretsTxt["NEW_SECRETS.txt\n(Strictly Git-Ignored)"]
    end

    subgraph Automation_Scripts ["🤖 3. Verification & Application Scripts"]
        GenSecrets["python scripts/generate_secrets.py\n--output-file NEW_SECRETS.txt --append"]
        VerifyScript["python scripts/verify_rotation.py\n(Verifies connectivity & diffs)"]
        ApplyScript["python scripts/apply_rotation.py\n(Updates .env.production & purges temp)"]
    end

    SupabaseReset -->|Paste NEW_DATABASE_URL| NewSecretsTxt
    UpstashReset -->|Paste NEW_REDIS_URL| NewSecretsTxt
    GenSecrets -->|Appends JWT/APP secrets| NewSecretsTxt
    NewSecretsTxt --> VerifyScript
    VerifyScript -->|On PASS| ApplyScript
```

---

## 📋 Step-by-Step Instructions

### Step 1: Supabase Database Password Rotation (2 minutes)
1. Navigate to: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your `PR-AI-WORKFORCE` project.
3. Open **Project Settings** (gear icon) → **Database**.
4. Scroll down to **Database password** and click **Reset Database Password**.
5. Generate a secure random password (min 24 characters).
6. Copy the password to your password manager immediately.
7. Under **Connection string**, select **URI** and copy the **Session pooler** (Port 5432 or 6543 Transaction pooler).
8. Open or create `NEW_SECRETS.txt` in the project root:
   ```text
   NEW_DATABASE_URL=postgresql://postgres.[project-ref]:[NEW_PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
   ```

---

### Step 2: Upstash Redis Token Rotation (2 minutes)
1. Navigate to: [https://console.upstash.com](https://console.upstash.com)
2. Select your Redis database.
3. In the **Details** tab, locate **Password / REST Token**.
4. Click **Reset Password** / **Rotate Token**.
5. Copy the updated `rediss://` connection URL.
6. Append it to `NEW_SECRETS.txt`:
   ```text
   NEW_REDIS_URL=rediss://default:[NEW_TOKEN]@[host].upstash.io:6379
   ```

---

### Step 3: Generate Cryptographic App Secrets (10 seconds)
Run the automated secret generator in your terminal to append fresh 256-bit hexadecimal keys to `NEW_SECRETS.txt`:
```bash
python scripts/generate_secrets.py --output-file NEW_SECRETS.txt --append
```
This automatically appends:
- `NEW_JWT_SECRET`
- `NEW_APP_SECRET`
- `NEW_SESSION_SECRET`

---

### Step 4: Verification & Safe Application (1 minute)
1. Verify that `NEW_SECRETS.txt` is strictly ignored by Git:
   ```bash
   git check-ignore NEW_SECRETS.txt
   # Expected output: NEW_SECRETS.txt
   ```
2. Run the automated rotation pre-flight verification:
   ```bash
   python scripts/verify_rotation.py
   # Expected: All checks PASS (Database SELECT 1 and Redis PING verified)
   ```
3. Apply the rotation to `.env.production` and purge the temporary file:
   ```bash
   python scripts/apply_rotation.py
   # Automatically creates a backup (.env.production.bak.<timestamp>)
   # and securely deletes NEW_SECRETS.txt
   ```

---

## 🛡️ Security Rules

1. **NEVER commit `NEW_SECRETS.txt`** — it is protected in `.gitignore`.
2. **NEVER share raw secrets in chat or logs**.
3. **Rollback:** If any issue occurs, restore `.env.production` from its timestamped backup (`.env.production.bak.*`).
