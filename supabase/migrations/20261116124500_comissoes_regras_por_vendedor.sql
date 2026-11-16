-- Migration: Suporte a Regras Individuais de Comissão por Vendedor (Comercial)
ALTER TABLE public.mcs_comissoes_settings
  ADD COLUMN IF NOT EXISTS regras_vendedores JSONB DEFAULT '{}'::jsonb;

UPDATE public.mcs_comissoes_settings
SET regras_vendedores = COALESCE(regras_vendedores, '{}'::jsonb)
WHERE id = 1;
