-- Synthetic seed data for logistics_demo fixture (no customer data)
BEGIN;

INSERT INTO logistics.warehouses (warehouse_code, warehouse_name, city, region_code, capacity_pallets)
VALUES
    ('WH-RUH-01', 'مستودع الرياض المركزي', 'الرياض', 'CENTRAL', 1200),
    ('WH-JED-01', 'مستودع جدة البحري', 'جدة', 'WEST', 950),
    ('WH-DMM-01', 'مستودع الدمام الشرقي', 'الدمام', 'EAST', 800);

INSERT INTO logistics.carriers (carrier_code, carrier_name, service_tier, active)
VALUES
    ('CAR-EXP', 'شركة البرق السريع للنقل', 'express', TRUE),
    ('CAR-CLD', 'شركة الأفق المبردة', 'cold_chain', TRUE);

INSERT INTO logistics.drivers (carrier_id, license_number, full_name, phone)
VALUES
    (1, 'LIC-1001', 'ماجد عبد الله الشهري', '+966500001001'),
    (1, 'LIC-1002', 'سلطان ناصر الحربي', '+966500001002'),
    (2, 'LIC-2001', 'تركي سالم القحطاني', '+966500002001');

INSERT INTO logistics.shipments (
    tracking_number, origin_warehouse_id, carrier_id, destination_city,
    total_weight_kg, shipping_cost, shipment_status, dispatched_on
)
VALUES
    ('TRK-2026-0001', 1, 1, 'جدة', 420.50, 890.00, 'delivered', '2026-11-10'),
    ('TRK-2026-0002', 2, 2, 'الرياض', 610.00, 1450.00, 'in_transit', '2026-11-15'),
    ('TRK-2026-0003', 3, 1, 'الخبر', 180.25, 320.00, 'created', '2026-11-18');

INSERT INTO logistics.route_stops (shipment_id, stop_seq, hub_city, planned_arrival, stop_status)
VALUES
    (1, 1, 'الرياض', '2026-11-10 08:00:00', 'departed'),
    (1, 2, 'جدة', '2026-11-11 14:30:00', 'arrived'),
    (2, 1, 'جدة', '2026-11-15 09:00:00', 'departed'),
    (2, 2, 'الرياض', '2026-11-16 17:00:00', 'scheduled'),
    (3, 1, 'الدمام', '2026-11-18 10:00:00', 'scheduled');

INSERT INTO logistics.delivery_confirmations (shipment_id, stop_seq, driver_id, confirmed_at, receiver_name)
VALUES
    (1, 2, 1, '2026-11-11 15:05:00', 'مركز استلام جدة الموحد');

COMMIT;
ANALYZE logistics.warehouses;
ANALYZE logistics.carriers;
ANALYZE logistics.drivers;
ANALYZE logistics.shipments;
ANALYZE logistics.route_stops;
ANALYZE logistics.delivery_confirmations;
