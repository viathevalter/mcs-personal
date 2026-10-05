-- Migration: 20261005230000_portal_client_sites_and_branding.sql
-- Description: Provide safe access to client sites (obras) for worker portal and supervisor signatures

CREATE OR REPLACE FUNCTION public.get_client_sites_portal(
    p_cliente_nombre TEXT DEFAULT NULL,
    p_empresa_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', cs.id,
            'name', cs.name,
            'site_code', cs.site_code,
            'client_id', cs.client_id
        ) ORDER BY cs.name ASC
    ), '[]'::jsonb)
    INTO v_result
    FROM core_common.client_sites cs
    LEFT JOIN core_common.clients c ON c.id = cs.client_id
    WHERE (
        p_cliente_nombre IS NULL
        OR UPPER(TRIM(c.trade_name)) = UPPER(TRIM(p_cliente_nombre))
        OR UPPER(TRIM(c.legal_name)) = UPPER(TRIM(p_cliente_nombre))
        OR UPPER(TRIM(cs.name)) ILIKE '%' || UPPER(TRIM(p_cliente_nombre)) || '%'
        OR (p_empresa_id IS NOT NULL AND cs.empresa_id = p_empresa_id)
    )
    AND (cs.status IS NULL OR cs.status != 'archived');

    RETURN jsonb_build_object('success', true, 'sites', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_sites_portal(TEXT, UUID) TO anon, authenticated, service_role;
