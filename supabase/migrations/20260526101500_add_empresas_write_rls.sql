-- ==============================================================================
-- Migração Evolutiva - Adiciona políticas de escrita (RLS) na tabela empresas
-- ==============================================================================

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir update de empresas para admins e super_admin" ON "core_common"."empresas";
DROP POLICY IF EXISTS "Permitir insercao de empresas para super_admin" ON "core_common"."empresas";

-- Habilita escrita para Administradores da Empresa e Super Admins globais
CREATE POLICY "Permitir update de empresas para admins e super_admin" ON "core_common"."empresas"
FOR UPDATE TO authenticated
USING (core_common.has_role(id, 'super_admin') OR core_common.has_role(id, 'admin'))
WITH CHECK (core_common.has_role(id, 'super_admin') OR core_common.has_role(id, 'admin'));

-- Apenas Super Admins globais podem criar novas empresas/filiais
CREATE POLICY "Permitir insercao de empresas para super_admin" ON "core_common"."empresas"
FOR INSERT TO authenticated
WITH CHECK (public.get_my_role() = 'super_admin');
