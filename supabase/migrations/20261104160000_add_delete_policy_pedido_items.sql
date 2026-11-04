-- ========================================================================================
-- MIGRATION: ADD DELETE RLS POLICY ON core_comercial.pedido_items
-- Description:
-- Adds missing FOR DELETE RLS policy on core_comercial.pedido_items and ensures 'admin'
-- is also included alongside 'super_admin', 'operador', and 'admin_rh'.
-- ========================================================================================

BEGIN;

DROP POLICY IF EXISTS "Delete pedido_items" ON core_comercial.pedido_items;
CREATE POLICY "Delete pedido_items" ON core_comercial.pedido_items
    FOR DELETE USING (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    );

DROP POLICY IF EXISTS "Manage pedido_items" ON core_comercial.pedido_items;
CREATE POLICY "Manage pedido_items" ON core_comercial.pedido_items
    FOR INSERT WITH CHECK (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    );

DROP POLICY IF EXISTS "Update pedido_items" ON core_comercial.pedido_items;
CREATE POLICY "Update pedido_items" ON core_comercial.pedido_items
    FOR UPDATE USING (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    ) WITH CHECK (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    );

COMMIT;
