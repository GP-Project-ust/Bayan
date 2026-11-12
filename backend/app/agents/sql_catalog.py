"""كتالوج المشاهد — العقد المجمد بين وكيل SQL وطبقة التهيئة وكل المستهلكين.

هذا الملف **عقد دستوري** (بمعنى ADR-004): الأنواع والتوقيع أدناه مجمدة —
يتفق كل من وكيل SQL (v1: التنفيذ الثابت أدناه) وطبقة التهيئة الذكية
(v2: الفهرس الدلالي المولَّد من استبطان القاعدة) على إرجاع هذه الأنواع
حرفيًا من هذه الواجهة، ويُثبت الالتزام باختبارات العقد في
backend/tests/test_catalog_contract.py (لا تُعدَّل إلا بقرار القائد التقني).

القاعدة:
  - الوكيلات تستدعي get_catalog() وتقرأ ما يعود — لا تعرف من أين جاء.
  - v1 (هذا الملف): بيانات ثابتة فوق مشاهد القاعدة التجريبية الموحدة.
  - v2 (لاحقًا): نفس الأنواع تُبنى من فهرس دلالي مولَّد — التبديل إعداد لا كود.

لا يُخزن في هذا الكتالوج أي SQL — فقط أوصاف المشاهد وأعمدتها ومفاهيمها العربية.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CatalogColumn:
    """عمود واحد في مشهد من مشاهد الكتالوج."""

    name: str        # اسم العمود كما في قاعدة البيانات
    type: str        # النوع التقريبي (نص/رقم/تاريخ ...)
    description: str  # وصف عربي موجز لدلالة العمود


@dataclass(frozen=True)
class CatalogEntry:
    """مشهد واحد جاهز للاستعلام الآمن — وحدة الكتالوج الكاملة."""

    view: str                   # اسم المشهد في قاعدة البيانات (v_...)
    description: str            # الوصف العربي (من COMMENT ON VIEW)
    columns: tuple[CatalogColumn, ...]  # الأعمدة بترتيب المشهد
    concepts: tuple[str, ...]   # مفاهيم عربية مفتاحية لمطابقة أسئلة المستخدم
    source: str = "static_v1"   # تشخيصي فقط: مصدر هذا الإدخال (static_v1 / semantic_v2)


# ---------------------------------------------------------------------------
# v1 — التنفيذ الثابت فوق مشاهد القاعدة التجريبية الموحدة (ADR-001)
# الأعمدة مطابقة حرفيًا لتعريفات database/university_demo/03_views_and_reader.sql
# ---------------------------------------------------------------------------

_STUDENT_PROFILE = CatalogEntry(
    view="v_student_profile",
    description=(
        "بيان: الملف الشخصي للطالب — رقم القيد والاسم والتواصل والبرنامج والدفعة"
    ),
    columns=(
        CatalogColumn("student_id", "رقم", "المعرّف الداخلي للطالب"),
        CatalogColumn("roll_number", "نص", "رقم القيد الجامعي (مثال YUxxxxxxx)"),
        CatalogColumn("student_name", "نص", "الاسم الكامل للطالب"),
        CatalogColumn("email", "نص", "البريد الإلكتروني"),
        CatalogColumn("phone", "نص", "رقم الهاتف"),
        CatalogColumn("city", "نص", "المدينة"),
        CatalogColumn("program_name", "نص", "اسم البرنامج الأكاديمي (مثال: علوم الحاسوب)"),
        CatalogColumn("batch_name", "نص", "الدفعة (سنة القبول)"),
        CatalogColumn("gender", "نص", "الجنس (ذكر / أنثى)"),
    ),
    concepts=("طالب", "طلاب", "ملف الطالب", "قيد", "رقم القيد", "اسم", "بريد", "هاتف",
              "مدينة", "برنامج", "دفعة", "جنس", "ذكر", "أنثى"),
)

_FEES_SUMMARY = CatalogEntry(
    view="v_fees_summary",
    description="بيان: ملخص الرسوم والمتأخرات لكل طالب",
    columns=(
        CatalogColumn("roll_number", "نص", "رقم القيد الجامعي"),
        CatalogColumn("student_name", "نص", "اسم الطالب"),
        CatalogColumn("program_name", "نص", "اسم البرنامج الأكاديمي"),
        CatalogColumn("total_amount", "رقم", "إجمالي الرسوم المستحقة"),
        CatalogColumn("total_paid", "رقم", "إجمالي ما سُدِّد فعليًا"),
        CatalogColumn("outstanding", "رقم", "المتأخرات المتبقية غير المسددة"),
    ),
    concepts=("رسوم", "رسوم دراسية", "سداد", "مسدد", "مدفوع", "متأخر", "متأخرات",
              "مديون", "دين", "متبقي", "مالي", "التزام مالي"),
)

_PROGRAM_STATS = CatalogEntry(
    view="v_program_stats",
    description="بيان: إحصاءات الطلاب لكل برنامج ودفعة — العدد الكلي وتوزيعه حسب الجنس",
    columns=(
        CatalogColumn("program_code", "نص", "رمز البرنامج (مثال CS)"),
        CatalogColumn("program_name", "نص", "اسم البرنامج الأكاديمي"),
        CatalogColumn("batch_name", "نص", "الدفعة (سنة القبول)"),
        CatalogColumn("student_count", "رقم", "عدد الطلاب في البرنامج والدفعة"),
        CatalogColumn("male_count", "رقم", "عدد الذكور"),
        CatalogColumn("female_count", "رقم", "عدد الإناث"),
    ),
    concepts=("إحصاء", "إحصائية", "عدد", "كم", "توزيع", "برنامج", "برامج", "كلية",
              "دفعة", "دفعات", "ذكر", "أنثى", "نسبة", "تعداد"),
)

_CATALOG_V1: tuple[CatalogEntry, ...] = (
    _STUDENT_PROFILE,
    _FEES_SUMMARY,
    _PROGRAM_STATS,
)


def get_catalog(allowed_views: list[str] | None = None) -> list[CatalogEntry]:
    """إرجاع مشاهد الكتالوج الجاهزة للاستعلام الآمن.

    المعامل:
        allowed_views: قصر النتيجة على هذه المشاهد حصرًا (فتحة الأدوار RBAC —
                       موضعها جاهز في التوقيع وتفعيلها لاحقًا مع نظام الأدوار).
                       None يعني كل المشاهد المعتمدة.

    الضمانات (مجمدة):
        - الترتيب ثابت دائمًا (نفس ترتيب القاعدة أعلاه).
        - استدعاء بلا معامل يعيد كل المشاهد المعتمدة.
        - الأسماء غير المعروفة تُتجاهل بصمت (فلترة لا خطأ).
    """
    if allowed_views is None:
        return list(_CATALOG_V1)
    allowed = set(allowed_views)
    return [entry for entry in _CATALOG_V1 if entry.view in allowed]
