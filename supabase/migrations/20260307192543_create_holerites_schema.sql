-- Create Enum for Holerite Status
DO $$ BEGIN
    CREATE TYPE core_personal.holerite_status AS ENUM ('rascunho', 'fechado', 'pago');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Enum for Tipo Evento
DO $$ BEGIN
    CREATE TYPE core_personal.tipo_evento_holerite AS ENUM ('provento', 'desconto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Enum for Categoria Evento
DO $$ BEGIN
    CREATE TYPE core_personal.categoria_evento_holerite AS ENUM (
        'salario_base', 'auxilio_alojamento', 'outros_acrescimos', 
        'imposto_ss', 'adiantamento', 'desconto_carro', 'multa_transito', 
        'combustivel', 'pedagios', 'suministros', 'multa_alojamento', 
        'limpeza_danos', 'epis', 'taxa_bancaria', 'outros_descontos'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Holerites Table
CREATE TABLE IF NOT EXISTS core_personal.holerites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id BIGINT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    mes_referencia DATE NOT NULL,
    horas_trabalhadas NUMERIC(10, 2) DEFAULT 0,
    total_proventos NUMERIC(15, 2) DEFAULT 0,
    total_descontos NUMERIC(15, 2) DEFAULT 0,
    valor_liquido NUMERIC(15, 2) DEFAULT 0,
    status core_personal.holerite_status NOT NULL DEFAULT 'rascunho',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holerite Eventos (Items)
CREATE TABLE IF NOT EXISTS core_personal.holerite_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    holerite_id UUID NOT NULL REFERENCES core_personal.holerites(id) ON DELETE CASCADE,
    tipo_evento core_personal.tipo_evento_holerite NOT NULL,
    categoria core_personal.categoria_evento_holerite NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(15, 2) NOT NULL,
    referencia_dias_horas NUMERIC(10, 2), -- Context, e.g., 160 hours or 15 days
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Benefits Settings & Defaults
CREATE TABLE IF NOT EXISTS core_personal.worker_beneficios_settings (
    worker_id UUID PRIMARY KEY REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    iban TEXT,
    tarifa_hora NUMERIC(10, 2) DEFAULT 0,
    recebe_auxilio_moradia BOOLEAN DEFAULT false,
    auxilio_moradia_base NUMERIC(10, 2) DEFAULT 300.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE core_personal.holerites ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.holerite_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_beneficios_settings ENABLE ROW LEVEL SECURITY;

-- Create Policies (Admin full access loop)
CREATE POLICY "Enable ALL for authenticated admins on holerites" 
ON core_personal.holerites FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin', 'operador'))
);

CREATE POLICY "Enable ALL for authenticated admins on holerite_eventos" 
ON core_personal.holerite_eventos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin', 'operador'))
);

CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_settings" 
ON core_personal.worker_beneficios_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin', 'operador'))
);
