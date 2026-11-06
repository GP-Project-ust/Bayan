"""نموذج وهمي (Mock) حتمي — يتيح تطوير واختبار كل الوكلاء دون أي اتصال خارجي.

لماذا هو دستوري؟
  كل عضو في الفريق يشغّل السلسلة كاملة من أول يوم بلا مفاتيح API وبلا عتاد
  يتحمل نموذجاً حقيقياً: LLM_PROVIDER=mock (أو تركه فارغاً مع غياب Ollama).
  الردود حتمية (نفس المدخل ← نفس المخرج) لضمان اختبارات مستقرة وقابلة
  للمقارنة بين أجهزة الأعضاء، ومفصولة لكل دور حتى تحاكي سلوك الوكيل المقابل.
"""

from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import Field


class MockChatModel(BaseChatModel):
    """نموذج محادثة وهمي — يعيد رداً معيارياً حتمياً بحسب دور الوكيل الطالب."""

    role: str = Field(default="default", description="دور الوكيل الطالب للرد")

    # ردود معيارية لكل دور — موثقة هنا ليمكن لأي عضو توقعها في اختباراته
    _ROLE_REPLIES: dict[str, str] = {
        "supervisor": '{"route": "sql_agent", "confidence": 0.95}',
        "sql": "SELECT program_name, COUNT(*) AS student_count "
        "FROM v_program_stats GROUP BY program_name ORDER BY student_count DESC LIMIT 20;",
        "rag": "وفق لائحة القبول، تُمنح الترقية للطالب المجتاز "
        "36 ساعة معتمدة بمعدل لا يقل عن 2.0.",
        "analyst": "التحليل الأولي: البيانات تُظهر تركز الطلاب في برنامجي "
        "علوم الحاسوب وتقنية المعلومات.",
        "reporter": "تم تجميع النتائج في تقرير موحد مع جدول البيانات ومصادرها.",
        "default": "رد وهمي معياري من طبقة LLM الموحدة (وضع mock).",
    }

    @property
    def _llm_type(self) -> str:
        return "bayan-mock"

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        """إرجاع الرد الحتمي للدور — يتجاهل الرسائل عمداً (سلوك موثق)."""
        reply = self._ROLE_REPLIES.get(self.role, self._ROLE_REPLIES["default"])
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=reply))])

    def bind_role(self, role: str) -> "MockChatModel":
        """إنشاء نسخة جديدة بالدور المطلوب (نمط Immutable)."""
        return MockChatModel(role=role)
