-- ==============================================================================
-- Migração Evolutiva - Restauração de Acesso Super Admin (RLS)
-- ==============================================================================

-- A versão 2.3 removeu o acesso do super_admin nas tabelas de master data 
-- (clients, epis, job_functions, etc) ao corrigir os papéis para admin/rh.
-- Isso causou RLS violation para o super_admin (usuário da Kotrik) ao tentar cadastrar EPIs.
-- Este patch adiciona `OR core_common.has_role(empresa_id, 'super_admin')` de volta às policies.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Removemos as policies afetadas para recriar
    FOR r IN (
        SELECT policyname, tablename, schemaname
        FROM pg_policies 
        WHERE schemaname IN ('core_common', 'core_comercial', 'core_logistica')
          AND policyname LIKE 'Insercao de%' OR policyname LIKE 'Edicao de%'
          AND tablename IN (
              'clients', 'client_sites', 'suppliers', 'audit_logs',
              'job_functions', 'job_function_questions', 'job_function_rate_refs',
              'epis', 'job_function_epis'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END
$$;

-- ------------------------------------------------------------------------------
-- RECRIAÇÃO COM ACESSO SUPER_ADMIN RESTAURADO
-- ------------------------------------------------------------------------------

-- core_common (Clientes, Obras, Fornecedores, Auditoria)
CREATE POLICY "Insercao de clientes" ON "core_common"."clients" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial'));
CREATE POLICY "Edicao de clientes" ON "core_common"."clients" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial'));

CREATE POLICY "Insercao de obras" ON "core_common"."client_sites" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial') OR core_common.has_role(empresa_id, 'rh'));
CREATE POLICY "Edicao de obras" ON "core_common"."client_sites" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial') OR core_common.has_role(empresa_id, 'rh')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Insercao de fornecedores" ON "core_common"."suppliers" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial'));
CREATE POLICY "Edicao de fornecedores" ON "core_common"."suppliers" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial'));

CREATE POLICY "Insercao de auditoria" ON "core_common"."audit_logs" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh') OR core_common.has_role(empresa_id, 'commercial'));

-- core_comercial (Funções)
CREATE POLICY "Insercao de funcoes" ON "core_comercial"."job_functions" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh') OR core_common.has_role(empresa_id, 'commercial'));
CREATE POLICY "Edicao de funcoes" ON "core_comercial"."job_functions" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh') OR core_common.has_role(empresa_id, 'commercial')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh') OR core_common.has_role(empresa_id, 'commercial'));

CREATE POLICY "Insercao de perguntas" ON "core_comercial"."job_function_questions" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));
CREATE POLICY "Edicao de perguntas" ON "core_comercial"."job_function_questions" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Insercao de custos" ON "core_comercial"."job_function_rate_refs" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial'));
CREATE POLICY "Edicao de custos" ON "core_comercial"."job_function_rate_refs" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'commercial'));

-- core_logistica (EPIs)
CREATE POLICY "Insercao de epis" ON "core_logistica"."epis" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));
CREATE POLICY "Edicao de epis" ON "core_logistica"."epis" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Insercao de epis_funcao" ON "core_logistica"."job_function_epis" FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));
CREATE POLICY "Edicao de epis_funcao" ON "core_logistica"."job_function_epis" FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));
