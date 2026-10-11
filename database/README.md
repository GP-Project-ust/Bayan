# قواعد البيانات في بيان

بيان يتعامل مع **قاعدتين منفصلتين تماماً** — فصل مقصود للأمان:

| القاعدة | الدور | الصلاحية |
|---------|-------|----------|
| **قاعدة المنصة** (`bayan`) | محادثات، ذاكرة المحادثة (pgvector)، سجل التدقيق، إعدادات | قراءة وكتابة |
| **قاعدة الجامعة** (Odoo/OpenEduCat) | بيانات الاختبار الحقيقية: طلاب، مقررات، رسوم، نتائج | **قراءة فقط — دائماً** |

## قاعدة الجامعة (بيئة الاختبار)

بيئة Odoo 17 + OpenEduCat ببيانات جامعة يمنية واقعية (5000+ طالب، 5 سنوات أكاديمية)
توجد في مستودع [openeducat-yemen-university](https://github.com/GP-Project-ust/openeducat-yemen-university):

```bash
git clone https://github.com/GP-Project-ust/openeducat-yemen-university.git
cd openeducat-yemen-university
docker compose up -d
# انتظر 2-5 دقائق لأول استعادة، ثم: http://localhost:8069 (admin/admin)
```

منفذ PostgreSQL الخاص بها خارج الحاوية **غير معرّض** افتراضياً —
لتوصيل بيان بها، أضف تعريض المنفذ في `docker-compose.yml` الخاص بها:

```yaml
  db:
    ports:
      - "5433:5432"   # يُعرَّض على 5433 محلياً حتى لا يتعارض مع قاعدة بيان
```

## إنشاء مستخدم القراءة فقط (خطوة إلزامية)

بيان **لا يستخدم حساب odoo الإداري إطلاقاً**. أنشئ مستخدماً مقيداً بالقراءة:

```bash
docker compose exec db psql -U odoo -d university
```

```sql
CREATE ROLE bayan_reader WITH LOGIN PASSWORD 'كلمة-مرور-قوية';
GRANT CONNECT ON DATABASE university TO bayan_reader;
GRANT USAGE ON SCHEMA public TO bayan_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bayan_reader;
-- ليشمل المشاهد الجديدة (Smart Views) التي تُنشأ لاحقاً:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bayan_reader;
```

ثم ضع القيم في `.env` (انظر `.env.example` — القسم المخصص لبيئة الاختبار).

## طبقة Smart Views

راجع [`smart_views/`](smart_views/) و[الوثيقة التصميمية](../docs/03_smart_views.md) —
طبقة المشاهد المبسّطة فوق مخطط Odoo، وهي **ابتكار المشروع الأساسي** لرفع دقة NL2SQL.

## قواعد صارمة

1. **ممنوع الكتابة في قاعدة الجامعة** — الاتصال يمر بمستخدم قراءة فقط
   ومعاملة PostgreSQL للقراءة فقط (`default_transaction_read_only=on`)
2. **ممنوع رفع أي dump قاعدة بيانات إلى Git** (موجود في .gitignore)
3. أي مخطط جديد لقاعدة المنصة يُدار عبر هجرات Alembic (تُضاف في Sprint 1) — لا تغييرات يدوية
