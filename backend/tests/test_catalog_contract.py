"""اختبارات عقد الكتالوج — تجمد واجهة get_catalog وأنواعها (ADR-004).

هذه الاختبارات **عقد ملزم**: أي تنفيذ للكتالوج (v1 الثابت الحالي أو v2
الدلالي من طبقة التهيئة لاحقًا) يجب أن يجتازها كما هي دون أي تعديل عليها.
تعديلها قرار القائد التقني وحده (مثل تعديل العقد نفسه).
"""

from app.agents.sql_catalog import CatalogColumn, CatalogEntry, get_catalog

ALL_VIEWS = ["v_student_profile", "v_fees_summary", "v_program_stats"]


def test_catalog_returns_all_approved_views():
    entries = get_catalog()
    assert [e.view for e in entries] == ALL_VIEWS


def test_catalog_full_call_matches_no_filter():
    """استدعاء allowed_views بكل المشاهد == استدعاء بلا معامل (نفس الترتيب)."""
    assert get_catalog(ALL_VIEWS) == get_catalog()


def test_catalog_filter_returns_only_requested_in_stable_order():
    entries = get_catalog(["v_program_stats", "v_fees_summary"])
    assert [e.view for e in entries] == ["v_fees_summary", "v_program_stats"]


def test_catalog_empty_filter_returns_empty():
    assert get_catalog([]) == []


def test_catalog_unknown_views_ignored_silently():
    entries = get_catalog(["v_student_profile", "v_does_not_exist"])
    assert [e.view for e in entries] == ["v_student_profile"]


def test_every_entry_is_complete_and_arabic():
    for entry in get_catalog():
        assert isinstance(entry, CatalogEntry)
        assert entry.view.startswith("v_")
        assert entry.description.strip()
        assert entry.columns, f"مشهد بلا أعمدة: {entry.view}"
        assert entry.concepts, f"مشهد بلا مفاهيم: {entry.view}"
        for column in entry.columns:
            assert isinstance(column, CatalogColumn)
            assert column.name.strip()
            assert column.type.strip()
            assert column.description.strip()
        # كل عمود فريد داخل المشهد
        names = [c.name for c in entry.columns]
        assert len(names) == len(set(names))


def test_catalog_columns_match_unified_demo_views():
    """الأعمدة مطابقة حرفيًا لتعريفات المشاهد في القاعدة التجريبية الموحدة."""
    expected = {
        "v_student_profile": {
            "student_id", "roll_number", "student_name", "email", "phone",
            "city", "program_name", "batch_name", "gender",
        },
        "v_fees_summary": {
            "roll_number", "student_name", "program_name",
            "total_amount", "total_paid", "outstanding",
        },
        "v_program_stats": {
            "program_code", "program_name", "batch_name",
            "student_count", "male_count", "female_count",
        },
    }
    for entry in get_catalog():
        assert {c.name for c in entry.columns} == expected[entry.view]


def test_catalog_is_deterministic():
    """نفس الاستدعاء يعيد نفس النتيجة حرفيًا — شرط الفهرس الدلالي v2 أيضًا."""
    assert get_catalog() == get_catalog()
    assert get_catalog(ALL_VIEWS) == get_catalog(ALL_VIEWS)


def test_entries_are_immutable():
    """أنواع الكتالوج مجمدة (frozen) — منع التلاعب العارض بالبيانات المشتركة."""
    entry = get_catalog()[0]
    try:
        entry.view = "v_hacked"  # type: ignore[misc]
    except Exception:  # dataclasses.FrozenInstanceError وأمثالها
        return
    raise AssertionError("CatalogEntry يجب أن يكون غير قابل للتعديل (frozen)")
