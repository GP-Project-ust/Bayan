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
--   4. v_student_financial_status   (جديد — تصنيف مقيّد: بيانات مالية فردية)
--   5. v_program_financial_summary  (جديد — تصنيف عام/مجمّع: بلا هوية أفراد)
--
-- ملاحظة التنفيذ الآمن: يعتمد الملف CREATE OR REPLACE VIEW دون استخدام
-- DROP VIEW ... CASCADE حتى لا تُحذف أي مشاهد أو صلاحيات تابعة بالخطأ.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 4) الحالة المالية التفصيلية للطالب (تربط الرسوم بالبرنامج والدفعة والمدينة والجنس)
--    التصنيف الأمني المستهدف (الفصل الرابع §4.3.2): restricted (مقيّد) لأنها تجمع
--    معرّف الطالب واسمه بمبالغ الرسوم والمتأخرات، رغم حذف البريد والهاتف.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_financial_status AS
SELECT
    s.roll_number                                                   AS roll_number,
    p.name                                                          AS student_name,
    p.city                                                          AS city,
    s.gender                                                        AS gender,
    c.code                                                          AS program_code,
    c.name                                                          AS program_name,
    b.name                                                          AS batch_name,
    COALESCE(SUM(COALESCE(f.amount, 0)), 0)::NUMERIC(12, 2)         AS total_amount,
    COALESCE(SUM(COALESCE(f.paid_amount, 0)), 0)::NUMERIC(12, 2)    AS total_paid,
    COALESCE(
        SUM(COALESCE(f.amount, 0) - COALESCE(f.paid_amount, 0)),
        0
    )::NUMERIC(12, 2)                                               AS outstanding,
    COUNT(f.id)                                                     AS fees_records_count,
    COALESCE(BOOL_OR(f.state = 'متأخر'), FALSE)                     AS has_overdue
FROM op_student s
JOIN res_partner p                  ON p.id = s.partner_id
LEFT JOIN op_course c               ON c.id = s.course_id
LEFT JOIN op_batch b                ON b.id = s.batch_id
LEFT JOIN op_student_fees_details f ON f.student_id = s.id
GROUP BY s.id, s.roll_number, p.name, p.city, s.gender, c.code, c.name, b.name;

COMMENT ON VIEW v_student_financial_status IS
'بيان [تصنيف مقيّد - restricted]: الحالة المالية لكل طالب مع البرنامج والدفعة والمدينة والجنس — يدعم أسئلة المتأخرات المصفاة ديموغرافياً وأكاديمياً دون كشف البريد أو الهاتف';
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
COMMENT ON COLUMN v_student_financial_status.has_overdue IS 'مؤشر منطقي غير فارغ لوجود قسط متأخر غير مسدد';

-- -----------------------------------------------------------------------------
-- 5) الملخص المالي المجمع للبرامج والدفعات (تجميع آمن دون هوية فردية للطلاب)
--    يستخدم تجميعاً مسبقاً على مستوى الطالب (student_totals) لمنع تضاعف
--    الربط (fanout) وحساب عدد الطلاب ذوي المتأخرات بدقة حتى مع تعدد الأقساط.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_program_financial_summary AS
WITH student_totals AS (
    SELECT
        s.id                                                        AS student_id,
        s.course_id                                                 AS course_id,
        s.batch_id                                                  AS batch_id,
        COALESCE(SUM(COALESCE(f.amount, 0)), 0)                     AS total_amount,
        COALESCE(SUM(COALESCE(f.paid_amount, 0)), 0)                AS total_paid,
        COALESCE(
            SUM(COALESCE(f.amount, 0) - COALESCE(f.paid_amount, 0)),
            0
        )                                                           AS outstanding,
        COALESCE(BOOL_OR(f.state IN ('متأخر', 'جزئي')), FALSE)      AS has_pending_state
    FROM op_student s
    LEFT JOIN op_student_fees_details f ON f.student_id = s.id
    GROUP BY s.id, s.course_id, s.batch_id
)
SELECT
    c.code                                                          AS program_code,
    c.name                                                          AS program_name,
    b.name                                                          AS batch_name,
    COUNT(st.student_id)                                            AS students_count,
    COALESCE(SUM(st.total_amount), 0)::NUMERIC(12, 2)               AS total_fees_due,
    COALESCE(SUM(st.total_paid), 0)::NUMERIC(12, 2)                 AS total_fees_paid,
    COALESCE(SUM(st.outstanding), 0)::NUMERIC(12, 2)                AS total_outstanding,
    COUNT(st.student_id) FILTER (
        WHERE st.outstanding > 0 OR st.has_pending_state
    )                                                               AS students_with_outstanding
FROM op_course c
JOIN op_batch b          ON b.course_id = c.id
LEFT JOIN student_totals st ON st.batch_id = b.id AND st.course_id = c.id
GROUP BY c.id, c.code, c.name, b.id, b.name;

COMMENT ON VIEW v_program_financial_summary IS
'بيان [تصنيف عام مجمّع - public]: الملخص المالي المجمع لكل برنامج ودفعة — إجمالي المستحق والمسدد والمتأخرات دون بيانات أفراد الطلاب';
COMMENT ON COLUMN v_program_financial_summary.program_code IS 'رمز البرنامج الأكاديمي';
COMMENT ON COLUMN v_program_financial_summary.program_name IS 'اسم البرنامج الأكاديمي';
COMMENT ON COLUMN v_program_financial_summary.batch_name IS 'الدفعة الأكاديمية (سنة القبول)';
COMMENT ON COLUMN v_program_financial_summary.students_count IS 'عدد الطلاب المسجلين في البرنامج والدفعة';
COMMENT ON COLUMN v_program_financial_summary.total_fees_due IS 'إجمالي الرسوم المستحقة للبرنامج والدفعة';
COMMENT ON COLUMN v_program_financial_summary.total_fees_paid IS 'إجمالي الرسوم المسددة للبرنامج والدفعة';
COMMENT ON COLUMN v_program_financial_summary.total_outstanding IS 'إجمالي المتأخرات المالية غير المسددة';
COMMENT ON COLUMN v_program_financial_summary.students_with_outstanding IS 'عدد الطلاب الذين لديهم متأخرات أو سداد جزئي';

GRANT SELECT ON v_student_financial_status, v_program_financial_summary TO bayan_reader;

COMMIT;
