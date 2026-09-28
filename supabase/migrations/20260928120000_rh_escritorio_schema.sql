-- ==============================================================================
-- MIGRATION: Módulo de RH Corporativo, Gestão de Escritório & Oficina
-- MultiCompany System (MCS)
-- ==============================================================================

-- 1. ADICIONAR TIMECLOCK_CODE NA TABELA DE MEMBROS (SEM DUPLICAR CADASTROS)
ALTER TABLE public.mcs_department_members 
ADD COLUMN IF NOT EXISTS timeclock_code VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_mcs_dept_members_timeclock 
ON public.mcs_department_members(timeclock_code);

-- 2. TABELA DE MODELOS DE JORNADA DE TRABALHO
CREATE TABLE IF NOT EXISTS public.rh_modelos_jornada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES core_common.empresas(id) ON DELETE SET NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    horas_semanais NUMERIC(5, 2) DEFAULT 40.00,
    tipo_jornada VARCHAR(50) DEFAULT 'semanal_padrao', -- 'semanal_padrao', 'escala', 'flexivel'
    dias_trabalho JSONB DEFAULT '[]'::jsonb, -- Configuração de horários Seg a Dom
    is_padrao BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir modelos de jornada padrão se não existirem
INSERT INTO public.rh_modelos_jornada (nome, descricao, horas_semanais, dias_trabalho, is_padrao)
SELECT 
    'Administrativo 40h (Seg-Sex 09h-18h)',
    'Jornada comercial padrão com 1h de almoço (13:00 às 14:00)',
    40.00,
    '[
        {"dia": "segunda", "ativo": true, "entrada": "09:00", "saida": "18:00", "intervalo_min": 60, "horas": 8},
        {"dia": "terca", "ativo": true, "entrada": "09:00", "saida": "18:00", "intervalo_min": 60, "horas": 8},
        {"dia": "quarta", "ativo": true, "entrada": "09:00", "saida": "18:00", "intervalo_min": 60, "horas": 8},
        {"dia": "quinta", "ativo": true, "entrada": "09:00", "saida": "18:00", "intervalo_min": 60, "horas": 8},
        {"dia": "sexta", "ativo": true, "entrada": "09:00", "saida": "18:00", "intervalo_min": 60, "horas": 8},
        {"dia": "sabado", "ativo": false, "horas": 0},
        {"dia": "domingo", "ativo": false, "horas": 0}
    ]'::jsonb,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.rh_modelos_jornada WHERE nome = 'Administrativo 40h (Seg-Sex 09h-18h)');

INSERT INTO public.rh_modelos_jornada (nome, descricao, horas_semanais, dias_trabalho, is_padrao)
SELECT 
    'Oficina / Operacional 40h (Seg-Sex 07h-15h)',
    'Jornada contínua matutina com intervalo de 30min',
    40.00,
    '[
        {"dia": "segunda", "ativo": true, "entrada": "07:00", "saida": "15:30", "intervalo_min": 30, "horas": 8},
        {"dia": "terca", "ativo": true, "entrada": "07:00", "saida": "15:30", "intervalo_min": 30, "horas": 8},
        {"dia": "quarta", "ativo": true, "entrada": "07:00", "saida": "15:30", "intervalo_min": 30, "horas": 8},
        {"dia": "quinta", "ativo": true, "entrada": "07:00", "saida": "15:30", "intervalo_min": 30, "horas": 8},
        {"dia": "sexta", "ativo": true, "entrada": "07:00", "saida": "15:30", "intervalo_min": 30, "horas": 8},
        {"dia": "sabado", "ativo": false, "horas": 0},
        {"dia": "domingo", "ativo": false, "horas": 0}
    ]'::jsonb,
    false
WHERE NOT EXISTS (SELECT 1 FROM public.rh_modelos_jornada WHERE nome = 'Oficina / Operacional 40h (Seg-Sex 07h-15h)');

-- 3. TABELA DE DADOS LABORAIS DO COLABORADOR (1:1 COM MCS_DEPARTMENT_MEMBERS)
CREATE TABLE IF NOT EXISTS public.rh_dados_laborais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.mcs_department_members(id) ON DELETE CASCADE UNIQUE,
    empresa_id UUID REFERENCES core_common.empresas(id) ON DELETE SET NULL,
    jornada_id UUID REFERENCES public.rh_modelos_jornada(id) ON DELETE SET NULL,
    
    cargo VARCHAR(150),
    departamento_nome VARCHAR(150),
    centro_custo VARCHAR(100) DEFAULT 'Geral',
    categoria_profissional VARCHAR(150),
    tipo_contrato VARCHAR(100) DEFAULT 'Indefinido',
    
    data_admissao DATE,
    data_fim_contrato DATE,
    periodo_experiencia_dias INT DEFAULT 60,
    local_trabalho VARCHAR(150) DEFAULT 'Barcelona / Oficina Central',
    
    responsavel_direto_id UUID REFERENCES public.mcs_department_members(id) ON DELETE SET NULL,
    coordenador_id UUID REFERENCES public.mcs_department_members(id) ON DELETE SET NULL,
    
    jornada_semanal_horas NUMERIC(5, 2) DEFAULT 40.00,
    horario_trabalho VARCHAR(100) DEFAULT '09:00 - 18:00',
    convencao_coletiva VARCHAR(150) DEFAULT 'Convenio General de Oficinas y Despachos',
    classificacao VARCHAR(100) DEFAULT 'Administrativo / Escritório', -- 'Administrativo / Escritório', 'Operacional', 'Coordenador', 'Gestor', 'Direção', 'Outros'
    timeclock_code VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE HISTÓRICO SALARIAL
CREATE TABLE IF NOT EXISTS public.rh_historico_salarial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.mcs_department_members(id) ON DELETE CASCADE,
    salario_base NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    moeda VARCHAR(10) DEFAULT 'EUR',
    complementos NUMERIC(10, 2) DEFAULT 0.00,
    ajuda_custo NUMERIC(10, 2) DEFAULT 0.00,
    transporte NUMERIC(10, 2) DEFAULT 0.00,
    alimentacao NUMERIC(10, 2) DEFAULT 0.00,
    premio_fixo NUMERIC(10, 2) DEFAULT 0.00,
    comissao_fixa NUMERIC(10, 2) DEFAULT 0.00,
    outros_valores NUMERIC(10, 2) DEFAULT 0.00,
    
    data_vigencia DATE NOT NULL,
    motivo VARCHAR(150) NOT NULL DEFAULT 'Atualização Salarial', -- 'Admissão', 'Mérito', 'Promoção', 'Convenção', 'Ajuste'
    usuario_responsavel VARCHAR(150) DEFAULT 'Sistema',
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE REGISTROS DE PONTO DIÁRIO
CREATE TABLE IF NOT EXISTS public.rh_ponto_registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.mcs_department_members(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES core_common.empresas(id) ON DELETE SET NULL,
    data DATE NOT NULL,
    timeclock_code VARCHAR(50),
    
    -- Batidas do dia (array JSON)
    batidas JSONB DEFAULT '[]'::jsonb,
    
    entrada_1 TIME,
    saida_1 TIME,
    entrada_2 TIME,
    saida_2 TIME,
    
    horas_trabalhadas NUMERIC(5, 2) DEFAULT 0.00,
    horas_previstas NUMERIC(5, 2) DEFAULT 8.00,
    minutos_saldo INT DEFAULT 0, -- Saldo positivo (extra) ou negativo (atraso/falta) em minutos
    minutos_atraso INT DEFAULT 0,
    minutos_saida_antecipada INT DEFAULT 0,
    minutos_extras INT DEFAULT 0,
    
    status VARCHAR(50) DEFAULT 'ok', -- 'ok', 'atraso', 'saida_antecipada', 'incompleto', 'falta', 'feriado', 'folga', 'ausencia_justificada'
    origem VARCHAR(50) DEFAULT 'relogio_importacao', -- 'relogio_importacao', 'manual', 'ajuste'
    observacoes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT uq_rh_ponto_member_data UNIQUE (member_id, data)
);

-- 6. TABELA DE AUDITORIA DE AJUSTES MANUAIS DE PONTO
CREATE TABLE IF NOT EXISTS public.rh_ponto_ajustes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ponto_registro_id UUID NOT NULL REFERENCES public.rh_ponto_registros(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.mcs_department_members(id) ON DELETE CASCADE,
    campo_alterado VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    motivo TEXT NOT NULL,
    usuario_responsavel VARCHAR(150) NOT NULL,
    data_ajuste TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELAS DE FÉRIAS (REGRAS ESPANHA - 30 DIAS NATURAIS / 22 ÚTEIS)
CREATE TABLE IF NOT EXISTS public.rh_ferias_saldos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.mcs_department_members(id) ON DELETE CASCADE,
    ano_exercicio INT NOT NULL,
    dias_direito INT DEFAULT 30, -- Padrão 30 dias naturais na Espanha
    dias_gozados INT DEFAULT 0,
    dias_programados INT DEFAULT 0,
    dias_saldo INT DEFAULT 30,
    tipo_contagem VARCHAR(20) DEFAULT 'naturais', -- 'naturais' ou 'uteis'
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_rh_ferias_saldos UNIQUE (member_id, ano_exercicio)
);

CREATE TABLE IF NOT EXISTS public.rh_ferias_solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.mcs_department_members(id) ON DELETE CASCADE,
    ano_exercicio INT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    dias_solicitados INT NOT NULL,
    tipo_dias VARCHAR(20) DEFAULT 'naturais',
    
    status VARCHAR(50) DEFAULT 'solicitado', -- 'rascunho', 'solicitado', 'aguardando_gestor', 'aguardando_rh', 'aprovado', 'rejeitado', 'cancelado', 'gozado'
    observacoes TEXT,
    
    aprovado_por_gestor VARCHAR(150),
    data_aprovacao_gestor TIMESTAMPTZ,
    aprovado_por_rh VARCHAR(150),
    data_aprovacao_rh TIMESTAMPTZ,
    motivo_rejeicao TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABELA DE AUSÊNCIAS E LICENÇAS
CREATE TABLE IF NOT EXISTS public.rh_ausencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.mcs_department_members(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL, -- 'baixa_medica' (IT), 'consulta_medica', 'falta_justificada', 'falta_injustificada', 'licenca', 'formacao', 'trabalho_externo', 'acidente', 'outro'
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    dias_total INT DEFAULT 1,
    remunerada BOOLEAN DEFAULT true,
    documento_url TEXT,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'aprovado',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TABELAS DE PRÉ-FOLHA (PREPARAÇÃO PARA CONTABILIDADE)
CREATE TABLE IF NOT EXISTS public.rh_pre_folha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competencia VARCHAR(7) NOT NULL, -- 'YYYY-MM', ex: '2026-09'
    empresa_id UUID REFERENCES core_common.empresas(id) ON DELETE SET NULL,
    titulo VARCHAR(150),
    status VARCHAR(50) DEFAULT 'em_preparacao', -- 'em_preparacao', 'em_revisao', 'aguardando_aprovacao', 'pronto', 'enviado_contabilidade', 'fechado'
    
    total_funcionarios INT DEFAULT 0,
    total_horas_trabalhadas NUMERIC(10, 2) DEFAULT 0.00,
    total_horas_extras NUMERIC(10, 2) DEFAULT 0.00,
    total_ferias_dias INT DEFAULT 0,
    total_baixas_dias INT DEFAULT 0,
    total_faltas_dias INT DEFAULT 0,
    total_variaveis_valor NUMERIC(12, 2) DEFAULT 0.00,
    
    fechado_por VARCHAR(150),
    data_fechamento TIMESTAMPTZ,
    data_envio_contabilidade TIMESTAMPTZ,
    email_destinatario_contabilidade VARCHAR(250),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_rh_pre_folha_comp_emp UNIQUE (competencia, empresa_id)
);

CREATE TABLE IF NOT EXISTS public.rh_pre_folha_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pre_folha_id UUID NOT NULL REFERENCES public.rh_pre_folha(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.mcs_department_members(id) ON DELETE CASCADE,
    
    salario_base NUMERIC(10, 2) DEFAULT 0.00,
    horas_trabalhadas NUMERIC(6, 2) DEFAULT 0.00,
    horas_extras NUMERIC(6, 2) DEFAULT 0.00,
    
    dias_ferias INT DEFAULT 0,
    dias_baixa INT DEFAULT 0,
    dias_falta INT DEFAULT 0,
    
    total_premios NUMERIC(10, 2) DEFAULT 0.00,
    total_comissoes NUMERIC(10, 2) DEFAULT 0.00,
    total_ajuda_custo NUMERIC(10, 2) DEFAULT 0.00,
    total_descontos NUMERIC(10, 2) DEFAULT 0.00,
    
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_rh_pre_folha_item UNIQUE (pre_folha_id, member_id)
);

-- 10. MODELOS SALVOS DE IMPORTAÇÃO DE PONTO
CREATE TABLE IF NOT EXISTS public.rh_modelos_importacao_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    tipo_arquivo VARCHAR(50) DEFAULT 'xls', -- 'xls', 'xlsx', 'csv'
    nome_aba VARCHAR(100) DEFAULT 'Registro asistencia',
    mapeamento JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_padrao BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir o modelo padrão correspondente ao software de relógio do escritório
INSERT INTO public.rh_modelos_importacao_ponto (nome, descricao, tipo_arquivo, nome_aba, mapeamento, is_padrao)
SELECT 
    'Relógio Escritório Barcelona (Todos los informes)',
    'Padrão Anviz/ZKTeco com abas "Registro asistencia" e "Resum. de asis."',
    'xls',
    'Registro asistencia',
    '{
        "tipo_estrutura": "registro_asistencia_blocos",
        "campo_id": "ID",
        "campo_nome": "Nombre",
        "campo_dept": "Dept.",
        "linha_dias": 3,
        "delimitador_batidas": "\\n"
    }'::jsonb,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.rh_modelos_importacao_ponto WHERE nome = 'Relógio Escritório Barcelona (Todos los informes)');

-- 11. POLICIES RLS PARA ACESSO SEGURO
ALTER TABLE public.rh_modelos_jornada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_dados_laborais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_historico_salarial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_ponto_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_ponto_ajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_ferias_saldos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_ferias_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_ausencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_pre_folha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_pre_folha_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_modelos_importacao_ponto ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename LIKE 'rh_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public access on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;
