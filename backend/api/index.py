"""نقطة دخول Vercel — تُعرّض تطبيق FastAPI لبيان عبر مشغل Python.

مشغل Vercel Python يتعرف على تطبيق ASGI باسم ``app`` في ملف الدالة،
والمسارات الواردة تصل كما هي إلى التطبيق (انظر vercel.json — كل
المسارات تُوجَّه إلى هذه الدالة فيستلم FastAPI مساره الأصلي).
"""

import sys
from pathlib import Path

# ضمان وصول حزمة app من جذر النشر (backend/)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402, F401 — تعرّف تطبيق ASGI لمشغل Vercel
