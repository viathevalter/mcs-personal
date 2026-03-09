-- Fix RLS Policies for worker_beneficios_settings, holerites, and holerite_eventos
-- (Replacing 'superadmin' and 'admin' with correct roles 'super_admin' and 'admin_rh')

DROP POLICY IF EXISTS "Enable ALL for authenticated admins on worker_beneficios_settings" ON core_personal.worker_beneficios_settings;
CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_settings" 
ON core_personal.worker_beneficios_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerites" ON core_personal.holerites;
CREATE POLICY "Enable ALL for authenticated admins on holerites" 
ON core_personal.holerites FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerite_eventos" ON core_personal.holerite_eventos;
CREATE POLICY "Enable ALL for authenticated admins on holerite_eventos" 
ON core_personal.holerite_eventos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);
