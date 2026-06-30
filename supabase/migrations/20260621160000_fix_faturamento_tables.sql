-- Tabela de faturas (mockup inicial esperado pela API)
CREATE TABLE IF NOT EXISTS core_finance.faturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES core_common.clients(id),
    status TEXT NOT NULL,
    data_emissao DATE NOT NULL,
    magic_link_token UUID,
    observacoes_cliente TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de horas trabalhadas detalhadas (mockup esperado pela API)
CREATE TABLE IF NOT EXISTS core_finance.horas_trabalhadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id),
    client_id UUID NOT NULL REFERENCES core_common.clients(id),
    fatura_id UUID REFERENCES core_finance.faturas(id),
    data_trabalho DATE NOT NULL,
    hora_inicio TIME,
    hora_fim TIME,
    horas_totais NUMERIC(5,2),
    status TEXT NOT NULL,
    extraction_confidence NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE core_finance.faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_finance.horas_trabalhadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read write faturas" ON core_finance.faturas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all read write horas" ON core_finance.horas_trabalhadas FOR ALL USING (true) WITH CHECK (true);

-- Conceder permissões para os roles do Supabase
GRANT ALL ON TABLE core_finance.faturas TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_finance.horas_trabalhadas TO anon, authenticated, service_role;

