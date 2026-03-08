-- Fix RLS for worker_beneficios_settings

-- Enable RLS just in case it was disabled
ALTER TABLE core_personal.worker_beneficios_settings ENABLE ROW LEVEL SECURITY;

-- Drop the overly restrictive "ALL" policy that might be failing on SELECTs
DROP POLICY IF EXISTS "Enable ALL for authenticated admins on worker_beneficios_settings" ON core_personal.worker_beneficios_settings;
DROP POLICY IF EXISTS "Enable SELECT for authenticated users on worker_beneficios_settings" ON core_personal.worker_beneficios_settings;

-- Create a robust SELECT policy that allows any authenticated user (or at least anyone who can read workers) to read settings
CREATE POLICY "Enable SELECT for authenticated users on worker_beneficios_settings"
ON core_personal.worker_beneficios_settings FOR SELECT
TO authenticated
USING (true);

-- Create the modifier policy for admins
CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_settings"
ON core_personal.worker_beneficios_settings FOR ALL 
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);
