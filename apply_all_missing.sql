-- 1. Create Enum for Holerite Status
DO $$ BEGIN
    CREATE TYPE core_personal.holerite_status AS ENUM ('rascunho', 'fechado', 'pago');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Enum for Tipo Evento
DO $$ BEGIN
    CREATE TYPE core_personal.tipo_evento_holerite AS ENUM ('provento', 'desconto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Enum for Categoria Evento (includes 'total_horas')
DO $$ BEGIN
    CREATE TYPE core_personal.categoria_evento_holerite AS ENUM (
        'salario_base', 'auxilio_alojamento', 'outros_acrescimos', 
        'imposto_ss', 'adiantamento', 'desconto_carro', 'multa_transito', 
        'combustivel', 'pedagios', 'suministros', 'multa_alojamento', 
        'limpeza_danos', 'epis', 'taxa_bancaria', 'outros_descontos',
        'total_horas'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- (Optional fallback if enum already exists in the DB but lacks 'total_horas')
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'categoria_evento_holerite' AND e.enumlabel = 'total_horas') THEN
        ALTER TYPE core_personal.categoria_evento_holerite ADD VALUE IF NOT EXISTS 'total_horas';
    END IF;
END
$$;

-- 4. Holerites Table
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

-- 5. Holerite Eventos (Items)
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

-- 6. Worker Benefits Settings & Defaults
CREATE TABLE IF NOT EXISTS core_personal.worker_beneficios_settings (
    worker_id UUID PRIMARY KEY REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    iban TEXT,
    tarifa_hora NUMERIC(10, 2) DEFAULT 0,
    recebe_auxilio_moradia BOOLEAN DEFAULT false,
    auxilio_moradia_base NUMERIC(10, 2) DEFAULT 300.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Worker Beneficios History (Audit Log)
CREATE TABLE IF NOT EXISTS core_personal.worker_beneficios_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    change_type TEXT NOT NULL CHECK (change_type IN ('iban_update', 'tarifa_update')),
    old_value TEXT,
    new_value TEXT,
    document_url TEXT, -- Required for IBAN updates
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Enable Row Level Security
ALTER TABLE core_personal.holerites ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.holerite_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_beneficios_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_beneficios_history ENABLE ROW LEVEL SECURITY;

-- 9. Create Policies (Admin full access loop)
DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerites" ON core_personal.holerites;
CREATE POLICY "Enable ALL for authenticated admins on holerites" 
ON core_personal.holerites FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerite_eventos" ON core_personal.holerite_eventos;
CREATE POLICY "Enable ALL for authenticated admins on holerite_eventos" 
ON core_personal.holerite_eventos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

DROP POLICY IF EXISTS "Enable ALL for authenticated admins on worker_beneficios_settings" ON core_personal.worker_beneficios_settings;
CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_settings" 
ON core_personal.worker_beneficios_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

DROP POLICY IF EXISTS "Enable ALL for authenticated admins on worker_beneficios_history" ON core_personal.worker_beneficios_history;
CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_history" 
ON core_personal.worker_beneficios_history FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

-- 10. Create the storage bucket for benefits documents
INSERT INTO storage.buckets (id, name, public) VALUES ('beneficios-docs', 'beneficios-docs', false) ON CONFLICT (id) DO NOTHING;

-- 11. Set up Storage Policies for the bucket
-- Allow authenticated admins to insert and read documents
DROP POLICY IF EXISTS "Admins can insert documents in beneficios-docs" ON storage.objects;
CREATE POLICY "Admins can insert documents in beneficios-docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'beneficios-docs' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

DROP POLICY IF EXISTS "Admins can view documents in beneficios-docs" ON storage.objects;
CREATE POLICY "Admins can view documents in beneficios-docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'beneficios-docs' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);
