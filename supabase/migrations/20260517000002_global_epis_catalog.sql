-- ==============================================================================
-- Migração Evolutiva - Catálogo Global de EPIs (Visibilidade cruzada)
-- ==============================================================================

-- A pedido do usuário, os EPIs (e suas vinculações a funções) devem atuar como
-- um catálogo global. Ou seja, se o super admin cadastrar um EPI estando logado
-- na empresa "Grupo Mastercorp", um usuário da empresa "Luminus" (ou "Stoco")
-- deve poder visualizar e selecionar este EPI durante a montagem de Estimaciones.
-- 
-- Para isso, alteramos as políticas de LEITURA (SELECT) para permitir que qualquer
-- usuário autenticado leia todos os EPIs, independente da empresa_id vinculada ao registro.
-- As regras de ESCRITA (INSERT/UPDATE/DELETE) continuam protegidas.

DO $$
BEGIN
    -- Removemos as políticas de leitura restritas
    DROP POLICY IF EXISTS "Leitura epis por empresa" ON "core_logistica"."epis";
    DROP POLICY IF EXISTS "Leitura epis_funcao por empresa" ON "core_logistica"."job_function_epis";
    
    -- No caso do script V21/V22/V23, os nomes podem variar, então tentamos dropar outras variantes conhecidas
    DROP POLICY IF EXISTS "Leitura de epis da empresa" ON "core_logistica"."epis";
    DROP POLICY IF EXISTS "Leitura de epis por funcao" ON "core_logistica"."job_function_epis";
    
    -- Remove as restrições adicionadas que limitam o select baseado em is_member
    -- (apenas limpa para recriar de forma global)
END
$$;

-- Criamos políticas de leitura globais
CREATE POLICY "Leitura global de epis" ON "core_logistica"."epis" 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Leitura global de epis_funcao" ON "core_logistica"."job_function_epis" 
FOR SELECT TO authenticated 
USING (true);
