-- Migration: 20260817173000_fix_holerites_fk_and_rls.sql
-- Description: Fix foreign keys and disable RLS on holerites and related tables

DO $$
BEGIN
    -- Drop old foreign keys that might reference legacy public.empresas
    ALTER TABLE core_personal.holerites DROP CONSTRAINT IF EXISTS holerites_empresa_id_fkey;
    ALTER TABLE core_personal.holerites DROP CONSTRAINT IF EXISTS holerites_worker_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE core_personal.holerites ALTER COLUMN empresa_id DROP NOT NULL;

DO $$
BEGIN
    ALTER TABLE core_personal.holerites 
        ADD CONSTRAINT holerites_empresa_id_fkey 
        FOREIGN KEY (empresa_id) REFERENCES core_common.empresas(id) ON DELETE SET NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE core_personal.holerites 
        ADD CONSTRAINT holerites_worker_id_fkey 
        FOREIGN KEY (worker_id) REFERENCES core_personal.workers(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE core_personal.holerites DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.holerite_eventos DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE core_personal.holerites TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE core_personal.holerite_eventos TO postgres, anon, authenticated, service_role;
