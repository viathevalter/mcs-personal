-- ==============================================================================
-- Migration: Adicionar Modalidade, Local Presencial e Link Online (Teams/Meet)
-- ==============================================================================

ALTER TABLE public.operacoes_reunioes
ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS modalidade VARCHAR(50) DEFAULT 'presencial',
ADD COLUMN IF NOT EXISTS local_presencial TEXT,
ADD COLUMN IF NOT EXISTS link_online TEXT,
ADD COLUMN IF NOT EXISTS plataforma_online VARCHAR(50) DEFAULT 'teams';

CREATE INDEX IF NOT EXISTS idx_operacoes_reunioes_modalidade ON public.operacoes_reunioes(modalidade);
