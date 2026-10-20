-- Migration: Create fast aggregation RPC for Executive BI Dashboard (/bi)
-- Bypasses PostgREST 1,000-row limit on large tables and ensures complete group-wide visibility for the Executive Board

CREATE OR REPLACE FUNCTION public.get_executive_bi_aggregates(p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core_common, core_comercial, core_finance, core_personal
AS $$
DECLARE
  v_horas_mensais jsonb;
  v_leads_mensais jsonb;
  v_worker_hours_mensais jsonb;
  v_estimaciones jsonb;
  v_pedidos jsonb;
  v_pedido_items jsonb;
  v_workers jsonb;
BEGIN
  -- 1. Agregação de horas_trabalhadas por (month, client_id, worker_id)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_horas_mensais
  FROM (
    SELECT
      EXTRACT(MONTH FROM h.data_trabalho)::integer AS month,
      h.client_id,
      h.worker_id,
      MAX(h.fatura_id::text) AS fatura_id,
      MAX(h.status) AS status,
      ROUND(SUM(COALESCE(h.horas_totais, 0))::numeric, 2) AS total_horas,
      ROUND(AVG(NULLIF(h.tarifa_faturada, 0))::numeric, 2) AS tarifa_media,
      ROUND(SUM(
        CASE
          WHEN COALESCE(h.horas_normais, 0) > 0 OR COALESCE(h.horas_noturnas, 0) > 0 THEN
            (GREATEST(0, COALESCE(h.horas_totais, 0) - COALESCE(h.horas_noturnas, 0)) * COALESCE(NULLIF(h.tarifa_faturada, 0), 26.50))
            + (COALESCE(h.horas_noturnas, 0) * COALESCE(NULLIF(h.tarifa_faturada_noturna, 0), NULLIF(h.tarifa_faturada, 0), 26.50))
          ELSE
            COALESCE(h.horas_totais, 0) * COALESCE(NULLIF(h.tarifa_faturada, 0), 26.50)
        END
      )::numeric, 2) AS total_valor
    FROM core_finance.horas_trabalhadas h
    WHERE EXTRACT(YEAR FROM h.data_trabalho)::integer = p_year
    GROUP BY EXTRACT(MONTH FROM h.data_trabalho)::integer, h.client_id, h.worker_id
  ) t;

  -- 2. Agregação de leads (29k+ registros) por (month, empresa_id, country_id, assigned_to)
  SELECT COALESCE(jsonb_agg(row_to_json(l)), '[]'::jsonb)
  INTO v_leads_mensais
  FROM (
    SELECT
      EXTRACT(MONTH FROM ld.created_at)::integer AS month,
      ld.empresa_id,
      ld.country_id,
      ld.assigned_to,
      COUNT(*)::integer AS total_leads,
      COUNT(ld.client_id)::integer AS converted_leads,
      MAX(COALESCE(ld.company_name, ld.name, 'Lead Comercial')) AS sample_company
    FROM core_comercial.leads ld
    WHERE EXTRACT(YEAR FROM ld.created_at)::integer = p_year
    GROUP BY EXTRACT(MONTH FROM ld.created_at)::integer, ld.empresa_id, ld.country_id, ld.assigned_to
  ) l;

  -- 3. Agregação de worker_hours (3.2k+ registros) por (period_month, status, empresa_id, cliente_nombre, contratante)
  SELECT COALESCE(jsonb_agg(row_to_json(wh)), '[]'::jsonb)
  INTO v_worker_hours_mensais
  FROM (
    SELECT
      w.period_month::integer AS month,
      COALESCE(w.status, 'pendente') AS status,
      w.empresa_id,
      COALESCE(w.cliente_nombre, 'Cliente Geral') AS cliente_nombre,
      COALESCE(w.contratante, 'Luminous') AS contratante,
      COUNT(*)::integer AS records_count,
      COUNT(DISTINCT w.worker_id)::integer AS workers_count,
      ROUND(SUM(COALESCE(w.horas_totais, 0))::numeric, 2) AS total_horas
    FROM core_personal.worker_hours w
    WHERE w.period_year = p_year
    GROUP BY w.period_month, w.status, w.empresa_id, w.cliente_nombre, w.contratante
  ) wh;

  -- 4. Estimaciones completas com versão atual e itens
  SELECT COALESCE(jsonb_agg(row_to_json(e_row)), '[]'::jsonb)
  INTO v_estimaciones
  FROM (
    SELECT
      e.id,
      e.codigo,
      e.status,
      e.estimation_type,
      e.client_id,
      e.lead_id,
      e.client_site_id,
      e.empresa_id,
      e.commercial_owner_id,
      e.created_by,
      e.created_at,
      e.expected_start_date,
      e.country_id,
      e.total_estimated_revenue,
      e.total_estimated_cost,
      e.estimated_margin_percent,
      v.total_revenue AS version_revenue,
      v.margin_percent AS version_margin,
      (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('quantity', ei.quantity, 'job_function_id', ei.job_function_id)), '[]'::jsonb)
        FROM core_comercial.estimacion_items ei
        WHERE ei.estimacion_version_id = e.current_version_id
      ) AS items
    FROM core_comercial.estimaciones e
    LEFT JOIN core_comercial.estimacion_versions v ON v.id = e.current_version_id
    ORDER BY e.created_at DESC
  ) e_row;

  -- 5. Pedidos & Pedido Items
  SELECT COALESCE(jsonb_agg(row_to_json(p_row)), '[]'::jsonb)
  INTO v_pedidos
  FROM (
    SELECT
      p.id,
      p.codigo,
      p.source_estimacion_id,
      p.client_id,
      p.client_site_id,
      p.empresa_id,
      p.commercial_owner_id,
      p.responsible_id,
      p.created_by,
      p.commercial_status,
      p.operational_status,
      p.total_revenue_snapshot,
      p.margin_percent_snapshot,
      p.created_at,
      p.expected_start_date,
      p.country_id
    FROM core_comercial.pedidos p
    WHERE COALESCE(p.operational_status, '') <> 'cancelled'
    ORDER BY p.created_at DESC
  ) p_row;

  SELECT COALESCE(jsonb_agg(row_to_json(pi_row)), '[]'::jsonb)
  INTO v_pedido_items
  FROM (
    SELECT
      pi.id,
      pi.pedido_id,
      pi.job_function_id,
      pi.job_function_name_snapshot,
      pi.quantity_requested,
      pi.quantity_fulfilled,
      pi.sell_rate_hour_snapshot
    FROM core_comercial.pedido_items pi
  ) pi_row;

  -- 6. Workers
  SELECT COALESCE(jsonb_agg(row_to_json(w_row)), '[]'::jsonb)
  INTO v_workers
  FROM (
    SELECT
      wk.id,
      wk.cod_colab,
      wk.nome,
      wk.funcion,
      wk.cliente,
      wk.contratante,
      wk.status_trabajador,
      wk.status_seguridad,
      wk.data_ingresso,
      wk.data_baixa,
      wk.created_at
    FROM core_personal.workers wk
    WHERE wk.deleted_at IS NULL
  ) w_row;

  RETURN jsonb_build_object(
    'horas_mensais', v_horas_mensais,
    'leads_mensais', v_leads_mensais,
    'worker_hours_mensais', v_worker_hours_mensais,
    'estimaciones', v_estimaciones,
    'pedidos', v_pedidos,
    'pedido_items', v_pedido_items,
    'workers', v_workers
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_executive_bi_aggregates(integer) TO anon, authenticated, service_role;
