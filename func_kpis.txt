CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(p_empresa_id uuid, p_cliente_nombre text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total int;
  v_ativos int;
  v_pendentes_alta int;
  v_inativos int;
BEGIN
  IF p_cliente_nombre IS NULL OR p_cliente_nombre = '' THEN
    SELECT 
      COUNT(w.id),
      COUNT(w.id) FILTER (WHERE w.status_seguridad ILIKE '%alta%' AND w.status_seguridad NOT ILIKE '%pendiente%'),
      COUNT(w.id) FILTER (WHERE w.status_seguridad ILIKE '%pendiente alta%'),
      COUNT(w.id) FILTER (WHERE w.status_seguridad ILIKE '%baja%' AND w.status_seguridad NOT ILIKE '%pendiente%')
    INTO v_total, v_ativos, v_pendentes_alta, v_inativos
    FROM core_personal.workers w
    WHERE w.empresa_id = p_empresa_id;
  ELSE
    SELECT 
      COUNT(DISTINCT w.id),
      COUNT(DISTINCT w.id) FILTER (WHERE w.status_seguridad ILIKE '%alta%' AND w.status_seguridad NOT ILIKE '%pendiente%'),
      COUNT(DISTINCT w.id) FILTER (WHERE w.status_seguridad ILIKE '%pendiente alta%'),
      COUNT(DISTINCT w.id) FILTER (WHERE w.status_seguridad ILIKE '%baja%' AND w.status_seguridad NOT ILIKE '%pendiente%')
    INTO v_total, v_ativos, v_pendentes_alta, v_inativos
    FROM core_personal.workers w
    JOIN public.colaborador_por_pedido cpp ON w.cod_colab = cpp.cod_colab
    WHERE w.empresa_id = p_empresa_id AND cpp.cliente_nombre = p_cliente_nombre;
  END IF;

  RETURN json_build_object(
    'total', COALESCE(v_total, 0),
    'ativos', COALESCE(v_ativos, 0),
    'pendentes_alta', COALESCE(v_pendentes_alta, 0),
    'inativos', COALESCE(v_inativos, 0)
  );
END;
$function$
