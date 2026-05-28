-- ========================================================================================
-- Migration: 20260525173000_seasonal_regional_lodging.sql
-- Description: Expand lodging_rates table to support seasonal validity dates, description, and regional rates with multiple dates.
-- ========================================================================================

BEGIN;

-- 1. Remover restrição de unicidade simples para permitir múltiplas linhas da mesma região (sazonalidades diferentes)
ALTER TABLE core_comercial.lodging_rates DROP CONSTRAINT IF EXISTS uq_country_region;

-- 2. Adicionar colunas de datas de vigência (sazonalidade) e descrição explicativa
ALTER TABLE core_comercial.lodging_rates 
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Garantir unicidade apenas para a tarifa BASE (sem data de início/fim):
-- No máximo 1 tarifa base por País:
CREATE UNIQUE INDEX IF NOT EXISTS uq_base_lodging_rate_country 
  ON core_comercial.lodging_rates (country_id) 
  WHERE (region_id IS NULL AND start_date IS NULL AND end_date IS NULL);

-- No máximo 1 tarifa base por Região:
CREATE UNIQUE INDEX IF NOT EXISTS uq_base_lodging_rate_region 
  ON core_comercial.lodging_rates (country_id, region_id) 
  WHERE (region_id IS NOT NULL AND start_date IS NULL AND end_date IS NULL);

-- Indexar campos de data para agilizar consultas
CREATE INDEX IF NOT EXISTS idx_lodging_rates_dates 
  ON core_comercial.lodging_rates (start_date, end_date);

COMMIT;
