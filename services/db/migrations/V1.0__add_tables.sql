-- Description: Sets up only the servants table for PowerSync sync engine

-- Create schema if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
        CREATE SCHEMA public;
    END IF;
END
$$;

-- Servants table (inferred from sync_rules.yaml)
CREATE TABLE IF NOT EXISTS servants (
    id UUID PRIMARY KEY
    -- Add additional columns as needed
);
