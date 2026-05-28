-- ========================================================================================
-- Migration: 20260525170000_comercial_lodging_and_taxes.sql
-- Description: Lodging rates per country and social security tax parameterization
-- ========================================================================================

BEGIN;

-- 1. Tabela de tarifas padrão de alojamento por país e região
CREATE TABLE IF NOT EXISTS core_comercial.lodging_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES core_common.countries(id) ON DELETE CASCADE,
    region_id UUID REFERENCES core_common.regions(id) ON DELETE CASCADE,
    rate_per_day NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_country_region UNIQUE (country_id, region_id)
);

-- Indexar para otimizar a busca por país
CREATE INDEX IF NOT EXISTS idx_lodging_rates_country_id ON core_comercial.lodging_rates(country_id);

-- 2. Tabela de parâmetros de Seguridade Social por país
CREATE TABLE IF NOT EXISTS core_comercial.country_tax_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES core_common.countries(id) ON DELETE CASCADE UNIQUE,
    ss_employer_rate NUMERIC(5,2) NOT NULL DEFAULT 23.00,
    ss_employee_rate NUMERIC(5,2) NOT NULL DEFAULT 11.00,
    ss_use_total BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE: usa 34% (23% + 11%), FALSE: usa 23% (apenas patronal)
    destacado_base_salary NUMERIC(10,2) NOT NULL DEFAULT 920.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Seed de dados iniciais para Portugal (PT), Espanha (ES) e Itália (IT)
INSERT INTO core_comercial.lodging_rates (country_id, rate_per_day)
VALUES 
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 20.00),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 15.00),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 25.00)
ON CONFLICT (country_id, region_id) DO NOTHING;

INSERT INTO core_comercial.country_tax_parameters (country_id, ss_employer_rate, ss_employee_rate, ss_use_total, destacado_base_salary)
VALUES 
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 23.00, 11.00, TRUE, 920.00),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 23.00, 11.00, TRUE, 920.00),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 23.00, 11.00, TRUE, 920.00)
ON CONFLICT (country_id) DO NOTHING;

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE core_comercial.lodging_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.country_tax_parameters ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas de leitura e escrita para RLS
CREATE POLICY "Permitir leitura de alojamentos para autenticados" 
ON core_comercial.lodging_rates FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir leitura de impostos para autenticados" 
ON core_comercial.country_tax_parameters FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir super_admin gerenciar alojamentos" 
ON core_comercial.lodging_rates FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM core_common.user_memberships 
        WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
);

CREATE POLICY "Permitir super_admin gerenciar impostos" 
ON core_comercial.country_tax_parameters FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM core_common.user_memberships 
        WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
);

-- 6. Conceder permissões para os roles do Supabase
GRANT ALL PRIVILEGES ON core_comercial.lodging_rates TO postgres, service_role, authenticated;
GRANT ALL PRIVILEGES ON core_comercial.country_tax_parameters TO postgres, service_role, authenticated;

COMMIT;
