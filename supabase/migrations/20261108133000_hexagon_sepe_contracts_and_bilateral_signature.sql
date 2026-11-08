-- Migration: Add Hexagon SEPE contract settings, Spanish worker fields, and bilateral signature audit fields
ALTER TABLE core_common.empresas
  ADD COLUMN IF NOT EXISTS contract_settings JSONB DEFAULT '{}'::jsonb;

ALTER TABLE core_personal.workers
  ADD COLUMN IF NOT EXISTS nuss VARCHAR(50),
  ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(20),
  ADD COLUMN IF NOT EXISTS municipio_domicilio VARCHAR(150),
  ADD COLUMN IF NOT EXISTS nivel_formativo VARCHAR(150);

ALTER TABLE core_personal.contract_audit_logs
  ADD COLUMN IF NOT EXISTS signer_role VARCHAR(50) DEFAULT 'worker',
  ADD COLUMN IF NOT EXISTS signer_name VARCHAR(255);
