"""مخططات Pydantic لطلبات واستجابات المحادثة."""

import datetime
import decimal
import uuid
from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """طلب محادثة وارد من المستخدم."""

    question: str = Field(
        ...,
        min_length=2,
        max_length=2000,
        description="السؤال بالعربية (فصحى أو عامية)",
        examples=["كم عدد الطلاب المتخرجين هذا العام؟"],
    )
    conversation_id: str | None = Field(
        default=None,
        description="معرّف المحادثة إن كانت متابعة لحوار سابق",
    )


class AgentTraceEntry(BaseModel):
    """عنصر واحد من أثر تنفيذ السؤال عبر الوكلاء.

    هذا عقد مشترك دستوري: تنتجه كل عقدة في المخطط وتستهلكه:
      - نقطة البث SSE (تحوّله إلى حدث agent_end)
      - واجهة الاختبار الموحدة (تبني منه بطاقات أثر الوكلاء)
      - اختبارات القبول (تتحقق من الوكلاء المشاركين ومخرجاتهم)
    """

    agent: str = Field(description="اسم الوكيل (supervisor / sql_agent / ...)")
    note: str = Field(default="", description="ملاحظة موجزة عما فعله الوكيل")
    status: str = Field(default="done", description="done / failed / skipped")
    sql: str | None = Field(default=None, description="استعلام SQL إن وُلّد")
    rows_count: int | None = Field(default=None, description="عدد صفوف النتيجة إن نُفّذ")
    duration_ms: int | None = Field(default=None, description="مدة تنفيذ الوكيل بالمللي ثانية")


# سقف عرض الجدول في الواجهات — مستقل عن سقف تنفيذ الاستعلام (شأن وكيل SQL)
TABLE_DISPLAY_MAX_ROWS = 50


def _json_safe(value: Any) -> Any:
    """تحويل قيمة قاعدة بيانات إلى قيمة JSON آمنة للبث والعرض."""
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, datetime.datetime | datetime.date | datetime.time):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, uuid.UUID | bytes | bytearray):
        return str(value)
    return str(value)


class TablePayload(BaseModel):
    """جدول نتائج صالح للعرض — عقد مشترك بين SSE (حدث final) وChatResponse.

    يعاد في الحدث الختامي للبث وفي استجابة المحادثة العادية معاً —
    نوع واحد، مستهلكان (نفس مبدأ ADR-003).
    """

    columns: list[str] = Field(default_factory=list, description="أسماء الأعمدة بترتيب العرض")
    rows: list[list[Any]] = Field(
        default_factory=list,
        description="قيم الصفوف بترتيب الأعمدة نفسه (قيم JSON آمنة)",
    )
    truncated: bool = Field(
        default=False,
        description="هل قُطعت النتيجة عند سقف الصفوف (تنفيذًا أو عرضًا)؟",
    )

    @classmethod
    def from_results(
        cls,
        results: list[dict[str, Any]],
        truncated: bool = False,
        max_rows: int = TABLE_DISPLAY_MAX_ROWS,
    ) -> "TablePayload":
        """بناء الجدول من نتائج الاستعلام (قائمة صفوف قاموسية).

        - الأعمدة من مفاتيح الصف الأول بترتيبها.
        - القيم تُحوَّل إلى قيم JSON آمنة.
        - يُقص العرض عند max_rows صفاً (سقف العرض فقط — سقف التنفيذ شأن الوكيل).
        """
        if not results:
            return cls(columns=[], rows=[], truncated=truncated)
        columns = list(results[0].keys())
        shown = results[:max_rows]
        rows = [[_json_safe(row.get(column)) for column in columns] for row in shown]
        display_truncated = truncated or len(results) > len(shown)
        return cls(columns=columns, rows=rows, truncated=display_truncated)


class ChatResponse(BaseModel):
    """استجابة المحادثة النهائية."""

    conversation_id: str
    question: str
    answer: str = Field(description="الإجابة النهائية بالعربية")
    route: str = Field(default="", description="المسار الذي اختاره الـ Supervisor")
    agent_trace: list[AgentTraceEntry] = Field(
        default_factory=list,
        description="سلسلة الوكلاء الذين شاركوا في الإجابة",
    )
    table: TablePayload | None = Field(
        default=None,
        description="جدول نتائج الاستعلام إن وُجد — للعرض في الواجهات",
    )
