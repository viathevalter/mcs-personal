-- Fix RLS Policies for worker_beneficios_history
DROP POLICY IF EXISTS "Enable ALL for authenticated admins on worker_beneficios_history" ON core_personal.worker_beneficios_history;

CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_history" 
ON core_personal.worker_beneficios_history FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

-- Fix Policies for storage bucket beneficios-docs (if achievable via SQL, must update)
DROP POLICY IF EXISTS "Admins can insert documents in beneficios-docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view documents in beneficios-docs" ON storage.objects;

CREATE POLICY "Admins can insert documents in beneficios-docs"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'beneficios-docs' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

CREATE POLICY "Admins can view documents in beneficios-docs"
ON storage.objects FOR SELECT TO authenticated USING (
    bucket_id = 'beneficios-docs' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);
