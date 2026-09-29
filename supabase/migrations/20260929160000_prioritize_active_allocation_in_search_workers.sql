-- Migration: prioritize active allocation in search_workers and get_client_worker_kpis

-- 1. Create fn_get_active_function_for_worker
CREATE OR REPLACE FUNCTION core_personal.fn_get_active_function_for_worker(p_cod_colab text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_funcion text;
BEGIN
  WITH all_allocations AS (
    -- 1. Alocações novas (worker_assignments)
    SELECT 
      wa.job_function_name_snapshot AS funcion_name,
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
    WHERE w.cod_colab = p_cod_colab

    UNION ALL

    -- 2. Alocações legadas (colaborador_por_pedido)
    SELECT 
      cpp.funcion AS funcion_name,
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
  SELECT funcion_name 
  INTO v_funcion
  FROM all_allocations
  WHERE funcion_name IS NOT NULL AND TRIM(funcion_name) != ''
  ORDER BY 
    is_active DESC,
    start_date DESC NULLS LAST,
    inserted_at DESC
  LIMIT 1;

  RETURN v_funcion;
END;
$function$;

-- 2. Redefine core_personal.search_workers to prioritize active allocation
CREATE OR REPLACE FUNCTION core_personal.search_workers(
  p_empresa_id text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_cliente_nombre text[] DEFAULT NULL::text[],
  p_status_trabajador_filter text[] DEFAULT NULL::text[],
  p_status_seguridad_filter text[] DEFAULT NULL::text[],
  p_contratante text DEFAULT NULL::text,
  p_funcion text DEFAULT NULL::text,
  p_sort_column text DEFAULT 'nome'::text,
  p_sort_direction text DEFAULT 'asc'::text,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50,
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
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_offset integer;
  v_holding_id text := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'; -- GRP - Login Pro
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH base_workers AS (
    SELECT 
      w.id,
      COALESCE(
        (
          SELECT wa.empresa_id
          FROM core_personal.worker_assignments wa
          WHERE wa.worker_id = w.id
            AND wa.status IN ('active', 'planned', 'paused')
            AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE)
          ORDER BY wa.start_date DESC NULLS LAST
          LIMIT 1
        ),
        e.id,
        (
          SELECT cnt.empresa_id
          FROM core_personal.contracts cnt
          WHERE cnt.worker_id = w.id
          ORDER BY cnt.created_at DESC
          LIMIT 1
        ),
        (
          SELECT wa.empresa_id
          FROM core_personal.worker_assignments wa
          WHERE wa.worker_id = w.id
          ORDER BY wa.planned_start_date DESC
          LIMIT 1
        )
      ) as empresa_id,
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
      w.data_ingresso,
      w.data_alta_seguridad,
      w.created_at,
      COALESCE(core_personal.fn_get_active_contratante_for_worker(w.cod_colab), NULLIF(w.contratante, ''), c.contratante) as contratante,
      COALESCE(core_personal.fn_get_active_function_for_worker(w.cod_colab), NULLIF(w.funcion, ''), jf.name, c.funcion) as funcion,
      COALESCE(core_personal.fn_get_active_client_for_worker(w.cod_colab), NULLIF(w.cliente, '')) as active_client_nombre
    FROM core_personal.workers w
    LEFT JOIN core_comercial.job_functions jf ON jf.code = w.cod_funcion
    LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
    LEFT JOIN core_common.empresas e ON (
      UPPER(e.codigo) = UPPER(w.contratante) OR 
      UPPER(e.nome) = UPPER(w.contratante) OR
      (UPPER(w.contratante) LIKE 'LUMINOUS%' AND e.codigo = 'LUM') OR
      (UPPER(w.contratante) LIKE 'WISEOWE%' AND e.codigo = 'WIS') OR
      (UPPER(w.contratante) LIKE 'STOCCO%' AND e.codigo = 'STO') OR
      (UPPER(w.contratante) LIKE 'TRIANGULO%' AND e.codigo = 'TRI') OR
      (UPPER(w.contratante) LIKE '%ROSAS%' AND e.codigo = 'KOT')
    )
  ),
  filtered AS (
    SELECT bw.*
    FROM base_workers bw
    WHERE (
        p_empresa_id IS NULL 
        OR p_empresa_id = '' 
        OR p_empresa_id = v_holding_id 
        OR (bw.empresa_id IS NOT NULL AND bw.empresa_id::text = p_empresa_id)
        OR EXISTS (
          SELECT 1 FROM core_personal.contracts cnt 
          WHERE cnt.worker_id = bw.id AND cnt.empresa_id::text = p_empresa_id
        )
        OR EXISTS (
          SELECT 1 FROM core_personal.worker_assignments wa 
          WHERE wa.worker_id = bw.id AND wa.empresa_id::text = p_empresa_id
        )
        OR bw.empresa_id IS NULL
      )
      AND (
        p_search IS NULL OR TRIM(p_search) = '' OR (
          bw.nome ILIKE '%' || TRIM(p_search) || '%' OR
          bw.cod_colab ILIKE '%' || TRIM(p_search) || '%' OR
          bw.nif ILIKE '%' || TRIM(p_search) || '%' OR
          bw.niss ILIKE '%' || TRIM(p_search) || '%' OR
          bw.nie ILIKE '%' || TRIM(p_search) || '%' OR
          bw.dni ILIKE '%' || TRIM(p_search) || '%' OR
          bw.pasaporte ILIKE '%' || TRIM(p_search) || '%'
        )
      )
      AND (p_cliente_nombre IS NULL OR cardinality(p_cliente_nombre) = 0 OR bw.active_client_nombre = ANY(p_cliente_nombre))
      AND (
        p_status_trabajador_filter IS NULL 
        OR cardinality(p_status_trabajador_filter) = 0 
        OR bw.status_trabajador = ANY(p_status_trabajador_filter)
        OR (
          EXISTS (
            SELECT 1 FROM unnest(p_status_trabajador_filter) AS st
            WHERE 
              (st = 'ativos' AND (bw.status_trabajador ILIKE 'Ativo%' OR bw.status_trabajador ILIKE 'Activo%'))
              OR
              (st = 'inativos' AND (
                bw.status_trabajador ILIKE 'Inativo%' 
                OR bw.status_trabajador ILIKE 'Inactivo%' 
                OR bw.status_trabajador ILIKE 'Desligado%' 
                OR bw.status_trabajador ILIKE 'Desistiu%'
              ))
              OR
              (st IN ('pendientes_ingreso', 'pendentes_ingreso', 'pendentes_ingresso') AND (
                bw.status_trabajador ILIKE '%Pendente%' 
                OR bw.status_trabajador ILIKE '%Pendiente%'
              ))
              OR
              (st IN ('disponiveis', 'disponivel', 'disponíveis') AND bw.status_trabajador ILIKE 'Dispon%')
              OR
              (st = 'desistiu' AND bw.status_trabajador ILIKE 'Desist%')
              OR
              (bw.status_trabajador ILIKE st)
          )
        )
      )
      AND (
        p_status_seguridad_filter IS NULL 
        OR cardinality(p_status_seguridad_filter) = 0 
        OR bw.status_seguridad = ANY(p_status_seguridad_filter)
        OR (
          EXISTS (
            SELECT 1 FROM unnest(p_status_seguridad_filter) AS sf
            WHERE 
              (sf = 'alta' AND bw.status_seguridad ILIKE 'Alta')
              OR
              (sf = 'pendentes_alta' AND (bw.status_seguridad ILIKE 'Pendente Alta' OR bw.status_seguridad ILIKE 'Pendiente Alta'))
              OR
              (sf = 'baixa' AND (bw.status_seguridad ILIKE 'Baixa' OR bw.status_seguridad ILIKE 'Baja' OR bw.status_seguridad ILIKE 'Anulado'))
              OR
              (sf = 'pendentes_baixa' AND (bw.status_seguridad ILIKE 'Pendente Baixa' OR bw.status_seguridad ILIKE 'Pendiente Baja'))
              OR
              (sf = 'em_regularizacao' AND (
                bw.status_seguridad ILIKE 'Em Regulariza%' 
                OR bw.status_seguridad ILIKE 'En Regulariza%'
              ))
              OR
              (bw.status_seguridad ILIKE sf)
          )
        )
      )
      AND (p_contratante IS NULL OR bw.contratante ILIKE '%' || p_contratante || '%')
      AND (p_funcion IS NULL OR bw.funcion ILIKE '%' || p_funcion || '%')
      AND (
        p_period_month IS NULL OR p_period_year IS NULL OR
        (EXTRACT(MONTH FROM bw.data_ingresso) = p_period_month AND EXTRACT(YEAR FROM bw.data_ingresso) = p_period_year) OR
        (EXTRACT(MONTH FROM bw.data_alta_seguridad) = p_period_month AND EXTRACT(YEAR FROM bw.data_alta_seguridad) = p_period_year) OR
        (EXTRACT(MONTH FROM bw.created_at) = p_period_month AND EXTRACT(YEAR FROM bw.created_at) = p_period_year)
      )
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

-- 3. Redefine core_personal.get_client_worker_kpis
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
DECLARE
  v_holding_id uuid := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid;
BEGIN
    -- Security Check
    IF NOT (
        public.get_my_role() = 'super_admin'
        OR (p_empresa_id IS NULL AND core_common.is_member(v_holding_id))
        OR (p_empresa_id IS NOT NULL AND (core_common.is_member(p_empresa_id) OR core_common.is_member(v_holding_id)))
    ) THEN
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
        RETURN;
    END IF;

    RETURN QUERY
    WITH base_workers AS (
        SELECT 
            w.id,
            COALESCE(
              (
                SELECT wa.empresa_id
                FROM core_personal.worker_assignments wa
                WHERE wa.worker_id = w.id
                  AND wa.status IN ('active', 'planned', 'paused')
                  AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE)
                ORDER BY wa.start_date DESC NULLS LAST
                LIMIT 1
              ),
              e.id,
              (
                SELECT cnt.empresa_id
                FROM core_personal.contracts cnt
                WHERE cnt.worker_id = w.id
                ORDER BY cnt.created_at DESC
                LIMIT 1
              ),
              (
                SELECT wa.empresa_id
                FROM core_personal.worker_assignments wa
                WHERE wa.worker_id = w.id
                ORDER BY wa.planned_start_date DESC
                LIMIT 1
              )
            ) as empresa_id,
            w.status_trabajador,
            w.status_seguridad,
            w.nome,
            w.cod_colab,
            w.dni,
            w.pasaporte,
            w.niss,
            w.nie,
            COALESCE(core_personal.fn_get_active_contratante_for_worker(w.cod_colab), NULLIF(w.contratante, ''), c.contratante) as contratante,
            COALESCE(core_personal.fn_get_active_function_for_worker(w.cod_colab), NULLIF(w.funcion, ''), jf.name, c.funcion) as funcion,
            COALESCE(core_personal.fn_get_active_client_for_worker(w.cod_colab), NULLIF(w.cliente, '')) as active_client
        FROM core_personal.workers w
        LEFT JOIN core_comercial.job_functions jf ON jf.code = w.cod_funcion
        LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
        LEFT JOIN core_common.empresas e ON (
          UPPER(e.codigo) = UPPER(w.contratante) OR 
          UPPER(e.nome) = UPPER(w.contratante) OR
          (UPPER(w.contratante) LIKE 'LUMINOUS%' AND e.codigo = 'LUM') OR
          (UPPER(w.contratante) LIKE 'WISEOWE%' AND e.codigo = 'WIS') OR
          (UPPER(w.contratante) LIKE 'STOCCO%' AND e.codigo = 'STO') OR
          (UPPER(w.contratante) LIKE 'TRIANGULO%' AND e.codigo = 'TRI') OR
          (UPPER(w.contratante) LIKE '%ROSAS%' AND e.codigo = 'KOT')
        )
    ),
    filtered_kpis AS (
        SELECT bw.*
        FROM base_workers bw
        WHERE 
            (
              p_empresa_id IS NULL 
              OR p_empresa_id = v_holding_id 
              OR bw.empresa_id = p_empresa_id
              OR EXISTS (
                SELECT 1 FROM core_personal.contracts cnt 
                WHERE cnt.worker_id = bw.id AND cnt.empresa_id = p_empresa_id
              )
              OR EXISTS (
                SELECT 1 FROM core_personal.worker_assignments wa 
                WHERE wa.worker_id = bw.id AND wa.empresa_id = p_empresa_id
              )
              OR bw.empresa_id IS NULL
            )
            AND (
                p_search IS NULL OR TRIM(p_search) = '' 
                OR bw.nome ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.cod_colab ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.dni ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.pasaporte ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.niss ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.nie ILIKE '%' || TRIM(p_search) || '%'
            )
            AND (p_contratante IS NULL OR TRIM(p_contratante) = '' OR bw.contratante ILIKE '%' || TRIM(p_contratante) || '%')
            AND (p_funcion IS NULL OR TRIM(p_funcion) = '' OR bw.funcion ILIKE '%' || TRIM(p_funcion) || '%')
            AND (p_cliente_nombre IS NULL OR cardinality(p_cliente_nombre) = 0 OR bw.active_client = ANY(p_cliente_nombre))
    )
    SELECT 
        -- Status do Trabalhador
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Ativo%' OR wk.status_trabajador ILIKE 'Activo%')::bigint AS ativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inativo%' OR wk.status_trabajador ILIKE 'Inactivo%' OR wk.status_trabajador ILIKE 'Desligado%' OR wk.status_trabajador ILIKE 'Desistiu%')::bigint AS inativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE '%Pendente%' OR wk.status_trabajador ILIKE '%Pendiente%')::bigint AS pendentes_ingreso,
        
        -- Status de Seguridade
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Alta')::bigint AS seguridade_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendente Alta' OR wk.status_seguridad ILIKE 'Pendiente Alta')::bigint AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Em Regulariza%' OR wk.status_seguridad ILIKE 'En Regulariza%')::bigint AS seguridade_em_regularizacao,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Anulado')::bigint AS seguridade_baixa,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendente Baixa' OR wk.status_seguridad ILIKE 'Pendiente Baja')::bigint AS seguridade_pendente_baixa
    FROM filtered_kpis wk;
END;
$function$;
