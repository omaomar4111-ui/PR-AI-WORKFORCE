# 🤝 PR AI WORKFORCE — Production Manual Handoff & Launch Guide

**Status:** ✅ **100% of Programmatic Production Hardening Complete**  
**Pre-Launch Status:** ⏳ **Secrets Rotation Deferred to Pre-Launch Window**

---

## 🔴 Manual Steps (بالترتيب)

### 1. Railway Setup (10 دقائق)
- [ ] Sign up على https://railway.com
- [ ] اتبع [docs/RAILWAY_SETUP.md](RAILWAY_SETUP.md)
- [ ] Deploy backend + frontend:
  - خدمة `api` عبر `Dockerfile.api` (Healthcheck: `/health`, Port: 8000)
  - خدمة `web` عبر `Dockerfile.web` (Healthcheck: `/`, Port: 3000)
  - اختيار النطاق الجغرافي: **Western Europe (`eu-west-1`)**
  - تعيين متغيرات البيئة (من `.env.production` دون تعديل)

### 2. GitHub Push (5 دقائق)
- [ ] Create private repo على GitHub باسم `PR-AI-WORKFORCE`
- [ ] `git remote add origin <url>`
- [ ] `git push -u origin master`
- [ ] أضف secrets في المستودع: **Settings** → **Secrets and variables** → **Actions**:
  - `SUPABASE_DB_URL` = سلسلة اتصال قاعدة البيانات

### 3. Final Smoke Test
- [ ] `python scripts/smoke_test_staging.py --base-url <railway-url>`
- [ ] `python scripts/measure_prod_infra.py --base-url <railway-url>`

---

## ⏳ Pre-Launch (مرة واحدة قبل الجمهور)
- [ ] Rotation ([docs/ROTATION_GUIDE.md](ROTATION_GUIDE.md)):
  - تدوير كلمة مرور Supabase DB من Console
  - تدوير Upstash Redis Token من Console
  - تشغيل:
    ```bash
    python scripts/generate_secrets.py --output-file NEW_SECRETS.txt
    # إضافة الروابط الجديدة في NEW_SECRETS.txt
    python scripts/verify_rotation.py
    python scripts/apply_rotation.py
    ```
- [ ] Re-deploy بالقيم الجديدة على Railway
- [ ] Re-run smoke test:
  ```bash
  python scripts/smoke_test_staging.py --base-url <railway-url>
  ```

---

## ✅ ما تم آلياً
- **Dockerfiles + railway.toml:**
  - `railway.toml` مع صحة الـ Healthcheck والـ Restart Policy
  - `Dockerfile.api` (multi-stage, python:3.11-slim, non-root `appuser`, EXPOSE 8000)
  - `Dockerfile.web` (multi-stage, node:20-alpine, non-root `node`, EXPOSE 3000, standalone)
  - `.dockerignore` مستثني كافة ملفات الأسرار والـ cache
- **Scripts:**
  - `scripts/backup_supabase.py` (نسخ احتياطي مضغوط `db_*.dump.gz` مع SHA256 وحذف ما زاد عن 7 أيام)
  - `scripts/smoke_test_staging.py` (اختبارات a, b, c, d, e بنجاح 100%)
  - `scripts/measure_prod_infra.py` (قياس TTFB, Redis RTT, DB RTT والمقارنة بالـ Baseline)
- **Docs:**
  - `docs/RAILWAY_SETUP.md` (دليل النشر والربط السحابي خطوة بخطوة)
  - `docs/DR_RUNBOOK.md` (خطة التعافي من الكوارث RTO < 30m, RPO < 24h لـ 3 سيناريوهات)
  - `docs/DEPLOY_CHECKLIST.md` (قائمة التحقق الشاملة للإطلاق)
  - `docs/MANUAL_HANDOFF.md` (دليل التسليم النهائي)
- **Auth Hardening:**
  - Rate limiting على `/api/auth/login` و `/api/auth/register` (حد 5 طلبات/دقيقة مع إغلاق 15 دقيقة بعد 10 محاولات فاشلة مدعوماً بـ Redis)
  - JWT expiry check (15 دقيقة للوصول access token، 7 أيام للتجديد refresh token)
  - فحص قوة كلمة المرور (min 8 chars, uppercase, lowercase, digit)
- **Tests Pass:**
  - **74/74 اختباراً قديماً ناجحاً 100% دون أي تعديل** + 13 اختباراً أمنياً جديداً (إجمالي 87 اختباراً).
