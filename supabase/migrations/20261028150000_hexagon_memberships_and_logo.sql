-- ============================================================================
-- Migration: Setup Hexagon User Memberships, Official Logo, and Clean Autofill
-- ============================================================================

DO $$
DECLARE
  v_hexagon_id uuid := '2c944db5-f1d0-4789-a562-8cfa1c0155b7';
BEGIN
  -- 1. Set official invoice_logo_url for Hexagon and clear browser-autofilled credentials
  UPDATE core_common.empresas
  SET invoice_logo_url = 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/company-logos/public/logo-hexagon.png',
      microsoft_client_id = '',
      microsoft_client_secret = ''
  WHERE id = v_hexagon_id;

  -- 2. Clear browser-autofilled Microsoft credentials across companies where tenant_id is empty
  UPDATE core_common.empresas
  SET microsoft_client_id = '',
      microsoft_client_secret = ''
  WHERE (microsoft_tenant_id IS NULL OR microsoft_tenant_id = '')
    AND (microsoft_client_id LIKE '%@%' OR microsoft_client_secret = 'stkrt@2026');

  -- 3. Grant user_memberships in Hexagon to all active team members from Luminous (LUM)
  INSERT INTO core_common.user_memberships (user_id, empresa_id, role, is_active)
  SELECT um.user_id, v_hexagon_id, um.role, um.is_active
  FROM core_common.user_memberships um
  JOIN core_common.empresas e ON e.id = um.empresa_id
  WHERE e.codigo = 'LUM'
    AND um.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM core_common.user_memberships ex
      WHERE ex.user_id = um.user_id AND ex.empresa_id = v_hexagon_id
    );
END $$;
