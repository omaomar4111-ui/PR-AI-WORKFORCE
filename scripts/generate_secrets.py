#!/usr/bin/env python3
"""
PR AI WORKFORCE - Cryptographic Secrets Generator
Generates high-entropy (256-bit / 64 hex characters) secrets for production use.
Supports safe output to ignored files for automated rotation.
"""

import argparse
import secrets
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def verify_file_is_git_ignored(filepath: Path) -> bool:
    """Verifies that the target output file is ignored by Git before writing secrets to it."""
    try:
        res = subprocess.run(
            ["git", "check-ignore", str(filepath.name)],
            cwd=str(filepath.parent),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return res.returncode == 0
    except Exception:
        # Fallback to checking .gitignore content directly
        gitignore_path = filepath.parent / ".gitignore"
        if gitignore_path.exists():
            with open(gitignore_path, "r", encoding="utf-8") as f:
                content = f.read()
                return filepath.name in content
        return False


def generate_production_secrets(output_file: str = None, append: bool = False):
    jwt_secret = secrets.token_hex(32)
    app_secret = secrets.token_hex(32)
    session_secret = secrets.token_hex(32)

    print("=" * 70)
    print("🔐 NEW CRYPTOGRAPHIC PRODUCTION SECRETS GENERATED")
    print("=" * 70)
    print(f"JWT_SECRET     = ****...{jwt_secret[-4:]}")
    print(f"APP_SECRET     = ****...{app_secret[-4:]}")
    print(f"SESSION_SECRET = ****...{session_secret[-4:]}")
    print("-" * 70)

    if output_file:
        out_path = Path(output_file).resolve()
        if not verify_file_is_git_ignored(out_path):
            print(f"❌ خطأ أمني حرج: الملف '{out_path.name}' غير مدرج في .gitignore!")
            print("أضف الملف إلى .gitignore أولاً قبل محاولة حفظ الأسرار فيه.")
            sys.exit(1)

        mode = "a" if append else "w"
        with open(out_path, mode, encoding="utf-8") as f:
            if append and out_path.exists() and out_path.stat().st_size > 0:
                f.write("\n")
            f.write("# Generated Secrets from generate_secrets.py\n")
            f.write(f"NEW_JWT_SECRET={jwt_secret}\n")
            f.write(f"NEW_APP_SECRET={app_secret}\n")
            f.write(f"NEW_SESSION_SECRET={session_secret}\n")

        print(f"✅ تم حفظ المفاتيح بنجاح في: {out_path.name} (المحمي في .gitignore)")
        print("⚠️ تذكير: احذف هذا الملف فور انتهاء عملية الـ Rotation عبر scripts/apply_rotation.py")
    else:
        print("⚠️  تنبيه: لتخزين المفاتيح في ملف مؤقت محمي، استخدم:")
        print("   python scripts/generate_secrets.py --output-file NEW_SECRETS.txt --append")

    print("=" * 70)
    return {
        "JWT_SECRET": jwt_secret,
        "APP_SECRET": app_secret,
        "SESSION_SECRET": session_secret,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate 256-bit cryptographic secrets for PR AI Workforce.")
    parser.add_argument("--output-file", type=str, default=None, help="Path to temporary secrets file (must be gitignored)")
    parser.add_argument("--append", action="store_true", help="Append to existing output file instead of overwriting")
    args = parser.parse_args()

    generate_production_secrets(output_file=args.output_file, append=args.append)
