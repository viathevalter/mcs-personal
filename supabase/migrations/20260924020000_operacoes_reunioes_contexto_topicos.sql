-- ==============================================================================
-- Migration: Campos de Contexto Operacional e Tópicos Livres / Projetos no PLAN
-- ==============================================================================

ALTER TABLE public.operacoes_reunioes
ADD COLUMN IF NOT EXISTS trabalhadores_contexto TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS clientes_contexto TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS topicos_livres JSONB DEFAULT '[]'::jsonb;
