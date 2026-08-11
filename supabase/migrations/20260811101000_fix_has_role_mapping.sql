-- Migration: Fix has_role mapping for admin_rh
-- Exposes access to company operations for local 'admin' and 'rh' memberships when the database checks for 'admin_rh'

CREATE OR REPLACE FUNCTION core_common.has_role(p_empresa_id uuid, p_role text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
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
      AND (
        role = p_role
        OR (p_role = 'admin_rh' AND role IN ('admin', 'rh'))
      )
      AND is_active = true
  );
END;
$function$;
