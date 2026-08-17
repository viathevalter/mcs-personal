-- Migration: 20260817173500_force_rls_policies_true.sql
-- Description: Drop all existing policies and create universal permissive policies on holerites

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE tablename IN ('holerites', 'holerite_eventos')) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

ALTER TABLE core_personal.holerites ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.holerite_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holerites_universal_access" 
ON core_personal.holerites 
FOR ALL 
TO PUBLIC 
USING (true) 
WITH CHECK (true);

CREATE POLICY "holerite_eventos_universal_access" 
ON core_personal.holerite_eventos 
FOR ALL 
TO PUBLIC 
USING (true) 
WITH CHECK (true);
