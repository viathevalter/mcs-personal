-- ==============================================================================
-- Migração Evolutiva - Super Admin Global Access
-- ==============================================================================

-- A função get_my_role() retorna o papel global do usuário em public.user_roles.
-- Como o super_admin é global, ele nem sempre possui um registro específico
-- em core_common.user_memberships para cada empresa que ele tenta acessar.
-- Portanto, atualizamos as funções is_member e has_role para conceder 
-- acesso automático caso o usuário possua a role global 'super_admin'.

CREATE OR REPLACE FUNCTION core_common.is_member(p_empresa_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Se o usuário for um super admin global, ele tem acesso total a qualquer empresa
  IF public.get_my_role() = 'super_admin' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM core_common.user_memberships
    WHERE user_id = auth.uid()
      AND empresa_id = p_empresa_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION core_common.has_role(p_empresa_id uuid, p_role text)
RETURNS boolean AS $$
BEGIN
  -- Se o usuário for um super admin global, ele tem acesso irrestrito
  IF public.get_my_role() = 'super_admin' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM core_common.user_memberships
    WHERE user_id = auth.uid()
      AND empresa_id = p_empresa_id
      AND role = p_role
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
