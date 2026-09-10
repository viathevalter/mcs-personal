-- Migration: 20260710120000_fix_pedidos_rls_policies.sql
-- Description: Expand RLS policies on core_comercial.pedidos to allow admin, operador, comercial, super_admin and company members

DROP POLICY IF EXISTS "Manage pedidos" ON core_comercial.pedidos;
DROP POLICY IF EXISTS "Update pedidos" ON core_comercial.pedidos;
DROP POLICY IF EXISTS "Permitir gestao de pedidos para usuarios" ON core_comercial.pedidos;

CREATE POLICY "Permitir gestao de pedidos para usuarios" ON core_comercial.pedidos
FOR ALL
USING (
  core_common.is_member(empresa_id)
  OR core_common.has_role(empresa_id, 'admin')
  OR core_common.has_role(empresa_id, 'super_admin')
  OR core_common.has_role(empresa_id, 'operador')
  OR core_common.has_role(empresa_id, 'comercial')
)
WITH CHECK (
  core_common.is_member(empresa_id)
  OR core_common.has_role(empresa_id, 'admin')
  OR core_common.has_role(empresa_id, 'super_admin')
  OR core_common.has_role(empresa_id, 'operador')
  OR core_common.has_role(empresa_id, 'comercial')
);
