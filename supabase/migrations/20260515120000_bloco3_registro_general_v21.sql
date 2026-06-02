-- ==============================================================================
-- Migração Evolutiva - Bloco 3: Registro General (Master Data) - VERSÃO 2.1
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- FASE 1: Schemas e Dicionários Globais
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS "core_logistica";
CREATE SCHEMA IF NOT EXISTS "core_comercial";
CREATE SCHEMA IF NOT EXISTS "core_operacoes"; -- Preparação para blocos operacionais

-- Permissões básicas estritas (sem anon)
GRANT USAGE ON SCHEMA core_logistica TO authenticated;
GRANT USAGE ON SCHEMA core_comercial TO authenticated;
GRANT USAGE ON SCHEMA core_operacoes TO authenticated;

-- Function utilitária para updated_at e updated_by
CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Atualiza o updated_by de forma segura caso a coluna exista na tabela
  BEGIN
    NEW.updated_by = auth.uid();
  EXCEPTION WHEN undefined_column THEN
    -- Ignora silenciosamente se a tabela não tiver a coluna updated_by
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabelas Globais (Sem empresa_id)
CREATE TABLE IF NOT EXISTS "core_common"."countries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "iso2" character varying(2) NOT NULL UNIQUE,
    "iso3" character varying(3) NOT NULL UNIQUE,
    "name" text NOT NULL,
    "phone_code" character varying(20),
    "currency_code" character varying(3),
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_countries_updated_at ON "core_common"."countries";
CREATE TRIGGER set_countries_updated_at BEFORE UPDATE ON "core_common"."countries" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TABLE IF NOT EXISTS "core_common"."regions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "country_id" uuid NOT NULL REFERENCES core_common.countries(id) ON DELETE RESTRICT,
    "name" text NOT NULL,
    "code" character varying(50),
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_regions_updated_at ON "core_common"."regions";
CREATE TRIGGER set_regions_updated_at BEFORE UPDATE ON "core_common"."regions" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- FASE 2: Entidades de Relacionamento
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "core_common"."clients" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "legacy_id" text,
    "codigo" character varying(50),
    "legal_name" text NOT NULL,
    "trade_name" text,
    "tax_id" character varying(50),
    "country_id" uuid REFERENCES core_common.countries(id) ON DELETE RESTRICT,
    "region_id" uuid REFERENCES core_common.regions(id) ON DELETE RESTRICT,
    "province" text,
    "city" text,
    "postal_code" character varying(20),
    "address_line" text,
    "phone" character varying(50),
    "email" text,
    "billing_email" text,
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_clients_updated_at ON "core_common"."clients";
CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON "core_common"."clients" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TABLE IF NOT EXISTS "core_common"."client_sites" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "client_id" uuid NOT NULL REFERENCES core_common.clients(id) ON DELETE RESTRICT,
    "name" text NOT NULL,
    "site_code" character varying(50),
    "country_id" uuid REFERENCES core_common.countries(id) ON DELETE RESTRICT,
    "region_id" uuid REFERENCES core_common.regions(id) ON DELETE RESTRICT,
    "province" text,
    "city" text,
    "postal_code" character varying(20),
    "address_line" text,
    "latitude" numeric(10, 8) CHECK (latitude >= -90 AND latitude <= 90),
    "longitude" numeric(11, 8) CHECK (longitude >= -180 AND longitude <= 180),
    "contact_name" text,
    "contact_phone" character varying(50),
    "contact_email" text,
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_client_sites_updated_at ON "core_common"."client_sites";
CREATE TRIGGER set_client_sites_updated_at BEFORE UPDATE ON "core_common"."client_sites" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TABLE IF NOT EXISTS "core_common"."suppliers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "legacy_id" text,
    "codigo" character varying(50),
    "legal_name" text NOT NULL,
    "trade_name" text,
    "tax_id" character varying(50),
    "supplier_type" character varying(50) CHECK (supplier_type IN ('housing', 'transport', 'epi', 'tools', 'legal', 'accounting', 'general', 'other')),
    "country_id" uuid REFERENCES core_common.countries(id) ON DELETE RESTRICT,
    "region_id" uuid REFERENCES core_common.regions(id) ON DELETE RESTRICT,
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
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_suppliers_updated_at ON "core_common"."suppliers";
CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON "core_common"."suppliers" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- ------------------------------------------------------------------------------
-- FASE 3: Funções / Perfis Profissionais
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "core_comercial"."job_functions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "legacy_id" text,
    "code" character varying(50),
    "name" text NOT NULL,
    "description" text,
    "risk_level" character varying(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    "default_language" character varying(10),
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_job_functions_updated_at ON "core_comercial"."job_functions";
CREATE TRIGGER set_job_functions_updated_at BEFORE UPDATE ON "core_comercial"."job_functions" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TABLE IF NOT EXISTS "core_comercial"."job_function_questions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "job_function_id" uuid NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE RESTRICT,
    "question_text" text NOT NULL,
    "question_type" character varying(50) NOT NULL CHECK (question_type IN ('short_text', 'long_text', 'boolean', 'number', 'single_choice', 'multi_choice', 'date')),
    "is_required" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_job_function_questions_updated_at ON "core_comercial"."job_function_questions";
CREATE TRIGGER set_job_function_questions_updated_at BEFORE UPDATE ON "core_comercial"."job_function_questions" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TABLE IF NOT EXISTS "core_comercial"."job_function_rate_refs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "job_function_id" uuid NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE RESTRICT,
    "country_id" uuid REFERENCES core_common.countries(id) ON DELETE RESTRICT,
    "region_id" uuid REFERENCES core_common.regions(id) ON DELETE RESTRICT,
    "currency_code" character varying(3) NOT NULL DEFAULT 'EUR',
    "base_cost_hour" numeric(10, 2) NOT NULL DEFAULT 0 CHECK (base_cost_hour >= 0),
    "minimum_sell_rate_hour" numeric(10, 2) NOT NULL DEFAULT 0 CHECK (minimum_sell_rate_hour >= 0),
    "recommended_sell_rate_hour" numeric(10, 2) NOT NULL DEFAULT 0 CHECK (recommended_sell_rate_hour >= 0),
    "minimum_margin_percent" numeric(5, 2) NOT NULL DEFAULT 0 CHECK (minimum_margin_percent >= 0),
    "notes" text,
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_job_function_rate_refs_updated_at ON "core_comercial"."job_function_rate_refs";
CREATE TRIGGER set_job_function_rate_refs_updated_at BEFORE UPDATE ON "core_comercial"."job_function_rate_refs" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- ------------------------------------------------------------------------------
-- FASE 4: Logística e EPIs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "core_logistica"."epis" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "code" character varying(50),
    "name" text NOT NULL,
    "description" text,
    "category" character varying(100),
    "unit" character varying(20),
    "default_cost" numeric(10, 2) CHECK (default_cost >= 0),
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_epis_updated_at ON "core_logistica"."epis";
CREATE TRIGGER set_epis_updated_at BEFORE UPDATE ON "core_logistica"."epis" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TABLE IF NOT EXISTS "core_logistica"."job_function_epis" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "job_function_id" uuid NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE RESTRICT,
    "epi_id" uuid NOT NULL REFERENCES core_logistica.epis(id) ON DELETE RESTRICT,
    "quantity" integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    "is_required" boolean DEFAULT true,
    "renewal_period_days" integer CHECK (renewal_period_days >= 0),
    "notes" text,
    "status" character varying(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "updated_by" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_job_function_epis_updated_at ON "core_logistica"."job_function_epis";
CREATE TRIGGER set_job_function_epis_updated_at BEFORE UPDATE ON "core_logistica"."job_function_epis" FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- ------------------------------------------------------------------------------
-- FASE 5: Auditoria / Histórico (Tabela Genérica)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "core_common"."audit_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "empresa_id" uuid NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    "entity_schema" character varying(50) NOT NULL,
    "entity_table" character varying(50) NOT NULL,
    "entity_id" uuid NOT NULL,
    "action_type" character varying(50) NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'ARCHIVE', 'DELETE')),
    "old_values" jsonb,
    "new_values" jsonb,
    "description" text,
    "user_id" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now()
);


-- ------------------------------------------------------------------------------
-- FASE 6: Políticas RLS e GRANTs SQL
-- ------------------------------------------------------------------------------

-- GRANTs SQL
GRANT SELECT ON "core_common"."countries" TO authenticated;
GRANT SELECT ON "core_common"."regions" TO authenticated;

GRANT SELECT, INSERT, UPDATE ON "core_common"."clients" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "core_common"."client_sites" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "core_common"."suppliers" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "core_comercial"."job_functions" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "core_comercial"."job_function_questions" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "core_comercial"."job_function_rate_refs" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "core_logistica"."epis" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "core_logistica"."job_function_epis" TO authenticated;

GRANT SELECT, INSERT ON "core_common"."audit_logs" TO authenticated;

-- Habilitação Rigorosa de RLS
ALTER TABLE "core_common"."countries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."regions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."client_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_comercial"."job_functions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_comercial"."job_function_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_comercial"."job_function_rate_refs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_logistica"."epis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_logistica"."job_function_epis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_common"."audit_logs" ENABLE ROW LEVEL SECURITY;

-- Limpeza Prévias Idempotente (com qualificação explícita de schema e tabela)
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname IN ('core_common', 'core_comercial', 'core_logistica')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Leitura de Dicionários Globais (Sem permissão de Escrita - Apenas Admin/API)
CREATE POLICY "Leitura global de Paises" ON "core_common"."countries" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura global de Regioes" ON "core_common"."regions" FOR SELECT TO authenticated USING (true);

-- Leitura Restrita (Membros da empresa)
CREATE POLICY "Leitura clientes por empresa" ON "core_common"."clients" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura obras por empresa" ON "core_common"."client_sites" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura fornecedores por empresa" ON "core_common"."suppliers" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura funcoes por empresa" ON "core_comercial"."job_functions" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura perguntas por empresa" ON "core_comercial"."job_function_questions" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura custos por empresa" ON "core_comercial"."job_function_rate_refs" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura epis por empresa" ON "core_logistica"."epis" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura epis_funcao por empresa" ON "core_logistica"."job_function_epis" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Leitura auditoria por empresa" ON "core_common"."audit_logs" FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));

-- Escrita Protegida (INSERT/UPDATE para perfis administrativos)
CREATE POLICY "Insercao de clientes" ON "core_common"."clients" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Edicao de clientes" ON "core_common"."clients" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "Insercao de obras" ON "core_common"."client_sites" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Edicao de obras" ON "core_common"."client_sites" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "Insercao de fornecedores" ON "core_common"."suppliers" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Edicao de fornecedores" ON "core_common"."suppliers" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "Insercao de funcoes" ON "core_comercial"."job_functions" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));
CREATE POLICY "Edicao de funcoes" ON "core_comercial"."job_functions" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));

CREATE POLICY "Insercao de perguntas" ON "core_comercial"."job_function_questions" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));
CREATE POLICY "Edicao de perguntas" ON "core_comercial"."job_function_questions" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));

CREATE POLICY "Insercao de custos" ON "core_comercial"."job_function_rate_refs" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));
CREATE POLICY "Edicao de custos" ON "core_comercial"."job_function_rate_refs" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));

CREATE POLICY "Insercao de epis" ON "core_logistica"."epis" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Edicao de epis" ON "core_logistica"."epis" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "Insercao de epis_funcao" ON "core_logistica"."job_function_epis" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));
CREATE POLICY "Edicao de epis_funcao" ON "core_logistica"."job_function_epis" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));

CREATE POLICY "Insercao de auditoria" ON "core_common"."audit_logs" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh') OR core_common.has_role(empresa_id, 'operador'));


-- ------------------------------------------------------------------------------
-- FASE 7: Índices e Constraints de Performance e Unicidade
-- ------------------------------------------------------------------------------
-- Índices por empresa_id
CREATE INDEX IF NOT EXISTS idx_clients_empresa ON "core_common"."clients"("empresa_id");
CREATE INDEX IF NOT EXISTS idx_client_sites_empresa ON "core_common"."client_sites"("empresa_id");
CREATE INDEX IF NOT EXISTS idx_suppliers_empresa ON "core_common"."suppliers"("empresa_id");
CREATE INDEX IF NOT EXISTS idx_job_functions_empresa ON "core_comercial"."job_functions"("empresa_id");
CREATE INDEX IF NOT EXISTS idx_epis_empresa ON "core_logistica"."epis"("empresa_id");

-- Índices Secundários de Busca Rápida e Relacionamento
CREATE INDEX IF NOT EXISTS idx_clients_status ON "core_common"."clients"("status");
CREATE INDEX IF NOT EXISTS idx_clients_tax_id ON "core_common"."clients"("tax_id");
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_id ON "core_common"."suppliers"("tax_id");
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON "core_common"."suppliers"("status");

CREATE INDEX IF NOT EXISTS idx_client_sites_client ON "core_common"."client_sites"("client_id");

CREATE INDEX IF NOT EXISTS idx_job_functions_status ON "core_comercial"."job_functions"("status");
CREATE INDEX IF NOT EXISTS idx_epis_status ON "core_logistica"."epis"("status");

CREATE INDEX IF NOT EXISTS idx_job_function_questions_func ON "core_comercial"."job_function_questions"("job_function_id");
CREATE INDEX IF NOT EXISTS idx_job_function_rate_refs_func ON "core_comercial"."job_function_rate_refs"("job_function_id");
CREATE INDEX IF NOT EXISTS idx_job_function_rate_refs_country ON "core_comercial"."job_function_rate_refs"("country_id");
CREATE INDEX IF NOT EXISTS idx_job_function_rate_refs_region ON "core_comercial"."job_function_rate_refs"("region_id");

CREATE INDEX IF NOT EXISTS idx_job_function_epis_func ON "core_logistica"."job_function_epis"("job_function_id");
CREATE INDEX IF NOT EXISTS idx_job_function_epis_epi ON "core_logistica"."job_function_epis"("epi_id");

CREATE INDEX IF NOT EXISTS idx_audit_logs_generic ON "core_common"."audit_logs"("empresa_id", "entity_schema", "entity_table", "entity_id");

-- Constraints de Unicidade Parciais
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_tax_id_active ON "core_common"."clients"("empresa_id", "tax_id") WHERE "tax_id" IS NOT NULL AND "status" != 'archived';

CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_tax_id_active ON "core_common"."suppliers"("empresa_id", "tax_id") WHERE "tax_id" IS NOT NULL AND "status" != 'archived';

CREATE UNIQUE INDEX IF NOT EXISTS uq_epis_code_active ON "core_logistica"."epis"("empresa_id", "code") WHERE "code" IS NOT NULL AND "status" != 'archived';

ALTER TABLE "core_logistica"."job_function_epis" DROP CONSTRAINT IF EXISTS uq_job_function_epi_empresa;
ALTER TABLE "core_logistica"."job_function_epis" ADD CONSTRAINT uq_job_function_epi_empresa UNIQUE ("empresa_id", "job_function_id", "epi_id");
