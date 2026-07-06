-- Add cobranca_email to core_common.empresas for specific billing collection email notifications
ALTER TABLE "core_common"."empresas"
  ADD COLUMN IF NOT EXISTS "cobranca_email" text;
