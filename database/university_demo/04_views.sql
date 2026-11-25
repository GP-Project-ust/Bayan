-- =============================================================================
-- بيان — المشهدان الإضافيان للقاعدة التجريبية الموحدة (PR-2 — Issue #7)
-- =============================================================================
-- الغرض: سد الفجوات التحليلية والمالية في أسئلة Golden Dataset (ولا سيما
-- Q-0021..Q-0024 وQ-0005 وQ-0006 وQ-0014 وQ-0015 وQ-0019) دون تعديل المشاهد
-- الثلاثة التأسيسية في 03_views_and_reader.sql، ودون كشف البريد أو الهاتف.
--
-- يرتفع عدد المشاهد المعتمدة في قاعدة university مع هذا الملف إلى 5 مشاهد:
--   1. v_student_profile
--   2. v_fees_summary
--   3. v_program_stats
--   4. v_student_financial_status   (جديد)
--   5. v_program_financial_summary  (جديد)
--
-- التطبيق (قراءة/تنفيذ بصلاحية المالك odoo، ويبقى bayan_reader قراءة فقط):
--   psql -X -v ON_ERROR_STOP=1 -h localhost -p 5433 -U odoo -d university \
--       -f database/university_demo/04_views.sql
-- =============================================================================

BEGIN;

DROP VIEW IF EXISTS v_student_financial_status CASCADE;
DROP VIEW IF EXISTS v_program_financial_summary CASCADE;

-- -----------------------------------------------------------------------------
-- 4) الحالة المالية التفصيلية للطالب (تربط الرسوم بالبرنامج والدفعة والمدينة والجنس)
--    تغلق الحاجة لربط متعدد المشاهد في Q-0022 وQ-0023 وQ-0024 وتدعم Q-0019 وQ-0021
--    مع استبعاد بيانات التواصل الشخصية (email / phone) لتقليل انكشاف PII.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_financial_status AS
SELECT
    s.roll_number                                        AS roll_number,
    p.name                                               AS student_name,
    p.city                                               AS city,
    s.gender                                             AS gender,
    c.code                                               AS program_code,
    c.name                                               AS program_name,
    b.name                                               AS batch_name,
    COALESCE(SUM(f.amount), 0)::NUMERIC(12, 2)           AS total_amount,
    COALESCE(SUM(f.paid_amount), 0)::NUMERIC(12, 2)      AS total_paid,
    COALESCE(SUM(f.amount - f.paid_amount), 0)::NUMERIC(12, 2) AS outstanding,
    COUNT(f.id)                                          AS fees_records_count,
    BOOL_OR(f.state = 'متأخر')                           AS has_overdue
FROM op_student s
JOIN res_partner p                ON p.id = s.partner_id
JOIN op_course c                  ON c.id = s.course_id
JOIN op_batch b                   ON b.id = s.batch_id
LEFT JOIN op_student_fees_details f ON f.student_id = s.id
GROUP BY s.roll_number, p.name, p.city, s.gender, c.code, c.name, b.name;

COMMENT ON VIEW v_student_financial_status IS
'بيان: الحالة المالية لكل طالب مع البرنامج والدفعة والمدينة والجنس — يدعم أسئلة المتأخرات المصفاة ديموغرافياً وأكاديمياً دون كشف بيانات التواصل';
COMMENT ON COLUMN v_student_financial_status.roll_number IS 'رقم القيد الجامعي (YUxxxxxxx)';
COMMENT ON COLUMN v_student_financial_status.student_name IS 'الاسم الكامل للطالب';
COMMENT ON COLUMN v_student_financial_status.city IS 'مدينة سكن الطالب';
COMMENT ON COLUMN v_student_financial_status.gender IS 'جنس الطالب (ذكر / أنثى)';
COMMENT ON COLUMN v_student_financial_status.program_code IS 'رمز البرنامج الأكاديمي';
COMMENT ON COLUMN v_student_financial_status.program_name IS 'اسم البرنامج الأكاديمي';
COMMENT ON COLUMN v_student_financial_status.batch_name IS 'الدفعة الأكاديمية (سنة القبول)';
COMMENT ON COLUMN v_student_financial_status.total_amount IS 'إجمالي الرسوم المستحقة للطالب';
COMMENT ON COLUMN v_student_financial_status.total_paid IS 'إجمالي المبالغ المسددة للطالب';
COMMENT ON COLUMN v_student_financial_status.outstanding IS 'المتأخرات المتبقية غير المسددة';
COMMENT ON COLUMN v_student_financial_status.fees_records_count IS 'عدد سطور أو أقساط الرسوم المسجلة للطالب';
COMMENT ON COLUMN v_student_financial_status.has_overdue IS 'مؤشر منطقي لوجود قسط متأخر غير مسدد';

-- -----------------------------------------------------------------------------
-- 5) الملخص المالي المجمع للبرامج والدفعات (تجميع آمن دون هوية فردية للطلاب)
--    يدعم أسئلة المقارنة والتجميع المالي مثل Q-0005 وQ-0006 وQ-0014 وQ-0015 وQ-0024
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_program_financial_summary AS
SELECT
    c.code                                               AS program_code,
    c.name                                               AS program_name,
    b.name                                               AS batch_name,
    COUNT(DISTINCT s.id)                                 AS students_count,
    COALESCE(SUM(f.amount), 0)::NUMERIC(12, 2)           AS total_fees_due,
    COALESCE(SUM(f.paid_amount), 0)::NUMERIC(12, 2)      AS total_fees_paid,
    COALESCE(SUM(f.amount - f.paid_amount), 0)::NUMERIC(12, 2) AS total_outstanding,
    COUNT(DISTINCT CASE WHEN f.state IN ('متأخر', 'جزئي') THEN s.id END) AS students_with_outstanding
FROM op_course c
JOIN op_batch b                   ON b.course_id = c.id
LEFT JOIN op_student s            ON s.batch_id = b.id
LEFT JOIN op_student_fees_details f ON f.student_id = s.id
GROUP BY c.code, c.name, b.name;

COMMENT ON VIEW v_program_financial_summary IS
'بيان: الملخص المالي المجمع لكل برنامج ودفعة — إجمالي المستحق والمسدد والمتأخرات دون بيانات أفراد الطلاب';
COMMENT ON COLUMN v_program_financial_summary.program_code IS 'رمز البرنامج الأكاديمي';
COMMENT ON COLUMN v_program_financial_summary.program_name IS 'اسم البرنامج الأكاديمي';
COMMENT ON COLUMN v_program_financial_summary.batch_name IS 'الدفعة الأكاديمية (سنة القبول)';
COMMENT ON COLUMN v_program_financial_summary.students_count IS 'عدد الطلاب المسجلين في البرنامج والدفعة';
COMMENT ON COLUMN v_program_financial_summary.total_fees_due IS 'إجمالي الرسوم المستحقة للبرنامج والدفعة';
COMMENT ON COLUMN v_program_financial_summary.total_fees_paid IS 'إجمالي الرسوم المسددة للبرنامج والدفعة';
COMMENT ON COLUMN v_program_financial_summary.total_outstanding IS 'إجمالي المتأخرات المالية غير المسددة';
COMMENT ON COLUMN v_program_financial_summary.students_with_outstanding IS 'عدد الطلاب الذين لديهم سداد جزئي أو متأخر';

GRANT SELECT ON v_student_financial_status, v_program_financial_summary TO bayan_reader;

COMMIT;
