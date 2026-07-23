-- Drop old function first to avoid PostgreSQL parameter defaults redefinition error
DROP FUNCTION IF EXISTS core_personal.search_workers(
    p_empresa_id uuid,
    p_search text,
    p_cliente_nombre text[],
    p_status_trabajador_filter text[],
    p_status_seguridad_filter text[],
    p_contratante text,
    p_funcion text,
    p_sort_column text,
    p_sort_direction text,
    p_page integer,
    p_page_size integer,
    p_period_month integer,
    p_period_year integer
);

-- Recreate search_workers with fix for company filter logic using active allocations
CREATE OR REPLACE FUNCTION core_personal.search_workers(
    p_empresa_id uuid,
    p_search text,
    p_cliente_nombre text[],
    p_status_trabajador_filter text[],
    p_status_seguridad_filter text[],
    p_contratante text,
    p_funcion text,
    p_sort_column text,
    p_sort_direction text,
    p_page integer,
    p_page_size integer,
    p_period_month integer DEFAULT NULL::integer,
    p_period_year integer DEFAULT NULL::integer
)
 RETURNS TABLE(
    total_count bigint,
    id uuid,
    empresa_id uuid,
    cod_colab text,
    nome text,
    email text,
    movil text,
    niss text,
    nif text,
    nie text,
    dni text,
    pasaporte text,
    status_seguridad text,
    status_trabajador text,
    contratante text,
    funcion text,
    cliente_nombre text,
    data_ingresso date,
    data_baixa date,
    data_alta_seguridad date,
    data_baixa_seguridad date,
    created_at timestamp with time zone
)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'core_personal'
 AS $function$
DECLARE
    v_offset int := (p_page - 1) * p_page_size;
BEGIN
    RETURN QUERY
    WITH current_allocations AS (
        SELECT 
          cpp.cod_colab,
          cpp.contratante,
          CASE 
            WHEN lower(cpp.contratante) IN ('stocco') THEN '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid
            WHEN lower(cpp.contratante) IN ('triangulo') THEN 'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid
            WHEN lower(cpp.contratante) IN ('luminous') THEN '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid
            WHEN lower(cpp.contratante) IN ('wiseowe') THEN 'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid
            WHEN lower(cpp.contratante) IN ('rosas', 'kotrik & rosas') THEN 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf'::uuid
            ELSE NULL
          END AS allocation_empresa_id
        FROM public.colaborador_por_pedido cpp
    ),
    base_workers AS (
        SELECT 
            w.id,
            p_empresa_id as empresa_id,
            w.cod_colab,
            w.nome,
            w.email,
            w.movil,
            w.niss,
            w.nif,
            w.nie,
            w.dni,
            w.pasaporte,
            w.status_seguridad,
            w.status_trabajador,
            COALESCE(
                (
                    SELECT emp.nome::text 
                    FROM core_personal.worker_assignments wa 
                    JOIN core_common.empresas emp ON emp.id = wa.empresa_id 
                    WHERE wa.worker_id = w.id AND wa.status IN ('planned', 'active', 'paused') 
                    ORDER BY wa.planned_start_date DESC LIMIT 1
                ),
                w.contratante, 
                c.contratante
            )::text as contratante,
            COALESCE(
                (
                    SELECT wa.job_function_name_snapshot::text 
                    FROM core_personal.worker_assignments wa 
                    WHERE wa.worker_id = w.id AND wa.status IN ('planned', 'active', 'paused') 
                    ORDER BY wa.planned_start_date DESC LIMIT 1
                ),
                w.funcion, 
                c.funcion
            )::text as funcion,
            COALESCE(
                (
                    SELECT cli.trade_name::text 
                    FROM core_personal.worker_assignments wa 
                    JOIN core_common.clients cli ON cli.id = wa.client_id 
                    WHERE wa.worker_id = w.id AND wa.status IN ('planned', 'active', 'paused') 
                    ORDER BY wa.planned_start_date DESC LIMIT 1
                ),
                w.cliente::text, 
                core_personal.fn_get_active_client_for_worker(w.cod_colab)::text
            )::text as active_client_nombre,
            w.data_ingresso,
            w.data_baixa,
            w.data_alta_seguridad,
            w.data_baixa_seguridad,
            w.created_at
        FROM core_personal.workers w
        LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
        WHERE 
            -- Resolve company membership globally by allocations, active/pending contracts or assignments
            (
                p_empresa_id IS NULL 
                OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid 
                OR EXISTS (
                    SELECT 1 FROM current_allocations ca 
                    WHERE ca.cod_colab = w.cod_colab AND ca.allocation_empresa_id = p_empresa_id
                )
                OR EXISTS (
                    SELECT 1 FROM core_personal.contracts cnt 
                    WHERE cnt.worker_id = w.id AND cnt.empresa_id = p_empresa_id
                      AND cnt.status IN ('signed', 'pending_signature', 'no_signature')
                ) 
                OR EXISTS (
                    SELECT 1 FROM core_personal.worker_assignments wa
                    WHERE wa.worker_id = w.id AND wa.empresa_id = p_empresa_id AND wa.status IN ('planned', 'active', 'paused')
                )
            )
            AND (
                p_search IS NULL OR p_search = '' 
                OR w.nome ILIKE '%' || p_search || '%' 
                OR w.cod_colab ILIKE '%' || p_search || '%' 
                OR w.dni ILIKE '%' || p_search || '%' 
                OR w.pasaporte ILIKE '%' || p_search || '%' 
                OR w.niss ILIKE '%' || p_search || '%' 
                OR w.nie ILIKE '%' || p_search || '%'
            )
            AND (p_contratante IS NULL OR p_contratante = '' OR COALESCE(w.contratante, c.contratante) = p_contratante)
            AND (p_funcion IS NULL OR p_funcion = '' OR COALESCE(w.funcion, c.funcion) = p_funcion)
            AND (p_status_trabajador_filter IS NULL OR array_length(p_status_trabajador_filter, 1) IS NULL OR (
                EXISTS (
                    SELECT 1 FROM unnest(p_status_trabajador_filter) AS sf
                    WHERE (sf = 'ativos' AND (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')) OR
                          (sf = 'inativos' AND (w.status_trabajador ILIKE 'Inativo' OR w.status_trabajador ILIKE 'Inactivo' OR w.status_trabajador ILIKE 'Desligado')) OR
                          (sf IN ('pendientes_ingreso', 'pendentes_ingreso', 'pendentes_ingresso') AND (w.status_trabajador ILIKE 'Pendente Ingresso' OR w.status_trabajador ILIKE 'Pendiente Ingresar' OR w.status_trabajador ILIKE 'Pendiente Ingreso'))
                )
            ))
            AND (p_status_seguridad_filter IS NULL OR array_length(p_status_seguridad_filter, 1) IS NULL OR (
                EXISTS (
                    SELECT 1 FROM unnest(p_status_seguridad_filter) AS sf
                    WHERE (sf = 'alta' AND w.status_seguridad ILIKE 'Alta') OR
                          (sf = 'pendentes_alta' AND (w.status_seguridad ILIKE 'Pendente Alta' OR w.status_seguridad ILIKE 'Pendiente Alta')) OR
                          (sf = 'baixa' AND (w.status_seguridad ILIKE 'Baixa' OR w.status_seguridad ILIKE 'Baja' OR w.status_seguridad ILIKE 'Anulado')) OR
                          (sf = 'pendentes_baixa' AND (w.status_seguridad ILIKE 'Pendente Baixa' OR w.status_seguridad ILIKE 'Pendiente Baja')) OR
                          (sf = 'em_regularizacao' AND (w.status_seguridad ILIKE 'Em Regularização' OR w.status_seguridad ILIKE 'Em Regularizacion' OR w.status_seguridad ILIKE 'En Regularización' OR w.status_seguridad ILIKE 'En Regularizacion'))
                )
            ))
            AND (
                p_period_month IS NULL OR p_period_year IS NULL OR
                (EXTRACT(MONTH FROM w.data_ingresso) = p_period_month AND EXTRACT(YEAR FROM w.data_ingresso) = p_period_year)
                OR 
                (EXTRACT(MONTH FROM w.created_at) = p_period_month AND EXTRACT(YEAR FROM w.created_at) = p_period_year)
            )
    ),
    filtered AS (
        SELECT bw.*
        FROM base_workers bw
        WHERE (p_cliente_nombre IS NULL OR array_length(p_cliente_nombre, 1) IS NULL OR bw.active_client_nombre = ANY(p_cliente_nombre))
    ),
    total AS (
        SELECT COUNT(*) AS exact_count FROM filtered
    )
    SELECT 
        (SELECT exact_count FROM total) AS total_count_mapped,
        f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.active_client_nombre as cliente_nombre_mapped, f.data_ingresso, f.data_baixa, f.data_alta_seguridad, f.data_baixa_seguridad, f.created_at
    FROM filtered f
    ORDER BY 
        CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'asc' THEN f.nome END ASC NULLS LAST,
        CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'desc' THEN f.nome END DESC NULLS LAST,
        CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'asc' THEN f.cod_colab END ASC NULLS LAST,
        CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'desc' THEN f.cod_colab END DESC NULLS LAST,
        CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'asc' THEN f.contratante END ASC NULLS LAST,
        CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'desc' THEN f.contratante END DESC NULLS LAST,
        CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'asc' THEN f.funcion END ASC NULLS LAST,
        CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'desc' THEN f.funcion END DESC NULLS LAST,
        CASE WHEN p_sort_column = 'cliente' AND p_sort_direction = 'asc' THEN f.active_client_nombre END ASC NULLS LAST,
        CASE WHEN p_sort_column = 'cliente' AND p_sort_direction = 'desc' THEN f.active_client_nombre END DESC NULLS LAST,
        CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'asc' THEN f.status_trabajador END ASC NULLS LAST,
        CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'desc' THEN f.status_trabajador END DESC NULLS LAST,
        CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'asc' THEN f.status_seguridad END ASC NULLS LAST,
        CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'desc' THEN f.status_seguridad END DESC NULLS LAST,
        f.nome ASC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$function$;

GRANT EXECUTE ON FUNCTION core_personal.search_workers(uuid, text, text[], text[], text[], text, text, text, text, integer, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION core_personal.search_workers(uuid, text, text[], text[], text[], text, text, text, text, integer, integer, integer, integer) TO service_role;
