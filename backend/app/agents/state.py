"""حالة الوكلاء المشتركة — العمود الفقري لتدفق البيانات في مخطط LangGraph.

كل وكيل يقرأ حقولاً ويكتب حقولاً، والـ Supervisor يقرأ الجميع ليقرر المسار.
التصميم وفق الفصول الثلاثة الأولى من وثيقة مشروع التخرج.
"""

import operator
from typing import Annotated, Any, TypedDict


class AgentState(TypedDict, total=False):
    """الحالة المشتركة التي تنتقل بين عقد المخطط.

    الحقول الأساسية:
      question          — سؤال المستخدم العربي (بعد التطبيع العربي لاحقاً)
      conversation_id   — معرّف المحادثة (لربط الذاكرة)
      route             — قرار الـ Supervisor: sql_agent / rag_agent / analyst_agent / ...
      sql_query         — استعلام SQL الذي ولّده وكيل SQL
      query_results     — نتائج التنفيذ (صفوف + أعمدة + عدد)
      rag_context       — المقاطع المسترجعة من Qdrant (لوائح/سياسات)
      answer            — الإجابة النهائية المجمّعة
      agent_trace       — أثر التنفيذ (للواجهة والقياس والتصحيح)
      error             — خطأ إن وقع (تُستخدم لفرع الإصلاح الذاتي)

    ملاحظة مهمة: الحقول القائمة (مثل agent_trace) تستخدم reducer الدمج
    (Annotated[..., operator.add]) — فكل عقدة تضيف إلى القائمة بدل استبدالها،
    وهذا ما يجمع أثر الوكلاء عبر السلسلة كاملة.
    """

    question: str
    conversation_id: str
    route: str
    sql_query: str
    query_results: list[dict[str, Any]]
    rag_context: Annotated[list[str], operator.add]
    answer: str
    agent_trace: Annotated[list[dict[str, str]], operator.add]
    error: str
