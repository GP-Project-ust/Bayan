"""اختبارات واجهة الاختبار الموحدة (/dev/playground) فقط.

ملاحظة: اختبارات وكيل SQL نُقلت إلى test_sql_agent.py (Issue #6 — Waleed).
"""

import psycopg
import pytest

from app.agents.sql_agent import execute_readonly
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
# التنفيذ الفعلي على القاعدة التجريبية — يتخطى تلقائياً إن غابت القاعدة
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
