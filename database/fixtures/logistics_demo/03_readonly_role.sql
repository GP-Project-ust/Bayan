-- Dedicated read-only reader role for logistics_demo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bayan_logistics_reader') THEN
        CREATE ROLE bayan_logistics_reader
            LOGIN
            PASSWORD 'bayan_dev_logistics_reader'
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT;
    END IF;
END
$$;

ALTER ROLE bayan_logistics_reader SET default_transaction_read_only = on;

REVOKE ALL ON SCHEMA logistics FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA logistics FROM PUBLIC;

GRANT USAGE ON SCHEMA logistics TO bayan_logistics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA logistics TO bayan_logistics_reader;

ALTER DEFAULT PRIVILEGES IN SCHEMA logistics
    GRANT SELECT ON TABLES TO bayan_logistics_reader;
