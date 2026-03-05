DROP FUNCTION IF EXISTS core_personal.search_workers(uuid, text, text, integer, integer);
DROP FUNCTION IF EXISTS core_personal.search_workers(uuid, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS core_personal.search_workers(uuid, text, text, text[], text[], text, text, integer, integer);

CREATE OR REPLACE FUNCTION core_personal.search_workers(
  p_empresa_id uuid,
  p_search text DEFAULT NULL::text,
  p_cliente_nombre text DEFAULT NULL::text,
  p_status_trabajador_filter text[] DEFAULT NULL::text[],
  p_status_seguridad_filter text[] DEFAULT NULL::text[],
  p_contratante text DEFAULT NULL::text,
  p_funcion text DEFAULT NULL::text,
  p_sort_column text DEFAULT 'nome'::text,
  p_sort_direction text DEFAULT 'asc'::text,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10
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
AS $function$
DECLARE
  v_offset int := (p_page - 1) * p_page_size;
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT w.*, c.contratante, c.funcion,
      (SELECT string_agg(DISTINCT cpp.cliente_nombre, ', ') FROM public.colaborador_por_pedido cpp WHERE cpp.cod_colab = w.cod_colab) as cliente_nombre
    FROM core_personal.workers w
    LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
    WHERE w.empresa_id = p_empresa_id
      AND (p_search IS NULL OR p_search = '' OR w.nome ILIKE '%' || p_search || '%' OR w.cod_colab ILIKE '%' || p_search || '%' OR w.dni ILIKE '%' || p_search || '%' OR w.pasaporte ILIKE '%' || p_search || '%' OR w.niss ILIKE '%' || p_search || '%' OR w.nie ILIKE '%' || p_search || '%')
      AND (p_cliente_nombre IS NULL OR p_cliente_nombre = '' OR EXISTS (
        SELECT 1 FROM public.colaborador_por_pedido cpp WHERE cpp.cod_colab = w.cod_colab AND cpp.cliente_nombre ILIKE '%' || p_cliente_nombre || '%'
      ))
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
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT exact_count FROM total) AS total_count,
    f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.cliente_nombre, f.created_at
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
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'asc' THEN f.cliente_nombre END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'desc' THEN f.cliente_nombre END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'asc' THEN f.status_trabajador END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'desc' THEN f.status_trabajador END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'asc' THEN f.status_seguridad END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'desc' THEN f.status_seguridad END DESC NULLS LAST,
    f.nome ASC -- Fallback tiebreaker
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;
