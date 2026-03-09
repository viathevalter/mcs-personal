-- Migration to add tax_rules table for Phase 4

-- Create ENUM for tax types
CREATE TYPE tax_category AS ENUM (
    'SS_TRABALHADOR',
    'SS_EMPRESA',
    'IRS_DEFAULT',
    'SUBSIDIO_ALIMENTACAO_LIMITE_DINHEIRO',
    'SUBSIDIO_ALIMENTACAO_LIMITE_CARTAO',
    'FCT',
    'AJUDAS_CUSTO_LIMITE',
    'KMS_LIMITE',
    'OUTROS'
);

-- Note: We are tying it to `empresas` optionally if a customer has multiple legal entities with different rules
CREATE TABLE IF NOT EXISTS tax_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id BIGINT REFERENCES empresas(id) ON DELETE CASCADE,
    tax_type tax_category NOT NULL,
    rate_percentage DECIMAL(5, 2), -- e.g. 11.00 for 11%
    fixed_amount DECIMAL(10, 2),   -- e.g. 6.00 for €6.00 daily limit
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- Ensure a rule has either a % or a fixed € amount to be valid logic
    CONSTRAINT has_value CHECK (rate_percentage IS NOT NULL OR fixed_amount IS NOT NULL)
);

-- Enable RLS
ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;

-- Policies for tax_rules
CREATE POLICY "Enable ALL for authenticated users on tax_rules" 
    ON tax_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_tax_rules
    BEFORE UPDATE ON tax_rules
    FOR EACH ROW
    EXECUTE FUNCTION core_personal.update_modified_column();

-- Insert default rules for Portugal (Can be linked to specific company later or left as global if needed)
-- We will leave empresa_id NULL for these defaults so every company starts with them.
INSERT INTO tax_rules (tax_type, rate_percentage, description, valid_from) VALUES
    ('SS_TRABALHADOR', 11.00, 'Taxa Geral Segurança Social - Trabalhador', '2024-01-01'),
    ('SS_EMPRESA', 23.75, 'Taxa Geral Segurança Social - Entidade Empregadora (TSU)', '2024-01-01'),
    ('FCT', 1.00, 'Fundo de Compensação do Trabalho', '2024-01-01');

INSERT INTO tax_rules (tax_type, fixed_amount, description, valid_from) VALUES
    ('SUBSIDIO_ALIMENTACAO_LIMITE_DINHEIRO', 6.00, 'Limite Diário Isento Subsídio Alimentação (Numerário)', '2024-01-01'),
    ('SUBSIDIO_ALIMENTACAO_LIMITE_CARTAO', 9.60, 'Limite Diário Isento Subsídio Alimentação (Cartão/Vale)', '2024-01-01'),
    ('KMS_LIMITE', 0.40, 'Valor isento por Km em viatura própria', '2024-01-01');
