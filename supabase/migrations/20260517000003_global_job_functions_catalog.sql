-- ==============================================================================
-- Migração Evolutiva - Catálogo Global de Perfis Profissionais (Funções)
-- ==============================================================================

-- Seguindo o mesmo conceito do catálogo de EPIs, os Perfis Profissionais
-- (Cargos/Funções), seus Custos (rate_refs) e Perguntas de Entrevista 
-- devem estar disponíveis globalmente para que qualquer empresa do grupo
-- possa utilizá-los na montagem de Estimaciones.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Removemos todas as políticas de SELECT restritivas das tabelas de funções
    FOR r IN (
        SELECT policyname, tablename, schemaname
        FROM pg_policies 
        WHERE schemaname = 'core_comercial'
          AND cmd = 'SELECT'
          AND tablename IN (
              'job_functions', 
              'job_function_questions', 
              'job_function_rate_refs'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END
$$;

-- Criamos políticas de leitura globais para todos os componentes do Perfil Profissional
CREATE POLICY "Leitura global de funcoes" ON "core_comercial"."job_functions" 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura global de perguntas da funcao" ON "core_comercial"."job_function_questions" 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura global de custos da funcao" ON "core_comercial"."job_function_rate_refs" 
FOR SELECT TO authenticated USING (true);
