-- Script para liberar permissões das tabelas do schema core_common para a Web API (anon / authenticated)

-- 1. Garante que os perfis da web possam visualizar e acessar o schema
GRANT USAGE ON SCHEMA core_common TO anon, authenticated;

-- 2. Concede permissão de Leitura, Inserção e Atualização para todas as tabelas dentro do core_common
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA core_common TO anon, authenticated;

-- 3. Concede permissões para as sequências de ID (necessário para auto_increment se houver)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA core_common TO anon, authenticated;

-- (Opcional) Desabilitar RLS momentaneamente para garantir o salvamento (se for um sistema fechado admin)
ALTER TABLE core_common.user_memberships DISABLE ROW LEVEL SECURITY;
