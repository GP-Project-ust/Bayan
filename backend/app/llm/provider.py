"""مزوّد النموذج اللغوي — طبقة تبديل موحّدة (وفق الوثيقة: نموذج قابل للتبديل).

الوضع الافتراضي: Ollama محلي (Qwen 2.5) — لا اعتماد على خدمات خارجية.
لاحقاً: إضافة مزوّد سحابي (مثل OpenAI/Gemini) يُختار من الإعدادات أو لوحة التحكم.
"""


def get_llm():
    """إرجاع نموذج محادثة جاهز وفق الإعدادات (LLM_PROVIDER / LLM_MODEL).

    التطبيق الحالي يعيد نموذج Ollama؛ عند إضافة مزوّدات أخرى تُدار
    التبديلية هنا فقط دون تغيير أي وكيل.
    """
    from app.core.config import get_settings

    settings = get_settings()

    if settings.llm_provider != "ollama":
        # TODO: مزوّدات سحابية بديلة (تُفعّل عند الحاجة للقياس المقارن)
        raise ValueError(f"مزوّد غير مدعوم بعد: {settings.llm_provider}")

    from langchain_ollama import ChatOllama

    return ChatOllama(
        model=settings.llm_model,
        base_url=settings.ollama_base_url,
        temperature=0,
    )
