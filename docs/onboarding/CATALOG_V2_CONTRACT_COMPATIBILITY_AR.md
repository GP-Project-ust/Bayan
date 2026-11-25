# توافق `Catalog v2` مع العقد الرسمي المجمد (`sql_catalog.py`)

**الملفات المعنية:**  
- العقد المجمد (غير معدّل): [sql_catalog.py](file:///C:/Bayan/backend/app/agents/sql_catalog.py) و[test_catalog_contract.py](file:///C:/Bayan/backend/tests/test_catalog_contract.py)  
- مهايئ `Catalog v2` الجديد: [adapter.py](file:///C:/Bayan/backend/app/services/onboarding/catalog/adapter.py) و[builder.py](file:///C:/Bayan/backend/app/services/onboarding/catalog/builder.py)

---

## 1. الالتزام الحرفي بالعقد المجمد (`ADR-004`)

- يستورد المهايئ الصنفين الرسميين مباشرة من المصدر الوحيد للحقيقة:
  `from app.agents.sql_catalog import CatalogColumn, CatalogEntry`
- يقدّم `SemanticCatalogV2Provider.get_catalog(allowed_views: list[str] | None = None) -> list[CatalogEntry]` الضمانات المجمدة نفسها:
  1. `allowed_views is None`: إرجاع جميع المشاهد النشطة المخوّلة بترتيب ثابت (`sort_catalog_entries`).
  2. `allowed_views == []`: إرجاع قائمة فارغة `[]`.
  3. تمرير أسماء مجهولة أو أسماء جداول فيزيائية (مثل `op_student`): يُتجاهل بصمت ولا يعرض أي جدول فيزيائي لوكيل SQL أبداً.
  4. كل عنصر مُعاد يحمل `source="semantic_v2"` وهو كائن `CatalogEntry` مجمد (`frozen=True`).

---

## 2. الفرق بين الكتالوج المرجعي الحالي (3 مشاهد) والكتالوج الموسع (5 مشاهد)

- يتحقق [test_catalog_contract.py](file:///C:/Bayan/backend/tests/test_catalog_contract.py) غير المعدّل من ثبات المشاهد الثلاثة الأصلية (`v_student_profile`, `v_fees_summary`, `v_program_stats`) وأعمدتها وترتيبها عبر `static_v1`.
- يتيح `SemanticCatalogV2Provider` وضعين متحققاً منهما في [test_onboarding_catalog_v2.py](file:///C:/Bayan/backend/tests/test_onboarding_catalog_v2.py):
  - **وضع التوافق التام (3 مشاهد):** عند تمرير `allowed_views=["v_student_profile", "v_fees_summary", "v_program_stats"]` يطابق مخرجات v1 بنيةً وترتيباً وأعمدةً.
  - **الكتالوج الموسّع (5 مشاهد):** بعد إضافة `v_student_financial_status` و`v_program_financial_summary` من [04_views.sql](file:///C:/Bayan/database/university_demo/04_views.sql)، يعرض المشاهد الخمسة كلها عندما لا يُقيَّد بـ 3 مشاهد.

---

## 3. مقترح التفعيل عبر مفتاح إعداد (دون تعديل الملفات الملك حالياً)

لم يُعدّل `sql_catalog.py` أو `sql_agent.py` في PR-2 احتراماً لحدود الملكية في `ADR-004`. وعند موافقة مالك العقد، يُقترح التبديل عبر متغير بيئة واحد في `app/core/config.py`:

```env
CATALOG_PROVIDER=static_v1   # الافتراضي الآمن (static_v1 | semantic_v2)
```

- **خطة التراجع الفورية (Rollback):** إعادة `CATALOG_PROVIDER=static_v1` يعيد وكيل SQL فوراً إلى الكتالوج الثابت دون الحاجة لتعديل الكود أو حذف بيانات pgvector.
- **شرط التفعيل الإنتاجي:** تطبيق `04_views.sql` وتشغيل `make onboarding` وتحديث قائمة `ALL_VIEWS` في `test_catalog_contract.py` بقرار القائد التقني.
