#!/usr/bin/env bash
# =============================================================================
# بيان — تجهيز بيئة التطوير المحلية
# =============================================================================
set -e

echo "=========================================="
echo "  تجهيز بيئة تطوير بيان"
echo "=========================================="

# ---------- 1) فحص المتطلبات ----------
echo ""
echo "[1/4] فحص المتطلبات..."
command -v python3 >/dev/null || { echo "خطأ: python3 غير مثبت"; exit 1; }
command -v node    >/dev/null || { echo "خطأ: node غير مثبت"; exit 1; }
command -v docker  >/dev/null || echo "تنبيه: docker غير موجود — البنية التحتية عبر compose لن تعمل"

# ---------- 2) ملف البيئة ----------
echo ""
echo "[2/4] ملف البيئة..."
if [ -f .env ]; then
    echo "‎.env موجود — تم تجاوز النسخ"
else
    cp .env.example .env
    echo "تم إنشاء ‎.env من القالب — راجع قيم بيئة الاختبار فيه"
fi

# ---------- 3) الواجهة الخلفية ----------
echo ""
echo "[3/4] تجهيز الواجهة الخلفية (Python)..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet -r requirements.txt
echo "تم. التشغيل:  source .venv/bin/activate && uvicorn app.main:app --reload"
cd ..

# ---------- 4) الواجهة الأمامية ----------
echo ""
echo "[4/4] تجهيز الواجهة الأمامية (Node)..."
cd frontend
npm install
cd ..

echo ""
echo "=========================================="
echo "  اكتمل التجهيز — الخطوات التالية:"
echo "=========================================="
echo "  1) make infra          # قواعد البيانات + Redis + Qdrant"
echo "  2) make backend-dev    # الواجهة الخلفية على :8000"
echo "  3) make frontend-dev   # الواجهة الأمامية على :3000"
echo ""
echo "  بيئة الاختبار (Odoo): راجع database/README.md"
