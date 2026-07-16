-- Fix get_hours_control_workers filter logic to evaluate active allocations in period per company
CREATE OR REPLACE FUNCTION core_personal.get_hours_control_workers(
  p_empresa_id uuid,
  p_period_year integer,
  p_period_month integer,
  p_contratante text DEFAULT NULL::text,
  p_cliente_nombre text DEFAULT NULL::text
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
  data_baixa date,
  created_at timestamp with time zone
)
 LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date date := make_date(p_period_year, p_period_month, 1);
  v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
BEGIN
  RETURN QUERY
  WITH valid_allocations_all AS (
    SELECT 
      cpp.cod_colab,
      cpp.contratante,
      cpp.cliente_nombre,
      CASE 
        WHEN lower(cpp.contratante) IN ('stocco') THEN '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid
        WHEN lower(cpp.contratante) IN ('triangulo') THEN 'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid
        WHEN lower(cpp.contratante) IN ('luminous') THEN '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid
        WHEN lower(cpp.contratante) IN ('wiseowe') THEN 'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid
        WHEN lower(cpp.contratante) IN ('rosas', 'kotrik & rosas') THEN 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf'::uuid
        ELSE NULL
      END AS allocation_empresa_id,
      cpp.fechasalidatrabajador,
      cpp.fechafinpedido,
      cpp.inserted_at
    FROM public.colaborador_por_pedido cpp
    WHERE 
      (cpp.fechainiciopedido IS NULL OR cpp.fechainiciopedido <= v_end_date)
      AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= v_start_date)
      AND (cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= v_start_date)
  ),
  valid_allocations AS (
    SELECT DISTINCT ON (cpp.cod_colab)
      cpp.cod_colab,
      cpp.contratante,
      cpp.cliente_nombre,
      cpp.allocation_empresa_id
    FROM valid_allocations_all cpp
    WHERE p_empresa_id IS NULL OR cpp.allocation_empresa_id = p_empresa_id
    ORDER BY cpp.cod_colab, 
             COALESCE(cpp.fechasalidatrabajador, cpp.fechafinpedido, v_end_date) DESC,
             cpp.inserted_at DESC
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
      COALESCE(va.contratante, c.contratante) AS contratante,
      COALESCE(w.funcion, c.funcion) AS funcion,
      COALESCE(va.cliente_nombre, public.fn_get_active_client_for_worker(w.cod_colab), 'NÃO DEFINIDO') AS cliente_nombre,
      w.data_baixa,
      w.created_at
    FROM core_personal.workers w
    LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
    LEFT JOIN valid_allocations va ON va.cod_colab = w.cod_colab
    WHERE (
      p_empresa_id IS NULL OR
      -- Caso 1: O trabalhador tem alocação ativa nesta empresa neste período
      (va.cod_colab IS NOT NULL)
      OR
      -- Caso 2: O trabalhador não tem nenhuma alocação ativa no período e seu contrato ativo pertence a esta empresa
      (
        NOT EXISTS (
          SELECT 1 FROM valid_allocations_all vaa 
          WHERE vaa.cod_colab = w.cod_colab
        )
        AND EXISTS (
          SELECT 1 FROM core_personal.contracts cnt 
          WHERE cnt.worker_id = w.id 
            AND cnt.empresa_id = p_empresa_id
            AND cnt.created_at::date <= v_end_date
            AND (cnt.terminated_at IS NULL OR cnt.terminated_at::date >= v_start_date)
            AND cnt.status = 'signed'
        )
      )
    )
    AND (
       (w.status_trabajador NOT ILIKE 'Inativo' AND w.status_trabajador NOT ILIKE 'Desligado' AND w.status_trabajador NOT ILIKE 'Pendente Baixa' AND w.status_trabajador NOT ILIKE 'Baja')
       OR
       (w.data_baixa IS NOT NULL AND w.data_baixa >= v_start_date)
       OR
       EXISTS (
           SELECT 1 FROM core_personal.worker_hours wh
           WHERE wh.worker_id = w.id
             AND wh.period_year = p_period_year
             AND wh.period_month = p_period_month
       )
       OR
       EXISTS (
           SELECT 1 FROM core_finance.horas_trabalhadas ht
           WHERE ht.worker_id = w.id
             AND ht.data_trabalho >= v_start_date
             AND ht.data_trabalho <= v_end_date
       )
    )
    AND (
       (va.cod_colab IS NOT NULL) 
       OR 
       (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')
       OR
       EXISTS (
           SELECT 1 FROM core_personal.worker_hours wh
           WHERE wh.worker_id = w.id
             AND wh.period_year = p_period_year
             AND wh.period_month = p_period_month
       )
       OR
       EXISTS (
           SELECT 1 FROM core_finance.horas_trabalhadas ht
           WHERE ht.worker_id = w.id
             AND ht.data_trabalho >= v_start_date
             AND ht.data_trabalho <= v_end_date
       )
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
$$;
