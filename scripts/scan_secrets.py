#!/usr/bin/env python3
"""
PR AI WORKFORCE - Codebase Secret Scanner
Scans source files under apps/ for hardcoded passwords, tokens, API keys, or credentials.
"""

import re
import glob
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent

PATTERNS = [
    re.compile(r'(password|secret|api_key|token)\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE),
    re.compile(r'(postgresql|postgres|rediss?):\/\/[^:]+:[^@]+@', re.IGNORECASE),
    re.compile(r'ey[a-zA-Z0-9_-]{20,}\.ey[a-zA-Z0-9_-]{20,}', re.IGNORECASE),  # JWT tokens
]

EXCLUDE_DIRS = {".git", ".next", "node_modules", ".pytest_cache", ".lighthouseci", "scratch"}

findings = []

for py_path in ROOT_DIR.glob("apps/**/*.py"):
    # Skip excluded directories
    if any(ex in py_path.parts for ex in EXCLUDE_DIRS):
        continue
    
    with open(py_path, "r", encoding="utf-8", errors="ignore") as f:
        for line_num, line in enumerate(f, 1):
            line_stripped = line.strip()
            # Ignore comments and standard environment variable lookups
            if line_stripped.startswith("#") or "os.getenv" in line or "os.environ" in line or "pydantic_settings" in line:
                continue
            
            for pat in PATTERNS:
                match = pat.search(line_stripped)
                if match:
                    # Filter out obvious false positives like mock/test fixtures and type annotations
                    matched_text = match.group(0).lower()
                    if any(fp in matched_text for fp in ["mock", "dummy", "test", "your-", "optional", "field(", "str ="]):
                        continue
                    findings.append({
                        "file": str(py_path.relative_to(ROOT_DIR)),
                        "line": line_num,
                        "snippet_pattern": match.group(1) if match.groups() else "connection_uri"
                    })

print(f"=== SECRETS SCAN RESULT ===")
print(f"Total potential hardcoded secrets found: {len(findings)}")
for item in findings:
    print(f"  • {item['file']}:{item['line']} (Matched pattern: {item['snippet_pattern']})")

if not findings:
    print("✅ Zero hardcoded credentials or connection URIs detected in production application source code.")
