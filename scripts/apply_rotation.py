#!/usr/bin/env python3
"""
PR AI WORKFORCE - Secrets Rotation Applier
Applies rotated secrets from NEW_SECRETS.txt into .env.production safely.
Automatically creates a timestamped backup of .env.production and deletes NEW_SECRETS.txt upon completion.
"""

import os
import shutil
import sys
import datetime
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
NEW_SECRETS_PATH = ROOT_DIR / "NEW_SECRETS.txt"
ENV_PROD_PATH = ROOT_DIR / ".env.production"


def apply_rotation():
    print("=" * 70)
    print("🚀 APPLYING ROTATED SECRETS TO .env.production")
    print("=" * 70)

    if not NEW_SECRETS_PATH.exists():
        print(f"❌ خطأ: لم يتم العثور على ملف '{NEW_SECRETS_PATH.name}'.")
        print("تأكد من إنشاء الملف وتوليد المفاتيح أولاً عبر docs/ROTATION_GUIDE.md.")
        sys.exit(1)

    # 1. Parse NEW_SECRETS.txt
    new_values = {}
    with open(NEW_SECRETS_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                new_values[k.strip()] = v.strip().strip('"').strip("'")

    mapping = {
        "NEW_DATABASE_URL": ["DATABASE_URL", "DATABASE_POOLER_URL"],
        "NEW_REDIS_URL": ["REDIS_URL"],
        "NEW_JWT_SECRET": ["JWT_SECRET"],
        "NEW_APP_SECRET": ["APP_SECRET"],
        "NEW_SESSION_SECRET": ["SESSION_SECRET"],
    }

    # 2. Create timestamped backup of .env.production
    if ENV_PROD_PATH.exists():
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = ROOT_DIR / f".env.production.bak.{timestamp}"
        shutil.copyfile(ENV_PROD_PATH, backup_path)
        print(f"📦 تم إنشاء نسخة احتياطية آمنة في: {backup_path.name}")
    else:
        print("⚠️ .env.production غير موجود حالياً، سيتم إنشاؤه جديداً.")

    # 3. Read current env lines or initialize
    existing_lines = []
    updated_keys = set()
    if ENV_PROD_PATH.exists():
        with open(ENV_PROD_PATH, "r", encoding="utf-8") as f:
            existing_lines = f.readlines()

    # Build update dictionary
    replacements = {}
    for new_k, target_keys in mapping.items():
        if new_k in new_values:
            val = new_values[new_k]
            for tk in target_keys:
                replacements[tk] = val

    new_lines = []
    seen_keys = set()
    for line in existing_lines:
        line_clean = line.strip()
        if "=" in line_clean and not line_clean.startswith("#"):
            k = line_clean.split("=", 1)[0].strip()
            if k in replacements:
                new_lines.append(f"{k}={replacements[k]}\n")
                seen_keys.add(k)
                updated_keys.add(k)
                continue
        new_lines.append(line)

    # Append any keys that did not exist previously
    for tk, val in replacements.items():
        if tk not in seen_keys:
            new_lines.append(f"{tk}={val}\n")
            updated_keys.add(tk)

    # 4. Write updated .env.production
    with open(ENV_PROD_PATH, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    # 5. Securely delete NEW_SECRETS.txt
    try:
        os.remove(NEW_SECRETS_PATH)
        print(f"🧹 تم حذف ملف الأسرار المؤقت '{NEW_SECRETS_PATH.name}' بنجاح.")
    except Exception as e:
        print(f"⚠️ تنبيه: يرجى حذف '{NEW_SECRETS_PATH.name}' يدوياً: {e}")

    print("-" * 70)
    print("✅ تم تحديث المفاتيح الآتية في .env.production بنجاح:")
    for k in sorted(updated_keys):
        print(f"  • {k} (Updated & Rotated)")
    print("=" * 70)
    print("🎉 اكتمل تدوير الأسرار بنجاح! يمكنك الآن إعادة تشغيل خوادم التطبيق.")


if __name__ == "__main__":
    apply_rotation()
