-- ==============================================================================
-- Migração Evolutiva - Bloco 3: Registro General (Master Data)
-- Fases 1 a 5: Schemas, Países/Regiões, Clientes, Fornecedores, Funções e EPIs.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- FASE 1: Schemas Base
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS "core_comercial";
CREATE SCHEMA IF NOT EXISTS "core_operacoes";
CREATE SCHEMA IF NOT EXISTS "core_documents";
CREATE SCHEMA IF NOT EXISTS "core_logistica";

-- Permissões básicas dos Schemas
GRANT USAGE ON SCHEMA core_comercial TO authenticated, anon;
GRANT USAGE ON SCHEMA core_operacoes TO authenticated, anon;
GRANT USAGE ON SCHEMA core_documents TO authenticated, anon;
GRANT USAGE ON SCHEMA core_logistica TO authenticated, anon;

-- Tabelas Geopolíticas (Globais, em core_common)
CREATE TABLE IF NOT EXISTS "core_common"."countries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "iso2" character varying(2) NOT NULL,
    "iso3" character varying(3) NOT NULL,
    "name" text NOT NULL,
    "phone_code" character varying(20),
    "currency_code" character varying(3),
    "status" text DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS "core_common"."regions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "country_id" uuid NOT NULL REFERENCES core_common.countries(id) ON DELETE CASCADE,
    "name" text NOT NULL,
    "code" character varying(50),
    "status" text DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
);

-- Ativando RLS (Acesso Global de Leitura para autênticos)
ALTER TABLE "core_common"."countries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."regions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON "core_common"."countries" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for all authenticated users" ON "core_common"."regions" FOR SELECT TO authenticated USING (true);


-- ------------------------------------------------------------------------------
-- FASE 2: Clientes, Obras (Client Sites) e Fornecedores
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
    "status" text DEFAULT 'active',
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS "core_common"."client_sites" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "client_id" uuid NOT NULL REFERENCES core_common.clients(id) ON DELETE CASCADE,
    "name" text NOT NULL,
    "site_code" character varying(50),
    "status" text DEFAULT 'active',
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
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS "core_common"."suppliers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "legacy_id" text,
    "codigo" character varying(50),
    "legal_name" text NOT NULL,
    "trade_name" text,
    "tax_id" character varying(50),
    "supplier_type" text, -- housing, transport, epi, tools, legal, accounting, general, other
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
    "status" text DEFAULT 'active',
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
);

-- ------------------------------------------------------------------------------
-- FASE 3: Funções Profissionais (Comercial)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "core_comercial"."job_functions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "legacy_id" text,
    "code" character varying(50),
    "name" text NOT NULL,
    "description" text,
    "risk_level" text, -- low, medium, high, extreme
    "default_language" character varying(10),
    "status" text DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS "core_comercial"."job_function_questions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "job_function_id" uuid NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE CASCADE,
    "question_text" text NOT NULL,
    "question_type" text NOT NULL, -- text, boolean, choice
    "is_required" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "status" text DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS "core_comercial"."job_function_rate_refs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "job_function_id" uuid NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE CASCADE,
    "country_id" uuid REFERENCES core_common.countries(id),
    "region_id" uuid REFERENCES core_common.regions(id),
    "currency_code" character varying(3) NOT NULL,
    "base_cost_hour" numeric(10, 2) NOT NULL,
    "minimum_sell_rate_hour" numeric(10, 2) NOT NULL,
    "recommended_sell_rate_hour" numeric(10, 2) NOT NULL,
    "minimum_margin_percent" numeric(5, 2) NOT NULL,
    "notes" text,
    "status" text DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
);

-- ------------------------------------------------------------------------------
-- FASE 4: Logística e EPIs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "core_logistica"."epis" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    "code" character varying(50),
    "name" text NOT NULL,
    "description" text,
    "category" text,
    "unit" character varying(20),
    "default_cost" numeric(10, 2),
    "status" text DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
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
    "status" text DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid REFERENCES auth.users(id),
    "updated_by" uuid REFERENCES auth.users(id)
);

-- ------------------------------------------------------------------------------
-- FASE 5: Ativação Rigorosa de RLS
-- ------------------------------------------------------------------------------
-- Habilitando RLS
ALTER TABLE "core_common"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."client_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_comercial"."job_functions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_comercial"."job_function_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_comercial"."job_function_rate_refs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_logistica"."epis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_logistica"."job_function_epis" ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS genéricas usando core_common.is_member
-- Nota: Será refinado futuramente com core_common.has_role para admin_rh / logistica etc.

-- Leitura
CREATE POLICY "Leitura de clientes da empresa" ON "core_common"."clients" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura de obras da empresa" ON "core_common"."client_sites" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura de fornecedores da empresa" ON "core_common"."suppliers" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura de funcoes da empresa" ON "core_comercial"."job_functions" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura de perguntas de funcoes" ON "core_comercial"."job_function_questions" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura de custos de funcoes" ON "core_comercial"."job_function_rate_refs" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura de epis da empresa" ON "core_logistica"."epis" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura de epis por funcao" ON "core_logistica"."job_function_epis" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));

-- Escrita (Simplificada por ora. Em produção, exigir roles específicas)
CREATE POLICY "Escrita de clientes" ON "core_common"."clients" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita de obras" ON "core_common"."client_sites" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita de fornecedores" ON "core_common"."suppliers" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita de funcoes" ON "core_comercial"."job_functions" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita de perguntas" ON "core_comercial"."job_function_questions" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita de custos" ON "core_comercial"."job_function_rate_refs" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita de epis" ON "core_logistica"."epis" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
CREATE POLICY "Escrita de epis funcao" ON "core_logistica"."job_function_epis" FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) WITH CHECK (core_common.is_member(empresa_id));
