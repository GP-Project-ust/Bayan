"""اختبارات جدول النتائج (TablePayload) — عقد العرض المشترك بين SSE وChatResponse."""

import datetime
import decimal

from app.schemas.chat import TABLE_DISPLAY_MAX_ROWS, TablePayload


def test_table_from_results_columns_and_order():
    results = [
        {"program_name": "علوم الحاسوب", "student_count": 120},
        {"program_name": "تقنية معلومات", "student_count": 80},
    ]
    table = TablePayload.from_results(results)
    assert table.columns == ["program_name", "student_count"]
    assert table.rows == [["علوم الحاسوب", 120], ["تقنية معلومات", 80]]
    assert table.truncated is False


def test_table_converts_values_to_json_safe():
    results = [
        {
            "created": datetime.date(2026, 11, 12),
            "amount": decimal.Decimal("1250.50"),
            "count": 7,
            "note": None,
        }
    ]
    table = TablePayload.from_results(results)
    assert table.rows[0] == ["2026-11-12", 1250.50, 7, None]


def test_table_display_truncation_flag():
    results = [{"id": i} for i in range(TABLE_DISPLAY_MAX_ROWS + 10)]
    table = TablePayload.from_results(results)
    assert len(table.rows) == TABLE_DISPLAY_MAX_ROWS
    assert table.truncated is True


def test_table_execution_truncation_passes_through():
    results = [{"id": i} for i in range(3)]
    table = TablePayload.from_results(results, truncated=True)
    assert table.truncated is True


def test_table_empty_results():
    table = TablePayload.from_results([], truncated=False)
    assert table.columns == [] and table.rows == [] and table.truncated is False
