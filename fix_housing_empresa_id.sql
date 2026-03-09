-- REVERTER PARA UUID:
-- O banco de dados utiliza nativamente UUID para a empresa_id. 
-- Este script desfaz a alteração que tentava forçar o BIGINT e restaura a integridade do banco.

-- Passo 1: Remover as políticas de segurança novamente
DROP POLICY IF EXISTS "Admin, RH and Finance can view benefit housing" ON core_personal.worker_benefit_housing;
DROP POLICY IF EXISTS "Admin and RH can insert benefit housing" ON core_personal.worker_benefit_housing;
DROP POLICY IF EXISTS "Admin and RH can update benefit housing" ON core_personal.worker_benefit_housing;
DROP POLICY IF EXISTS "Admin and RH can delete benefit housing" ON core_personal.worker_benefit_housing;

-- Passo 1.5: Apagar registros que não são UUIDs válidos e que impediriam a reversão para UUID
-- (Ex: Limpar testes recentes que gravaram "58")
DELETE FROM core_personal.worker_benefit_housing 
WHERE length(empresa_id::text) < 30; -- UUIDs têm 36 caracteres, algo menor como '58' é id falso de teste

-- Passo 2: Reverter a coluna para UUID. 
ALTER TABLE core_personal.worker_benefit_housing 
  ALTER COLUMN empresa_id TYPE uuid USING (empresa_id::text::uuid);

-- Passo 3: Recriar as políticas de segurança com o tipo correto (UUID)
CREATE POLICY "Admin, RH and Finance can view benefit housing"
ON core_personal.worker_benefit_housing FOR SELECT TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh') OR core_common.has_role(empresa_id, 'finance'));

CREATE POLICY "Admin and RH can insert benefit housing"
ON core_personal.worker_benefit_housing FOR INSERT TO authenticated
WITH CHECK (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Admin and RH can update benefit housing"
ON core_personal.worker_benefit_housing FOR UPDATE TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Admin and RH can delete benefit housing"
ON core_personal.worker_benefit_housing FOR DELETE TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));
