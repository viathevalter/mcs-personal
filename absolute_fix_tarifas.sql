-- 1. Ensure basic PostgreSQL table-level permissions exist (bypassing RLS requirements to even touch the table)
GRANT USAGE ON SCHEMA core_personal TO authenticated;
GRANT USAGE ON SCHEMA core_personal TO anon;
GRANT SELECT ON core_personal.worker_beneficios_settings TO authenticated;
GRANT SELECT ON core_personal.worker_beneficios_settings TO anon;

-- 2. Force Enable RLS
ALTER TABLE core_personal.worker_beneficios_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop all potentially conflicting policies
DROP POLICY IF EXISTS "Enable ALL for authenticated admins on worker_beneficios_settings" ON core_personal.worker_beneficios_settings;
DROP POLICY IF EXISTS "Enable SELECT for authenticated users on worker_beneficios_settings" ON core_personal.worker_beneficios_settings;
DROP POLICY IF EXISTS "worker_beneficios_select_all" ON core_personal.worker_beneficios_settings;

-- 4. Create an absolute wide-open SELECT policy for everyone (even anon) to ensure no read blockages
CREATE POLICY "worker_beneficios_select_all" 
ON core_personal.worker_beneficios_settings 
FOR SELECT 
USING (true);

-- 5. Create the modifier policy for admins
CREATE POLICY "worker_beneficios_all_admins" 
ON core_personal.worker_beneficios_settings 
FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

-- 6. FORCE Supabase PostgREST to reload its internal schema cache
NOTIFY pgrst, 'reload schema';
