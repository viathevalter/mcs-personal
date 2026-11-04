-- ========================================================================================
-- Migration: 20261104170000_create_suministros_faturas_and_limits.sql
-- Description: Cria a tabela core_logistics.suministros_faturas para Gestão de Suprimentos,
--              limites de consumo aceitável, rateio pro-rata por moradores e ponte com
--              Financeiro (core_finance.ordens_pagamento) e Descontos (public.worker_discounts).
-- ========================================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS core_logistics;

CREATE TABLE IF NOT EXISTS core_logistics.suministros_faturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_fatura TEXT UNIQUE,
    alojamento_id UUID REFERENCES core_logistics.alojamentos(id) ON DELETE SET NULL,
    alojamento_codigo TEXT,
    alojamento_nome TEXT,
    direccion_planilha TEXT,
    provedor_id UUID REFERENCES core_logistics.provedores(id) ON DELETE SET NULL,
    provedor_nome TEXT,
    servico TEXT NOT NULL DEFAULT 'Electricidad',
    concepto_original TEXT,
    mes_periodo TEXT,
    data_inicio DATE,
    data_fim DATE,
    num_dias INTEGER DEFAULT 30,
    valor_fatura NUMERIC(12,2) NOT NULL DEFAULT 0,
    limite_por_pessoa_mes NUMERIC(12,2) DEFAULT 0,
    limite_aceitavel_periodo NUMERIC(12,2) DEFAULT 0,
    ajuste_manual_limite BOOLEAN DEFAULT FALSE,
    valor_excedente NUMERIC(12,2) DEFAULT 0,
    qtd_moradores_periodo INTEGER DEFAULT 0,
    rateio_status TEXT DEFAULT 'sem_excedente', -- sem_excedente, pendente_revisao, enviado_financeiro, descontos_lancados, isento
    competencia_desconto TEXT,
    rateio_detalhes JSONB DEFAULT '[]'::jsonb,
    ordem_pagamento_id UUID,
    num_ordem_pago TEXT,
    data_ordem_pago DATE,
    estado_pago TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, SOLICITADO, APROBADO, PAGADO, DESCONTADO_FIANZA, CORRECCION_SOLICITADA
    estatus_alojamento TEXT DEFAULT 'EN CURSO', -- EN CURSO, FINALIZADO
    descontado_fianza BOOLEAN DEFAULT FALSE,
    anexo_fatura_url TEXT,
    anexo_fatura_nome TEXT,
    observacoes TEXT,
    criado_por TEXT,
    aprovado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suministros_faturas_alojamento ON core_logistics.suministros_faturas(alojamento_id);
CREATE INDEX IF NOT EXISTS idx_suministros_faturas_op ON core_logistics.suministros_faturas(ordem_pagamento_id);
CREATE INDEX IF NOT EXISTS idx_suministros_faturas_servico ON core_logistics.suministros_faturas(servico);
CREATE INDEX IF NOT EXISTS idx_suministros_faturas_estado_pago ON core_logistics.suministros_faturas(estado_pago);

ALTER TABLE core_logistics.suministros_faturas DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA core_logistics TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA core_logistics TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core_logistics TO postgres, service_role, authenticated, anon;

COMMIT;
