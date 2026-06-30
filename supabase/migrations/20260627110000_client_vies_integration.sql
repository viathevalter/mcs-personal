-- Adiciona colunas do VIES à tabela core_common.clients
ALTER TABLE "core_common"."clients" 
ADD COLUMN IF NOT EXISTS "vies_applicable" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "vies_status" text DEFAULT 'not_checked',
ADD COLUMN IF NOT EXISTS "vies_valid" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "vies_returned_name" text,
ADD COLUMN IF NOT EXISTS "vies_returned_address" text,
ADD COLUMN IF NOT EXISTS "vies_request_date" text,
ADD COLUMN IF NOT EXISTS "vies_request_identifier" text,
ADD COLUMN IF NOT EXISTS "vies_last_checked_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "vies_last_checked_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "vies_requires_review" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "vies_last_error_code" text,
ADD COLUMN IF NOT EXISTS "vies_last_error_message" text,
ADD COLUMN IF NOT EXISTS "eu_vat_number" text;

-- Cria a tabela de histórico de consultas VIES
CREATE TABLE IF NOT EXISTS "core_common"."client_vies_checks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "client_id" uuid NOT NULL REFERENCES core_common.clients(id) ON DELETE CASCADE,
    "country_code" text NOT NULL,
    "vat_number" text NOT NULL,
    "full_vat_number" text NOT NULL,
    "status" text NOT NULL,
    "valid" boolean NOT NULL,
    "returned_name" text,
    "returned_address" text,
    "request_date" text,
    "request_identifier" text,
    "error_code" text,
    "error_message" text,
    "checked_at" timestamp with time zone DEFAULT now(),
    "checked_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "trigger_source" text DEFAULT 'manual',
    "response_payload" jsonb,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Ativa RLS para a tabela de logs
ALTER TABLE "core_common"."client_vies_checks" ENABLE ROW LEVEL SECURITY;

-- Deleta políticas anteriores se existirem
DROP POLICY IF EXISTS "Leitura de logs VIES por empresa" ON "core_common"."client_vies_checks";
DROP POLICY IF EXISTS "Escrita de logs VIES por empresa" ON "core_common"."client_vies_checks";

-- Cria as políticas de RLS correspondentes
CREATE POLICY "Leitura de logs VIES por empresa" ON "core_common"."client_vies_checks" 
FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));

CREATE POLICY "Escrita de logs VIES por empresa" ON "core_common"."client_vies_checks" 
FOR INSERT TO authenticated WITH CHECK (core_common.is_member(empresa_id));

-- Cria os índices
CREATE INDEX IF NOT EXISTS idx_vies_checks_client ON "core_common"."client_vies_checks"("client_id");
CREATE INDEX IF NOT EXISTS idx_vies_checks_empresa ON "core_common"."client_vies_checks"("empresa_id");

-- Concede permissões ao usuário autenticado
GRANT SELECT, INSERT ON "core_common"."client_vies_checks" TO authenticated;
