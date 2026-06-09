-- ========================================================================================
-- Migration: 20260608110000_comercial_settings_and_client_finance.sql
-- Description: Create comercial_settings table per empresa and add financial columns to clients.
-- ========================================================================================

BEGIN;

-- 1. Criar a tabela de configurações comerciais por empresa
CREATE TABLE IF NOT EXISTS core_comercial.comercial_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL UNIQUE REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    min_margin_percent DECIMAL(5,2) DEFAULT 15.00,
    block_debtor_estimations BOOLEAN DEFAULT TRUE,
    ivp_min_threshold DECIMAL(5,2) DEFAULT 5.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Inserir configurações padrão para as empresas existentes
INSERT INTO core_comercial.comercial_settings (empresa_id, min_margin_percent, block_debtor_estimations, ivp_min_threshold)
SELECT id, 15.00, TRUE, 5.00 FROM core_common.empresas
ON CONFLICT (empresa_id) DO NOTHING;

-- 3. Adicionar colunas financeiras e de risco à tabela de clientes (core_common.clients)
ALTER TABLE core_common.clients ADD COLUMN IF NOT EXISTS financial_status VARCHAR DEFAULT 'active' CHECK (financial_status IN ('active', 'debtor', 'blocked'));
ALTER TABLE core_common.clients ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT NULL;
ALTER TABLE core_common.clients ADD COLUMN IF NOT EXISTS current_debt DECIMAL(15,2) DEFAULT 0.00;

-- 4. Habilitar RLS e criar políticas para comercial_settings
ALTER TABLE core_comercial.comercial_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View settings if member" ON core_comercial.comercial_settings;
CREATE POLICY "View settings if member" ON core_comercial.comercial_settings 
FOR SELECT TO authenticated 
USING (core_common.is_member(empresa_id));

DROP POLICY IF EXISTS "Manage settings if admin" ON core_comercial.comercial_settings;
CREATE POLICY "Manage settings if admin" ON core_comercial.comercial_settings 
FOR ALL TO authenticated 
USING (core_common.has_role(empresa_id, 'super_admin'))
WITH CHECK (core_common.has_role(empresa_id, 'super_admin'));

-- 5. Conceder permissões para a nova tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON core_comercial.comercial_settings TO authenticated;

-- 6. Recarregar o esquema do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
