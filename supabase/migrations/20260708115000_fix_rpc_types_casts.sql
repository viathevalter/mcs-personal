-- Redefine core_personal.search_workers with explicit text casts to match target return table definition
CREATE OR REPLACE FUNCTION core_personal.search_workers(
    p_empresa_id uuid, 
    p_search text DEFAULT NULL::text, 
    p_cliente_nombre text[] DEFAULT NULL::text[], 
    p_status_trabajador_filter text[] DEFAULT NULL::text[], 
    p_status_seguridad_filter text[] DEFAULT NULL::text[], 
    p_contratante text DEFAULT NULL::text, 
    p_funcion text DEFAULT NULL::text, 
    p_sort_column text DEFAULT 'nome'::text, 
    p_sort_direction text DEFAULT 'asc'::text, 
    p_page integer DEFAULT 1, 
    p_page_size integer DEFAULT 10, 
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
    WITH base_workers AS (
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
            -- Resolve company membership globally, by active contract, or by active/planned allocation
            (p_empresa_id IS NULL OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid OR EXISTS (
                SELECT 1 FROM core_personal.contracts cnt 
                WHERE cnt.worker_id = w.id AND cnt.empresa_id = p_empresa_id
            ) OR EXISTS (
                SELECT 1 FROM core_personal.worker_assignments wa
                WHERE wa.worker_id = w.id AND wa.empresa_id = p_empresa_id AND wa.status IN ('planned', 'active', 'paused')
            ))
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


-- Redefine core_personal.get_client_worker_kpis with explicit text casts to ensure correct internal CTE evaluations
CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(
    p_empresa_id uuid, 
    p_search text DEFAULT NULL::text, 
    p_cliente_nombre text[] DEFAULT NULL::text[], 
    p_contratante text DEFAULT NULL::text, 
    p_funcion text DEFAULT NULL::text
)
RETURNS TABLE(
    ativos bigint, 
    inativos bigint, 
    pendentes_ingreso bigint, 
    seguridade_alta bigint, 
    seguridade_pendente_alta bigint, 
    seguridade_em_regularizacao bigint, 
    seguridade_baixa bigint, 
    seguridade_pendente_baixa bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH worker_active_clients AS (
        SELECT 
            w.id,
            w.status_trabajador,
            w.status_seguridad,
            w.nome,
            w.cod_colab,
            w.dni,
            w.pasaporte,
            w.niss,
            w.nie,
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
            )::text as active_client
        FROM core_personal.workers w
        LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
        WHERE 
            -- Resolve company membership globally, by active contract, or by active/planned allocation
            (p_empresa_id IS NULL OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid OR EXISTS (
                SELECT 1 FROM core_personal.contracts cnt 
                WHERE cnt.worker_id = w.id AND cnt.empresa_id = p_empresa_id
            ) OR EXISTS (
                SELECT 1 FROM core_personal.worker_assignments wa
                WHERE wa.worker_id = w.id AND wa.empresa_id = p_empresa_id AND wa.status IN ('planned', 'active', 'paused')
            ))
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
    ),
    filtered_kpis AS (
        SELECT *
        FROM worker_active_clients wk
        WHERE (p_cliente_nombre IS NULL OR array_length(p_cliente_nombre, 1) IS NULL OR wk.active_client = ANY(p_cliente_nombre))
    )
    SELECT 
        -- Status do Trabalhador
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Activo' OR wk.status_trabajador ILIKE 'Ativo') AS ativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inactivo' OR wk.status_trabajador ILIKE 'Inativo' OR wk.status_trabajador ILIKE 'Desligado') AS inativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE '%Pendente%') AS pendentes_ingreso,
        
        -- Status de Seguridade
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Alta') AS seguridade_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente Alta' OR wk.status_seguridad ILIKE 'Pendente Alta') AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Em Regularização' OR wk.status_seguridad ILIKE 'Em Regularizacion' OR wk.status_seguridad ILIKE 'En Regularización' OR wk.status_seguridad ILIKE 'En Regularizacion') AS seguridade_em_regularizacao,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Anulado') AS seguridade_baixa,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente Baja' OR wk.status_seguridad ILIKE 'Pendente Baixa') AS seguridade_pendente_baixa

    FROM filtered_kpis wk;
END;
$function$;

GRANT EXECUTE ON FUNCTION core_personal.get_client_worker_kpis(uuid, text, text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION core_personal.get_client_worker_kpis(uuid, text, text[], text, text) TO service_role;
