-- 1. Redefinir fn_sync_worker_active_fields_by_cod para que a função do trabalhador seja resolvida com fallback para job_functions
CREATE OR REPLACE FUNCTION core_personal.fn_sync_worker_active_fields_by_cod(p_cod_colab text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_client text;
  v_active_contratante text;
  v_active_funcion text;
  v_fallback_funcion text;
BEGIN
  WITH all_allocations AS (
    -- 1. Alocações novas
    SELECT 
      COALESCE(cl.trade_name, cl.legal_name, 'Cliente'::text) AS client_name,
      emp.nome AS contratante,
      wa.job_function_name_snapshot AS funcion,
      COALESCE(wa.start_date, wa.planned_start_date) AS start_date,
      wa.created_at AS inserted_at,
      CASE 
        WHEN wa.status IN ('active', 'planned', 'paused') 
             AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE) 
        THEN 1 
        ELSE 0 
      END AS is_active
    FROM core_personal.worker_assignments wa
    JOIN core_personal.workers w ON w.id = wa.worker_id
    LEFT JOIN core_common.clients cl ON cl.id = wa.client_id
    LEFT JOIN core_common.empresas emp ON emp.id = wa.empresa_id
    WHERE w.cod_colab = p_cod_colab

    UNION ALL

    -- 2. Alocações legadas
    SELECT 
      cpp.cliente_nombre AS client_name,
      cpp.contratante AS contratante,
      cpp.funcion AS funcion,
      cpp.fechainiciopedido::timestamp with time zone AS start_date,
      cpp.inserted_at AS inserted_at,
      CASE 
        WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE 
        THEN 1 
        ELSE 0 
      END AS is_active
    FROM public.colaborador_por_pedido cpp
    WHERE cpp.cod_colab = p_cod_colab
  )
  SELECT client_name, contratante, funcion
  INTO v_active_client, v_active_contratante, v_active_funcion
  FROM all_allocations
  ORDER BY 
    is_active DESC,
    start_date DESC NULLS LAST,
    inserted_at DESC
  LIMIT 1;

  -- Obter fallback de função cadastrada (via cod_funcion -> job_functions ou colaboradores)
  SELECT COALESCE(NULLIF(v_active_funcion, ''), jf.name, w.funcion, c.funcion)
  INTO v_fallback_funcion
  FROM core_personal.workers w
  LEFT JOIN core_comercial.job_functions jf ON jf.code = w.cod_funcion
  LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
  WHERE w.cod_colab = p_cod_colab;

  -- Atualizar core_personal.workers
  UPDATE core_personal.workers
  SET cliente = COALESCE(NULLIF(v_active_client, ''), cliente),
      contratante = COALESCE(NULLIF(v_active_contratante, ''), contratante),
      funcion = COALESCE(NULLIF(v_fallback_funcion, ''), funcion)
  WHERE cod_colab = p_cod_colab;
  
  -- Atualizar public.colaboradores (se existir)
  UPDATE public.colaboradores
  SET contratante = COALESCE(NULLIF(v_active_contratante, ''), contratante),
      funcion = COALESCE(NULLIF(v_fallback_funcion, ''), funcion)
  WHERE cod_colab = p_cod_colab;
END;
$$;

-- 2. Redefinir a RPC search_workers para sempre resolver funcion com fallback para job_functions
CREATE OR REPLACE FUNCTION core_personal.search_workers(
  p_empresa_id text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_cliente_nombre text DEFAULT NULL,
  p_status_trabajador text DEFAULT NULL,
  p_status_seguridad text DEFAULT NULL,
  p_contratante text DEFAULT NULL,
  p_funcion text DEFAULT NULL,
  p_sort_column text DEFAULT 'nome',
  p_sort_direction text DEFAULT 'asc',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10,
  p_period_month integer DEFAULT NULL,
  p_period_year integer DEFAULT NULL
)
RETURNS TABLE (
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
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_offset integer;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

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
      w.created_at,
      COALESCE(NULLIF(w.contratante, ''), c.contratante) as contratante,
      COALESCE(NULLIF(w.funcion, ''), jf.name, c.funcion) as funcion,
      core_personal.fn_get_active_client_for_worker(w.cod_colab) as active_client_nombre
    FROM core_personal.workers w
    LEFT JOIN core_comercial.job_functions jf ON jf.code = w.cod_funcion
    LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
  ),
  filtered AS (
    SELECT bw.*
    FROM base_workers bw
    WHERE (p_empresa_id IS NULL OR bw.empresa_id = p_empresa_id::uuid)
      AND (p_search IS NULL OR (
        bw.nome ILIKE '%' || p_search || '%' OR
        bw.cod_colab ILIKE '%' || p_search || '%' OR
        bw.nif ILIKE '%' || p_search || '%' OR
        bw.niss ILIKE '%' || p_search || '%'
      ))
      AND (p_cliente_nombre IS NULL OR bw.active_client_nombre ILIKE '%' || p_cliente_nombre || '%')
      AND (p_status_trabajador IS NULL OR bw.status_trabajador ILIKE '%' || p_status_trabajador || '%')
      AND (p_status_seguridad IS NULL OR bw.status_seguridad ILIKE '%' || p_status_seguridad || '%')
      AND (p_contratante IS NULL OR bw.contratante ILIKE '%' || p_contratante || '%')
      AND (p_funcion IS NULL OR bw.funcion ILIKE '%' || p_funcion || '%')
  ),
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT exact_count FROM total) AS total_count,
    f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.active_client_nombre as cliente_nombre, f.created_at
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'asc' THEN f.nome END ASC,
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'desc' THEN f.nome END DESC,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'asc' THEN f.cod_colab END ASC,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'desc' THEN f.cod_colab END DESC,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'asc' THEN f.active_client_nombre END ASC,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'desc' THEN f.active_client_nombre END DESC,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'asc' THEN f.contratante END ASC,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'desc' THEN f.contratante END DESC,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'asc' THEN f.funcion END ASC,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'desc' THEN f.funcion END DESC,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'asc' THEN f.status_trabajador END ASC,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'desc' THEN f.status_trabajador END DESC,
    f.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- 3. Rodar sincronização em lote para restaurar/preencher funcion em todos os trabalhadores
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT cod_colab FROM core_personal.workers WHERE cod_colab IS NOT NULL LOOP
    BEGIN
      PERFORM core_personal.fn_sync_worker_active_fields_by_cod(r.cod_colab);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;
