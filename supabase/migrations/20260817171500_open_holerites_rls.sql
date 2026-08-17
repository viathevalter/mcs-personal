-- Migration: 20260817171500_open_holerites_rls.sql
-- Description: Unconditionally allow read/write operations for holerites and holerite_eventos

ALTER TABLE core_personal.holerites ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.holerite_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerites" ON core_personal.holerites;
DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerite_eventos" ON core_personal.holerite_eventos;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on holerites" ON core_personal.holerites;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on holerite_eventos" ON core_personal.holerite_eventos;
DROP POLICY IF EXISTS "Enable ALL for all users on holerites" ON core_personal.holerites;
DROP POLICY IF EXISTS "Enable ALL for all users on holerite_eventos" ON core_personal.holerite_eventos;

CREATE POLICY "Enable ALL for all users on holerites" 
ON core_personal.holerites FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Enable ALL for all users on holerite_eventos" 
ON core_personal.holerite_eventos FOR ALL 
USING (true) WITH CHECK (true);
