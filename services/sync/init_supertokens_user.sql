DO $$ 
BEGIN
    -- Check if the supertokens_user role exists; create it if it doesn't
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supertokens_user') THEN
        CREATE ROLE supertokens_user WITH LOGIN PASSWORD 'somePassword';
    END IF;
END
$$;

-- Ensure the supertokens database exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'supertokens') THEN
        CREATE DATABASE supertokens;
    END IF;
END
$$;

-- Grant all privileges on the supertokens database to supertokens_user
GRANT ALL PRIVILEGES ON DATABASE supertokens TO supertokens_user;