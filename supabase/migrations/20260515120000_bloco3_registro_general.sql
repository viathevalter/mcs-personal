-- ==============================================================================
-- Migração Evolutiva - Bloco 3: Registro General (Master Data)
-- Este arquivo contempla as 7 Fases para isolamento comercial, logs e RLS.
-- Padrão obrigatório: Todas as tabelas têm created_at, updated_at, created_by,
-- updated_by e status (active/inactive/archived).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- FASE 1: Schemas e Dicionários Globais
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS "core_logistica";
CREATE SCHEMA IF NOT EXISTS "core_comercial";
CREATE SCHEMA IF NOT EXISTS "core_operacoes";

-- Permissões básicas
GRANT USAGE ON SCHEMA core_logistica TO authenticated, anon;
GRANT USAGE ON SCHEMA core_comercial TO authenticated, anon;
GRANT USAGE ON SCHEMA core_operacoes TO authenticated, anon;

-- Tabelas Globais (Sem empresa_id)
CREATE TABLE IF NOT EXISTS "core_common"."countries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "iso2" character varying(2) NOT NULL UNIQUE,
    "iso3" character varying(3) NOT NULL UNIQUE,
    "name" text NOT NULL,
    "phone_code" character varying(20),
    "currency_code" character varying(3),
    "status" character varying(20) DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "core_common"."regions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "country_id" uuid NOT NULL REFERENCES core_common.countries(id) ON DELETE CASCADE,
    "name" text NOT NULL,
    "code" character varying(50),
    "status" character varying(20) DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);


-- ------------------------------------------------------------------------------
-- FASE 2: Entidades de Relacionamento
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "core_common"."clients" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "legacy_id" text,
    "codigo" character varying(50),
    "legal_name" text NOT NULL,
    "trade_name" text,
    "tax_id" character varying(50),
    "country_id" uuid REFERENCES core_common.countries(id),
    "region_id" uuid REFERENCES core_common.regions(id),
    "province" text,
    "city" text,
    "postal_code" character varying(20),
    "address_line" text,
    "phone" character varying(50),
    "email" text,
    "billing_email" text,
    "status" character varying(20) DEFAULT 'active',
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "core_common"."client_sites" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "client_id" uuid NOT NULL REFERENCES core_common.clients(id) ON DELETE CASCADE,
    "name" text NOT NULL,
    "site_code" character varying(50),
    "country_id" uuid REFERENCES core_common.countries(id),
    "region_id" uuid REFERENCES core_common.regions(id),
    "province" text,
    "city" text,
    "postal_code" character varying(20),
    "address_line" text,
    "latitude" numeric(10, 8),
    "longitude" numeric(11, 8),
    "contact_name" text,
    "contact_phone" character varying(50),
    "contact_email" text,
    "status" character varying(20) DEFAULT 'active',
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "core_common"."suppliers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "legacy_id" text,
    "codigo" character varying(50),
    "legal_name" text NOT NULL,
    "trade_name" text,
    "tax_id" character varying(50),
    "supplier_type" character varying(50), -- housing, transport, epi, tools...
    "country_id" uuid REFERENCES core_common.countries(id),
    "region_id" uuid REFERENCES core_common.regions(id),
    "province" text,
    "city" text,
    "postal_code" character varying(20),
    "address_line" text,
    "phone" character varying(50),
    "email" text,
    "billing_email" text,
    "payment_terms" text,
    "iban" character varying(50),
    "bank_name" text,
    "tax_regime" text,
    "status" character varying(20) DEFAULT 'active',
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);


-- ------------------------------------------------------------------------------
-- FASE 3: Funções / Perfis Profissionais
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "core_comercial"."job_functions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "legacy_id" text,
    "code" character varying(50),
    "name" text NOT NULL,
    "description" text,
    "risk_level" character varying(20), -- baixo, medio, alto, extremo
    "default_language" character varying(10),
    "status" character varying(20) DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "core_comercial"."job_function_questions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "job_function_id" uuid NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE CASCADE,
    "question_text" text NOT NULL,
    "question_type" character varying(50) NOT NULL, -- short_text, boolean, choice, number...
    "is_required" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "core_comercial"."job_function_rate_refs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "job_function_id" uuid NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE CASCADE,
    "country_id" uuid REFERENCES core_common.countries(id),
    "region_id" uuid REFERENCES core_common.regions(id),
    "currency_code" character varying(3) NOT NULL DEFAULT 'EUR',
    "base_cost_hour" numeric(10, 2) NOT NULL DEFAULT 0,
    "minimum_sell_rate_hour" numeric(10, 2) NOT NULL DEFAULT 0,
    "recommended_sell_rate_hour" numeric(10, 2) NOT NULL DEFAULT 0,
    "minimum_margin_percent" numeric(5, 2) NOT NULL DEFAULT 0,
    "notes" text,
    "status" character varying(20) DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);


-- ------------------------------------------------------------------------------
-- FASE 4: EPIs e Relação Função x EPI
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "core_logistica"."epis" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "code" character varying(50),
    "name" text NOT NULL,
    "description" text,
    "category" character varying(100),
    "unit" character varying(20),
    "default_cost" numeric(10, 2),
    "status" character varying(20) DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "core_logistica"."job_function_epis" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "job_function_id" uuid NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE CASCADE,
    "epi_id" uuid NOT NULL REFERENCES core_logistica.epis(id) ON DELETE RESTRICT,
    "quantity" integer NOT NULL DEFAULT 1,
    "is_required" boolean DEFAULT true,
    "renewal_period_days" integer,
    "notes" text,
    "status" character varying(20) DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);


-- ------------------------------------------------------------------------------
-- FASE 5: Auditoria / Histórico (Tabela Genérica)
-- ------------------------------------------------------------------------------
-- Para evitar dezenas de tabelas de histórico separadas no momento, adotamos
-- uma tabela de log de auditoria global no core_common para as novas entidades.
CREATE TABLE IF NOT EXISTS "core_common"."audit_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "entity_schema" character varying(50) NOT NULL,  -- ex: 'core_comercial'
    "entity_table" character varying(50) NOT NULL,   -- ex: 'job_functions'
    "entity_id" uuid NOT NULL,
    "action_type" character varying(50) NOT NULL,    -- CREATE, UPDATE, ARCHIVE, DELETE
    "old_values" jsonb,
    "new_values" jsonb,
    "description" text,
    "user_id" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now()
);


-- ------------------------------------------------------------------------------
-- FASE 6: Políticas RLS
-- ------------------------------------------------------------------------------

-- Habilitação Rigorosa de RLS
ALTER TABLE "core_common"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."client_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_comercial"."job_functions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_comercial"."job_function_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_comercial"."job_function_rate_refs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_logistica"."epis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_logistica"."job_function_epis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."audit_logs" ENABLE ROW LEVEL SECURITY;

-- Leitura de Dicionários Globais
DROP POLICY IF EXISTS "Leitura global de Paises" ON "core_common"."countries";
CREATE POLICY "Leitura global de Paises" ON "core_common"."countries" FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leitura global de Regioes" ON "core_common"."regions";
CREATE POLICY "Leitura global de Regioes" ON "core_common"."regions" FOR SELECT TO authenticated USING (true);

-- Leitura por Empresa (usando a função existente core_common.is_member)
CREATE POLICY "Leitura clientes por empresa" ON "core_common"."clients" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura obras por empresa" ON "core_common"."client_sites" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura fornecedores por empresa" ON "core_common"."suppliers" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura funcoes por empresa" ON "core_comercial"."job_functions" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura perguntas por empresa" ON "core_comercial"."job_function_questions" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura custos por empresa" ON "core_comercial"."job_function_rate_refs" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura epis por empresa" ON "core_logistica"."epis" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura epis_funcao por empresa" ON "core_logistica"."job_function_epis" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura auditoria por empresa" ON "core_common"."audit_logs" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));

-- Escrita por Empresa (simplificada para todos os membros ativos por ora, em prod refinar com has_role)
CREATE POLICY "Escrita clientes por empresa" ON "core_common"."clients" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita obras por empresa" ON "core_common"."client_sites" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita fornecedores por empresa" ON "core_common"."suppliers" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita funcoes por empresa" ON "core_comercial"."job_functions" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita perguntas por empresa" ON "core_comercial"."job_function_questions" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita custos por empresa" ON "core_comercial"."job_function_rate_refs" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita epis por empresa" ON "core_logistica"."epis" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita epis_funcao por empresa" ON "core_logistica"."job_function_epis" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita auditoria por empresa" ON "core_common"."audit_logs" FOR INSERT TO authenticated WITH CHECK (core_common.is_member(empresa_id));


-- ------------------------------------------------------------------------------
-- FASE 7: Índices e Constraints de Performance e Unicidade
-- ------------------------------------------------------------------------------
-- Índices por empresa_id (Crucial para performance de RLS)
CREATE INDEX IF NOT EXISTS idx_clients_empresa ON "core_common"."clients"("empresa_id");
CREATE INDEX IF NOT EXISTS idx_client_sites_empresa ON "core_common"."client_sites"("empresa_id");
CREATE INDEX IF NOT EXISTS idx_suppliers_empresa ON "core_common"."suppliers"("empresa_id");
CREATE INDEX IF NOT EXISTS idx_job_functions_empresa ON "core_comercial"."job_functions"("empresa_id");
CREATE INDEX IF NOT EXISTS idx_epis_empresa ON "core_logistica"."epis"("empresa_id");

-- Índices Secundários de Busca Rápida
CREATE INDEX IF NOT EXISTS idx_clients_status ON "core_common"."clients"("status");
CREATE INDEX IF NOT EXISTS idx_clients_tax_id ON "core_common"."clients"("tax_id");
CREATE INDEX IF NOT EXISTS idx_client_sites_client ON "core_common"."client_sites"("client_id");
CREATE INDEX IF NOT EXISTS idx_job_functions_status ON "core_comercial"."job_functions"("status");
CREATE INDEX IF NOT EXISTS idx_epis_status ON "core_logistica"."epis"("status");

-- Constraints de Unicidade
-- Evita duplicação do mesmo código de cliente dentro da mesma empresa
ALTER TABLE "core_common"."clients" DROP CONSTRAINT IF EXISTS uq_clients_codigo_empresa;
ALTER TABLE "core_common"."clients" ADD CONSTRAINT uq_clients_codigo_empresa UNIQUE ("empresa_id", "codigo");

-- Evita duplicação do mesmo código de função dentro da mesma empresa
ALTER TABLE "core_comercial"."job_functions" DROP CONSTRAINT IF EXISTS uq_job_functions_code_empresa;
ALTER TABLE "core_comercial"."job_functions" ADD CONSTRAINT uq_job_functions_code_empresa UNIQUE ("empresa_id", "code");
