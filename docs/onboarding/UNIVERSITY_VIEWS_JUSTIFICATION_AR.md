# مبررات المشهدين الإضافيين للقاعدة الجامعية (`04_views.sql`)

**الملف:** [04_views.sql](file:///C:/Bayan/database/university_demo/04_views.sql)  
**المرجع:** [questions.json](file:///C:/Bayan/evaluation/golden_dataset/questions.json) (33 سؤالاً مرجعياً) و[01_schema.sql](file:///C:/Bayan/database/university_demo/01_schema.sql)

---

## 1. الفجوة المرصودة في المشاهد الثلاثة الأولى

في [03_views_and_reader.sql](file:///C:/Bayan/database/university_demo/03_views_and_reader.sql):
- يضم `v_student_profile` المدينة (`city`) والجنس (`gender`) والدفعة (`batch_name`) دون مبالغ الرسوم.
- يضم `v_fees_summary` مبالغ الرسوم (`total_amount`, `total_paid`, `outstanding`) والبرنامج دون المدينة أو الجنس أو الدفعة، مما اضطر أسئلة `join` (`Q-0022`, `Q-0023`, `Q-0024`) إلى ربط المشهدين يدوياً عبر `roll_number`.
- لا يوجد مشهد مالي تجميعي محمي على مستوى البرامج والدفعات يخفي هوية الطالب الفردية.

---

## 2. المشهدان المصممان وتغطية الأسئلة الذهبية

### أ. `v_student_financial_status`
- **الجداول والأعمدة الموثقة من `01_schema.sql`:** `op_student` (`roll_number`, `gender`), `res_partner` (`name`, `city`), `op_course` (`code`, `name`), `op_batch` (`name`), `op_student_fees_details` (`amount`, `paid_amount`, `state`, `id`).
- **الأعمدة الناتجة (12 عموداً):** `roll_number`, `student_name`, `city`, `gender`, `program_code`, `program_name`, `batch_name`, `total_amount`, `total_paid`, `outstanding`, `fees_records_count`, `has_overdue`.
- **الخصوصية والأمان:** يستبعد صراحةً `res_partner.email` و`res_partner.phone` لتقليل كشف بيانات التواصل الحساسة.
- **الأسئلة الذهبية المخدومة:**
  - `Q-0022`: عدد الطلاب المتأخرين في سداد الرسوم من مدينة عدن (`city` + `outstanding`).
  - `Q-0023`: متوسط المتأخرات على الطالبات في كل برنامج (`gender` + `program_name` + `outstanding`).
  - `Q-0024`: إجمالي المتأخرات على طلاب دفعة 2022 في الهندسة المدنية (`program_name` + `batch_name` + `outstanding`).
  - `Q-0019` و`Q-0021`: تفاصيل ومعدلات المتأخرات حسب البرنامج.

### ب. `v_program_financial_summary`
- **الجداول والأعمدة الموثقة:** `op_course`, `op_batch`, `op_student`, `op_student_fees_details`.
- **الأعمدة الناتجة (8 أعمدة):** `program_code`, `program_name`, `batch_name`, `students_count`, `total_fees_due`, `total_fees_paid`, `total_outstanding`, `students_with_outstanding`.
- **الخصوصية والأمان:** إحصاء مالي مجمّع بالكامل بلا أي معرّف فردي للطالب (`roll_number` أو `student_name`).
- **الأسئلة الذهبية المخدومة:**
  - `Q-0005`: مجموع المتأخرات على طلاب كل برنامج.
  - `Q-0006`: البرنامج الأعلى متأخرات.
  - `Q-0014` و`Q-0015`: إجمالي الرسوم المستحقة والمسددة لكل برنامج.
  - `Q-0024`: تجميع مالي لبرنامج ودفعة محددة.

---

## 3. ضوابط الصلاحيات والتحقق

- يعتمد الملف `CREATE OR REPLACE VIEW` ضمن معاملة آمنة (دون `DROP VIEW ... CASCADE` حتى لا تُحذف مشاهد أو صلاحيات تابعة بالخطأ)، ثم `GRANT SELECT ON v_student_financial_status, v_program_financial_summary TO bayan_reader;`.
- يصنّف المشهد `v_student_financial_status` في الفهرس الدلالي بتصنيف `restricted` لارتباطه ببيانات مالية فردية للطالب (`roll_number`, `student_name`, `outstanding`) مع استبعاد `email` و`phone`، بينما يصنّف `v_program_financial_summary` بتصنيف `public` مجمّعاً دون هوية أفراد.
- يحتفظ كل مشهد بتعليق عربي `COMMENT ON VIEW` وتعليقات `COMMENT ON COLUMN` لكل عمود ليتغذى الفهرس الدلالي منها تلقائياً في المرحلة الحتمية.
- **ملاحظة تحقق حي:** لم يُنفذ الملف على خادم PostgreSQL حي لعدم توفر Docker/PostgreSQL في هذه البيئة؛ بانتظار المراجعة والتطبيق عبر `psql` عند رفع `university-db`.
