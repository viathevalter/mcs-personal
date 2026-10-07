-- Migration: 20261007154000_fix_get_client_sites_portal_client_filter.sql
-- Description: Fix get_client_sites_portal to strictly filter obras by the assigned client, deduplicate site names, and prevent leaking other clients' sites.

DROP FUNCTION IF EXISTS public.get_client_sites_portal(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_client_sites_portal(TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_client_sites_portal(
    p_cliente_nombre TEXT DEFAULT NULL,
    p_empresa_id UUID DEFAULT NULL,
    p_cliente_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_target_client_id UUID := p_cliente_id;
BEGIN
    -- 1. If client_id is not directly supplied, attempt to resolve it from p_cliente_nombre
    IF v_target_client_id IS NULL AND p_cliente_nombre IS NOT NULL AND TRIM(p_cliente_nombre) <> '' THEN
        SELECT c.id INTO v_target_client_id
        FROM core_common.clients c
        WHERE UPPER(TRIM(c.trade_name)) = UPPER(TRIM(p_cliente_nombre))
           OR UPPER(TRIM(c.legal_name)) = UPPER(TRIM(p_cliente_nombre))
           OR UPPER(TRIM(c.trade_name)) ILIKE '%' || UPPER(TRIM(p_cliente_nombre)) || '%'
           OR UPPER(TRIM(p_cliente_nombre)) ILIKE '%' || UPPER(TRIM(c.trade_name)) || '%'
        ORDER BY 
            CASE 
                WHEN UPPER(TRIM(c.trade_name)) = UPPER(TRIM(p_cliente_nombre)) THEN 1
                WHEN UPPER(TRIM(c.legal_name)) = UPPER(TRIM(p_cliente_nombre)) THEN 2
                ELSE 3
            END ASC
        LIMIT 1;
    END IF;

    -- 2. Query sites strictly matching the target client (and empresa_id if provided)
    -- Deduplicate site names with DISTINCT ON (TRIM(cs.name))
    IF v_target_client_id IS NOT NULL THEN
        -- Try first to get sites for this client that match the worker's empresa_id
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'site_code', t.site_code,
                'client_id', t.client_id
            ) ORDER BY t.name ASC
        ), '[]'::jsonb)
        INTO v_result
        FROM (
            SELECT DISTINCT ON (TRIM(cs.name))
                cs.id,
                cs.name,
                COALESCE(cs.site_code, '') as site_code,
                cs.client_id
            FROM core_common.client_sites cs
            WHERE cs.client_id = v_target_client_id
              AND (p_empresa_id IS NULL OR cs.empresa_id = p_empresa_id)
              AND (cs.status IS NULL OR LOWER(cs.status) IN ('active', 'ativo', 'ativa'))
            ORDER BY TRIM(cs.name) ASC, cs.id ASC
        ) t;

        -- Fallback: if no sites found under this specific empresa_id, check if the client has sites registered under any empresa_id
        IF (v_result IS NULL OR v_result = '[]'::jsonb) AND p_empresa_id IS NOT NULL THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', t.id,
                    'name', t.name,
                    'site_code', t.site_code,
                    'client_id', t.client_id
                ) ORDER BY t.name ASC
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT DISTINCT ON (TRIM(cs.name))
                    cs.id,
                    cs.name,
                    COALESCE(cs.site_code, '') as site_code,
                    cs.client_id
                FROM core_common.client_sites cs
                WHERE cs.client_id = v_target_client_id
                  AND (cs.status IS NULL OR LOWER(cs.status) IN ('active', 'ativo', 'ativa'))
                ORDER BY TRIM(cs.name) ASC, cs.id ASC
            ) t;
        END IF;

    ELSIF p_empresa_id IS NOT NULL THEN
        -- If no client was specified at all, return sites of this empresa (deduplicated by name)
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'site_code', t.site_code,
                'client_id', t.client_id
            ) ORDER BY t.name ASC
        ), '[]'::jsonb)
        INTO v_result
        FROM (
            SELECT DISTINCT ON (TRIM(cs.name))
                cs.id,
                cs.name,
                COALESCE(cs.site_code, '') as site_code,
                cs.client_id
            FROM core_common.client_sites cs
            WHERE cs.empresa_id = p_empresa_id
              AND (cs.status IS NULL OR LOWER(cs.status) IN ('active', 'ativo', 'ativa'))
            ORDER BY TRIM(cs.name) ASC, cs.id ASC
        ) t;
    ELSE
        v_result := '[]'::jsonb;
    END IF;

    RETURN jsonb_build_object('success', true, 'sites', COALESCE(v_result, '[]'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_sites_portal(TEXT, UUID, UUID) TO anon, authenticated, service_role;
