-- 1. Ensure basic PostgreSQL table-level permissions exist (bypassing RLS requirements to even touch the table)
GRANT USAGE ON SCHEMA core_personal TO authenticated;
GRANT USAGE ON SCHEMA core_personal TO anon;

GRANT ALL ON core_personal.holerites TO authenticated;
GRANT ALL ON core_personal.holerite_eventos TO authenticated;

-- 2. Force Enable RLS
ALTER TABLE core_personal.holerites ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.holerite_eventos ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing strict policies
DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerites" ON core_personal.holerites;
DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerite_eventos" ON core_personal.holerite_eventos;
DROP POLICY IF EXISTS "holerites_all_authenticated" ON core_personal.holerites;
DROP POLICY IF EXISTS "holerite_eventos_all_authenticated" ON core_personal.holerite_eventos;

-- 4. Create an absolute wide-open ALL policy for everyone authenticated
CREATE POLICY "holerites_all_authenticated" 
ON core_personal.holerites 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "holerite_eventos_all_authenticated" 
ON core_personal.holerite_eventos 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 5. FORCE Supabase PostgREST to reload its internal schema cache
NOTIFY pgrst, 'reload schema';
