"""اختبارات واجهة الاختبار الموحدة (/dev/playground) ووكيل SQL."""

import psycopg
import pytest

from app.agents.sql_agent import (
    execute_readonly,
    guard_sql,
    match_template,
)
from app.core.config import get_settings

# ---------------------------------------------------------------------------
# الواجهة الموحدة
# ---------------------------------------------------------------------------


def test_playground_served_with_arabic_ui(client):
    response = client.get("/dev/playground")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    body = response.text
    # فحوص جوهر الواجهة: عربية RTL + عقد البث + مثال جاهز
    assert 'dir="rtl"' in body
    assert "/api/v1/chat/stream" in body
    assert "بيان" in body
    assert "كم عدد الطلاب في كل برنامج؟" in body


def test_playground_is_single_file_offline(client):
    """الواجهة ملف واحد بلا موارد خارجية — شرط الفريق (offline-first)."""
    body = client.get("/dev/playground").text
    assert "http://cdn" not in body
    assert "https://" not in body.split("<script>")[0][:2000]  # لا استيراد خارجي في الرأس
    assert "fonts.googleapis" not in body


# ---------------------------------------------------------------------------
# حارس SQL — القواعد القاطعة للسلامة
# ---------------------------------------------------------------------------


def test_guard_accepts_select_only():
    assert guard_sql("SELECT * FROM v_program_stats LIMIT 10;").startswith("SELECT")


def test_guard_rejects_destructive_statements():
    for evil in [
        "DROP TABLE op_student",
        "DELETE FROM res_partner",
        "UPDATE op_student SET gender='x'",
        "INSERT INTO op_course VALUES (1, 'x')",
        "GRANT ALL ON op_student TO public",
    ]:
        with pytest.raises(ValueError, match="الحارس يرفض"):
            guard_sql(evil)


def test_guard_rejects_multi_statement_injection():
    with pytest.raises(ValueError, match="عبارة واحدة"):
        guard_sql("SELECT 1; DROP TABLE op_student")


def test_template_matching_covers_core_questions():
    sql, view, _ = match_template("من الطلاب الذين عليهم رسوم متأخرة؟")
    assert view == "v_fees_summary" and "outstanding" in sql
    sql, view, _ = match_template("كم عدد الطلاب في كل برنامج؟")
    assert view == "v_program_stats" and "program_name" in sql


# ---------------------------------------------------------------------------
# التنفيذ الفعلي على القاعدة التجريبية — يتخطى تلقائياً إن غابت القاعدة
# (في CI تعمل القاعدة دائماً؛ محلياً: make dev-db)
# ---------------------------------------------------------------------------


def _database_available() -> bool:
    try:
        with psycopg.connect(get_settings().odoo_database_url, connect_timeout=2):
            return True
    except psycopg.OperationalError:
        return False


@pytest.mark.skipif(
    not _database_available(),
    reason="قاعدة الجامعة التجريبية غير متاحة — شغّل make dev-db",
)
class TestAgainstLiveUniversityDb:
    def test_readonly_query_returns_arabic_rows(self):
        rows, duration = execute_readonly(
            "SELECT program_name, SUM(student_count) AS total FROM v_program_stats "
            "GROUP BY program_name ORDER BY total DESC LIMIT 10"
        )
        assert len(rows) >= 5  # ستة برامج في القاعدة الموحدة
        assert duration < 5
        assert any("علوم الحاسوب" == r["program_name"] for r in rows)

    def test_reader_role_cannot_write(self):
        """دور bayan_reader قراءة فقط — اختبار سالب أمني إلزامي."""
        with pytest.raises(psycopg.Error):
            with psycopg.connect(get_settings().odoo_database_url, connect_timeout=2) as conn:
                conn.execute("INSERT INTO op_course (name, code) VALUES ('اختبار', 'TST')")
