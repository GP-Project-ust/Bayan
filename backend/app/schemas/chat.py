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
    """عنصر واحد من أثر تنفيذ السؤال عبر الوكلاء."""

    agent: str = Field(description="اسم الوكيل (supervisor / sql_agent / ...)")
    note: str = Field(default="", description="ملاحظة موجزة عما فعله الوكيل")


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
