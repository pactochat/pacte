-- PowerSync Setup
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'powersync_replication') THEN
        CREATE ROLE powersync_replication WITH REPLICATION LOGIN PASSWORD 'replication-secret-password';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO powersync_replication;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO powersync_replication;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO powersync_replication;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
        CREATE PUBLICATION powersync FOR ALL TABLES;
    END IF;
END
$$;
