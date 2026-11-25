# Logistics Demo PostgreSQL Fixture (`logistics_demo`)

قاعدة اختبار PostgreSQL مستقلة لإثبات عمومية الاستبطان الحتمي والفهرسة الدلالية على مخطط غير `public`.

## المواصفات
- **المخطط:** `logistics`
- **الجداول (6):** `warehouses`, `carriers`, `drivers`, `shipments`, `route_stops`, `delivery_confirmations`
- **المشاهد (2):** `v_active_shipments_overview`, `v_warehouse_dispatch_summary`
- **المفاتيح الأجنبية (6):** تتضمن مفتاحاً أجنبياً مركباً `(shipment_id, stop_seq)` بين `delivery_confirmations` و`route_stops`
- **التعليقات:** مزيج من `COMMENT ON` العربية وكائنات/أعمدة بدون تعليقات لاختبار أولوية التعليق ثم القالب الحتمي
- **حساب القراءة فقط:** `bayan_logistics_reader` (صلاحيات `USAGE` + `SELECT` فقط مع `default_transaction_read_only = on`)

## التهيئة على خادم PostgreSQL
```bash
createdb logistics_demo
psql -d logistics_demo -f 01_schema.sql
psql -d logistics_demo -f 02_seed.sql
psql -d logistics_demo -f 03_readonly_role.sql
```

## إعدادات الاتصال للاختبار
- **Host:** `localhost`
- **Port:** `5433`
- **Database:** `logistics_demo`
- **Schema:** `logistics`
- **Reader user:** `bayan_logistics_reader`
- **Development password:** `bayan_dev_logistics_reader`
