# دليل تشغيل سلسلة التهيئة الدلالية الموحدة (`make onboarding`)

**نقاط الدخول:**  
- عبر Make: `make onboarding` في [Makefile](file:///C:/Bayan/Makefile)  
- عبر Python مباشرة (لبيئات Windows أو بدون `make`):  
  `python -m app.services.onboarding.cli`

---

## 1. التسلسل التنفيذي الحتمي (Zero-LLM)

عند تشغيل الأمر، تُنفذ الخطوات السبع التالية دون تدخل بشري تفاعلي ودون استدعاء أي نموذج لغوي توليدي:

1. قراءة إعدادات قاعدة العميل (`ODOO_DB_*`) بصلاحية القراءة فقط عبر `PostgresConnectionSettings.from_app_settings`.
2. التحقق من وضع الجلسة (`SHOW transaction_read_only`) واستبطان المخطط من `information_schema` و`pg_catalog`.
3. توليد الأوصاف العربية الحتمية (`COMMENT ON` أولاً، ثم القالب الحتمي).
4. بناء السجلات الدلالية (`table`, `view`, `column`, `relationship`, `concept`) مع حظر SQL والأسرار.
5. توليد المتجهات عبر المصنع الرسمي `app.core.qdrant.get_embeddings` للعناصر الجديدة أو المتغيرة فقط.
6. حفظ السجلات والمتجهات معاملاتياً في `DATABASE_URL` (`pgvector`) مع أرشفة العناصر المحذوفة ضمن نطاق المصدر فقط.
7. طباعة التقرير العربي وتحديث المشاهد الجاهزة في `Catalog v2`، وإعادة رمز خروج غير صفري (`1`) عند أي فشل.

---

## 2. أوامر التشغيل للقاعدتين بالإعدادات فقط

### أ. قاعدة الجامعة الرسمية (`university` / مخطط `public`)
```bash
# عبر Make:
make onboarding

# أو مباشرة عبر Python (من مجلد backend):
python -m app.services.onboarding.cli --tenant university-demo --source-id SRC-UNIVERSITY --schemas public --format markdown
```

### ب. قاعدة اللوجستيات الاختبارية (`logistics_demo` / مخطط `logistics`)
دون تغيير سطر كود واحد:
```bash
ODOO_DB_NAME=logistics_demo \
ODOO_DB_USER=bayan_logistics_reader \
ODOO_DB_PASSWORD=bayan_dev_logistics_reader \
ODOO_DB_SCHEMAS=logistics \
ONBOARDING_TENANT=logistics-demo \
ONBOARDING_SOURCE_ID=SRC-LOGISTICS \
make onboarding
```

أو على Windows PowerShell:
```powershell
$env:ODOO_DB_NAME="logistics_demo"
$env:ODOO_DB_USER="bayan_logistics_reader"
$env:ODOO_DB_PASSWORD="bayan_dev_logistics_reader"
$env:ODOO_DB_SCHEMAS="logistics"
backend\.venv\Scripts\python.exe -m app.services.onboarding.cli --tenant logistics-demo --source-id SRC-LOGISTICS --schemas logistics --format json
```
