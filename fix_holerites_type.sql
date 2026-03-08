-- O Holerites foi acidentalmente criado com BIGINT porque a tabela public.empresas usa BIGINT.
-- No entanto, o sistema (core_personal) usa UUID para designar as empresas.
-- Este script corrige esse erro de estrutura.

ALTER TABLE core_personal.holerites DROP CONSTRAINT IF EXISTS holerites_empresa_id_fkey;
ALTER TABLE core_personal.holerites ALTER COLUMN empresa_id TYPE UUID USING uuid_generate_v4();

-- Refresh the postgrest schema cache again just to be 100% sure
NOTIFY pgrst, 'reload schema';
