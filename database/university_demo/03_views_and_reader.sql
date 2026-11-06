-- =============================================================================
-- بيان — المشاهد ودور القراءة فقط للقاعدة التجريبية الموحدة
-- =============================================================================
-- هذا الملف:
--   1) v_student_profile — نسخة عاملة مطابقة لتعريف database/smart_views/
--      00_init_views.sql (نفس الأعمدة حرفياً).
--   2) v_fees_summary — تفعيل المشهد الذي كان معطلاً بالتعليق في الملف الأصلي؛
--      يعمل الآن فوق الأعمدة الثابتة amount / paid_amount في 01_schema.sql.
--   3) v_program_stats — مشهد إحصائي جديد: عدد الطلاب لكل برنامج ودفعة
--      (يخدم سؤال «كم طالباً في كل برنامج؟»).
--   4) دور bayan_reader — قراءة فقط على كل الجداول والمشاهد، بلا كتابة إطلاقاً.
--
-- التطبيق (أو ببساطة: make dev-db):
--   psql -X -v ON_ERROR_STOP=1 -h localhost -p 5433 -U odoo -d university \
--       -f database/university_demo/03_views_and_reader.sql
--
-- الملف قابل لإعادة التشغيل (re-runnable) بأمان.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- تنظيف مشاهد سابقة إن وُجدت (CASCADE لأي مشهد تابع مستقبلاً)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_student_profile CASCADE;
DROP VIEW IF EXISTS v_fees_summary  CASCADE;
DROP VIEW IF EXISTS v_program_stats CASCADE;

-- -----------------------------------------------------------------------------
-- 1) الملف الشخصي للطالب — نسخة مطابقة لـ smart_views/00_init_views.sql
--    يجمع: بيانات القيد (op_student) + جهة الاتصال (res_partner عبر الميراث
--    المفوَّض partner_id) + البرنامج (op_course) + الدفعة (op_batch)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_profile AS
SELECT
    s.id                        AS student_id,
    s.roll_number               AS roll_number,          -- رقم القيد اليمني YUxxxxxxx
    p.name                      AS student_name,
    p.email                     AS email,
    p.phone                     AS phone,
    p.city                      AS city,
    c.name                      AS program_name,          -- اسم البرنامج (مثال: علوم الحاسوب)
    b.name                      AS batch_name,            -- الدفعة (سنة القبول)
    s.gender                    AS gender
FROM op_student s
JOIN res_partner p      ON p.id = s.partner_id
LEFT JOIN op_course c   ON c.id = s.course_id
LEFT JOIN op_batch b    ON b.id = s.batch_id;

COMMENT ON VIEW v_student_profile IS
'بيان: الملف الشخصي للطالب — رقم القيد والاسم والتواصل والبرنامج والدفعة';

-- -----------------------------------------------------------------------------
-- 2) ملخص الرسوم لكل طالب — تفعيل القالب المعطل في الملف الأصلي
--    (الأعمدة amount و paid_amount مضمونة بهذه الأسماء في 01_schema.sql)
--
--    مثال لأسئلة المستخدم التي يخدمها:
--      "كم مجموع الرسوم المسددة لطلاب علوم الحاسوب؟"
--      "من الطلاب الذين عليهم رسوم متأخرة؟"
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_fees_summary AS
SELECT
    s.roll_number            AS roll_number,
    p.name                   AS student_name,
    c.name                   AS program_name,
    SUM(f.amount)            AS total_amount,
    SUM(f.paid_amount)       AS total_paid,       -- إجمالي المسدد فعلياً
    SUM(f.amount - f.paid_amount) AS outstanding  -- المتأخرات المتبقية
FROM op_student_fees_details f
JOIN op_student s      ON s.id = f.student_id
JOIN res_partner p     ON p.id = s.partner_id
LEFT JOIN op_course c  ON c.id = s.course_id
GROUP BY s.roll_number, p.name, c.name;

COMMENT ON VIEW v_fees_summary IS 'بيان: ملخص الرسوم والمتأخرات لكل طالب';

-- -----------------------------------------------------------------------------
-- 3) إحصاءات البرامج والدفعات — عدد الطلاب لكل برنامج ودفعة
--    يخدم مباشرة: "كم طالباً في كل برنامج؟" و"كم طالبة في دفعة 2023؟"
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_program_stats AS
SELECT
    c.code                                          AS program_code,   -- رمز البرنامج (CS, IT, ...)
    c.name                                          AS program_name,   -- اسم البرنامج
    b.name                                          AS batch_name,     -- الدفعة (سنة القبول)
    COUNT(s.id)                                     AS student_count,  -- عدد الطلاب
    COUNT(*) FILTER (WHERE s.gender = 'ذكر')        AS male_count,     -- عدد الذكور
    COUNT(*) FILTER (WHERE s.gender = 'أنثى')       AS female_count    -- عدد الإناث
FROM op_course c
JOIN op_batch b        ON b.course_id = c.id
LEFT JOIN op_student s ON s.batch_id  = b.id
GROUP BY c.code, c.name, b.name;

COMMENT ON VIEW v_program_stats IS
'بيان: إحصاءات الطلاب لكل برنامج ودفعة — العدد الكلي وتوزيعه حسب الجنس';

-- -----------------------------------------------------------------------------
-- 4) دور القارئ bayan_reader — قراءة فقط، بلا أي صلاحية كتابة
--    (كلمة المرور كلمة مرور تطوير محلية مقصودة: bayan_dev_reader)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bayan_reader') THEN
        CREATE ROLE bayan_reader LOGIN PASSWORD 'bayan_dev_reader';
    ELSE
        ALTER ROLE bayan_reader WITH LOGIN PASSWORD 'bayan_dev_reader';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE university TO bayan_reader;
GRANT USAGE ON SCHEMA public TO bayan_reader;
-- كل الجداول والمشاهد القائمة الآن: قراءة فقط
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bayan_reader;
-- أي جداول/مشاهد تُنشأ مستقبلاً بصلاحية هذا المستخدم: يقرؤها القارئ تلقائياً
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bayan_reader;

COMMIT;
