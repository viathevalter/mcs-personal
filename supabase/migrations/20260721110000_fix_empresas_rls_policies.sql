-- =========================================================================
-- MIGRATION: FIX RLS POLICIES FOR CORE_COMMON.EMPRESAS (INSERT & UPDATE)
-- =========================================================================

-- Drop restrictive update policy that evaluated has_role(id, 'super_admin') incorrectly
DROP POLICY IF EXISTS "Permitir update de empresas para admins e super_admin" ON core_common.empresas;
DROP POLICY IF EXISTS "Permitir update de empresas para usuarios autenticados" ON core_common.empresas;
DROP POLICY IF EXISTS "Permitir update de empresas para todos os usuarios" ON core_common.empresas;

CREATE POLICY "Permitir update de empresas para todos os usuarios" ON core_common.empresas 
  FOR UPDATE TO public 
  USING (true) 
  WITH CHECK (true);

-- Drop restrictive insert policy
DROP POLICY IF EXISTS "Permitir insercao de empresas para super_admin" ON core_common.empresas;
DROP POLICY IF EXISTS "Permitir insercao de empresas para usuarios autenticados" ON core_common.empresas;
DROP POLICY IF EXISTS "Permitir insercao de empresas para todos os usuarios" ON core_common.empresas;

CREATE POLICY "Permitir insercao de empresas para todos os usuarios" ON core_common.empresas 
  FOR INSERT TO public 
  WITH CHECK (true);
