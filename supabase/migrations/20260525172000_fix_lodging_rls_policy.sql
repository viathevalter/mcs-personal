-- ========================================================================================
-- Migration: 20260525172000_fix_lodging_rls_policy.sql
-- Description: Fix RLS policies for lodging_rates and country_tax_parameters to allow admins/operadores
-- ========================================================================================

BEGIN;

-- 1. Remover as políticas anteriores que limitavam estritamente a 'super_admin'
DROP POLICY IF EXISTS "Permitir super_admin gerenciar alojamentos" ON core_comercial.lodging_rates;
DROP POLICY IF EXISTS "Permitir super_admin gerenciar impostos" ON core_comercial.country_tax_parameters;

-- 2. Criar novas políticas flexíveis para 'super_admin', 'admin' e 'operador'
CREATE POLICY "Permitir admins gerenciarem alojamentos" 
ON core_comercial.lodging_rates FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM core_common.user_memberships 
        WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'operador') AND is_active = true
    )
);

CREATE POLICY "Permitir admins gerenciarem impostos" 
ON core_comercial.country_tax_parameters FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM core_common.user_memberships 
        WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'operador') AND is_active = true
    )
);

COMMIT;
