-- =============================================================================
-- بيان — طبقة Smart Views التأسيسية فوق مخطط Odoo/OpenEduCat
-- =============================================================================
-- الهدف: إخفاء تعقيد مخطط Odoo (الميراث المفوَّض إلى res_partner، جداول العلاقات
-- الثنائية _rel، مئات الأعمدة التقنية) خلف مشاهد بسيطة بعمود لكل مفهوم يفهمه
-- المستخدم العربي — فترتفع دقة توليد SQL من النموذج اللغوي.
--
-- التطبيق (بعد رفع بيئة الاختبار وربطها — راجع database/README.md):
--   docker compose exec db psql -U odoo -d university -f /dev/stdin < 00_init_views.sql
--   (أو من الجهاز: psql -h localhost -p 5433 -U odoo -d university -f 00_init_views.sql)
--
-- ملاحظة مهمة قبل التوسع: تحقق من الأعمدة الفعلية على قاعدتك المستعادة:
--   \d op_student
--   \d op_student_fees_details
-- فبعض إصدارات OpenEduCat تختلف تسمية الأعمدة قليلاً.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) الملف الشخصي للطالب — أول مشهد تدريبي
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
-- 2) ملخص الرسوم لكل طالب — قالب جاهز للتحقق والتدقيق (معطّل حتى التحقق)
--
--    مثال لأسئلة المستخدم التي يخدمها:
--      "كم مجموع الرسوم المسددة لطلاب علوم الحاسوب؟"
--      "من الطلاب الذين عليهم رسوم متأخرة؟"
-- -----------------------------------------------------------------------------
-- CREATE OR REPLACE VIEW v_fees_summary AS
-- SELECT
--     s.roll_number            AS roll_number,
--     p.name                   AS student_name,
--     c.name                   AS program_name,
--     SUM(f.amount)            AS total_amount,
--     SUM(f.paid_amount)       AS total_paid,       -- ⚠️ تحقق من اسم العمود الفعلي
--     SUM(f.amount - f.paid_amount) AS outstanding
-- FROM op_student_fees_details f
-- JOIN op_student s      ON s.id = f.student_id
-- JOIN res_partner p     ON p.id = s.partner_id
-- LEFT JOIN op_course c  ON c.id = s.course_id
-- GROUP BY s.roll_number, p.name, c.name;
--
-- COMMENT ON VIEW v_fees_summary IS 'بيان: ملخص الرسوم والمتأخرات لكل طالب';

-- -----------------------------------------------------------------------------
-- الدفعة القادمة (Sprint 1): مشاهد الامتحانات والنتائج والقبولات
--   v_exam_results / v_admission_stats / v_faculty_workload
-- ترتيب الأولوية وفق توزيع أسئلة Golden Dataset (راجع evaluation/README.md)
-- -----------------------------------------------------------------------------
