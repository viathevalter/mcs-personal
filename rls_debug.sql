-- 1. Verifica se existe RLS habilitado nas tabelas do core_common
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relnamespace = 'core_common'::regnamespace 
  AND relname IN ('empresas', 'user_memberships');

-- 2. Mostrar políticas de RLS ativas nestas tabelas
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'core_common' 
  AND tablename IN ('empresas', 'user_memberships');

-- Caso haja RLS ativa bloqueando a leitura, o comando emergencial para liberar SELECT em ambas:
-- DROP POLICY IF EXISTS "Enable read access for all users" ON core_common.empresas;
-- CREATE POLICY "Enable read access for all users" ON core_common.empresas FOR SELECT USING (true);
-- 
-- DROP POLICY IF EXISTS "Enable read access for user memberships" ON core_common.user_memberships;
-- CREATE POLICY "Enable read access for user memberships" ON core_common.user_memberships FOR SELECT USING (true);
