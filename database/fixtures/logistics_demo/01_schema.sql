-- Bayan PR-1 Second PostgreSQL Fixture: logistics_demo
-- Independent domain fixture (schema: logistics) with:
--   * 6 physical tables
--   * 2 SQL views
--   * 6 foreign-key constraints (including 1 composite foreign key)
--   * Arabic COMMENT ON for selected objects/columns
--   * Deliberately uncommented objects/columns to prove template fallback

CREATE SCHEMA IF NOT EXISTS logistics;

COMMENT ON SCHEMA logistics IS 'مخطط العمليات اللوجستية والشحن والتوصيل (بيئة اختبار مستقلة).';

CREATE TABLE logistics.warehouses (
    warehouse_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    warehouse_code VARCHAR(16) NOT NULL UNIQUE,
    warehouse_name VARCHAR(120) NOT NULL,
    city VARCHAR(80) NOT NULL,
    region_code VARCHAR(16) NOT NULL,
    capacity_pallets INTEGER NOT NULL DEFAULT 500 CHECK (capacity_pallets > 0)
);

COMMENT ON TABLE logistics.warehouses IS 'المستودعات ومراكز التوزيع اللوجستية.';
COMMENT ON COLUMN logistics.warehouses.warehouse_id IS 'المعرف الرقمي الفريد للمستودع.';
COMMENT ON COLUMN logistics.warehouses.warehouse_name IS 'الاسم المعتمد للمستودع.';

CREATE TABLE logistics.carriers (
    carrier_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    carrier_code VARCHAR(16) NOT NULL UNIQUE,
    carrier_name VARCHAR(120) NOT NULL,
    service_tier VARCHAR(30) NOT NULL DEFAULT 'standard' CHECK (service_tier IN ('express', 'standard', 'cold_chain')),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE logistics.carriers IS 'شركات النقل والتوصيل المتعاقد معها.';

CREATE TABLE logistics.drivers (
    driver_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    carrier_id INTEGER NOT NULL,
    license_number VARCHAR(32) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(30),
    CONSTRAINT fk_drivers_carrier
        FOREIGN KEY (carrier_id) REFERENCES logistics.carriers (carrier_id)
);

CREATE TABLE logistics.shipments (
    shipment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tracking_number VARCHAR(36) NOT NULL UNIQUE,
    origin_warehouse_id INTEGER NOT NULL,
    carrier_id INTEGER NOT NULL,
    destination_city VARCHAR(80) NOT NULL,
    total_weight_kg NUMERIC(10, 2) NOT NULL CHECK (total_weight_kg > 0),
    shipping_cost NUMERIC(12, 2) NOT NULL CHECK (shipping_cost >= 0),
    shipment_status VARCHAR(24) NOT NULL DEFAULT 'created' CHECK (shipment_status IN ('created', 'in_transit', 'delivered', 'delayed')),
    dispatched_on DATE NOT NULL,
    CONSTRAINT fk_shipments_warehouse
        FOREIGN KEY (origin_warehouse_id) REFERENCES logistics.warehouses (warehouse_id),
    CONSTRAINT fk_shipments_carrier
        FOREIGN KEY (carrier_id) REFERENCES logistics.carriers (carrier_id)
);

COMMENT ON TABLE logistics.shipments IS 'سجل الشحنات الصادرة من المستودعات إلى مدن الوجهة.';
COMMENT ON COLUMN logistics.shipments.tracking_number IS 'رقم التتبع المرجعي للشحنة.';
COMMENT ON COLUMN logistics.shipments.total_weight_kg IS 'الوزن الإجمالي للشحنة بالكيلوغرام.';

CREATE TABLE logistics.route_stops (
    shipment_id BIGINT NOT NULL,
    stop_seq SMALLINT NOT NULL CHECK (stop_seq > 0),
    hub_city VARCHAR(80) NOT NULL,
    planned_arrival TIMESTAMP NOT NULL,
    stop_status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (stop_status IN ('scheduled', 'arrived', 'departed')),
    PRIMARY KEY (shipment_id, stop_seq),
    CONSTRAINT fk_route_stops_shipment
        FOREIGN KEY (shipment_id) REFERENCES logistics.shipments (shipment_id)
);

COMMENT ON TABLE logistics.route_stops IS 'محطات توقف وعبور الشحنة بمفتاح أساسي مركب.';

CREATE TABLE logistics.delivery_confirmations (
    confirmation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shipment_id BIGINT NOT NULL,
    stop_seq SMALLINT NOT NULL,
    driver_id INTEGER NOT NULL,
    confirmed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    receiver_name VARCHAR(120) NOT NULL,
    CONSTRAINT uq_confirmations_stop UNIQUE (shipment_id, stop_seq),
    CONSTRAINT fk_confirmations_route_stop
        FOREIGN KEY (shipment_id, stop_seq) REFERENCES logistics.route_stops (shipment_id, stop_seq),
    CONSTRAINT fk_confirmations_driver
        FOREIGN KEY (driver_id) REFERENCES logistics.drivers (driver_id)
);

CREATE INDEX ix_shipments_status_date ON logistics.shipments (shipment_status, dispatched_on);
CREATE INDEX ix_route_stops_hub ON logistics.route_stops (hub_city);

CREATE OR REPLACE VIEW logistics.v_active_shipments_overview AS
SELECT
    s.shipment_id,
    s.tracking_number,
    w.warehouse_name,
    c.carrier_name,
    s.destination_city,
    s.total_weight_kg,
    s.shipping_cost,
    s.shipment_status,
    s.dispatched_on
FROM logistics.shipments s
JOIN logistics.warehouses w ON w.warehouse_id = s.origin_warehouse_id
JOIN logistics.carriers c ON c.carrier_id = s.carrier_id;

COMMENT ON VIEW logistics.v_active_shipments_overview IS 'مشهد تحليلي لمتابعة الشحنات وربطها بالمستودع والناقل.';
COMMENT ON COLUMN logistics.v_active_shipments_overview.warehouse_name IS 'اسم المستودع المرسل للشحنة.';

CREATE OR REPLACE VIEW logistics.v_warehouse_dispatch_summary AS
SELECT
    w.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    w.city,
    COUNT(s.shipment_id) AS shipments_count,
    COALESCE(SUM(s.total_weight_kg), 0) AS total_dispatched_weight_kg,
    COALESCE(SUM(s.shipping_cost), 0) AS total_shipping_cost
FROM logistics.warehouses w
LEFT JOIN logistics.shipments s ON s.origin_warehouse_id = w.warehouse_id
GROUP BY w.warehouse_id, w.warehouse_code, w.warehouse_name, w.city;
