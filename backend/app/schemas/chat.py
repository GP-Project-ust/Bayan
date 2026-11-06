"""مخططات Pydantic لطلبات واستجابات المحادثة."""

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
