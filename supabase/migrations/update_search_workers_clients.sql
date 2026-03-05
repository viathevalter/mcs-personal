-- Helper function to centralize active client logic
CREATE OR REPLACE FUNCTION public.fn_get_active_client_for_worker(p_cod_colab text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT cpp.cliente_nombre 
  FROM public.colaborador_por_pedido cpp 
  WHERE cpp.cod_colab = p_cod_colab 
    AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE)
  ORDER BY 
    CASE WHEN cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= CURRENT_DATE THEN 0 ELSE 1 END,
    cpp.fechainiciopedido DESC NULLS LAST,
    cpp.inserted_at DESC
  LIMIT 1;
$function$;

-- Update get_client_worker_kpis to use the new exact match logic
CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(p_empresa_id uuid, p_search text DEFAULT NULL::text, p_cliente_nombre text DEFAULT NULL::text, p_contratante text DEFAULT NULL::text, p_funcion text DEFAULT NULL::text)
 RETURNS TABLE(ativos bigint, inativos bigint, pendentes_ingreso bigint, seguridade_alta bigint, seguridade_pendente_alta bigint, seguridade_baixa bigint, seguridade_pendente_baixa bigint)
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
            c.contratante,
            c.funcion,
            public.fn_get_active_client_for_worker(w.cod_colab) as active_client
        FROM core_personal.workers w
        LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
        WHERE w.empresa_id = p_empresa_id
          AND (p_search IS NULL OR p_search = '' OR w.nome ILIKE '%' || p_search || '%' OR w.cod_colab ILIKE '%' || p_search || '%' OR w.dni ILIKE '%' || p_search || '%' OR w.pasaporte ILIKE '%' || p_search || '%' OR w.niss ILIKE '%' || p_search || '%' OR w.nie ILIKE '%' || p_search || '%')
          AND (p_contratante IS NULL OR p_contratante = '' OR c.contratante = p_contratante)
          AND (p_funcion IS NULL OR p_funcion = '' OR c.funcion = p_funcion)
    ),
    filtered_kpis AS (
        SELECT *
        FROM worker_active_clients wk
        WHERE (p_cliente_nombre IS NULL OR p_cliente_nombre = '' OR wk.active_client ILIKE '%' || p_cliente_nombre || '%')
    )
    SELECT 
        -- Status do Trabalhador
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Activo' OR wk.status_trabajador ILIKE 'Ativo') AS ativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inactivo' OR wk.status_trabajador ILIKE 'Inativo') AS inativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE '%Pendente%') AS pendentes_ingreso,
        
        -- Status de Seguridade
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Alta' OR wk.status_seguridad ILIKE 'Alta Confirmada') AS seguridade_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente de Alta' OR wk.status_seguridad ILIKE 'Pendente de Alta') AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Anulado') AS seguridade_baixa,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente de Baja' OR wk.status_seguridad ILIKE 'Pendente de Baixa') AS seguridade_pendente_baixa

    FROM filtered_kpis wk;
END;
$function$;

-- Update search_workers to use the exact same logic
CREATE OR REPLACE FUNCTION core_personal.search_workers(p_empresa_id uuid, p_search text DEFAULT NULL::text, p_cliente_nombre text DEFAULT NULL::text, p_status_trabajador_filter text[] DEFAULT NULL::text[], p_status_seguridad_filter text[] DEFAULT NULL::text[], p_contratante text DEFAULT NULL::text, p_funcion text DEFAULT NULL::text, p_sort_column text DEFAULT 'nome'::text, p_sort_direction text DEFAULT 'asc'::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 10)
 RETURNS TABLE(total_count bigint, id uuid, empresa_id uuid, cod_colab text, nome text, email text, movil text, niss text, nif text, nie text, dni text, pasaporte text, status_seguridad text, status_trabajador text, contratante text, funcion text, cliente_nombre text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_offset int := (p_page - 1) * p_page_size;
BEGIN
  RETURN QUERY
  WITH base_workers AS (
    SELECT w.*, c.contratante, c.funcion,
      public.fn_get_active_client_for_worker(w.cod_colab) as active_client_nombre
    FROM core_personal.workers w
    LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
    WHERE w.empresa_id = p_empresa_id
      AND (p_search IS NULL OR p_search = '' OR w.nome ILIKE '%' || p_search || '%' OR w.cod_colab ILIKE '%' || p_search || '%' OR w.dni ILIKE '%' || p_search || '%' OR w.pasaporte ILIKE '%' || p_search || '%' OR w.niss ILIKE '%' || p_search || '%' OR w.nie ILIKE '%' || p_search || '%')
      AND (p_contratante IS NULL OR p_contratante = '' OR c.contratante = p_contratante)
      AND (p_funcion IS NULL OR p_funcion = '' OR c.funcion = p_funcion)
      AND (p_status_trabajador_filter IS NULL OR array_length(p_status_trabajador_filter, 1) IS NULL OR (
        EXISTS (
          SELECT 1 FROM unnest(p_status_trabajador_filter) AS sf
          WHERE (sf = 'ativos' AND (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')) OR
                (sf = 'inativos' AND (w.status_trabajador ILIKE 'Inativo' OR w.status_trabajador ILIKE 'Inactivo')) OR
                (sf = 'pendientes_ingreso' AND (w.status_trabajador ILIKE 'Pendente Ingresso' OR w.status_trabajador ILIKE 'Pendiente Ingresar'))
        )
      ))
      AND (p_status_seguridad_filter IS NULL OR array_length(p_status_seguridad_filter, 1) IS NULL OR (
        EXISTS (
          SELECT 1 FROM unnest(p_status_seguridad_filter) AS sf
          WHERE (sf = 'alta' AND w.status_seguridad ILIKE 'Alta') OR
                (sf = 'pendentes_alta' AND (w.status_seguridad ILIKE 'Pendente Alta' OR w.status_seguridad ILIKE 'Pendiente Alta')) OR
                (sf = 'baixa' AND (w.status_seguridad ILIKE 'Baixa' OR w.status_seguridad ILIKE 'Baja' OR w.status_seguridad ILIKE 'Anulado')) OR
                (sf = 'pendentes_baixa' AND (w.status_seguridad ILIKE 'Pendente Baixa' OR w.status_seguridad ILIKE 'Pendiente Baja'))
        )
      ))
  ),
  filtered AS (
    SELECT *
    FROM base_workers bw
    WHERE (p_cliente_nombre IS NULL OR p_cliente_nombre = '' OR bw.active_client_nombre ILIKE '%' || p_cliente_nombre || '%')
  ),
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT exact_count FROM total) AS total_count,
    f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.active_client_nombre as cliente_nombre, f.created_at
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
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'asc' THEN f.active_client_nombre END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'desc' THEN f.active_client_nombre END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'asc' THEN f.status_trabajador END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'desc' THEN f.status_trabajador END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'asc' THEN f.status_seguridad END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'desc' THEN f.status_seguridad END DESC NULLS LAST,
    f.nome ASC -- Fallback tiebreaker
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;
