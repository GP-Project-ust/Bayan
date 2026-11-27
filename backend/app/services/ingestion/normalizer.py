"""تطبيع غير هدّام للنص العربي/الإنجليزي المخصص للتضمين."""

import re
import unicodedata

_HORIZONTAL_WHITESPACE = re.compile(r"[^\S\r\n]+")
_SPACES_AROUND_NEWLINE = re.compile(r" *\n *")
_EXCESSIVE_BLANK_LINES = re.compile(r"\n{3,}")


def normalize_for_embedding(text: str) -> str:
    """إنتاج نص مستقر للتضمين مع حفظ البنية والمعنى.

    لا تُحذف التشكيلات ولا تُوحَّد الهمزات أو التاء المربوطة، لأن ذلك قد يغير
    المصطلح القانوني. يحتفظ نموذج المقطع بالنص الأصلي منفصلاً للاستشهاد.
    """

    normalized = unicodedata.normalize("NFC", text)
    normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")
    normalized = normalized.replace("\ufeff", "").replace("\u00a0", " ")
    normalized = _HORIZONTAL_WHITESPACE.sub(" ", normalized)
    normalized = _SPACES_AROUND_NEWLINE.sub("\n", normalized)
    normalized = _EXCESSIVE_BLANK_LINES.sub("\n\n", normalized)
    return normalized.strip()
