"""اختبارات مصنع النماذج الموحد — البوابة الوحيدة للاتصال بأي LLM."""

import pytest

from app.core.config import get_settings
from app.llm.mock import MockChatModel
from app.llm.provider import ROLE_TEMPERATURES, get_llm


def test_mock_is_default_provider():
    """الافتراضي للتطوير: mock — كل عضو يعمل بلا أي اتصال خارجي."""
    assert get_settings().llm_provider == "mock"


def test_get_llm_returns_mock_model_for_every_role():
    for role in ROLE_TEMPERATURES:
        model = get_llm(role)
        assert isinstance(model, MockChatModel)
        assert model.role == role


def test_mock_replies_are_deterministic_per_role():
    sql_llm = get_llm("sql")
    first = sql_llm.invoke("كم عدد الطلاب؟").content
    second = sql_llm.invoke("سؤال مختلف تماماً").content
    assert first == second  # حتمية: نفس الدور ← نفس الرد مهما كان السؤال
    assert "SELECT" in first  # رد الدور sql استعلام فعلي


def test_unknown_role_rejected():
    with pytest.raises(ValueError, match="دور غير معروف"):
        get_llm("nonexistent_role")


def test_unknown_provider_rejected(monkeypatch):
    """المزوّد يُقرأ من متغير البيئة — قيمة غير مدعومة ترفض بوضوح."""
    from app.core.config import get_settings

    monkeypatch.setenv("LLM_PROVIDER", "carrier_pigeon")
    get_settings.cache_clear()
    try:
        with pytest.raises(ValueError, match="مزوّد غير مدعوم"):
            get_llm("sql")
    finally:
        monkeypatch.delenv("LLM_PROVIDER", raising=False)
        get_settings.cache_clear()  # إعادة الافتراضي لبقية الاختبارات
