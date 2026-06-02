-- 1. DROP old functions if they exist
DROP FUNCTION IF EXISTS core_personal.get_salary_report_workers(uuid, integer, integer, text, text, text[], text, text, integer, integer);
DROP FUNCTION IF EXISTS core_personal.get_salary_report_kpis(uuid, integer, integer, text, text, text[]);

-- 2. CREATE core_personal.get_salary_report_workers
CREATE OR REPLACE FUNCTION core_personal.get_salary_report_workers(
  p_empresa_id uuid,
  p_period_year integer,
  p_period_month integer,
  p_search text DEFAULT NULL::text,
  p_contratante text DEFAULT NULL::text,
  p_cliente_nombre text[] DEFAULT NULL::text[],
  p_sort_column text DEFAULT 'nome'::text,
  p_sort_direction text DEFAULT 'asc'::text,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10
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
  nacionalidade text,
  fecha_nacimiento text,
  status_seguridad text,
  status_trabajador text,
  contratante text,
  funcion text,
  cliente_nombre text,
  data_ingresso date,
  data_baixa date,
  data_alta_seguridad date,
  data_baixa_seguridad date,
  dias_trabalhados integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'core_personal'
AS $$
DECLARE
  v_start_date date := make_date(p_period_year, p_period_month, 1);
  v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
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
      w.nacionalidade,
      w.fecha_nacimiento,
      w.status_seguridad,
      w.status_trabajador,
      w.contratante,
      w.funcion,
      w.cliente as active_client_nombre,
      w.data_ingresso,
      w.data_baixa,
      w.data_alta_seguridad,
      w.data_baixa_seguridad,
      w.created_at,
      -- Calculate active working days in the period (using GREATEST and LEAST on seguridade dates, fallback to ingresso dates)
      COALESCE(
        CASE 
          WHEN GREATEST(COALESCE(w.data_alta_seguridad, w.data_ingresso, v_start_date), v_start_date) <= LEAST(COALESCE(w.data_baixa_seguridad, w.data_baixa, v_end_date), v_end_date)
          THEN (LEAST(COALESCE(w.data_baixa_seguridad, w.data_baixa, v_end_date), v_end_date) - GREATEST(COALESCE(w.data_alta_seguridad, w.data_ingresso, v_start_date), v_start_date) + 1)
          ELSE 0
        END,
        0
      )::integer as calc_dias_trabalhados
    FROM core_personal.workers w
    WHERE 
      -- Bypass principal company check if p_empresa_id matches the main system tenant
      (p_empresa_id IS NULL OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224A9A5A3d'::uuid OR w.empresa_id = p_empresa_id)
      
      -- Filter to only include those who were active (de alta) in Seguridade during the month
      AND (w.data_alta_seguridad IS NOT NULL OR w.data_ingresso IS NOT NULL)
      AND COALESCE(w.data_alta_seguridad, w.data_ingresso) <= v_end_date
      AND (COALESCE(w.data_baixa_seguridad, w.data_baixa) IS NULL OR COALESCE(w.data_baixa_seguridad, w.data_baixa) >= v_start_date)

      -- Search text filter
      AND (
        p_search IS NULL OR p_search = '' 
        OR w.nome ILIKE '%' || p_search || '%' 
        OR w.cod_colab ILIKE '%' || p_search || '%' 
        OR w.dni ILIKE '%' || p_search || '%' 
        OR w.pasaporte ILIKE '%' || p_search || '%' 
        OR w.niss ILIKE '%' || p_search || '%' 
        OR w.nie ILIKE '%' || p_search || '%'
      )
      
      -- Contractor/Contratante filter
      AND (p_contratante IS NULL OR p_contratante = '' OR w.contratante = p_contratante)
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
    (SELECT exact_count FROM total) AS total_count,
    f.id,
    f.empresa_id,
    f.cod_colab,
    f.nome,
    f.email,
    f.movil,
    f.niss,
    f.nif,
    f.nie,
    f.dni,
    f.pasaporte,
    f.nacionalidade,
    f.fecha_nacimiento,
    f.status_seguridad,
    f.status_trabajador,
    f.contratante,
    f.funcion,
    f.active_client_nombre as cliente_nombre,
    f.data_ingresso,
    f.data_baixa,
    f.data_alta_seguridad,
    f.data_baixa_seguridad,
    f.calc_dias_trabalhados as dias_trabalhados,
    f.created_at
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
    CASE WHEN p_sort_column = 'dias_trabalhados' AND p_sort_direction = 'asc' THEN f.calc_dias_trabalhados END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'dias_trabalhados' AND p_sort_direction = 'desc' THEN f.calc_dias_trabalhados END DESC NULLS LAST,
    f.nome ASC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- 3. CREATE core_personal.get_salary_report_kpis
CREATE OR REPLACE FUNCTION core_personal.get_salary_report_kpis(
  p_empresa_id uuid,
  p_period_year integer,
  p_period_month integer,
  p_search text DEFAULT NULL::text,
  p_contratante text DEFAULT NULL::text,
  p_cliente_nombre text[] DEFAULT NULL::text[]
)
RETURNS TABLE (
  total_ativos_periodo bigint,
  novos_admitidos bigint,
  desligados bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'core_personal'
AS $$
DECLARE
  v_start_date date := make_date(p_period_year, p_period_month, 1);
  v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
BEGIN
  RETURN QUERY
  WITH base_workers AS (
    SELECT 
      w.id,
      w.data_ingresso,
      w.data_baixa,
      w.data_alta_seguridad,
      w.data_baixa_seguridad,
      w.cliente as active_client_nombre
    FROM core_personal.workers w
    WHERE 
      (p_empresa_id IS NULL OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224A9A5A3d'::uuid OR w.empresa_id = p_empresa_id)
      AND (w.data_alta_seguridad IS NOT NULL OR w.data_ingresso IS NOT NULL)
      AND COALESCE(w.data_alta_seguridad, w.data_ingresso) <= v_end_date
      AND (COALESCE(w.data_baixa_seguridad, w.data_baixa) IS NULL OR COALESCE(w.data_baixa_seguridad, w.data_baixa) >= v_start_date)

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
  ),
  filtered AS (
    SELECT bw.*
    FROM base_workers bw
    WHERE (p_cliente_nombre IS NULL OR array_length(p_cliente_nombre, 1) IS NULL OR bw.active_client_nombre = ANY(p_cliente_nombre))
  )
  SELECT 
    COUNT(*)::bigint AS total_ativos_periodo,
    COUNT(*) FILTER (WHERE COALESCE(f.data_alta_seguridad, f.data_ingresso) >= v_start_date AND COALESCE(f.data_alta_seguridad, f.data_ingresso) <= v_end_date)::bigint AS novos_admitidos,
    COUNT(*) FILTER (WHERE COALESCE(f.data_baixa_seguridad, f.data_baixa) >= v_start_date AND COALESCE(f.data_baixa_seguridad, f.data_baixa) <= v_end_date)::bigint AS desligados
  FROM filtered f;
END;
$$;

-- 4. GRANT PERMISSIONS
GRANT ALL ON FUNCTION core_personal.get_salary_report_workers(uuid, integer, integer, text, text, text[], text, text, integer, integer) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION core_personal.get_salary_report_kpis(uuid, integer, integer, text, text, text[]) TO anon, authenticated, service_role;
