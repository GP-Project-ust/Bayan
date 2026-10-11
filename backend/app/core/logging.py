"""تهيئة السجلات الموحّدة للتطبيق."""

import logging
import sys


def setup_logging() -> None:
    """ضبط سجل موحّد يكتب إلى الطرفية بصيغة واضحة مع الاسم والوقت."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
        force=True,
    )
    # تخفيف ضجيج المكتبات
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


logger = logging.getLogger("bayan")
