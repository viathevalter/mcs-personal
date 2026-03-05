-- 1. Remove a restrição antiga que só permitia (admin, rh, finance, commercial)
ALTER TABLE core_common.user_memberships DROP CONSTRAINT IF EXISTS user_memberships_role_check;

-- 2. Adiciona a nova restrição permitindo o tipo 'user' (Colaborador Local) também
ALTER TABLE core_common.user_memberships ADD CONSTRAINT user_memberships_role_check 
CHECK (role IN ('admin', 'rh', 'finance', 'commercial', 'user'));
