-- monica_ai schema init
-- Usage Scenarios:
-- 1. Supabase hosted PostgreSQL
-- 2. Prisma direct database connection
-- 3. Multiple projects sharing the same database, isolated by schema
--
-- Notes:
-- 1. Use monica_ai_app for runtime connections; do NOT use postgres
-- 2. schema=monica_ai is the default namespace only, NOT a security boundary
-- 3. Permission isolation relies on granting monica_ai_app minimal privileges to the monica_ai schema

-- Dangerous operation, keep commented; do NOT execute in shared environments by default
-- DROP SCHEMA IF EXISTS monica_ai CASCADE;

-- Step 1: Create schema (safe to run repeatedly)
CREATE SCHEMA IF NOT EXISTS monica_ai;

-- Step 2: Assign schema ownership to postgres
ALTER SCHEMA monica_ai OWNER TO postgres;

-- Step 3: Revoke broad privileges from PUBLIC and Supabase shared roles
REVOKE ALL ON SCHEMA monica_ai FROM PUBLIC;
REVOKE ALL ON SCHEMA monica_ai FROM anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA monica_ai FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA monica_ai FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA monica_ai FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA monica_ai FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA monica_ai FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA monica_ai FROM anon, authenticated, service_role;

-- Step 4: Create application role; set a strong password manually
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'monica_ai_app'
  ) THEN
    CREATE ROLE monica_ai_app
      LOGIN
      PASSWORD 'YOURS_PASSWORD';
  END IF;
END
$$;

-- Step 5: Grant database connection permission to the application role
GRANT CONNECT ON DATABASE postgres TO monica_ai_app;

-- Step 6: Allow the application role to use the monica_ai schema only (no CREATE privilege)
GRANT USAGE ON SCHEMA monica_ai TO monica_ai_app;

-- Step 7: Grant minimal required permissions for existing objects to monica_ai_app
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA monica_ai TO monica_ai_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA monica_ai TO monica_ai_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA monica_ai TO monica_ai_app;

-- Step 8: Configure default privileges to auto-grant access for new objects created by postgres
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA monica_ai
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA monica_ai
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO monica_ai_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA monica_ai
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO monica_ai_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA monica_ai
  GRANT EXECUTE ON FUNCTIONS TO monica_ai_app;