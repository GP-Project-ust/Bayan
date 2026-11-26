"""اختبارات وكيل SQL — Issue #6 (Waleed) — PR2.

التغطية:
  1. تحقق AST: المسار السعيد + رفض DML/DDL + رفض مصادر خارج الكتالوج
  2. CTE / WITH: مقبول الآن (كان مرفوضاً في Sprint 0)
  3. UNION بين المشاهد المسموحة: مقبول الآن (PR2)
  4. مطابقة المفاهيم الأولية
  5. تكامل مع القاعدة الحية (يتخطى تلقائياً بلا قاعدة)
  6. إصلاحات PR2: LIMIT عبر AST، فاصلة داخل نص، rows_truncated

ملاحظات تقنية:
  - كل اختبارات الوحدة تعمل عبر mock بلا اتصال خارجي.
  - لا تعديل على llm/mock.py — نستخدم stubs محلية حين نحتاجها.
  - اختبارات القاعدة الحية تتخطى تلقائياً (نمط test_playground_and_sql.py).
"""

import psycopg
import pytest

from app.agents.sql_agent import (
    _extract_sql_from_response,
    _select_candidate_views,
    execute_readonly,
    sql_agent_node,
    validate_sql_ast,
)
from app.agents.sql_catalog import get_catalog
from app.core.config import get_settings

# الكتالوج والمشاهد المسموحة
_CATALOG = get_catalog()
_ALLOWED_VIEWS = [entry.view for entry in _CATALOG]
_MAX_ROWS = 1000


# ===========================================================================
# § 1 — تحقق AST: المسار السعيد
# ===========================================================================

class TestASTAccepts:
    def test_simple_select(self):
        sql = "SELECT * FROM v_student_profile"
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "SELECT" in result.upper()
        assert "LIMIT" in result.upper()

    def test_select_with_where(self):
        sql = "SELECT student_name FROM v_student_profile WHERE city = 'صنعاء'"
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "LIMIT" in result.upper()

    def test_select_with_aggregation(self):
        sql = "SELECT program_name, COUNT(*) FROM v_program_stats GROUP BY program_name"
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "LIMIT" in result.upper()

    def test_select_with_join_between_allowed_views(self):
        sql = (
            "SELECT s.student_name, f.outstanding "
            "FROM v_student_profile s "
            "JOIN v_fees_summary f ON s.roll_number = f.roll_number"
        )
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "SELECT" in result.upper()

    def test_cte_with_clause_now_accepted(self):
        """CTE مقبول الآن — كان مرفوضاً في Sprint 0."""
        sql = (
            "WITH fee_summary AS ("
            "  SELECT program_name, SUM(outstanding) AS total "
            "  FROM v_fees_summary GROUP BY program_name"
            ") "
            "SELECT * FROM fee_summary ORDER BY total DESC"
        )
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "WITH" in result.upper()

    def test_existing_limit_preserved(self):
        sql = "SELECT * FROM v_program_stats LIMIT 10"
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        # لا يُضاف LIMIT مكرر
        assert result.upper().count("LIMIT") == 1

    def test_trailing_semicolon_cleaned(self):
        sql = "SELECT * FROM v_program_stats LIMIT 5;"
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert ";" not in result

    def test_markdown_code_fence_cleaned(self):
        sql = "```sql\nSELECT * FROM v_program_stats\n```"
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "```" not in result
        assert "SELECT" in result.upper()

    def test_limit_added_via_ast_with_trailing_comment(self):
        """ثغرة التعليقات: LIMIT يضاف عبر AST حتى لو انتهى الاستعلام بتعليق --."""
        sql = "SELECT * FROM v_student_profile -- تعليق في نهاية الاستعلام"
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "LIMIT" in result.upper()
        # نتحقق من أن LIMIT ليس مبتلعاً داخل تعليق سطر واحد
        import sqlglot
        parsed = sqlglot.parse(result, dialect="postgres")[0]
        assert parsed.args.get("limit") is not None

    def test_semicolon_inside_string_literal_accepted(self):
        """الفاصلة المنقوطة داخل نص لا تُرفض لأن التحقق أصبح عبر AST."""
        sql = "SELECT * FROM v_student_profile WHERE student_name = 'أحمد;DROP'"
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "أحمد;DROP" in result
        assert "LIMIT" in result.upper()

    def test_union_between_allowed_views_accepted(self):
        """UNION بين المشاهد المسموحة مقبول الآن (PR2)."""
        sql = (
            "SELECT student_name FROM v_student_profile "
            "UNION "
            "SELECT program_name FROM v_program_stats"
        )
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "UNION" in result.upper()
        assert "LIMIT" in result.upper()


# ===========================================================================
# § 2 — تحقق AST: رفض DML / DDL
# ===========================================================================

class TestASTRejectsDMLandDDL:
    @pytest.mark.parametrize("evil_sql", [
        "INSERT INTO v_student_profile VALUES (1, 'test')",
        "UPDATE v_fees_summary SET outstanding = 0",
        "DELETE FROM v_program_stats",
        "DROP TABLE v_student_profile",
        "CREATE TABLE hack (id INT)",
        "GRANT ALL ON v_student_profile TO public",
        "TRUNCATE TABLE v_fees_summary",
    ])
    def test_rejects_write_statements(self, evil_sql):
        with pytest.raises(ValueError, match="الحارس يرفض"):
            validate_sql_ast(evil_sql, _ALLOWED_VIEWS, _MAX_ROWS)

    def test_rejects_select_into(self):
        sql = "SELECT * INTO hacked_table FROM v_student_profile"
        with pytest.raises(ValueError, match="الحارس يرفض"):
            validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)

    def test_rejects_dml_inside_cte(self):
        """DML داخل CTE يجب أن يُرفض."""
        sql = (
            "WITH evil AS (DELETE FROM v_fees_summary RETURNING *) "
            "SELECT * FROM evil"
        )
        with pytest.raises(ValueError, match="الحارس يرفض"):
            validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)


class TestASTRejectsDangerousFunctions:
    """دوال خطرة (اتصال خارجي/تنفيذ عن بُعد/شلل) — حُصّنت بعد فحص ما بعد PR #17."""

    @pytest.mark.parametrize("evil_sql", [
        "SELECT dblink('host=evil.example', 'SELECT 1')",
        "SELECT dblink_exec('dbname=university', 'DELETE FROM op_student')",
        "SELECT pg_sleep(60)",
    ])
    def test_rejects_forbidden_functions(self, evil_sql):
        with pytest.raises(ValueError, match="الحارس يرفض"):
            validate_sql_ast(evil_sql, _ALLOWED_VIEWS, _MAX_ROWS)


# ===========================================================================
# § 3 — تحقق AST: رفض الحقن ومصادر خارج الكتالوج
# ===========================================================================

class TestASTRejectsInjectionAndOutOfCatalog:
    def test_rejects_multi_statement_semicolon(self):
        sql = "SELECT 1; DROP TABLE v_student_profile"
        with pytest.raises(ValueError):
            validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)

    def test_rejects_table_outside_catalog(self):
        sql = "SELECT * FROM pg_user"
        with pytest.raises(ValueError, match="الحارس يرفض"):
            validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)

    def test_rejects_raw_odoo_table(self):
        sql = "SELECT * FROM op_student LIMIT 10"
        with pytest.raises(ValueError, match="الحارس يرفض"):
            validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)

    def test_rejects_information_schema(self):
        sql = "SELECT table_name FROM information_schema.tables"
        with pytest.raises(ValueError, match="الحارس يرفض"):
            validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)

    def test_cte_alias_accepted_as_source(self):
        """CTE alias مقبول كمصدر داخل الاستعلام الرئيسي."""
        sql = (
            "WITH my_data AS (SELECT * FROM v_student_profile) "
            "SELECT student_name FROM my_data LIMIT 10"
        )
        # يجب ألا يرفض my_data لأنه CTE alias
        result = validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)
        assert "WITH" in result.upper()

    def test_rejects_union_with_disallowed_source(self):
        """UNION مع مصدر خارج الكتالوج يجب أن يُرفض."""
        sql = (
            "SELECT student_name FROM v_student_profile "
            "UNION "
            "SELECT username FROM pg_user"
        )
        with pytest.raises(ValueError, match="الحارس يرفض"):
            validate_sql_ast(sql, _ALLOWED_VIEWS, _MAX_ROWS)


# ===========================================================================
# § 4 — مطابقة المفاهيم الأولية
# ===========================================================================

class TestConceptMatching:
    def test_fees_concepts_map_to_fees_view(self):
        candidates = _select_candidate_views("من الطلاب المتأخرون في الرسوم؟", _CATALOG)
        views = [e.view for e in candidates]
        assert "v_fees_summary" in views

    def test_student_concepts_map_to_profile_view(self):
        candidates = _select_candidate_views("اذكر أسماء الطلاب في دفعة 2023", _CATALOG)
        views = [e.view for e in candidates]
        assert "v_student_profile" in views

    def test_stats_concepts_map_to_program_view(self):
        candidates = _select_candidate_views("كم عدد الطلاب في كل برنامج؟", _CATALOG)
        views = [e.view for e in candidates]
        assert "v_program_stats" in views

    def test_unknown_question_returns_full_catalog(self):
        """سؤال بلا مفاهيم معروفة → أرجع الكتالوج كاملاً."""
        candidates = _select_candidate_views("مرحبا", _CATALOG)
        assert len(candidates) == len(_CATALOG)


# ===========================================================================
# § 5 — اختبار العقدة مع Mock LLM
# ===========================================================================

class TestAgentNodeWithMock:
    """اختبارات العقدة الكاملة عبر MockChatModel (LLM_PROVIDER=mock افتراضي)."""

    def test_node_returns_required_keys(self):
        """العقدة ترجع المفاتيح المطلوبة في AgentState."""
        state = {"question": "كم عدد الطلاب في الجامعة؟"}
        result = sql_agent_node(state)
        # المفاتيح المطلوبة حسب ADR-004
        assert "sql_query" in result
        assert "query_results" in result
        assert "agent_trace" in result
        assert isinstance(result["agent_trace"], list)
        assert len(result["agent_trace"]) > 0

    def test_node_trace_has_required_fields(self):
        """كل trace entry يحوي agent + status + prompt_version."""
        state = {"question": "اعطني قائمة الطلاب"}
        result = sql_agent_node(state)
        trace = result["agent_trace"][0]
        assert trace["agent"] == "sql_agent"
        assert "status" in trace
        assert "prompt_version" in trace

    def test_node_handles_empty_question(self):
        """السؤال الفارغ لا يُسقط العقدة."""
        state = {"question": ""}
        result = sql_agent_node(state)
        assert "agent_trace" in result


# ===========================================================================
# § 6 — حلقة الإصلاح الذاتي (Self-Healing — FR-14)
# ===========================================================================

class TestSelfHealingLoop:
    """اختبارات دورة الإصلاح الذاتي عبر كعوب محلية (دون المساس بـ mock.py)."""

    def test_self_healing_succeeds_on_second_attempt(self, monkeypatch):
        """فشل مصطنع في المحاولة 1 يُصلح في المحاولة 2."""
        call_count = 0

        class StubLLM:
            def invoke(self, messages):
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    # محاولة 1: استعلام محظور (DML)
                    return "DELETE FROM v_student_profile"
                # محاولة 2: استعلام سليم
                return "SELECT * FROM v_student_profile LIMIT 10"

        monkeypatch.setattr("app.agents.sql_agent.get_llm", lambda role="sql": StubLLM())

        state = {"question": "كم عدد الطلاب؟"}
        result = sql_agent_node(state)

        # تحققات النجاح
        assert call_count == 2
        trace = result["agent_trace"][0]
        assert trace["attempts"] == 2

    def test_self_healing_exhausts_three_attempts(self, monkeypatch):
        """استنفاد 3 محاولات فاشلة → اعتذار عربي + error + عداد 3 في الأثر."""
        call_count = 0

        class AlwaysFailingLLM:
            def invoke(self, messages):
                nonlocal call_count
                call_count += 1
                # إرجاع استعلام يرفضه AST في كل محاولة
                return f"DROP TABLE v_student_profile_{call_count}"

        monkeypatch.setattr("app.agents.sql_agent.get_llm", lambda role="sql": AlwaysFailingLLM())

        state = {"question": "كم عدد الطلاب؟"}
        result = sql_agent_node(state)

        assert call_count == 3
        assert result["query_results"] == []
        assert "اعتذر" in result["answer"]
        assert result["error"] != ""
        trace = result["agent_trace"][0]
        assert trace["status"] == "failed"
        assert trace["attempts"] == 3

    def test_sql_max_rows_config_integration(self):
        """التحقق من أن سقف الصفوف 1000 يُقرأ من config.py."""
        settings = get_settings()
        assert settings.sql_max_rows == 1000


# ===========================================================================
# § 7 — اختبارات التكامل مع القاعدة الحية (تتخطى تلقائياً بلا قاعدة)
# ===========================================================================

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
    def test_readonly_query_returns_rows(self):
        rows, duration = execute_readonly(
            "SELECT program_name, SUM(student_count) AS total "
            "FROM v_program_stats GROUP BY program_name ORDER BY total DESC LIMIT 10"
        )
        assert len(rows) >= 1
        assert duration < 5

    def test_reader_role_cannot_write(self):
        """دور bayan_reader قراءة فقط — اختبار أمني إلزامي."""
        with pytest.raises(psycopg.Error):
            with psycopg.connect(get_settings().odoo_database_url, connect_timeout=2) as conn:
                conn.execute("INSERT INTO op_course (name, code) VALUES ('اختبار', 'TST')")


# ===========================================================================
# § 7 — استخراج SQL من رد النموذج: نص وكتل محتوى (Gemini 3+)
# ===========================================================================

class TestExtractSqlFromModelContent:
    """Gemini 3+ يعيد كتل محتوى قائمة — الاستخراج يقبل الصيغتين دفاعياً."""

    def test_plain_string_with_markdown_fence(self):
        raw = "تفضل:\n```sql\nSELECT 1\n```"
        assert _extract_sql_from_response(raw) == "SELECT 1"

    def test_content_blocks_list(self):
        content = [
            {"type": "text", "text": "SELECT program_name FROM v_program_stats"},
        ]
        assert _extract_sql_from_response(content) == "SELECT program_name FROM v_program_stats"

    def test_skips_non_text_blocks(self):
        content = [
            {"type": "reasoning", "text": "أفكر في SELECT مزيف"},
            {"type": "text", "text": "الجواب: WITH t AS (SELECT 1) SELECT * FROM t"},
        ]
        assert _extract_sql_from_response(content).startswith("WITH t AS")

    def test_mixed_string_and_dict_blocks(self):
        content = ["سأجيب:", {"type": "text", "text": "SELECT 2"}]
        assert _extract_sql_from_response(content) == "SELECT 2"

    def test_empty_variants(self):
        assert _extract_sql_from_response("") == ""
        assert _extract_sql_from_response([]) == ""

