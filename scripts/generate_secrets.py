#!/usr/bin/env python3
"""
PR AI WORKFORCE - Cryptographic Secrets Generator
Generates high-entropy (256-bit / 64 hex characters) secrets for production use.
These values are printed ONCE to stdout and are NEVER persisted to disk automatically.
"""

import secrets
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def generate_production_secrets():
    jwt_secret = secrets.token_hex(32)
    app_secret = secrets.token_hex(32)
    session_secret = secrets.token_hex(32)

    print("=" * 70)
    print("🔐 NEW CRYPTOGRAPHIC PRODUCTION SECRETS GENERATED")
    print("=" * 70)
    print("⚠️  تحذير هام:")
    print("احفظ هذه القيم الآن في بيئة آمنة (مثل 1Password أو إعدادات لوحة تحكم Railway).")
    print("لن يتم تخزين هذه القيم في أي ملف محلي ولن يتم طباعتها مجدداً.")
    print("-" * 70)
    print(f"JWT_SECRET     = {jwt_secret}")
    print(f"APP_SECRET     = {app_secret}")
    print(f"SESSION_SECRET = {session_secret}")
    print("=" * 70)
    print("✅ تم التوليد بنجاح. انسخ القيم واقفل التيرمينال فوراً.")

if __name__ == "__main__":
    generate_production_secrets()
