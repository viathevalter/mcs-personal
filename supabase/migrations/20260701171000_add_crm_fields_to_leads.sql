-- ========================================================================================
-- Migration: 20260701171000_add_crm_fields_to_leads.sql
-- Description: Add structured CRM columns to leads table for sector, cargo, product, and origin
-- ========================================================================================

BEGIN;

ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS sector VARCHAR(150);
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS cargo VARCHAR(150);
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS servicio_producto VARCHAR(255);
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS origen_lead VARCHAR(150);

-- Criar índices de busca nas novas colunas
CREATE INDEX IF NOT EXISTS idx_leads_sector ON core_comercial.leads(sector);
CREATE INDEX IF NOT EXISTS idx_leads_cargo ON core_comercial.leads(cargo);
CREATE INDEX IF NOT EXISTS idx_leads_origen ON core_comercial.leads(origen_lead);

COMMIT;
