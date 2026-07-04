-- Migration para Faturamento B2B e Controle de Horas
-- Data: 2026-06-21

-- 1. Criação do Bucket extracao-horas caso não exista
INSERT INTO storage.buckets (id, name, public) 
VALUES ('extracao-horas', 'extracao-horas', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage RLS (Bucket: extracao-horas)
DROP POLICY IF EXISTS "Allow all operations on extracao-horas" ON storage.objects;
CREATE POLICY "Allow all operations on extracao-horas"
ON storage.objects FOR ALL
USING (bucket_id = 'extracao-horas')
WITH CHECK (bucket_id = 'extracao-horas');


-- 2. Tabela faturas_proforma (Fluxo do Magic Link)
CREATE TABLE IF NOT EXISTS core_finance.faturas_proforma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
    ano_referencia INTEGER NOT NULL,
    valor_total NUMERIC(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, pago, cancelado
    magic_link_token UUID UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em faturas_proforma
ALTER TABLE core_finance.faturas_proforma ENABLE ROW LEVEL SECURITY;

-- Política permissiva (Ajustar em produção)
CREATE POLICY "Allow all read write for faturas_proforma" 
ON core_finance.faturas_proforma FOR ALL 
USING (true) WITH CHECK (true);


-- 3. Tabela extracao_horas_imagens (Imagens conectadas ao trabalhador e mês)
CREATE TABLE IF NOT EXISTS core_personal.extracao_horas_imagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
    ano_referencia INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    file_path TEXT,
    status_extracao TEXT DEFAULT 'pendente', -- pendente, processando, concluido, erro
    dados_extraidos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em extracao_horas_imagens
ALTER TABLE core_personal.extracao_horas_imagens ENABLE ROW LEVEL SECURITY;

-- Política permissiva (Ajustar em produção)
CREATE POLICY "Allow all read write for extracao_horas_imagens" 
ON core_personal.extracao_horas_imagens FOR ALL 
USING (true) WITH CHECK (true);
