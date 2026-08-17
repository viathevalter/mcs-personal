-- ==============================================================================
-- Migração Evolutiva - Catálogo Global de Clientes
-- ==============================================================================

-- Seguindo o mesmo conceito do catálogo de EPIs e Job Functions,
-- os Clientes e Obras de Clientes devem estar disponíveis globalmente 
-- para que qualquer empresa do grupo (Tenant) possa utilizá-los 
-- na montagem de Estimaciones sem precisar recadastrar.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Removemos todas as políticas de SELECT restritivas das tabelas de clientes e obras
    FOR r IN (
        SELECT policyname, tablename, schemaname
        FROM pg_policies 
        WHERE schemaname = 'core_common'
          AND cmd = 'SELECT'
          AND tablename IN (
              'clients', 
              'client_sites'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END
$$;

-- Criamos políticas de leitura globais para todos os componentes do Cliente
CREATE POLICY "Leitura global de clientes" ON "core_common"."clients" 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura global de obras do cliente" ON "core_common"."client_sites" 
FOR SELECT TO authenticated USING (true);
