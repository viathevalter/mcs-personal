-- Migration: 20260622120000_client_flow_adjustments.sql
-- Description: Payment terms table, client sequence CXXXX trigger, and lead fields expansion for conversion.

BEGIN;

-- 1. Criar a tabela core_common.payment_terms
CREATE TABLE IF NOT EXISTS core_common.payment_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    days INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Trigger de updated_at para payment_terms
CREATE OR REPLACE TRIGGER set_payment_terms_updated_at 
BEFORE UPDATE ON core_common.payment_terms 
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS para payment_terms
ALTER TABLE core_common.payment_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir membros lerem prazos de sua empresa" ON core_common.payment_terms;
CREATE POLICY "Permitir membros lerem prazos de sua empresa"
ON core_common.payment_terms FOR SELECT
USING (empresa_id IN (
    SELECT u.empresa_id FROM core_common.user_memberships u WHERE u.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Permitir gestores e admins gerenciar prazos" ON core_common.payment_terms;
CREATE POLICY "Permitir gestores e admins gerenciar prazos"
ON core_common.payment_terms FOR ALL
USING (empresa_id IN (
    SELECT u.empresa_id FROM core_common.user_memberships u WHERE u.user_id = auth.uid() AND u.role IN ('admin', 'manager')
));

-- Conceder permissões para payment_terms
GRANT ALL PRIVILEGES ON core_common.payment_terms TO postgres, service_role, authenticated;
GRANT SELECT ON core_common.payment_terms TO anon;

-- 2. Inserir prazos de pagamento padrão para todas as empresas do grupo
INSERT INTO core_common.payment_terms (empresa_id, name, days, active)
SELECT id, '10 dias após faturamento', 10, true FROM core_common.empresas
ON CONFLICT DO NOTHING;

INSERT INTO core_common.payment_terms (empresa_id, name, days, active)
SELECT id, '15 dias após faturamento', 15, true FROM core_common.empresas
ON CONFLICT DO NOTHING;

INSERT INTO core_common.payment_terms (empresa_id, name, days, active)
SELECT id, '30 dias após faturamento', 30, true FROM core_common.empresas
ON CONFLICT DO NOTHING;

INSERT INTO core_common.payment_terms (empresa_id, name, days, active)
SELECT id, '60 dias após faturamento', 60, true FROM core_common.empresas
ON CONFLICT DO NOTHING;

INSERT INTO core_common.payment_terms (empresa_id, name, days, active)
SELECT id, 'Pronto Pagamento', 0, true FROM core_common.empresas
ON CONFLICT DO NOTHING;

-- 3. Alterar a tabela core_common.clients
ALTER TABLE core_common.clients ADD COLUMN IF NOT EXISTS payment_term_id UUID REFERENCES core_common.payment_terms(id) ON DELETE SET NULL;

-- 4. Alterar a tabela core_comercial.estimaciones
ALTER TABLE core_comercial.estimaciones ADD COLUMN IF NOT EXISTS payment_term_id UUID REFERENCES core_common.payment_terms(id) ON DELETE SET NULL;

-- 5. Alterar a tabela core_comercial.leads para incluir novos campos
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES core_common.countries(id) ON DELETE SET NULL;
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES core_common.regions(id) ON DELETE SET NULL;
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS address_line TEXT;
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS payment_term_id UUID REFERENCES core_common.payment_terms(id) ON DELETE SET NULL;
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES core_common.clients(id) ON DELETE SET NULL;

-- 6. Trigger para gerar código sequencial de cliente no padrão CXXXX
CREATE OR REPLACE FUNCTION core_common.generate_next_client_code()
RETURNS TRIGGER AS $$
DECLARE
    v_max_num INTEGER;
    v_next_num INTEGER;
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
        -- Extrai a parte numérica de códigos que começam com 'C' seguidos de números
        SELECT COALESCE(MAX(SUBSTRING(codigo FROM '^C([0-9]+)$')::INTEGER), 0)
        INTO v_max_num
        FROM core_common.clients
        WHERE codigo ~ '^C[0-9]+$';
        
        v_next_num := v_max_num + 1;
        NEW.codigo := 'C' || LPAD(v_next_num::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_client_code ON core_common.clients;
CREATE TRIGGER trg_generate_client_code
BEFORE INSERT ON core_common.clients
FOR EACH ROW
EXECUTE FUNCTION core_common.generate_next_client_code();

-- 7. Ajustar políticas RLS para permitir cadastro e preenchimento público de leads
DROP POLICY IF EXISTS "Permitir leitura pública de leads via ID" ON core_comercial.leads;
CREATE POLICY "Permitir leitura pública de leads via ID"
ON core_comercial.leads FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir atualização pública de leads" ON core_comercial.leads;
CREATE POLICY "Permitir atualização pública de leads"
ON core_comercial.leads FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir inserção pública de leads" ON core_comercial.leads;
CREATE POLICY "Permitir inserção pública de leads"
ON core_comercial.leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

COMMIT;
