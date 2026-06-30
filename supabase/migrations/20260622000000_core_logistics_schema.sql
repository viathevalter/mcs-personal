-- ========================================================================================
-- Migration: 20260622000000_core_logistics_schema.sql
-- Description: Creates the core_logistics schema and tables for Provedores and Alojamentos
-- ========================================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS core_logistics;

CREATE TABLE IF NOT EXISTS core_logistics.provedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE, -- e.g. PV-0006
    nome_razao_social TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('padrao', 'alojamento')),
    contato_nome TEXT,
    telefone TEXT,
    email TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_logistics.alojamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE, -- e.g. AL-0008
    provedor_id UUID REFERENCES core_logistics.provedores(id),
    titulo TEXT NOT NULL,
    tipo_alojamento TEXT, -- Fijo, Temporario
    classificacao TEXT, -- Privado, Publico
    capacidade_pessoas INTEGER DEFAULT 0,
    dormitorios INTEGER DEFAULT 0,
    total_camas INTEGER DEFAULT 0,
    camas_individuais INTEGER DEFAULT 0,
    camas_duplas INTEGER DEFAULT 0,
    banheiros INTEGER DEFAULT 0,
    endereco TEXT,
    municipio TEXT,
    provincia TEXT,
    pais TEXT,
    comodidades JSONB DEFAULT '{}', -- { wifi: true, ar_condicionado: true, parking: false, cozinha: true }
    suministros JSONB DEFAULT '{}', -- { internet: true, luz: false, gas: false, agua: false, limpeza: true, outros: false }
    observacoes TEXT,
    valor_mensal NUMERIC(10,2),
    valor_fianca NUMERIC(10,2),
    meses_fianca INTEGER,
    tipo_contrato TEXT,
    data_inicio_contrato DATE,
    data_fim_contrato DATE,
    dia_vencimento INTEGER,
    renovacao_automatica BOOLEAN DEFAULT false,
    aviso_renovacao_dias INTEGER,
    metodo_pago TEXT,
    banco TEXT,
    iban TEXT,
    swift TEXT,
    titular_conta TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_logistics.camas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alojamento_id UUID REFERENCES core_logistics.alojamentos(id) ON DELETE CASCADE,
    nome_cama TEXT NOT NULL,
    tipo TEXT, -- individual, dupla
    disponivel BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE core_logistics.provedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistics.alojamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistics.camas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total provedores para autenticados" ON core_logistics.provedores FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total alojamentos para autenticados" ON core_logistics.alojamentos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total camas para autenticados" ON core_logistics.camas FOR ALL TO authenticated USING (true);

GRANT USAGE ON SCHEMA core_logistics TO postgres, service_role, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA core_logistics TO postgres, service_role, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core_logistics TO postgres, service_role, authenticated;

COMMIT;
