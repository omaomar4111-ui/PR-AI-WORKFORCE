# 🔐 دليل تغيير وتأمين كلمة مرور Supabase (Supabase Password Rotation Guide)

لحماية قاعدة بيانات الإنتاج ومنع أي وصول غير مصرح به، تم إعداد هذا الدليل لتغيير كلمة مرور قاعدة البيانات وتحديث الروابط في البيئة المحلية وسحابة Railway.

> [!CAUTION]
> **تحذير أمني صارم:**  
> لا تقم بكتابة أو نسخ كلمة المرور في أي محادثة، أو لقطة شاشة، أو ارتكابها في Git. السكربتات المرفقة تقوم بطلب كلمة المرور في إدخال مخفي وتحديث الملفات دون طباعتها.

---

## 1. إعادة تعيين كلمة المرور في لوحة Supabase (دقيقتان)

1. افتح متصفحك وسجّل الدخول إلى [Supabase Dashboard](https://supabase.com/dashboard).
2. افتح مشروعك (`qqmfwkvwrsogveqwfuem`).
3. انتقل إلى القائمة الجانبية: **Project Settings** (أيقونة الترس ⚙️) → **Database**.
4. مرر لأسفل إلى قسم **Database Password**.
5. انقر على زر **Reset Database Password**.
6. أدخل كلمة مرور جديدة قوية (أو استخدم المولد التلقائي)، ثم انقر **Confirm**.
7. انسخ كلمة المرور الجديدة في مكان آمن مؤقتاً (Password Manager).

---

## 2. تحديث البيئة المحلية عبر السكربت التلقائي (دقيقة واحدة)

شغّل السكربت الآمن المخصص لتحديث `.env.production`:

```bash
python scripts/rotate_supabase_env.py
```

* **ما سيقوم به السكربت:**
  - يطلب منك إدخال كلمة المرور وتأكيدها (الإدخال مخفي تماماً لمنع ظهوره على الشاشة).
  - يقوم بترميز الرموز الخاصة تلقائياً (URL Encoding عبر `quote_plus`).
  - يحدّث كلا المتغيرين `DATABASE_URL` و `DATABASE_POOLER_URL` في ملف `.env.production`.

---

## 3. تحديث المتغيرات السحابية في Railway (دقيقة واحدة)

1. افتح [Railway Dashboard](https://railway.app).
2. افتح خدمة الباك إند الخاصة بمشروعك (`apps/api`).
3. انتقل إلى تبويب **Variables**.
4. قم بتحديث قيم:
   - `DATABASE_URL`: الرابط المحدث مع الباسورد الجديد (المنفذ `5432`).
   - `DATABASE_POOLER_URL`: رابط الـ Pooler المحدث (المنفذ `6543`).
5. انقر على **Save & Deploy**.

---

## 4. التحقق واختبار الاتصال الميداني (Smoke Test)

بعد تحديث `.env.production`، تحقق من نجاح الاتصال وسلامة الفهارس وصلاحيات RLS بتشغيل:

```bash
python scripts/smoke_test_production_db.py
```

### المخرجات المتوقعة عند النجاح:
```text
Connecting to production PostgreSQL database on Supabase...
▶ [1/4] Verifying 'vector' (pgvector) extension...
  ✓ pgvector extension verified (version: 0.8.0).
▶ [2/4] Verifying Table RLS Policies...
  ✓ All application tables have Row-Level Security strictly enforced.
▶ [3/4] Running transactional CRUD smoke test...
  ✓ Successfully created test records across organizations, clients, projects, tasks, and memory_embeddings.
  ✓ Vector retrieval verified.
▶ [4/4] Cleaning up smoke test records...
  ✓ Test records cleaned up. Database is pristine.

================================================================================
✅ PASSWORD ROTATION VERIFIED
🏆 PRODUCTION DATABASE VERIFICATION: 100% HEALTHY, SECURE & CERTIFIED.
================================================================================
```

بظهور هذه النتيجة، تكون قاعدة البيانات مؤمنة 100%، ويمكنك الرد بـ **"Supabase rotated"**.
