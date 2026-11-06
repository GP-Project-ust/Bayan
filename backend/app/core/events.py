"""عقد أحداث البث (SSE) — اللغة المشتركة بين الخلفية وكل واجهات بيان.

هذا الملف **دستوري**: أي تعديل عليه يمر عبر مراجعة القائد التقني لأنه
العقد الملزم بين الخلفية وواجهة الاختبار (playground) والواجهة النهائية.

أنواع الأحداث المعتمدة (event field):
  meta       — أول حدث دائماً: معرّف المحادثة + المزوّد الحالي (وضع mock أو حقيقي)
  agent_end  — اكتمال عقدة/وكيل: هويته وحالته ومدته وما أنتجه (SQL، عدد الصفوف)
  final      — الإجابة النهائية + الوكلاء المشاركون + المسار المختار
  error      — خطأ يمنع إكمال الطلب (يُعرض للمستخدم بوضوح)

أحداث مستقبلية محجوزة (لا تُستخدم بعد — تُفعَّل في السبرنتات القادمة):
  agent_start / agent_token / clarification / tool_call
حجزها الآن يضمن ثبات العقد أمام الواجهات.
"""

from typing import Any

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# حمولات الأحداث (Payloads) — كل نوع حدث له نموذج Pydantic موثّق
# ---------------------------------------------------------------------------


class MetaPayload(BaseModel):
    """بيانات الطلب الأساسية — أول ما يستقبله العميل."""

    conversation_id: str = Field(description="معرّف المحادثة")
    provider: str = Field(description="المزوّد الحالي (mock / ollama / openai / ...)")
    model: str = Field(description="اسم النموذج الحالي")
    mode: str = Field(description="mock = ردود حتمية للتطوير دون اتصال خارجي")


class AgentEndPayload(BaseModel):
    """اكتمال وكيل — مصدر بطاقات «أثر الوكلاء» في الواجهة."""

    agent: str = Field(description="اسم الوكيل (supervisor / sql_agent / ...)")
    status: str = Field(default="done", description="done / failed / skipped")
    note: str = Field(default="", description="ما فعله الوكيل بعبارة واحدة")
    sql: str | None = Field(default=None, description="استعلام SQL إن وُلّد")
    rows_count: int | None = Field(default=None, description="عدد صفوف النتيجة إن نُفّذ")
    duration_ms: int | None = Field(
        default=None, description="مدة تنفيذ الوكيل بالمللي ثانية إن قيست"
    )


class FinalPayload(BaseModel):
    """الإجابة النهائية — آخر حدث في التدفق الناجح."""

    conversation_id: str
    answer: str = Field(description="الإجابة النهائية للمستخدم")
    route: str = Field(description="المسار الذي اختاره الـ Supervisor")
    agents: list[str] = Field(default_factory=list, description="الوكلاء المشاركون بالترتيب")


class ErrorPayload(BaseModel):
    """خطأ يمنع إكمال الطلب — يجب أن يُعرض للمستخدم بصراحة."""

    code: str = Field(default="internal_error", description="رمز الخطأ البرمجي")
    message: str = Field(description="رسالة عربية مفهومة للمستخدم")


# ---------------------------------------------------------------------------
# التسلسل إلى صيغة SSE — الصيغة الوحيدة المسموح بها في كل نقاط البث
# ---------------------------------------------------------------------------

_HEADERS = ("meta", "agent_end", "final", "error")


def sse_event(event: str, payload: BaseModel | dict[str, Any]) -> str:
    """تحويل حدث إلى إطار SSE نصي جاهز للإرسال.

    الصيغة الملزمة (متوافقة مع EventSource ومع parser يدوي في fetch):
        event: <النوع>\\ndata: <JSON>\\n\\n
    """
    import json

    if event not in _HEADERS:
        raise ValueError(f"نوع حدث غير معتمد في العقد: {event} (المعتمد: {_HEADERS})")

    data = payload.model_dump() if isinstance(payload, BaseModel) else payload
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
