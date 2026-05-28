-- Add missing fields to core_common.empresas based on requirements
ALTER TABLE "core_common"."empresas"
  ADD COLUMN IF NOT EXISTS "trade_name" text,
  ADD COLUMN IF NOT EXISTS "legal_name" text,
  ADD COLUMN IF NOT EXISTS "tax_id" character varying(50),
  ADD COLUMN IF NOT EXISTS "vat_id" character varying(50),
  ADD COLUMN IF NOT EXISTS "address_line" text,
  ADD COLUMN IF NOT EXISTS "postal_code" character varying(20),
  ADD COLUMN IF NOT EXISTS "city" text,
  ADD COLUMN IF NOT EXISTS "province" text,
  ADD COLUMN IF NOT EXISTS "country_id" uuid REFERENCES core_common.countries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "phone" character varying(50),
  ADD COLUMN IF NOT EXISTS "mobile" character varying(50),
  ADD COLUMN IF NOT EXISTS "email" text,
  ADD COLUMN IF NOT EXISTS "billing_email" text,
  ADD COLUMN IF NOT EXISTS "iban" character varying(50),
  ADD COLUMN IF NOT EXISTS "latitude" numeric(10, 8),
  ADD COLUMN IF NOT EXISTS "longitude" numeric(11, 8),
  ADD COLUMN IF NOT EXISTS "bank_details" text;

-- Since the table already has `nome`, we will populate `trade_name` and `legal_name` from `nome` if they are empty
UPDATE "core_common"."empresas"
SET 
  trade_name = COALESCE(trade_name, nome),
  legal_name = COALESCE(legal_name, nome)
WHERE trade_name IS NULL OR legal_name IS NULL;
