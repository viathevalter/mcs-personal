-- Ajusta a política de UPDATE de core_personal.workers para permitir que super administradores e RH alterem trabalhadores de todas empresas
DROP POLICY IF EXISTS "Enable update access for all members" ON core_personal.workers;

CREATE POLICY "Enable update access for all members" ON core_personal.workers
FOR UPDATE USING (
  core_common.is_member(empresa_id) 
  OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin_rh'::app_role, 'operador'::app_role])
  )
  OR EXISTS (
      SELECT 1 FROM core_common.user_memberships 
      WHERE user_id = auth.uid() 
      AND empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid 
      AND is_active = true
  )
);
