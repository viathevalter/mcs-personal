const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    // DEL THE ACCIDENTAL OVERLOAD
    await prodClient.query(`
        DROP FUNCTION IF EXISTS core_personal.search_workers(uuid, text, text[], text[], text[], text[], text[], text, text, integer, integer);
    `);

    // UPDATING THE CORRECT ONE!
    await prodClient.query(`
    CREATE OR REPLACE FUNCTION core_personal.search_workers(p_empresa_id uuid, p_search text DEFAULT NULL::text, p_cliente_nombre text[] DEFAULT NULL::text[], p_status_trabajador_filter text[] DEFAULT NULL::text[], p_status_seguridad_filter text[] DEFAULT NULL::text[], p_contratante text DEFAULT NULL::text, p_funcion text DEFAULT NULL::text, p_sort_column text DEFAULT 'nome'::text, p_sort_direction text DEFAULT 'asc'::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 10)
    RETURNS TABLE(total_count bigint, id uuid, empresa_id uuid, cod_colab text, nome text, email text, movil text, niss text, nif text, nie text, dni text, pasaporte text, status_seguridad text, status_trabajador text, contratante text, funcion text, cliente_nombre text, created_at timestamp with time zone)
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
                w.empresa_id,
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
                w.contratante,
                w.funcion,
                w.cliente as active_client_nombre,
                w.created_at
            FROM core_personal.workers w
            WHERE 
                -- Bypass da empresa principal BEDBC2AD-BB7A-4BB3-986E-07224A9A5A3D (Login Pro)
                (p_empresa_id IS NULL OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid OR w.empresa_id = p_empresa_id)
                AND (
                    p_search IS NULL OR p_search = '' 
                    OR w.nome ILIKE '%' || p_search || '%' 
                    OR w.cod_colab ILIKE '%' || p_search || '%' 
                    OR w.dni ILIKE '%' || p_search || '%' 
                    OR w.pasaporte ILIKE '%' || p_search || '%' 
                    OR w.niss ILIKE '%' || p_search || '%' 
                    OR w.nie ILIKE '%' || p_search || '%'
                )
                AND (p_contratante IS NULL OR p_contratante = '' OR w.contratante = p_contratante)
                AND (p_funcion IS NULL OR p_funcion = '' OR w.funcion = p_funcion)
                AND (p_status_trabajador_filter IS NULL OR array_length(p_status_trabajador_filter, 1) IS NULL OR (
                    EXISTS (
                        SELECT 1 FROM unnest(p_status_trabajador_filter) AS sf
                        WHERE (sf = 'ativos' AND (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')) OR
                              (sf = 'inativos' AND (w.status_trabajador ILIKE 'Inativo' OR w.status_trabajador ILIKE 'Inactivo' OR w.status_trabajador ILIKE 'Desligado')) OR
                              (sf = 'pendientes_ingreso' AND (w.status_trabajador ILIKE 'Pendente Ingresso' OR w.status_trabajador ILIKE 'Pendiente Ingresar' OR w.status_trabajador ILIKE 'Pendiente Ingreso'))
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
            f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.active_client_nombre as cliente_nombre_mapped, f.created_at
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
            f.nome ASC -- Fallback tiebreaker
        LIMIT p_page_size
        OFFSET v_offset;
    END;
    $function$;
    `);

    // UPDATING get_hours_control_workers WITH BYPASS TOO!
    await prodClient.query(`
    CREATE OR REPLACE FUNCTION core_personal.get_hours_control_workers(p_empresa_id uuid, p_period_year integer, p_period_month integer, p_contratante text DEFAULT NULL::text, p_cliente_nombre text DEFAULT NULL::text)
    RETURNS TABLE(total_count bigint, id uuid, empresa_id uuid, cod_colab text, nome text, email text, movil text, niss text, nif text, nie text, dni text, pasaporte text, status_seguridad text, status_trabajador text, contratante text, funcion text, cliente_nombre text, data_baixa date, created_at timestamp with time zone)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public', 'core_personal'
    AS $function$
    DECLARE
    v_start_date date := make_date(p_period_year, p_period_month, 1);
    v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
    BEGIN
    RETURN QUERY
    WITH base_workers AS (
        SELECT 
        w.id,
        w.empresa_id,
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
        w.contratante,
        w.funcion,
        COALESCE(w.cliente, 'NÃO DEFINIDO') AS cliente_nombre,
        w.data_baixa,
        w.created_at
        FROM core_personal.workers w
        WHERE 
        (p_empresa_id IS NULL OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid OR w.empresa_id = p_empresa_id)
        AND (
            (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')
            OR
            ((w.status_trabajador ILIKE 'Inativo' OR w.status_trabajador ILIKE 'Desligado') AND w.data_baixa >= v_start_date)
        )
    ),
    filtered AS (
        SELECT bw.*
        FROM base_workers bw
        WHERE (p_contratante IS NULL OR p_contratante = '' OR bw.contratante = p_contratante)
        AND (p_cliente_nombre IS NULL OR p_cliente_nombre = '' OR bw.cliente_nombre ILIKE '%' || p_cliente_nombre || '%')
    ),
    total AS (
        SELECT COUNT(*) AS exact_count FROM filtered
    )
    SELECT 
        (SELECT exact_count FROM total) AS total_count,
        f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.cliente_nombre, f.data_baixa, f.created_at
    FROM filtered f
    ORDER BY f.nome ASC;
    END;
    $function$;
    `);

    console.log("Bug do Overload resolvido. Funções Injetadas com o Bypass LoginPro SuperAdmin.");
    await prodClient.end();
}
run();
