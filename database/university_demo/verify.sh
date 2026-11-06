#!/usr/bin/env bash
# =============================================================================
# بيان — التحقق الشامل من القاعدة التجريبية الموحدة
# =============================================================================
# يعمل محلياً وفي CI (set -euo pipefail). يفحص:
#   [1] وجود كل الجداول               [2] عدد الطلاب > 400
#   [3] المشاهد الثلاثة تعيد بياناتاً  [4] bayan_reader يقرأ v_student_profile
#   [5] bayan_reader يُرفض عند DROP TABLE (اختبار سالب إلزامي)
#   [6] bayan_reader يُرفض عند INSERT     (اختبار سالب إلزامي)
#
# الاستخدام:
#   bash database/university_demo/verify.sh
#
# يحتاج أحد مسارين للاتصال (يكتشفهما تلقائياً بالترتيب):
#   أ) عميل psql مثبت محلياً           ب) docker compose (خدمة university-db)
#
# متغيرات البيئة (اختيارية):
#   DB_HOST (افتراضي localhost)      DB_PORT (افتراضي 5433)
#   DB_NAME (افتراضي university)     DB_ADMIN_USER (افتراضي odoo)
#   DB_ADMIN_PASSWORD (افتراضي odoo) READER_USER (افتراضي bayan_reader)
#   READER_PASSWORD (افتراضي bayan_dev_reader)
#   ملاحظة: يمكن جعل DB_HOST مسار مجلد socket يمني (مثل /tmp/pgdata) — يعمل مع psql.
# =============================================================================

set -euo pipefail

# العمل دائماً من جذر المستودع (حتى يُعثر على docker-compose.yml في مسار docker)
cd "$(dirname "$0")/../.."

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-university}"
DB_ADMIN_USER="${DB_ADMIN_USER:-odoo}"
DB_ADMIN_PASSWORD="${DB_ADMIN_PASSWORD:-odoo}"
READER_USER="${READER_USER:-bayan_reader}"
READER_PASSWORD="${READER_PASSWORD:-bayan_dev_reader}"

# ---------------------------------------------------------------------------
# اختيار مسار الاتصال: psql المحلي أولاً، ثم docker compose
# ---------------------------------------------------------------------------
if command -v psql >/dev/null 2>&1; then
    admin_psql() {
        PGPASSWORD="$DB_ADMIN_PASSWORD" psql -X -q -v ON_ERROR_STOP=1 \
            -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" "$@"
    }
    reader_psql() {
        PGPASSWORD="$READER_PASSWORD" psql -X -q -v ON_ERROR_STOP=1 \
            -h "$DB_HOST" -p "$DB_PORT" -U "$READER_USER" -d "$DB_NAME" "$@"
    }
elif command -v docker >/dev/null 2>&1 && docker compose config >/dev/null 2>&1; then
    admin_psql() {
        docker compose exec -T university-db \
            psql -X -q -v ON_ERROR_STOP=1 -U "$DB_ADMIN_USER" -d "$DB_NAME" "$@"
    }
    reader_psql() {
        docker compose exec -T -e PGPASSWORD="$READER_PASSWORD" university-db \
            psql -X -q -v ON_ERROR_STOP=1 -U "$READER_USER" -d "$DB_NAME" "$@"
    }
else
    echo "❌ لا يوجد عميل psql ولا docker compose — لا يمكن التحقق من القاعدة"
    exit 1
fi

echo "=============================================="
echo "  التحقق من القاعدة التجريبية الموحدة (بيان)"
echo "  الهدف: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "=============================================="

# ---------------------------------------------------------------------------
# [1] فحص وجود الجداول
# ---------------------------------------------------------------------------
echo ""
echo "── [1/6] فحص وجود الجداول ──"
TABLES=(
    res_partner op_department op_course op_batch op_student op_faculty
    op_student_fees_details op_subject op_student_course_rel
)
for table in "${TABLES[@]}"; do
    exists="$(admin_psql -tAc "SELECT to_regclass('public.${table}') IS NOT NULL")"
    if [[ "$exists" != "t" ]]; then
        echo "❌ الجدول ${table} غير موجود — هل طبّقت 01_schema.sql؟"
        exit 1
    fi
    echo "   ✅ ${table}"
done

# ---------------------------------------------------------------------------
# [2] عدد الطلاب أكبر من 400
# ---------------------------------------------------------------------------
echo ""
echo "── [2/6] فحص عدد الطلاب ──"
student_count="$(admin_psql -tAc 'SELECT COUNT(*) FROM op_student')"
if (( student_count > 400 )); then
    echo "   ✅ عدد الطلاب: ${student_count} (أكبر من 400)"
else
    echo "❌ عدد الطلاب ${student_count} غير كافٍ (المطلوب أكثر من 400) — شغّل 02_seed.py"
    exit 1
fi

# ---------------------------------------------------------------------------
# [3] المشاهد الثلاثة تعيد بياناتاً
# ---------------------------------------------------------------------------
echo ""
echo "── [3/6] فحص المشاهد ──"
VIEWS=(v_student_profile v_fees_summary v_program_stats)
for view in "${VIEWS[@]}"; do
    view_count="$(admin_psql -tAc "SELECT COUNT(*) FROM ${view}")" || {
        echo "❌ فشل الاستعلام من المشهد ${view}"
        exit 1
    }
    if (( view_count > 0 )); then
        echo "   ✅ ${view} يعيد ${view_count} صفاً"
    else
        echo "❌ المشهد ${view} لا يعيد أية بيانات"
        exit 1
    fi
done

# ---------------------------------------------------------------------------
# [4] دور القارئ bayan_reader يقرأ v_student_profile بنجاح
# ---------------------------------------------------------------------------
echo ""
echo "── [4/6] صلاحيات القراءة لدور bayan_reader ──"
reader_count="$(reader_psql -tAc 'SELECT COUNT(*) FROM v_student_profile')" || {
    echo "❌ bayan_reader لم يتمكن من قراءة v_student_profile"
    exit 1
}
echo "   ✅ bayan_reader قرأ v_student_profile (${reader_count} صفاً)"

# عينة حقيقية من المشهد بصلاحية القارئ (تثبت سلامة البيانات العربية)
sample="$(reader_psql -tAc \
    "SELECT student_name || ' — ' || program_name || ' — ' || city FROM v_student_profile LIMIT 1")"
echo "   ✅ عينة من المشهد: ${sample}"

# ---------------------------------------------------------------------------
# [5] اختبار سالب (إلزامي): bayan_reader يُرفض عند DROP TABLE
#     الأمر يجب أن يفشل — وفشله هنا هو النجاح
# ---------------------------------------------------------------------------
echo ""
echo "── [5/6] رفض الحذف (DROP TABLE) لدور bayan_reader ──"
if reader_psql -c "DROP TABLE op_student" >/dev/null 2>&1; then
    echo "❌ ثغرة أمنية: bayan_reader استطاع حذف جدول!"
    exit 1
else
    echo "   ✅ حُجب DROP TABLE عن bayan_reader كما هو مطلوب (قراءة فقط)"
fi

# ---------------------------------------------------------------------------
# [6] اختبار سالب (إلزامي): bayan_reader يُرفض عند INSERT
# ---------------------------------------------------------------------------
echo ""
echo "── [6/6] رفض الإدراج (INSERT) لدور bayan_reader ──"
if reader_psql -c \
    "INSERT INTO op_student (roll_number, partner_id, course_id, batch_id, gender)
     VALUES ('YU9999999', 1, 1, 1, 'ذكر')" >/dev/null 2>&1
then
    echo "❌ ثغرة أمنية: bayan_reader استطاع إدراج بيانات!"
    exit 1
else
    echo "   ✅ حُجب INSERT عن bayan_reader كما هو مطلوب (قراءة فقط)"
fi

# ---------------------------------------------------------------------------
# النتيجة النهائية
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "✅ اكتمل التحقق بنجاح — القاعدة التجريبية الموحدة جاهزة لكل الفريق"
echo "   الاتصال بصلاحية القراءة فقط:"
echo "   PGPASSWORD=${READER_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${READER_USER} -d ${DB_NAME}"
echo "=============================================="
