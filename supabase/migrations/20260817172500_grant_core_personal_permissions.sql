-- Migration: 20260817172500_grant_core_personal_permissions.sql
-- Description: Grant usage and table permissions on core_personal and disable RLS on holerites

GRANT USAGE ON SCHEMA core_personal TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA core_personal TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core_personal TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA core_personal TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA core_personal GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA core_personal GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA core_personal GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

ALTER TABLE core_personal.holerites DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.holerite_eventos DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_beneficios_settings DISABLE ROW LEVEL SECURITY;
