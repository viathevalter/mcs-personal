-- =========================================================================
-- MIGRATION: ALIGN PRODUCTION SCHEMA WITH DEV SCHEMA
-- =========================================================================

ALTER TABLE core_common.clients
  ADD COLUMN IF NOT EXISTS billing_contact_name text,
  ADD COLUMN IF NOT EXISTS billing_contact_phone varchar(50),
  ADD COLUMN IF NOT EXISTS collections_contact_name text,
  ADD COLUMN IF NOT EXISTS collections_contact_phone varchar(50),
  ADD COLUMN IF NOT EXISTS collections_email text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone varchar(50),
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS functions_json jsonb,
  ADD COLUMN IF NOT EXISTS iban varchar(50),
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS mobile varchar(50),
  ADD COLUMN IF NOT EXISTS vat_id varchar(50);

ALTER TABLE core_common.departments
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE core_common.empresas
  ADD COLUMN IF NOT EXISTS atcud_prefix text,
  ADD COLUMN IF NOT EXISTS capital_social text,
  ADD COLUMN IF NOT EXISTS certified_software_text text DEFAULT 'ab8k - Processado por Programa Certificado nº 1137/AT'::text,
  ADD COLUMN IF NOT EXISTS conservatoria text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS invoice_logo_url text,
  ADD COLUMN IF NOT EXISTS invoice_series text DEFAULT '1'::text,
  ADD COLUMN IF NOT EXISTS matricula text,
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES core_common.regions(id);

ALTER TABLE core_personal.workers
  ADD COLUMN IF NOT EXISTS address_line text,
  ADD COLUMN IF NOT EXISTS contractor text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS departure_reason text,
  ADD COLUMN IF NOT EXISTS legacy_function text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS needs_housing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_transport boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;
