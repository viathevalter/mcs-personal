-- ==============================================================================
-- Migration: Módulo de Reuniões & Alinhamento WBR / PDCA (Operações)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.operacoes_reunioes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL DEFAULT 'geral_operacoes',
    data_reuniao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'agendada',
    departamentos_envolvidos TEXT[] DEFAULT '{}',
    participantes TEXT[] DEFAULT '{}',
    pauta_topicos TEXT,
    ata_conteudo TEXT,
    resumo_ia TEXT,
    decisoes_regras TEXT,
    proxima_reuniao_id UUID REFERENCES public.operacoes_reunioes(id) ON DELETE SET NULL,
    proxima_reuniao_data TIMESTAMPTZ,
    pedidos_contexto TEXT[] DEFAULT '{}',
    incidencias_contexto TEXT[] DEFAULT '{}',
    duracao_minutos INTEGER DEFAULT 45,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_operacoes_reunioes_tipo ON public.operacoes_reunioes(tipo);
CREATE INDEX IF NOT EXISTS idx_operacoes_reunioes_data ON public.operacoes_reunioes(data_reuniao DESC);
CREATE INDEX IF NOT EXISTS idx_operacoes_reunioes_status ON public.operacoes_reunioes(status);

-- Vínculo na tabela de tarefas mcs_incident_tasks
ALTER TABLE public.mcs_incident_tasks 
ADD COLUMN IF NOT EXISTS reuniao_id UUID REFERENCES public.operacoes_reunioes(id) ON DELETE SET NULL;

ALTER TABLE public.mcs_incident_tasks 
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'media';

ALTER TABLE public.mcs_incident_tasks 
ADD COLUMN IF NOT EXISTS department_id VARCHAR(100);

ALTER TABLE public.mcs_incident_tasks 
ADD COLUMN IF NOT EXISTS assigned_to_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_mcs_incident_tasks_reuniao_id ON public.mcs_incident_tasks(reuniao_id);

-- Permissões
GRANT ALL ON TABLE public.operacoes_reunioes TO authenticated;
GRANT ALL ON TABLE public.operacoes_reunioes TO anon;
GRANT ALL ON TABLE public.operacoes_reunioes TO service_role;
