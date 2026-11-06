-- =============================================================================
-- بيان — القاعدة التجريبية الموحدة: مخطط بجوهر أسماء OpenEduCat
-- =============================================================================
-- الفلسفة: قاعدة PostgreSQL خفيفة أسماء جداولها وأعمدتها تطابق جوهر مخطط
-- OpenEduCat/Odoo (op_* + res_partner)، بحيث:
--   1) تعمل Smart Views الحالية (database/smart_views/00_init_views.sql)
--      فوقها حرفياً بلا أي تعديل كود.
--   2) تكون الترقية لاحقاً إلى قاعدة Odoo/OpenEduCat حقيقية شبه سلسة،
--      لأن نفس أسماء الجداول والأعمدة المستخدمة في المشاهد موجودة هنا.
--
-- التطبيق (أو ببساطة: make dev-db):
--   psql -X -v ON_ERROR_STOP=1 -h localhost -p 5433 -U odoo -d university \
--       -f database/university_demo/01_schema.sql
--
-- ملاحظة: الملف قابل لإعادة التشغيل — يحذف الجداول (ومعها المشاهد التابعة)
-- ويعيد إنشاءها من الصفر. البيانات تُعبَّئ لاحقاً عبر 02_seed.py.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) تنظيف أي مخطط سابق (إعادة تشغيل آمنة)
--    CASCADE يحذف المشاهد المعتمدة إن وُجدت — سيُعيد 03_views_and_reader.sql بناءها
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS op_student_course_rel     CASCADE;
DROP TABLE IF EXISTS op_student_fees_details   CASCADE;
DROP TABLE IF EXISTS op_student                CASCADE;
DROP TABLE IF EXISTS op_faculty                CASCADE;
DROP TABLE IF EXISTS op_subject                CASCADE;
DROP TABLE IF EXISTS op_batch                  CASCADE;
DROP TABLE IF EXISTS op_course                 CASCADE;
DROP TABLE IF EXISTS op_department             CASCADE;
DROP TABLE IF EXISTS res_partner               CASCADE;

-- -----------------------------------------------------------------------------
-- 1) الأقسام الأكاديمية (OpenEduCat: op_department)
-- -----------------------------------------------------------------------------
CREATE TABLE op_department (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(120) NOT NULL,          -- اسم القسم (مثال: قسم علوم الحاسوب)
    code    VARCHAR(16)  NOT NULL UNIQUE    -- رمز القسم (مثال: CS)
);

COMMENT ON TABLE  op_department IS 'بيان (توافق OpenEduCat): الأقسام الأكاديمية بالجامعة';
COMMENT ON COLUMN op_department.name IS 'اسم القسم الأكاديمي بالعربية';
COMMENT ON COLUMN op_department.code IS 'رمز القسم اللاتيني المختصر';

-- -----------------------------------------------------------------------------
-- 2) جهات الاتصال (Odoo/OpenEduCat: res_partner)
--    في Odoo يحمل هذا الجدول أسماء الأشخاص وبيانات تواصلهم — والطالب/عضو
--    هيئة التدريس "يرثه" عبر partner_id (الميراث المفوَّض). نفس النمط هنا.
-- -----------------------------------------------------------------------------
CREATE TABLE res_partner (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(200) NOT NULL,           -- الاسم الكامل بالعربية
    email  VARCHAR(120),                    -- البريد الجامعي (قد يكون فارغاً)
    phone  VARCHAR(32),                     -- الهاتف بصيغة يمنية +9677XXXXXXXX
    city   VARCHAR(60)                      -- المدينة (صنعاء، عدن، تعز...)
);

COMMENT ON TABLE  res_partner IS 'بيان (توافق Odoo): جهات الاتصال — الأسماء وبيانات التواصل للطلاب وهيئة التدريس';
COMMENT ON COLUMN res_partner.name  IS 'الاسم الكامل (اسم أب عائلة)';
COMMENT ON COLUMN res_partner.email IS 'البريد الإلكتروني الجامعي';
COMMENT ON COLUMN res_partner.phone IS 'رقم الهاتف بصيغة دولية يمنية';
COMMENT ON COLUMN res_partner.city  IS 'مدينة السكن (مدن يمنية)';

-- -----------------------------------------------------------------------------
-- 3) البرامج الأكاديمية (OpenEduCat: op_course — «البرنامج» بلغة المستخدم العربي)
--    6 برامج: علوم الحاسوب، تقنية المعلومات، إدارة الأعمال، المحاسبة،
--    الهندسة المدنية، القانون (تُعبَّأ في 02_seed.py)
-- -----------------------------------------------------------------------------
CREATE TABLE op_course (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(160) NOT NULL,            -- اسم البرنامج (مثال: علوم الحاسوب)
    code  VARCHAR(16)  NOT NULL UNIQUE      -- رمز البرنامج (مثال: CS)
);

COMMENT ON TABLE  op_course IS 'بيان (توافق OpenEduCat): البرامج الأكاديمية — «الدورة/Course» في OpenEduCat تعني برنامج التخرج';
COMMENT ON COLUMN op_course.name IS 'اسم البرنامج الأكاديمي بالعربية';
COMMENT ON COLUMN op_course.code IS 'رمز البرنامج اللاتيني المختصر';

-- -----------------------------------------------------------------------------
-- 4) الدفعات (OpenEduCat: op_batch) — دفعة قبول لكل برنامج (2021..2025)
-- -----------------------------------------------------------------------------
CREATE TABLE op_batch (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(80) NOT NULL,         -- اسم الدفعة (مثال: دفعة 2021)
    course_id INTEGER     NOT NULL,         -- البرنامج الذي تنتمي إليه الدفعة
    UNIQUE (course_id, name),
    FOREIGN KEY (course_id) REFERENCES op_course (id) ON DELETE CASCADE
);

COMMENT ON TABLE  op_batch IS 'بيان (توافق OpenEduCat): دفعات القبول — لكل برنامج دفعة في كل سنة';
COMMENT ON COLUMN op_batch.name      IS 'اسم الدفعة (سنة القبول)';
COMMENT ON COLUMN op_batch.course_id IS 'معرّف البرنامج (op_course.id)';

-- -----------------------------------------------------------------------------
-- 5) الطلاب (OpenEduCat: op_student)
--    بيانات القيد فقط — الاسم والتواصل في res_partner عبر partner_id،
--    تماماً كما في Odoo (وهذا ما يخفيه المشهد v_student_profile).
-- -----------------------------------------------------------------------------
CREATE TABLE op_student (
    id          SERIAL PRIMARY KEY,
    roll_number VARCHAR(16) NOT NULL UNIQUE,   -- رقم القيد بصيغة YUxxxxxxx (YU + سنة + تسلسل)
    partner_id  INTEGER     NOT NULL UNIQUE,   -- جهة الاتصال المرتبطة (الاسم والتواصل)
    course_id   INTEGER     NOT NULL,          -- البرنامج الأكاديمي
    batch_id    INTEGER     NOT NULL,          -- دفعة القبول
    gender      VARCHAR(10) NOT NULL,          -- الجنس: ذكر / أنثى
    FOREIGN KEY (partner_id) REFERENCES res_partner (id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES op_course (id),
    FOREIGN KEY (batch_id)   REFERENCES op_batch (id)
);

COMMENT ON TABLE  op_student IS 'بيان (توافق OpenEduCat): سجلات قيد الطلاب — بيانات الهوية الأكاديمية فقط';
COMMENT ON COLUMN op_student.roll_number IS 'رقم القيد الجامعي بصيغة YUxxxxxxx (مثال: YU2100001)';
COMMENT ON COLUMN op_student.partner_id  IS 'معرّف جهة الاتصال (res_partner.id) — يحمل الاسم والبريد والهاتف والمدينة';
COMMENT ON COLUMN op_student.course_id   IS 'معرّف البرنامج (op_course.id)';
COMMENT ON COLUMN op_student.batch_id    IS 'معرّف الدفعة (op_batch.id)';
COMMENT ON COLUMN op_student.gender      IS 'الجنس (ذكر / أنثى)';

-- -----------------------------------------------------------------------------
-- 6) أعضاء هيئة التدريس (OpenEduCat: op_faculty)
-- -----------------------------------------------------------------------------
CREATE TABLE op_faculty (
    id            SERIAL PRIMARY KEY,
    partner_id    INTEGER NOT NULL UNIQUE,     -- جهة الاتصال (الاسم والتواصل)
    department_id INTEGER NOT NULL,            -- القسم الأكاديمي
    FOREIGN KEY (partner_id)    REFERENCES res_partner (id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES op_department (id)
);

COMMENT ON TABLE  op_faculty IS 'بيان (توافق OpenEduCat): أعضاء هيئة التدريس';
COMMENT ON COLUMN op_faculty.partner_id    IS 'معرّف جهة الاتصال (res_partner.id)';
COMMENT ON COLUMN op_faculty.department_id IS 'معرّف القسم (op_department.id)';

-- -----------------------------------------------------------------------------
-- 7) تفاصيل رسوم الطلاب (OpenEduCat: op_student_fees_details)
--    الأعمدة amount و paid_amount بهذه الأسماء حرفياً — يعتمد عليها
--    المشهد v_fees_summary (المفعَّل في 03_views_and_reader.sql).
-- -----------------------------------------------------------------------------
CREATE TABLE op_student_fees_details (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER        NOT NULL,       -- الطالب صاحب السطر
    amount      NUMERIC(12, 2) NOT NULL,       -- المبلغ المستحق للفصل الدراسي (ريال يمني)
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- المسدد فعلياً حتى الآن
    date        DATE           NOT NULL,       -- تاريخ استحقاق سطر الرسوم
    state       VARCHAR(20)    NOT NULL,       -- الحالة: مسدد / جزئي / متأخر
    FOREIGN KEY (student_id) REFERENCES op_student (id) ON DELETE CASCADE
);

COMMENT ON TABLE  op_student_fees_details IS 'بيان (توافق OpenEduCat): سطور رسوم الطلاب لكل فصل دراسي';
COMMENT ON COLUMN op_student_fees_details.student_id  IS 'معرّف الطالب (op_student.id)';
COMMENT ON COLUMN op_student_fees_details.amount      IS 'المبلغ المستحق بالريال اليمني';
COMMENT ON COLUMN op_student_fees_details.paid_amount IS 'المبلغ المسدد فعلياً بالريال اليمني';
COMMENT ON COLUMN op_student_fees_details.date        IS 'تاريخ استحقاق الرسوم';
COMMENT ON COLUMN op_student_fees_details.state       IS 'حالة السداد: مسدد / جزئي / متأخر';

-- -----------------------------------------------------------------------------
-- 8) المقررات الدراسية (OpenEduCat: op_subject — مقرر يُدرَّس ضمن برنامج)
-- -----------------------------------------------------------------------------
CREATE TABLE op_subject (
    id        SERIAL PRIMARY KEY,
    code      VARCHAR(16)  NOT NULL UNIQUE,   -- رمز المقرر (مثال: CS101)
    name      VARCHAR(160) NOT NULL,          -- اسم المقرر (مثال: تراكيب البيانات)
    course_id INTEGER      NOT NULL,          -- البرنامج الذي يتبعه المقرر
    FOREIGN KEY (course_id) REFERENCES op_course (id) ON DELETE CASCADE
);

COMMENT ON TABLE  op_subject IS 'بيان (توافق OpenEduCat): المقررات الدراسية ضمن كل برنامج';
COMMENT ON COLUMN op_subject.code      IS 'رمز المقرر اللاتيني';
COMMENT ON COLUMN op_subject.name      IS 'اسم المقرر بالعربية';
COMMENT ON COLUMN op_subject.course_id IS 'معرّف البرنامج (op_course.id)';

-- -----------------------------------------------------------------------------
-- 9) ربط الطلاب بالمقررات (نمط جداول العلاقات _rel في OpenEduCat)
--    جدول ثنائي بسيط: أي طالب سجّل أي مقرر — يخدم أسئلة النتائج مستقبلاً.
-- -----------------------------------------------------------------------------
CREATE TABLE op_student_course_rel (
    student_id INTEGER NOT NULL REFERENCES op_student (id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES op_subject (id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, subject_id)
);

COMMENT ON TABLE op_student_course_rel IS 'بيان (نمط OpenEduCat _rel): تسجيل الطلاب في المقررات';

-- -----------------------------------------------------------------------------
-- 10) فهارس المفاتيح الخارجية (لا تُنشأ تلقائياً في PostgreSQL)
-- -----------------------------------------------------------------------------
CREATE INDEX res_partner_city_idx          ON res_partner (city);
CREATE INDEX op_batch_course_idx           ON op_batch (course_id);
CREATE INDEX op_student_partner_idx        ON op_student (partner_id);
CREATE INDEX op_student_course_idx         ON op_student (course_id);
CREATE INDEX op_student_batch_idx          ON op_student (batch_id);
CREATE INDEX op_student_gender_idx         ON op_student (gender);
CREATE INDEX op_faculty_partner_idx        ON op_faculty (partner_id);
CREATE INDEX op_faculty_department_idx     ON op_faculty (department_id);
CREATE INDEX op_student_fees_student_idx   ON op_student_fees_details (student_id);
CREATE INDEX op_student_fees_state_idx     ON op_student_fees_details (state);
CREATE INDEX op_subject_course_idx         ON op_subject (course_id);
CREATE INDEX op_student_course_rel_subject_idx ON op_student_course_rel (subject_id);

COMMIT;
