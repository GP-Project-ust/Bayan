# تصميم تخزين PostgreSQL وpgvector للفهرس الدلالي

**الملفات المعنية:** [schema.sql](file:///C:/Bayan/backend/app/services/onboarding/indexing/schema.sql) و[repository.py](file:///C:/Bayan/backend/app/services/onboarding/indexing/repository.py)  
**قاعدة البيانات المستهدفة:** قاعدة بيانات المنصة المحددة في `DATABASE_URL` (`pgvector/pgvector:pg16` في [docker-compose.yml](file:///C:/Bayan/docker-compose.yml)).

---

## 1. فصل التخزين (Storage Separation)

| الطبقة | القاعدة المسؤولة | الصلاحية | المحتوى |
| --- | --- | --- | --- |
| قاعدة بيانات العميل / الجامعة | `ODOO_DB_*` (مثلاً `localhost:5433/university`) | **قراءة فقط** (`bayan_reader` + `default_transaction_read_only=on`) | الجداول الفيزيائية والمشاهد التشغيلية وسجلات المؤسسة |
| قاعدة بيانات المنصة الداخلية | `DATABASE_URL` (`localhost:5432/bayan`) | قراءة وكتابة معاملاتية | جدول `onboarding_semantic_entries` ومتجهات `pgvector` وبيانات المنصة |
| مخزن متجهات المستندات (PR-3) | `QDRANT_URL` (مجموعة `bayan_policies`) | مستقل تماماً عن الفهرس الدلالي | مقاطع اللوائح والسياسات الوثائقية النصية |

> **حظر صارم:** لا يُثبت امتداد `vector` ولا يُنشأ أي جدول منصة داخل قاعدة العميل.

---

## 2. بنية جدول `onboarding_semantic_entries` وامتداد `vector`

قبل أي إدراج أو تعديل، يتحقق `PgVectorSemanticRepository.ensure_schema()` من تفعيل الامتداد (`CREATE EXTENSION IF NOT EXISTS vector` ثم `SELECT extversion FROM pg_extension WHERE extname = 'vector'`).

- **الهوية المستقرة:** `entry_id VARCHAR(64) PRIMARY KEY` مشتق حتمياً من `SHA-256(tenant_id::source_id::entry_type::object_ref)`.
- **قيد الفرادة (Unique Scope):** `UNIQUE (tenant_id, source_id, entry_type, object_ref)` يضمن عدم تكرار أي عنصر عند تكرار التشغيل.
- **عمود المتجه:** `embedding vector(1024) NOT NULL` متطابق افتراضياً مع `EMBEDDING_DIMENSIONS=1024` (نموذج `bge-m3` / `mock` في `ADR-005`).
- **إدارة الإحالة والتقاعد (Safe Retirement):** عند حذف جدول أو مشهد في المصدر، لا تُحذف السجلات الفيزيائية عشوائياً؛ بل تُحدّث ضمن نطاق `(tenant_id, source_id)` فقط إلى `indexing_state = 'retired'` مع `retired_at = NOW()`.
- **بنية التحديث المعاملاتي:** تُنفذ عمليات `UPSERT` والتقاعد في معاملة SQL واحدة (`commit` عند النجاح، و`rollback` كامل عند أي فشل في التضمين أو الحفظ).

---

## 3. استراتيجية البحث والتوسع المستقبلي

- **الاستراتيجية المعتمدة في Sprint 1:** البحث التام بمقياس تشابه جيب التمام (`1 - (embedding <=> %s::vector)`) مع فهارس B-Tree مركبة على `(tenant_id, source_id, indexing_state, entry_type)` و`(tenant_id, schema_qualified_name)`.
- **المبرر الهندسي:** عدد السجلات الدلالية لقاعدة مؤسسية متوسطة يقع بين ~90 و~2500 صف لكل مصدر (وليس ملايين الصفوف)؛ لذا يحقق البحث التام دقة 100% دون الحاجة إلى `HNSW` أو `IVFFlat` اللذين قد يخفضان الاستدعاء عند انخفاض حجم الجدول أو يتطلبان ضبطاً إضافياً.
- **مسار التوسع المستقبلي:** عند تجاوز 20,000 سجل دلالي نشط عبر عدد كبير من المؤسسات، يمكن إضافة فهرس جزئي `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops) WHERE indexing_state = 'indexed'` دون تغيير أي واجهة برمجية.
