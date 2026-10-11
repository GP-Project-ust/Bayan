#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""فحص سريع لجاهزية خدمات بيان من الطرفية — دون تشغيل التطبيق.

الاستخدام (من جذر المستودع):
    python3 scripts/check_services.py
"""

import socket
import sys

import httpx

CHECKS = [
    ("قاعدة المنصة (PostgreSQL)", "localhost", 5432, None),
    ("Redis", "localhost", 6379, None),
    ("Qdrant (متجهات)", "localhost", 6333, "http://localhost:6333/healthz"),
    ("Ollama (LLM)", "localhost", 11434, "http://localhost:11434/api/tags"),
]


def check_tcp(name: str, host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=2):
            return True
    except OSError:
        return False


def check_http(url: str) -> bool:
    try:
        return httpx.get(url, timeout=2).status_code < 500
    except httpx.HTTPError:
        return False


def main() -> int:
    print("فحص خدمات بيان\n" + "=" * 46)
    all_up = True
    for name, host, port, url in CHECKS:
        ok = check_http(url) if url else check_tcp(name, host, port)
        mark = "يعمل" if ok else "متوقف"
        print(f"  {name:<28} {mark}")
        all_up = all_up and ok

    print("=" * 46)
    if all_up:
        print("كل الخدمات جاهزة.")
        return 0
    print("بعض الخدمات متوقفة — شغّلها بـ:  make infra   (و Ollama بـ: make llm)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
