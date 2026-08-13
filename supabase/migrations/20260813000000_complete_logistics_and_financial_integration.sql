-- ========================================================================================
-- Migration: 20260813000000_complete_logistics_and_financial_integration.sql
-- Description: Complete schema for core_logistics (provedores, alojamentos, camas, contratos, alocacoes, pagos)
-- ========================================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS core_logistics;

-- 1. Provedores (Fornecedores de Alojamento e Geral)
CREATE TABLE IF NOT EXISTS core_logistics.provedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE,
    nome_razao_social TEXT NOT NULL,
    nome_comercial TEXT,
    cif_nif TEXT,
    classificacao TEXT DEFAULT 'Proveedor Alojamiento',
    tipo_provedor TEXT DEFAULT 'Persona Jurídica',
    contato_nome TEXT,
    telefone TEXT,
    email TEXT,
    iban TEXT,
    banco TEXT,
    swift TEXT,
    titular_conta TEXT,
    metodo_pago TEXT DEFAULT 'Transferir',
    endereco TEXT,
    municipio TEXT,
    provincia TEXT,
    pais TEXT DEFAULT 'España',
    observacoes TEXT,
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Alojamentos
CREATE TABLE IF NOT EXISTS core_logistics.alojamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE,
    provedor_id UUID REFERENCES core_logistics.provedores(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    tipo_alojamento TEXT DEFAULT 'Fijo',
    classificacao TEXT DEFAULT 'Privado',
    capacidade_pessoas INTEGER DEFAULT 0,
    dormitorios INTEGER DEFAULT 0,
    total_camas INTEGER DEFAULT 0,
    camas_individuais INTEGER DEFAULT 0,
    camas_duplas INTEGER DEFAULT 0,
    banheiros INTEGER DEFAULT 0,
    endereco TEXT,
    municipio TEXT,
    provincia TEXT,
    pais TEXT DEFAULT 'España',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    comodidades JSONB DEFAULT '{"wifi": true, "ar_condicionado": false, "parking": false, "cozinha": true}',
    suministros JSONB DEFAULT '{"luz": true, "agua": true, "gas": true, "internet": true, "limpeza": false}',
    fotos JSONB DEFAULT '[]',
    observacoes TEXT,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Camas
CREATE TABLE IF NOT EXISTS core_logistics.camas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alojamento_id UUID NOT NULL REFERENCES core_logistics.alojamentos(id) ON DELETE CASCADE,
    identificador TEXT NOT NULL,
    tipo TEXT DEFAULT 'individual',
    status TEXT DEFAULT 'livre',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Contratos de Alojamento
CREATE TABLE IF NOT EXISTS core_logistics.contratos_alojamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE,
    alojamento_id UUID REFERENCES core_logistics.alojamentos(id) ON DELETE SET NULL,
    provedor_id UUID REFERENCES core_logistics.provedores(id) ON DELETE SET NULL,
    empresa_id UUID,
    cliente_id UUID,
    status TEXT DEFAULT 'Activo',
    tipo_contrato TEXT DEFAULT 'Fijo',
    data_inicio DATE,
    data_fim DATE,
    valor_mensal NUMERIC(15,2) DEFAULT 0,
    dia_vencimento INTEGER DEFAULT 1,
    fianza_valor NUMERIC(15,2) DEFAULT 0,
    fianza_meses INTEGER DEFAULT 0,
    renovacao_automatica BOOLEAN DEFAULT FALSE,
    aviso_rescisao_dias INTEGER DEFAULT 30,
    iban_cobranca TEXT,
    titular TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Alocações de Trabalhadores em Camas
CREATE TABLE IF NOT EXISTS core_logistics.alocacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cama_id UUID REFERENCES core_logistics.camas(id) ON DELETE CASCADE,
    alojamento_id UUID REFERENCES core_logistics.alojamentos(id) ON DELETE SET NULL,
    worker_id UUID,
    solicitud_id UUID,
    pedido_id UUID,
    empresa_id UUID,
    cliente_id UUID,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    status TEXT DEFAULT 'En Curso',
    motivo_checkout TEXT,
    gerou_auxilio_moradia BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Pagamentos de Alojamentos & Integração Financeira
CREATE TABLE IF NOT EXISTS core_logistics.pagos_alojamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_pago TEXT UNIQUE,
    contrato_id UUID REFERENCES core_logistics.contratos_alojamento(id) ON DELETE SET NULL,
    alojamento_id UUID REFERENCES core_logistics.alojamentos(id) ON DELETE SET NULL,
    provedor_id UUID REFERENCES core_logistics.provedores(id) ON DELETE SET NULL,
    ordem_pagamento_id UUID,
    tipo_pago TEXT DEFAULT 'Aluguel',
    status_pago TEXT DEFAULT 'Previsto',
    periodo_competencia TEXT,
    data_vencimento DATE,
    valor_previsto NUMERIC(15,2) DEFAULT 0,
    moeda TEXT DEFAULT 'EUR',
    num_parcela INTEGER,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para alta performance
CREATE INDEX IF NOT EXISTS idx_alojamentos_provedor ON core_logistics.alojamentos(provedor_id);
CREATE INDEX IF NOT EXISTS idx_camas_alojamento ON core_logistics.camas(alojamento_id);
CREATE INDEX IF NOT EXISTS idx_contratos_alojamento ON core_logistics.contratos_alojamento(alojamento_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_cama ON core_logistics.alocacoes(cama_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_worker ON core_logistics.alocacoes(worker_id);
CREATE INDEX IF NOT EXISTS idx_pagos_contrato ON core_logistics.pagos_alojamento(contrato_id);

-- Desativar RLS para permitir CRUD simplificado em desenvolvimento/produção autenticado
ALTER TABLE core_logistics.provedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistics.alojamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistics.camas DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistics.contratos_alojamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistics.alocacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistics.pagos_alojamento DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA core_logistics TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA core_logistics TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core_logistics TO postgres, service_role, authenticated, anon;

COMMIT;
