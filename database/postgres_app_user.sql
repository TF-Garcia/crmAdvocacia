\connect crm_thiago_adv

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_api_user') THEN
        CREATE ROLE crm_api_user
        WITH LOGIN
        PASSWORD 'troque-esta-senha-forte';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE crm_thiago_adv TO crm_api_user;
GRANT USAGE ON SCHEMA public TO crm_api_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crm_api_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crm_api_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_api_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO crm_api_user;

