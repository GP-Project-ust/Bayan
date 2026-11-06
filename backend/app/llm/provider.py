"""مصنع النماذج الموحّد — البوابة الوحيدة في بيان للاتصال بأي نموذج لغوي.

قاعدة دستورية: **لا يستورد أي وكيل SDK مزوّداً مباشرةً** —
كل وكيل يطلب نموذجه عبر get_llm(role) فيحصل على:
  1) نموذجاً مضبوطاً مسبقاً بدوره (درجة حرارة منخفضة للـ SQL، ...)
  2) مزوّداً قابلاً للتبديل من متغير بيئة واحد LLM_PROVIDER دون أي تغيير في الكود.

الأدوار المعتمدة (وفق وثيقة التصميم — الوكلاء الخمسة):
  supervisor  — توجيه سريع: نموذج خفيف ودرجة حرارة 0 (قرارات حتمية)
  sql         — توليد SQL: أقوى نموذج متاح ودرجة حرارة 0 (صحة قبل كل شيء)
  rag         — إجابات موثقة: حرارة منخفضة جداً (بلا اختلاق)
  analyst     — تحليل: حرارة منخفضة (استنتاج مقيد بالبيانات)
  reporter    — تنسيق عربي: حرارة معتدلة (صياغة طبيعية)

المزوّدون:
  mock   — افتراضي التطوير: ردود حتمية بلا أي اتصال (راجع mock.py)
  ollama — محلي: Qwen 2.5 (بلا مفاتيح، داخل شبكة الجامعة)
  openai / anthropic / gemini — سحابي: يتطلب حزمة SDK إضافية
           (langchain-openai / langchain-anthropic / langchain-google-genai)
           تُثبَّت عند الحاجة فقط حتى تبقى بيئة الفريق خفيفة، وتُدار
           المفاتيح من .env حصراً — ولا تُرفع إلى Git أبداً.
"""

from langchain_core.language_models.chat_models import BaseChatModel

from app.core.config import get_settings
from app.llm.mock import MockChatModel

# خرائط الأدوار: نموذج افتراضي لكل دور + درجة حرارة مناسبة لمهمته.
# (النموذج الفعلي يُستبدل من LLM_MODEL عند الرغبة — الأدوار تبقى ثابتة)
ROLE_TEMPERATURES: dict[str, float] = {
    "supervisor": 0.0,
    "sql": 0.0,
    "rag": 0.1,
    "analyst": 0.2,
    "reporter": 0.4,
}

DEFAULT_ROLE = "reporter"  # الدور العام حين لا يحدد الطالب دوره


def get_llm(role: str = DEFAULT_ROLE) -> BaseChatModel:
    """إرجاع نموذج محادثة مضبوطاً بالدور المطلوب وفق مزوّد البيئة.

    الاستخدام داخل أي وكيل:
        llm = get_llm("sql")
    """
    if role not in ROLE_TEMPERATURES:
        raise ValueError(f"دور غير معروف: {role!r} (المعتمد: {sorted(ROLE_TEMPERATURES)})")

    settings = get_settings()
    provider = settings.llm_provider.strip().lower()

    if provider == "mock":
        return MockChatModel(role=role)

    if provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(
            model=settings.llm_model,
            base_url=settings.ollama_base_url,
            temperature=ROLE_TEMPERATURES[role],
        )

    if provider in ("openai", "anthropic", "gemini"):
        # استيراد كسول: الحزم السحابية اختيارية ولا تُثبَّت إلا عند التفعيل
        sdk_packages = {
            "openai": "langchain_openai",
            "anthropic": "langchain_anthropic",
            "gemini": "langchain_google_genai",
        }
        try:
            if provider == "openai":
                from langchain_openai import ChatOpenAI

                return ChatOpenAI(
                    model=settings.llm_model,
                    temperature=ROLE_TEMPERATURES[role],
                )
            if provider == "anthropic":
                from langchain_anthropic import ChatAnthropic

                return ChatAnthropic(
                    model=settings.llm_model,
                    temperature=ROLE_TEMPERATURES[role],
                )
            from langchain_google_genai import ChatGoogleGenerativeAI

            return ChatGoogleGenerativeAI(
                model=settings.llm_model,
                temperature=ROLE_TEMPERATURES[role],
            )
        except ImportError as exc:  # pragma: no cover — يعتمد على بيئة العضو
            raise ValueError(
                f"المزوّد {provider} يتطلب تثبيت {sdk_packages[provider]} — "
                "راجع تعليق التثبيت في backend/requirements.txt"
            ) from exc

    raise ValueError(
        f"مزوّد غير مدعوم: {provider!r} "
        "(المعتمد: mock / ollama / openai / anthropic / gemini)"
    )
