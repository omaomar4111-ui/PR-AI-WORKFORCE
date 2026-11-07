# ⚡ دليل إعداد وتفعيل Upstash Redis (Upstash Redis Setup Guide)

يوضح هذا الدليل الخطوات السريعة لإنشاء وربط قاعدة بيانات **Upstash Redis** السحابية مع منصة **PR AI WORKFORCE**، لتشغيل طبقة الكاش (Caching Layer) وطوابور المهام.

---

## 1. خطوات إنشاء قاعدة البيانات في Upstash (3 دقائق)

1. توجه إلى [Upstash Console](https://console.upstash.com/redis) وسجّل الدخول بحسابك.
2. انقر على زر **"Create Database"**.
3. قم بملء الحقول بدقة كالتالي:
   * **Name:** `pr-ai-workforce`
   * **Type:** اختر **Regional** (أسرع وأقل تكلفة للمنطقة المحددة).
   * **Region:** اختر **`eu-west-1` (Ireland)** ⚠️ *(إجباري لتقليل زمن RTT ليتطابق جغرافياً مع خادم Supabase في أيرلندا)*.
   * **TLS:** تأكد من تفعيله ✅ **Enabled** (يضمن التشفير التام).
   * **Eviction:** تأكد من تفعيله ✅ **Enabled** واختر `allkeys-lru` (لحذف المفاتيح الأقل استخداماً عند امتلاء السعة تلقائياً).
4. انقر على **"Create"**.

---

## 2. نسخ رابط الاتصال الآمن (rediss:// URL)

1. داخل صفحة تفاصيل قاعدة البيانات المنشأة، افتح تبويب **"Connect"**.
2. في قسم **Redis**، اختر خيار الاتصال **`rediss://`** (لاحظ حرف `s` الإضافي المشير إلى التشفير بـ TLS).
3. انقر على زر **Copy** لنسخ الرابط بالكامل.
   * *الشكل النموذجي للرابط:*
     ```text
     rediss://default:AbCdEf12345...@eu1-pro-xxxx.upstash.io:6379
     ```

---

## 3. وضع الرابط في المتغيرات البيئية

### أ. محلياً في `.env.production`
أضف الرابط إلى ملف `.env.production` في جذر المشروع:
```bash
REDIS_URL=rediss://default:<YOUR_PASSWORD>@<YOUR_HOST>:6379
```
> [!IMPORTANT]
> ملف `.env.production` مدرج بالفعل في `.gitignore` لمنع رفعه بالخطأ إلى Git. لا تعرض هذا الرابط أو كلمة المرور في أي شات أو مستودع عام.

### ب. سحابياً في لوحة تحكم Railway
1. افتح مشروعك على [Railway Dashboard](https://railway.app).
2. افتح خدمة الباك إند (`apps/api`).
3. انتقل إلى تبويب **Variables**.
4. أضف أو حدّث المتغير:
   * **Key:** `REDIS_URL`
   * **Value:** الرابط المنسوخ `rediss://default:...`
5. انقر على **Save & Deploy**.

---

## 4. التحقق التلقائي من الاتصال (Verification)

بمجرد حفظ الرابط في `.env.production`، شغّل سكربت التحقق الميداني:

```bash
python scripts/verify_redis.py
```

### المخرجات المتوقعة عند النجاح:
```text
═══════════════════════════════════════════════════════════════
🔍 UPSTASH REDIS CONNECTION VERIFICATION
═══════════════════════════════════════════════════════════════
  Target Host: eu1-pro-xxxx.upstash.io:6379
  Protocol:    rediss (TLS Enforced)
  ✓ PING successful (Latency: 45.20 ms)
  ✓ Redis Engine Version: 7.2
  ✓ Cache Write/Read verified (TTL: 15s)
  ✓ Cleanup complete (test key deleted)
═══════════════════════════════════════════════════════════════
✅ REDIS CONNECTION VERIFIED SUCCESSFULLY
   Ready for Phase 2 Caching Layer.
═══════════════════════════════════════════════════════════════
```

عند ظهور هذه النتيجة، تكون قاعدة بيانات Redis جاهزة تماماً لـ **Phase 2**.
