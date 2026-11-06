# القاعدة التجريبية الموحدة للجامعة

قاعدة **PostgreSQL تجريبية خفيفة موحدة لكل أعضاء الفريق الخمسة** — ببيانات
جامعية يمنية اصطناعية عربية: ~500 طالب بأسماء يمنية واقعية، 40 عضو هيئة
تدريس، 6 برامج، دفعات 2021–2025، ورسوم بحالات سداد متنوعة (مسدد / جزئي /
متأخر) بالريال اليمني.

## لماذا؟ (بديل موحد خفيف عن رفع Odoo كاملاً)

رفع Odoo/OpenEduCat كاملاً ثقيل وبطيء وأسماء أعمدته تتغير بين الإصدارات —
فبنينا البديل: قاعدة PG مجردة **بأسماء جداول وأعمدة مطابقة لجوهر OpenEduCat**
(`op_student`, `res_partner`, `op_course`, `op_batch`, `op_faculty`,
`op_student_fees_details`, `op_subject`...). النتيجة:

- مشاهد **Smart Views** الحالية (وخصوصاً `v_student_profile`) تعمل فوقها حرفياً
- كود بيان لا يتغير عند الترقية لاحقاً إلى قاعدة Odoo حقيقية — نفس أسماء
  الجداول والأعمدة، فالانتقال يبقى سلساً (راجع «خيار متقدم» في
  [../README.md](../README.md))
- دور القراءة فقط `bayan_reader` يُنشأ ويُختبر تلقائياً — **بلا أي صلاحية كتابة**

## التشغيل بخطوة واحدة

من جذر المستودع:

```bash
make dev-db
```

يشغّل حاوية `university-db` (على المنفذ **5433**) ويطبّق بالترتيب:
المخطط ← البيانات ← المشاهد ودور القراءة ← التحقق الشامل.
(مطلوب مسبقاً: docker + Python فيه `psycopg` — يتوفر تلقائياً بعد `make setup`).

## كيف يختبر عضو الفريق اتصاله؟

بنفس صلاحية القراءة التي يستعملها بيان:

```bash
PGPASSWORD=bayan_dev_reader psql -h localhost -p 5433 -U bayan_reader -d university
```

مثال سريع من المشاهد:

```sql
SELECT student_name, program_name, city FROM v_student_profile LIMIT 5;
SELECT program_name, batch_name, student_count FROM v_program_stats;
SELECT student_name, outstanding FROM v_fees_summary WHERE outstanding > 0 LIMIT 5;
```

قيم الاتصال في `.env` (انظر `.env.example` — الافتراضي هناك يوافق هذه القاعدة):

```
ODOO_DB_HOST=localhost
ODOO_DB_PORT=5433
ODOO_DB_NAME=university
ODOO_DB_USER=bayan_reader
ODOO_DB_PASSWORD=bayan_dev_reader
```

## محتويات المجلد

| الملف | الدور |
|-------|-------|
| `01_schema.sql` | المخطط: جداول بجوهر أسماء OpenEduCat + فهارس + تعليقات عربية |
| `02_seed.py` | تعبئة البيانات الاصطناعية **الحتمية** (بذرة 42 — نفس النتيجة كل تشغيل) |
| `03_views_and_reader.sql` | المشاهد الثلاثة + إنشاء دور القراءة `bayan_reader` وصلاحياته |
| `verify.sh` | تحقق شامل: الجداول، العدد، المشاهد، ورفض الكتابة لدور القراءة (اختبارات سالبة) |

كل ملف قابل لإعادة التشغيل — ويمكن تشغيل كل خطوة يدوياً عند الحاجة:

```bash
docker compose exec -T university-db psql -X -v ON_ERROR_STOP=1 -U odoo -d university < database/university_demo/01_schema.sql
python database/university_demo/02_seed.py            # يقرأ DSN من متغيرات ODOO_DB_*
docker compose exec -T university-db psql -X -v ON_ERROR_STOP=1 -U odoo -d university < database/university_demo/03_views_and_reader.sql
bash database/university_demo/verify.sh
```

## علاقتها ببيئة Odoo الحقيقية

نفس أسماء الجداول والأعمدة التي تعتمدها Smart Views (`s.roll_number`,
`p.name`, `p.email`, `p.city`, `c.name`, `b.name`, `s.gender`, `f.amount`,
`f.paid_amount`) — لذلك عندما تستبدل قاعدة Odoo/OpenEduCat الحقيقية مكان هذه
القاعدة (بمنفذ 5433 نفسه ودور `bayan_reader` نفسه) يعمل كود بيان بلا تغيير،
ويكفي أن تُطبَّق `database/smart_views/00_init_views.sql` فوقها.

> البيانات كلها اصطناعية للتطوير والاختبار — لا تعكس أي أشخاص حقيقيين.
> كلمات المرور هنا (`odoo` / `bayan_dev_reader`) مقصودة لبيئة التطوير المحلية فقط.
