-- Multi-currency support (EUR, PLN, etc.) and bank transfer fees for Fundo de Caixa
-- Keeps backwards compatibility with all existing EUR records (default moeda='EUR', taxa_cambio=1)

ALTER TABLE public.caixas_despesas
  ADD COLUMN IF NOT EXISTS moeda TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS taxa_cambio NUMERIC(12, 6) NOT NULL DEFAULT 1;

ALTER TABLE public.caixas_recargas
  ADD COLUMN IF NOT EXISTS valor_eur NUMERIC,
  ADD COLUMN IF NOT EXISTS taxa_bancaria_eur NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_cambio NUMERIC(12, 6) NOT NULL DEFAULT 1;

ALTER TABLE public.caixas_despesas_registros
  ADD COLUMN IF NOT EXISTS valor_eur NUMERIC,
  ADD COLUMN IF NOT EXISTS taxa_cambio NUMERIC(12, 6);

-- Backfill existing EUR records cleanly
UPDATE public.caixas_recargas
SET valor_eur = valor,
    taxa_cambio = COALESCE(NULLIF(taxa_cambio, 0), 1)
WHERE valor_eur IS NULL;

UPDATE public.caixas_despesas_registros
SET valor_eur = valor,
    taxa_cambio = COALESCE(NULLIF(taxa_cambio, 0), 1)
WHERE valor_eur IS NULL;
